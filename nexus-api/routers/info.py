import os
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from services.graph_store import load_graph

router = APIRouter(prefix="/api")
logger = logging.getLogger("nexus.info")


class InfoRequest(BaseModel):
    text: str


@router.post("/info")
async def info_drop(request: InfoRequest):
    text = request.text.strip()

    # Try LLM-powered InfoDrop if OpenAI key is configured
    if os.getenv("OPENAI_API_KEY"):
        try:
            from services.infodrop_v2 import process_infodrop
            result = await process_infodrop(text)
            logger.info(f"[InfoDrop] LLM pipeline processed: {text[:50]}")
            return result
        except Exception as e:
            logger.warning(f"[InfoDrop] LLM pipeline failed, falling back: {e}")

    # Fallback to keyword-based info drop
    graph = load_graph()
    new_id = f"info-{uuid.uuid4().hex[:8]}"

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

    ripple_target = related_nodes[0]["id"] if related_nodes else ""

    return {
        "unit": unit,
        "new_edges": new_edges[:10],
        "ripple_target": ripple_target,
    }
