"""RAG engine stub for Ask NEXUS."""

async def query_with_rag(query: str, graph_data: dict, ask_cache: dict) -> dict:
    # Check cache first
    queries = ask_cache.get("queries", {})
    for cached_query, cached_response in queries.items():
        if query.lower().strip() in cached_query.lower() or cached_query.lower() in query.lower().strip():
            return cached_response
    return {"items": [], "highlight_node_ids": []}
