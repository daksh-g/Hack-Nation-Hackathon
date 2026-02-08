"""Decision chain traversal stub."""

def build_decision_chain(decision_id: str, graph_data: dict) -> dict:
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])

    # Find the decision node
    decision = next((n for n in nodes if n["id"] == decision_id), None)
    if not decision:
        return {"chain": [], "downstream_impact": []}

    return {
        "chain": [{"node": decision, "relationship_to_next": "", "division": decision.get("division", "")}],
        "downstream_impact": []
    }
