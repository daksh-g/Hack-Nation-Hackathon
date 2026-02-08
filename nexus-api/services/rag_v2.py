"""Module 7: Real RAG pipeline — embedding search + LLM generation with citations."""

import logging
from .llm.client import get_llm_client
from .llm.context_builder import ContextBuilder
from .llm.embeddings import get_embedding_service
from .llm import prompts
from .graph_store import load_graph
from .supabase_client import get_supabase, is_supabase_configured

logger = logging.getLogger("nexus.rag")

# Conversation memory store (fallback)
_conversations: dict[str, list[dict]] = {}


def _load_conversation_history(conversation_id: str) -> list[dict]:
    """Load conversation history from Supabase, falling back to in-memory."""
    if is_supabase_configured():
        try:
            sb = get_supabase()
            result = (
                sb.table("conversation_messages")
                .select("role, content")
                .eq("conversation_id", conversation_id)
                .order("created_at", desc=False)
                .limit(10)
                .execute()
            )
            if result.data:
                return result.data
        except Exception as e:
            logger.warning(f"[RAG] Failed to load conversation from Supabase: {e}")

    # In-memory fallback
    if conversation_id in _conversations:
        return _conversations[conversation_id][-10:]
    return []


def _save_conversation_messages(conversation_id: str, user_query: str, assistant_answer: str):
    """Persist conversation messages to Supabase and in-memory."""
    # Always keep in-memory copy
    if conversation_id not in _conversations:
        _conversations[conversation_id] = []
    _conversations[conversation_id].append({"role": "user", "content": user_query})
    _conversations[conversation_id].append({"role": "assistant", "content": assistant_answer})

    if is_supabase_configured():
        try:
            sb = get_supabase()
            # Upsert conversation record
            sb.table("conversations").upsert({
                "id": conversation_id,
                "updated_at": "now()",
            }).execute()

            # Insert the two messages
            sb.table("conversation_messages").insert([
                {
                    "conversation_id": conversation_id,
                    "role": "user",
                    "content": user_query,
                },
                {
                    "conversation_id": conversation_id,
                    "role": "assistant",
                    "content": assistant_answer,
                },
            ]).execute()
            logger.info(f"[RAG] Conversation {conversation_id} persisted to Supabase")
        except Exception as e:
            logger.warning(f"[RAG] Failed to persist conversation to Supabase: {e}")


async def query_rag(
    query: str,
    conversation_id: str | None = None,
    structured: bool = True,
) -> dict:
    """Full RAG pipeline: embed query -> search -> expand context -> generate answer."""
    client = get_llm_client()
    ctx = ContextBuilder()
    emb_service = get_embedding_service()

    # Ensure embedding index is built
    if not emb_service.is_ready:
        await emb_service.build_index()

    # Step 1: Semantic search
    search_results = await emb_service.search(query, top_k=20)
    logger.info(f"[RAG] Retrieved {len(search_results)} nodes for: {query[:50]}...")

    # Step 2: Expand context via graph neighbors
    graph = load_graph()
    nodes_by_id = {n["id"]: n for n in graph.get("nodes", [])}
    edges = graph.get("edges", [])

    retrieved_ids = {nid for nid, _ in search_results}
    expanded_ids = set(retrieved_ids)

    # 1-hop expansion
    for e in edges:
        if e["source"] in retrieved_ids:
            expanded_ids.add(e["target"])
        if e["target"] in retrieved_ids:
            expanded_ids.add(e["source"])

    # Step 3: Build context text
    context_lines = []
    for nid in expanded_ids:
        node = nodes_by_id.get(nid)
        if not node:
            continue
        relevance = next((s for n, s in search_results if n == nid), 0.0)
        line = (
            f"[{node.get('type', '?').upper()}] {node.get('label', nid)} (ID: {nid})"
            f" | Division: {node.get('division', '?')}"
        )
        if node.get("content"):
            line += f"\n  Content: {node['content'][:300]}"
        if node.get("role"):
            line += f" | Role: {node['role']}"
        if node.get("cognitive_load") is not None:
            line += f" | Load: {node['cognitive_load']}"
        if node.get("status"):
            line += f" | Status: {node['status']}"
        if node.get("freshness_score") is not None:
            line += f" | Freshness: {node['freshness_score']}"
        if relevance > 0:
            line += f" | Relevance: {relevance:.2f}"
        context_lines.append(line)

    # Add relevant edges
    edge_lines = []
    for e in edges:
        if e["source"] in expanded_ids and e["target"] in expanded_ids:
            edge_lines.append(f"  {e['source']} --[{e['type']}]--> {e['target']}")

    retrieved_context = "\n".join(context_lines[:40])
    if edge_lines:
        retrieved_context += "\n\nRelationships:\n" + "\n".join(edge_lines[:30])

    alerts_context = ctx.build_alerts_context()
    org_summary = ctx.build_org_summary()

    # Step 4: Build conversation history
    messages = []
    if conversation_id:
        messages = _load_conversation_history(conversation_id)

    # Step 5: Generate answer
    if structured:
        system = (
            prompts.NEXUS_BASE.format(**org_summary) + "\n\n"
            + prompts.ASK_NEXUS_STRUCTURED.format(
                retrieved_context=retrieved_context,
                alerts_context=alerts_context,
            )
        )
    else:
        system = (
            prompts.NEXUS_BASE.format(**org_summary) + "\n\n"
            + prompts.ASK_NEXUS.format(
                company_name=org_summary["company_name"],
                retrieved_context=retrieved_context,
                alerts_context=alerts_context,
            )
        )

    result = await client.complete_json(
        task_type="complex_ask",
        system_prompt=system,
        user_prompt=query,
        use_cache=False,
    )

    # Store conversation
    if conversation_id:
        _save_conversation_messages(conversation_id, query, result.get("answer", ""))

    logger.info(f"[RAG] Generated answer with {len(result.get('citations', []))} citations")
    return result


async def query_rag_stream(query: str):
    """Stream RAG response token by token."""
    client = get_llm_client()
    ctx = ContextBuilder()
    emb_service = get_embedding_service()

    if not emb_service.is_ready:
        await emb_service.build_index()

    search_results = await emb_service.search(query, top_k=15)
    graph = load_graph()
    nodes_by_id = {n["id"]: n for n in graph.get("nodes", [])}

    context_lines = []
    for nid, score in search_results:
        node = nodes_by_id.get(nid)
        if node:
            context_lines.append(
                f"[{node.get('type', '?').upper()}] {node.get('label', nid)}: "
                f"{(node.get('content') or node.get('label', ''))[:200]}"
            )

    retrieved_context = "\n".join(context_lines[:25])
    alerts_context = ctx.build_alerts_context()
    org_summary = ctx.build_org_summary()

    system = (
        prompts.NEXUS_BASE.format(**org_summary) + "\n\n"
        + prompts.ASK_NEXUS.format(
            company_name=org_summary["company_name"],
            retrieved_context=retrieved_context,
            alerts_context=alerts_context,
        )
    )

    # Stream tokens
    async for token in await client.complete(
        task_type="complex_ask",
        system_prompt=system,
        user_prompt=query,
        stream=True,
        use_cache=False,
    ):
        yield token
