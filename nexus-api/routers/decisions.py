from fastapi import APIRouter, HTTPException
from services.graph_store import load_graph
from services.archaeology import build_decision_chain

router = APIRouter(prefix="/api")


@router.get("/decisions")
async def get_decisions():
    graph = load_graph()
    decisions = [n for n in graph["nodes"] if n["type"] == "decision"]

    # Separate cross-division vs per-division
    cross_division = []
    by_division: dict[str, list] = {}

    for d in decisions:
        div = d.get("division", "Unknown")
        # A decision is cross-division if it affects nodes in multiple divisions
        affected_divisions = _get_affected_divisions(d["id"], graph)
        if len(affected_divisions) > 1:
            cross_division.append(d)
        else:
            by_division.setdefault(div, []).append(d)

    # Sort by blast_radius descending
    cross_division.sort(key=lambda x: x.get("blast_radius", 0), reverse=True)
    for divlist in by_division.values():
        divlist.sort(key=lambda x: x.get("blast_radius", 0), reverse=True)

    return {"cross_division": cross_division, "by_division": by_division}


@router.get("/decisions/{decision_id}/chain")
async def get_decision_chain(decision_id: str):
    graph = load_graph()
    result = build_decision_chain(decision_id, graph)
    if not result["chain"]:
        raise HTTPException(status_code=404, detail=f"Decision {decision_id} not found")
    return result


def _get_affected_divisions(node_id: str, graph: dict) -> set[str]:
    """Find all divisions that a node's connected nodes belong to."""
    edges = graph.get("edges", [])
    nodes_map = {n["id"]: n for n in graph.get("nodes", [])}

    connected_ids = set()
    for e in edges:
        if e["source"] == node_id:
            connected_ids.add(e["target"])
        elif e["target"] == node_id:
            connected_ids.add(e["source"])

    divisions = set()
    for cid in connected_ids:
        node = nodes_map.get(cid)
        if node and node.get("division"):
            divisions.add(node["division"])

    return divisions
