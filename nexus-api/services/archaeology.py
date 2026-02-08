"""Decision chain traversal — walks the knowledge graph to build a chain."""


def build_decision_chain(decision_id: str, graph_data: dict) -> dict:
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])
    nodes_map = {n["id"]: n for n in nodes}

    # Find the decision node
    decision = nodes_map.get(decision_id)
    if not decision:
        return {"chain": [], "downstream_impact": []}

    # Build adjacency for traversal
    adj: dict[str, list[tuple[str, str]]] = {}
    for e in edges:
        src, tgt, etype = e["source"], e["target"], e["type"]
        adj.setdefault(src, []).append((tgt, etype))
        adj.setdefault(tgt, []).append((src, etype))

    # Walk the chain: collect all connected knowledge units
    visited = set()
    chain_items = []
    downstream = []

    def walk(node_id: str, depth: int = 0):
        if node_id in visited or depth > 6:
            return
        visited.add(node_id)

        node = nodes_map.get(node_id)
        if not node:
            return

        # Only include knowledge units in the chain
        if node["type"] in ("decision", "fact", "commitment", "question"):
            # Find the relationship type from parent to this node
            relationship = ""
            if chain_items:
                prev_id = chain_items[-1]["node"]["id"]
                for neighbor_id, edge_type in adj.get(prev_id, []):
                    if neighbor_id == node_id:
                        relationship = _edge_type_label(edge_type)
                        break
                if chain_items:
                    chain_items[-1]["relationship_to_next"] = relationship

            chain_items.append({
                "node": node,
                "relationship_to_next": "",
                "division": node.get("division", ""),
            })

        # Continue walking to connected knowledge units
        for neighbor_id, edge_type in adj.get(node_id, []):
            if neighbor_id not in visited:
                neighbor = nodes_map.get(neighbor_id)
                if neighbor and neighbor["type"] in ("decision", "fact", "commitment", "question"):
                    walk(neighbor_id, depth + 1)

    walk(decision_id)

    # Downstream impact: find person/agent nodes affected by chain nodes
    chain_node_ids = {item["node"]["id"] for item in chain_items}
    for cid in chain_node_ids:
        for neighbor_id, edge_type in adj.get(cid, []):
            if neighbor_id not in chain_node_ids and neighbor_id not in visited:
                node = nodes_map.get(neighbor_id)
                if node and node["type"] in ("person", "agent", "team"):
                    downstream.append(node)
                    visited.add(neighbor_id)

    return {"chain": chain_items, "downstream_impact": downstream}


def _edge_type_label(edge_type: str) -> str:
    labels = {
        "DEPENDS_ON": "depends on",
        "SUPERSEDES": "supersedes",
        "CONTRADICTS": "contradicts",
        "BLOCKS": "blocks",
        "AFFECTS": "affects",
        "ABOUT": "about",
        "PRODUCED_BY": "produced by",
        "DECIDED_BY": "decided by",
        "CAN_ANSWER": "answers",
        "OWNS": "owns",
    }
    return labels.get(edge_type, edge_type.lower().replace("_", " "))
