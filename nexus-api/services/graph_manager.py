"""Module 2: Information Tracking — Graph mutation engine with dedup, versioning, and provenance."""

import uuid
import math
import logging
from datetime import datetime
from .graph_store import load_graph

logger = logging.getLogger("nexus.graph_manager")

# In-memory graph state (simulates a real graph database)
_graph_state: dict | None = None
_history: list[dict] = []  # Mutation log


def _ensure_state():
    global _graph_state
    if _graph_state is None:
        _graph_state = load_graph()


def get_graph_state() -> dict:
    _ensure_state()
    return _graph_state


def upsert_node(node_data: dict) -> tuple[str, bool]:
    """Create or update a node. Returns (node_id, is_new)."""
    _ensure_state()
    nodes = _graph_state["nodes"]
    node_id = node_data.get("id") or f"{node_data.get('type', 'node')}-{uuid.uuid4().hex[:8]}"

    # Check for existing
    existing = next((n for n in nodes if n["id"] == node_id), None)
    if existing:
        # Merge: update fields, preserve provenance
        for key, value in node_data.items():
            if value is not None and key != "id":
                existing[key] = value
        _record_mutation("update_node", node_id, node_data)
        logger.info(f"[GraphManager] Updated node {node_id}")
        return node_id, False

    # Create new
    node_data["id"] = node_id
    node_data.setdefault("created_at", datetime.now().isoformat())
    node_data.setdefault("freshness_score", 1.0)
    nodes.append(node_data)
    _record_mutation("create_node", node_id, node_data)
    logger.info(f"[GraphManager] Created node {node_id}")

    # Update metadata
    _graph_state["metadata"]["node_count"] = len(nodes)
    return node_id, True


def upsert_edge(source: str, target: str, edge_type: str, metadata: dict | None = None) -> str:
    """Create or update an edge."""
    _ensure_state()
    edges = _graph_state["edges"]
    metadata = metadata or {}

    # Check for existing edge
    existing = next(
        (e for e in edges if e["source"] == source and e["target"] == target and e["type"] == edge_type),
        None,
    )
    if existing:
        existing.update(metadata)
        _record_mutation("update_edge", existing["id"], metadata)
        return existing["id"]

    edge_id = f"edge-{uuid.uuid4().hex[:8]}"
    edge = {
        "id": edge_id,
        "source": source,
        "target": target,
        "type": edge_type,
        **metadata,
    }
    edges.append(edge)
    _graph_state["metadata"]["edge_count"] = len(edges)
    _record_mutation("create_edge", edge_id, edge)
    logger.info(f"[GraphManager] Created edge {edge_id}: {source} --[{edge_type}]--> {target}")
    return edge_id


def supersede_node(old_id: str, new_id: str):
    """Mark old knowledge unit as superseded by new one."""
    _ensure_state()
    nodes_by_id = {n["id"]: n for n in _graph_state["nodes"]}

    old = nodes_by_id.get(old_id)
    if old:
        old["status"] = "superseded"

    upsert_edge(new_id, old_id, "SUPERSEDES")
    _record_mutation("supersede", old_id, {"superseded_by": new_id})
    logger.info(f"[GraphManager] {old_id} superseded by {new_id}")


def compute_freshness():
    """Recompute freshness scores for all knowledge units using half-life decay."""
    _ensure_state()
    now = datetime.now()

    for node in _graph_state["nodes"]:
        if node.get("type") in ("decision", "fact", "commitment", "question"):
            created_str = node.get("created_at")
            half_life = node.get("half_life_days", 14)
            if created_str and half_life:
                try:
                    created = datetime.fromisoformat(created_str.replace("Z", "+00:00").replace("+00:00", ""))
                except (ValueError, TypeError):
                    continue
                age_days = (now - created).total_seconds() / 86400
                freshness = math.pow(2, -age_days / half_life)
                node["freshness_score"] = round(freshness, 3)

    logger.info("[GraphManager] Recomputed freshness scores")


def get_node_history(node_id: str) -> list[dict]:
    """Get mutation history for a specific node."""
    return [m for m in _history if m.get("node_id") == node_id]


def get_provenance(node_id: str) -> dict | None:
    """Get provenance information for a node."""
    _ensure_state()
    node = next((n for n in _graph_state["nodes"] if n["id"] == node_id), None)
    if not node:
        return None
    return {
        "node_id": node_id,
        "source_type": node.get("source_type"),
        "source_id": node.get("source_id"),
        "created_at": node.get("created_at"),
        "freshness_score": node.get("freshness_score"),
        "status": node.get("status"),
        "history": get_node_history(node_id),
    }


def _record_mutation(action: str, node_id: str, data: dict):
    _history.append({
        "action": action,
        "node_id": node_id,
        "data": data,
        "timestamp": datetime.now().isoformat(),
    })
