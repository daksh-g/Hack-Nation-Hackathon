"""Embedding service with vector store for semantic search."""

import numpy as np
import logging
from .client import get_llm_client
from .context_builder import ContextBuilder

logger = logging.getLogger("nexus.embeddings")


def cosine_similarity(a: list[float], b: list[float]) -> float:
    a_arr = np.array(a)
    b_arr = np.array(b)
    dot = np.dot(a_arr, b_arr)
    norm = np.linalg.norm(a_arr) * np.linalg.norm(b_arr)
    if norm == 0:
        return 0.0
    return float(dot / norm)


class EmbeddingService:
    """In-memory vector store for knowledge graph nodes."""

    def __init__(self):
        self._index: dict[str, list[float]] = {}  # node_id -> embedding
        self._texts: dict[str, str] = {}  # node_id -> text
        self._built = False

    async def build_index(self):
        """Embed all graph nodes and build the vector index."""
        ctx = ContextBuilder()
        node_texts = ctx.get_all_node_texts()

        if not node_texts:
            logger.warning("No nodes to embed")
            return

        client = get_llm_client()
        ids = [nt[0] for nt in node_texts]
        texts = [nt[1] for nt in node_texts]

        try:
            embeddings = await client.embed(texts)
            for node_id, text, emb in zip(ids, texts, embeddings):
                self._index[node_id] = emb
                self._texts[node_id] = text
            self._built = True
            logger.info(f"[Embeddings] Built index with {len(self._index)} nodes")
        except Exception as e:
            logger.error(f"[Embeddings] Failed to build index: {e}")
            # Fallback: use simple text matching
            for node_id, text in zip(ids, texts):
                self._texts[node_id] = text
            self._built = False

    async def search(self, query: str, top_k: int = 20) -> list[tuple[str, float]]:
        """Search for most similar nodes. Returns [(node_id, score)]."""
        if self._built and self._index:
            try:
                client = get_llm_client()
                query_emb = (await client.embed([query]))[0]
                scores = []
                for node_id, node_emb in self._index.items():
                    sim = cosine_similarity(query_emb, node_emb)
                    scores.append((node_id, sim))
                scores.sort(key=lambda x: x[1], reverse=True)
                return scores[:top_k]
            except Exception as e:
                logger.warning(f"[Embeddings] Search failed, falling back to text: {e}")

        # Fallback: simple keyword matching
        return self._keyword_search(query, top_k)

    def _keyword_search(self, query: str, top_k: int) -> list[tuple[str, float]]:
        """Fallback keyword-based search when embeddings aren't available."""
        query_words = set(query.lower().split())
        stop_words = {"the", "a", "an", "is", "are", "was", "were", "what", "why", "how", "who", "when", "did", "do", "does", "to", "for", "of", "in", "on", "at", "and", "or", "but", "not", "this", "that", "it"}
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
