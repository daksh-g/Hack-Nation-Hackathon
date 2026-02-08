"""Module 7: Real RAG pipeline — embedding search + LLM generation with citations."""

import logging
from .llm.client import get_llm_client
from .llm.context_builder import ContextBuilder
from .llm.embeddings import get_embedding_service
from .llm import prompts
from .graph_store import load_graph

logger = logging.getLogger("nexus.rag")

# Conversation memory store
_conversations: dict[str, list[dict]] = {}


async def query_rag(
    query: str,
    conversation_id: str | None = None,
    structured: bool = True,
) -> dict:
    """Full RAG pipeline: embed query → search → expand context → generate answer."""
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
    if conversation_id and conversation_id in _conversations:
        messages = _conversations[conversation_id][-10:]  # Last 5 turns

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
        if conversation_id not in _conversations:
            _conversations[conversation_id] = []
        _conversations[conversation_id].append({"role": "user", "content": query})
        _conversations[conversation_id].append({
            "role": "assistant",
            "content": result.get("answer", ""),
        })

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
