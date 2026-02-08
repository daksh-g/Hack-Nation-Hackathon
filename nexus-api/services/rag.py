"""RAG engine for Ask NEXUS — cache-based + keyword fallback."""

from difflib import SequenceMatcher


async def query_with_rag(query: str, graph_data: dict, ask_cache: dict) -> dict:
    q = query.lower().strip()
    queries = ask_cache.get("queries", {})

    # 1. Exact or close cache match
    best_match = None
    best_ratio = 0.0

    for cached_query, cached_response in queries.items():
        ratio = SequenceMatcher(None, q, cached_query.lower()).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = cached_response

        # Also check substring match
        if q in cached_query.lower() or cached_query.lower() in q:
            return cached_response

    if best_ratio > 0.5 and best_match:
        return best_match

    # 2. Keyword fallback — search graph nodes for relevant info
    keywords = set(q.split()) - {"what", "who", "why", "how", "is", "are", "the", "a", "an", "about", "to", "on", "in", "for", "of", "and", "or"}

    if not keywords:
        return {"items": [], "highlight_node_ids": []}

    scored_nodes = []
    for node in graph_data.get("nodes", []):
        label_lower = node.get("label", "").lower()
        content_lower = (node.get("content") or "").lower()
        text = label_lower + " " + content_lower
        score = sum(1 for kw in keywords if kw in text)
        if score > 0:
            scored_nodes.append((score, node))

    scored_nodes.sort(key=lambda x: x[0], reverse=True)
    top = scored_nodes[:5]

    if not top:
        return {"items": [], "highlight_node_ids": []}

    items = []
    highlight_ids = []
    for score, node in top:
        items.append({
            "type": "answer",
            "headline": node["label"],
            "detail": node.get("content", node["label"]),
            "division": node.get("division", ""),
            "actions": [
                {"label": f"View {node['type']}", "route": f"/decisions?id={node['id']}" if node["type"] == "decision" else f"/pulse?highlight={node['id']}"}
            ],
        })
        highlight_ids.append(node["id"])

    return {"items": items, "highlight_node_ids": highlight_ids}
