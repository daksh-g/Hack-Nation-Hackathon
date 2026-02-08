import uuid
from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from services.graph_store import load_graph

router = APIRouter(prefix="/api")


class InfoRequest(BaseModel):
    text: str


@router.post("/info")
async def info_drop(request: InfoRequest):
    graph = load_graph()
    text = request.text.strip()

    # Create a new knowledge unit from the info drop
    new_id = f"info-{uuid.uuid4().hex[:8]}"

    # Classify as fact by default
    unit = {
        "id": new_id,
        "type": "fact",
        "label": text[:80],
        "content": text,
        "division": "HQ",
        "source_type": "human",
        "source_id": "demo-user",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "freshness_score": 1.0,
        "status": "active",
        "health": "green",
        "size": 30,
    }

    # Find related nodes by keyword matching
    keywords = set(text.lower().split())
    related_nodes = []
    new_edges = []

    for node in graph.get("nodes", []):
        label_words = set(node.get("label", "").lower().split())
        content_words = set(node.get("content", "").lower().split()) if node.get("content") else set()
        overlap = keywords & (label_words | content_words)
        if len(overlap) >= 2:
            related_nodes.append(node)
            new_edges.append({
                "id": f"edge-info-{uuid.uuid4().hex[:6]}",
                "source": new_id,
                "target": node["id"],
                "type": "ABOUT",
                "weight": min(len(overlap) / 5, 1.0),
                "interaction_type": "human-human",
            })

    # Pick the most connected node as ripple target
    ripple_target = related_nodes[0]["id"] if related_nodes else ""

    return {
        "unit": unit,
        "new_edges": new_edges[:10],
        "ripple_target": ripple_target,
    }
