"""Embedding service with Supabase pgvector for semantic search."""

import json
import numpy as np
import logging
import os
from datetime import datetime, timezone

from .client import get_llm_client
from .context_builder import ContextBuilder
from ..supabase_client import get_supabase, is_supabase_configured

logger = logging.getLogger("nexus.embeddings")

EMBEDDING_MODEL = os.getenv("NEXUS_EMBEDDING_MODEL", "text-embedding-3-large")


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Fallback cosine similarity when pgvector is not available."""
    a_arr = np.array(a)
    b_arr = np.array(b)
    dot = np.dot(a_arr, b_arr)
    norm = np.linalg.norm(a_arr) * np.linalg.norm(b_arr)
    if norm == 0:
        return 0.0
    return float(dot / norm)


class EmbeddingService:
    """Vector store for knowledge graph nodes backed by Supabase pgvector."""

    def __init__(self):
        self._texts: dict[str, str] = {}  # node_id -> text (for keyword fallback)
        self._built = False
        self._use_supabase = is_supabase_configured()

    async def build_index(self):
        """Embed all graph nodes and upsert into node_embeddings table."""
        ctx = ContextBuilder()
        node_texts = ctx.get_all_node_texts()

        if not node_texts:
            logger.warning("No nodes to embed")
            return

        client = get_llm_client()
        ids = [nt[0] for nt in node_texts]
        texts = [nt[1] for nt in node_texts]

        # Always populate _texts for keyword fallback
        for node_id, text in zip(ids, texts):
            self._texts[node_id] = text

        try:
            embeddings = await client.embed(texts)

            if self._use_supabase:
                self._upsert_embeddings(ids, texts, embeddings)
            else:
                logger.warning(
                    "[Embeddings] Supabase not configured — "
                    "embeddings generated but not persisted"
                )

            self._built = True
            logger.info(f"[Embeddings] Built index with {len(ids)} nodes")

        except Exception as e:
            logger.error(f"[Embeddings] Failed to build index: {e}")
            self._built = False

    def _upsert_embeddings(
        self,
        ids: list[str],
        texts: list[str],
        embeddings: list[list[float]],
    ) -> None:
        """Upsert embedding rows into the node_embeddings table."""
        sb = get_supabase()
        now = datetime.now(timezone.utc).isoformat()

        # Upsert in batches of 50 to avoid payload limits
        batch_size = 50
        for i in range(0, len(ids), batch_size):
            batch_ids = ids[i : i + batch_size]
            batch_texts = texts[i : i + batch_size]
            batch_embs = embeddings[i : i + batch_size]

            rows = []
            for node_id, text, emb in zip(batch_ids, batch_texts, batch_embs):
                rows.append(
                    {
                        "node_id": node_id,
                        "text_content": text,
                        "embedding": emb,  # pgvector accepts list of floats
                        "model": EMBEDDING_MODEL,
                        "created_at": now,
                    }
                )

            sb.table("node_embeddings").upsert(
                rows, on_conflict="node_id"
            ).execute()

            logger.debug(
                f"[Embeddings] Upserted batch {i // batch_size + 1} "
                f"({len(rows)} rows)"
            )

    async def search(
        self, query: str, top_k: int = 20
    ) -> list[tuple[str, float]]:
        """Search for most similar nodes. Returns [(node_id, score)]."""

        # Try pgvector search first
        if self._built and self._use_supabase:
            try:
                return await self._pgvector_search(query, top_k)
            except Exception as e:
                logger.warning(
                    f"[Embeddings] pgvector search failed, "
                    f"falling back to keywords: {e}"
                )

        # Fallback: simple keyword matching
        return self._keyword_search(query, top_k)

    async def _pgvector_search(
        self, query: str, top_k: int
    ) -> list[tuple[str, float]]:
        """Perform similarity search via Supabase search_similar_nodes RPC."""
        client = get_llm_client()
        query_emb = (await client.embed([query]))[0]

        sb = get_supabase()

        # Supabase RPC expects the vector as a string representation
        embedding_str = json.dumps(query_emb)

        result = sb.rpc(
            "search_similar_nodes",
            {
                "query_embedding": embedding_str,
                "match_count": top_k,
            },
        ).execute()

        results: list[tuple[str, float]] = []
        if result.data:
            for row in result.data:
                node_id = row.get("node_id")
                similarity = float(row.get("similarity", 0.0))
                if node_id:
                    results.append((node_id, similarity))

        logger.info(
            f"[Embeddings] pgvector search returned {len(results)} results"
        )
        return results

    def _keyword_search(
        self, query: str, top_k: int
    ) -> list[tuple[str, float]]:
        """Fallback keyword-based search when embeddings aren't available."""
        # If _texts is empty but Supabase is available, try loading texts
        if not self._texts and self._use_supabase:
            try:
                self._load_texts_from_supabase()
            except Exception as e:
                logger.warning(
                    f"[Embeddings] Failed to load texts from Supabase: {e}"
                )

        query_words = set(query.lower().split())
        stop_words = {
            "the", "a", "an", "is", "are", "was", "were",
            "what", "why", "how", "who", "when",
            "did", "do", "does",
            "to", "for", "of", "in", "on", "at",
            "and", "or", "but", "not",
            "this", "that", "it",
        }
        query_words -= stop_words

        scores = []
        for node_id, text in self._texts.items():
            text_words = set(text.lower().split())
            overlap = len(query_words & text_words)
            if overlap > 0:
                score = overlap / max(len(query_words), 1)
                scores.append((node_id, score))

        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]

    def _load_texts_from_supabase(self) -> None:
        """Load text_content from node_embeddings for keyword fallback."""
        sb = get_supabase()
        result = (
            sb.table("node_embeddings")
            .select("node_id, text_content")
            .execute()
        )
        if result.data:
            for row in result.data:
                self._texts[row["node_id"]] = row["text_content"]
            logger.info(
                f"[Embeddings] Loaded {len(result.data)} texts from Supabase"
            )

    @property
    def is_ready(self) -> bool:
        return self._built or bool(self._texts)


# Singleton
_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
