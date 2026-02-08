"""Module 2: Information Tracking — Graph mutation engine with Supabase persistence."""

import json
import uuid
import math
import logging
from datetime import datetime

from .graph_store import load_graph, invalidate_cache, NODE_COLUMNS, EDGE_COLUMNS

logger = logging.getLogger("nexus.graph_manager")


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------
def _supabase_available() -> bool:
    try:
        from .supabase_client import is_supabase_configured
        return is_supabase_configured()
    except Exception:
        return False


def _get_sb():
    from .supabase_client import get_supabase
    return get_supabase()


def _split_node_for_db(node_data: dict) -> dict:
    """Split a flat node dict into columns + extras for the DB schema."""
    row = {}
    extras = {}
    for key, value in node_data.items():
        if value is None:
            continue
        if key in NODE_COLUMNS:
            row[key] = value
        else:
            extras[key] = value
    if extras:
        row["extras"] = extras
    return row


def _split_edge_for_db(edge_data: dict) -> dict:
    """Split a flat edge dict into columns + extras for the DB schema."""
    row = {}
    extras = {}
    for key, value in edge_data.items():
        if value is None:
            continue
        if key in EDGE_COLUMNS:
            row[key] = value
        else:
            extras[key] = value
    if extras:
        row["extras"] = extras
    return row


def _record_mutation(action: str, node_id: str, data: dict):
    """Record a mutation to Supabase mutation_history, falling back to in-memory."""
    entry = {
        "action": action,
        "node_id": node_id,
        "data": data,
    }
    if _supabase_available():
        try:
            sb = _get_sb()
            sb.table("mutation_history").insert(entry).execute()
            return
        except Exception as exc:
            logger.warning("[GraphManager] Failed to record mutation to DB: %s", exc)

    # Fallback: in-memory
    _history.append({**entry, "timestamp": datetime.now().isoformat()})


# In-memory fallback state
_graph_state: dict | None = None
_history: list[dict] = []


def _ensure_state():
    global _graph_state
    if _graph_state is None:
        _graph_state = load_graph()


def get_graph_state() -> dict:
    """Return the current graph (from Supabase via graph_store, or in-memory)."""
    _ensure_state()
    return _graph_state


def upsert_node(node_data: dict) -> tuple[str, bool]:
    """Create or update a node. Returns (node_id, is_new).

    Persists to Supabase if available, otherwise falls back to in-memory.
    """
    node_id = node_data.get("id") or f"{node_data.get('type', 'node')}-{uuid.uuid4().hex[:8]}"
    node_data["id"] = node_id

    if _supabase_available():
        try:
            sb = _get_sb()

            # Check if node exists
            existing = sb.table("nodes").select("id").eq("id", node_id).execute()
            is_new = not existing.data

            # Prepare row
            node_data.setdefault("created_at", datetime.now().isoformat())
            node_data.setdefault("freshness_score", 1.0)
            node_data["updated_at"] = datetime.now().isoformat()
            row = _split_node_for_db(node_data)

            sb.table("nodes").upsert(row).execute()
            invalidate_cache()

            action = "create_node" if is_new else "update_node"
            _record_mutation(action, node_id, node_data)
            logger.info("[GraphManager] %s node %s (Supabase)", action, node_id)
            return node_id, is_new

        except Exception as exc:
            logger.warning("[GraphManager] Supabase upsert_node failed, using in-memory: %s", exc)

    # Fallback: in-memory
    _ensure_state()
    nodes = _graph_state["nodes"]
    existing = next((n for n in nodes if n["id"] == node_id), None)

    if existing:
        for key, value in node_data.items():
            if value is not None and key != "id":
                existing[key] = value
        _record_mutation("update_node", node_id, node_data)
        logger.info("[GraphManager] Updated node %s (in-memory)", node_id)
        return node_id, False

    node_data.setdefault("created_at", datetime.now().isoformat())
    node_data.setdefault("freshness_score", 1.0)
    nodes.append(node_data)
    _graph_state["metadata"]["node_count"] = len(nodes)
    _record_mutation("create_node", node_id, node_data)
    logger.info("[GraphManager] Created node %s (in-memory)", node_id)
    return node_id, True


def upsert_edge(source: str, target: str, edge_type: str, metadata: dict | None = None) -> str:
    """Create or update an edge. Returns edge_id.

    Persists to Supabase if available, otherwise falls back to in-memory.
    """
    metadata = metadata or {}

    if _supabase_available():
        try:
            sb = _get_sb()

            # Check for existing edge (source, target, type) is unique
            existing = (
                sb.table("edges")
                .select("id")
                .eq("source", source)
                .eq("target", target)
                .eq("type", edge_type)
                .execute()
            )

            if existing.data:
                edge_id = existing.data[0]["id"]
                row = _split_edge_for_db(metadata)
                if row:
                    sb.table("edges").update(row).eq("id", edge_id).execute()
                _record_mutation("update_edge", edge_id, metadata)
                invalidate_cache()
                return edge_id

            # Create new edge
            edge_id = f"edge-{uuid.uuid4().hex[:8]}"
            edge_data = {
                "id": edge_id,
                "source": source,
                "target": target,
                "type": edge_type,
                **metadata,
            }
            row = _split_edge_for_db(edge_data)
            sb.table("edges").insert(row).execute()
            invalidate_cache()

            _record_mutation("create_edge", edge_id, edge_data)
            logger.info("[GraphManager] Created edge %s: %s --[%s]--> %s (Supabase)",
                        edge_id, source, edge_type, target)
            return edge_id

        except Exception as exc:
            logger.warning("[GraphManager] Supabase upsert_edge failed, using in-memory: %s", exc)

    # Fallback: in-memory
    _ensure_state()
    edges = _graph_state["edges"]
    existing = next(
        (e for e in edges if e["source"] == source and e["target"] == target and e["type"] == edge_type),
        None,
    )
    if existing:
        existing.update(metadata)
        _record_mutation("update_edge", existing["id"], metadata)
        return existing["id"]

    edge_id = f"edge-{uuid.uuid4().hex[:8]}"
    edge = {"id": edge_id, "source": source, "target": target, "type": edge_type, **metadata}
    edges.append(edge)
    _graph_state["metadata"]["edge_count"] = len(edges)
    _record_mutation("create_edge", edge_id, edge)
    logger.info("[GraphManager] Created edge %s: %s --[%s]--> %s (in-memory)",
                edge_id, source, edge_type, target)
    return edge_id


def supersede_node(old_id: str, new_id: str):
    """Mark old knowledge unit as superseded by new one."""
    if _supabase_available():
        try:
            sb = _get_sb()
            sb.table("nodes").update({"status": "superseded", "updated_at": datetime.now().isoformat()}).eq("id", old_id).execute()
            upsert_edge(new_id, old_id, "SUPERSEDES")
            _record_mutation("supersede", old_id, {"superseded_by": new_id})
            invalidate_cache()
            logger.info("[GraphManager] %s superseded by %s (Supabase)", old_id, new_id)
            return
        except Exception as exc:
            logger.warning("[GraphManager] Supabase supersede failed: %s", exc)

    # Fallback
    _ensure_state()
    nodes_by_id = {n["id"]: n for n in _graph_state["nodes"]}
    old = nodes_by_id.get(old_id)
    if old:
        old["status"] = "superseded"
    upsert_edge(new_id, old_id, "SUPERSEDES")
    _record_mutation("supersede", old_id, {"superseded_by": new_id})
    logger.info("[GraphManager] %s superseded by %s (in-memory)", old_id, new_id)


def compute_freshness():
    """Recompute freshness scores for all knowledge units using half-life decay."""
    now = datetime.now()

    if _supabase_available():
        try:
            sb = _get_sb()
            result = (
                sb.table("nodes")
                .select("id, type, created_at, freshness_score, half_life_days")
                .in_("type", ["decision", "fact", "commitment", "question"])
                .execute()
            )

            updates = []
            for node in (result.data or []):
                created_str = node.get("created_at")
                half_life = node.get("half_life_days", 14)
                if created_str and half_life:
                    try:
                        created = datetime.fromisoformat(created_str.replace("Z", "+00:00").replace("+00:00", ""))
                    except (ValueError, TypeError):
                        continue
                    age_days = (now - created).total_seconds() / 86400
                    freshness = round(math.pow(2, -age_days / half_life), 3)
                    if freshness != node.get("freshness_score"):
                        updates.append({"id": node["id"], "freshness_score": freshness, "updated_at": now.isoformat()})

            # Batch update in groups of 50
            for i in range(0, len(updates), 50):
                batch = updates[i:i + 50]
                for u in batch:
                    sb.table("nodes").update({"freshness_score": u["freshness_score"], "updated_at": u["updated_at"]}).eq("id", u["id"]).execute()

            invalidate_cache()
            logger.info("[GraphManager] Recomputed freshness for %d nodes (Supabase)", len(updates))
            return

        except Exception as exc:
            logger.warning("[GraphManager] Supabase freshness update failed: %s", exc)

    # Fallback
    _ensure_state()
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

    logger.info("[GraphManager] Recomputed freshness scores (in-memory)")


def get_node_history(node_id: str) -> list[dict]:
    """Get mutation history for a specific node."""
    if _supabase_available():
        try:
            sb = _get_sb()
            result = (
                sb.table("mutation_history")
                .select("*")
                .eq("node_id", node_id)
                .order("created_at", desc=True)
                .limit(50)
                .execute()
            )
            return result.data or []
        except Exception as exc:
            logger.warning("[GraphManager] Failed to load history from DB: %s", exc)

    return [m for m in _history if m.get("node_id") == node_id]


def get_provenance(node_id: str) -> dict | None:
    """Get provenance information for a node."""
    if _supabase_available():
        try:
            sb = _get_sb()
            result = sb.table("nodes").select("*").eq("id", node_id).execute()
            if not result.data:
                return None
            node = result.data[0]
            extras = node.pop("extras", {}) or {}
            node.update(extras)
            history = get_node_history(node_id)
            return {
                "node_id": node_id,
                "source_type": node.get("source_type"),
                "source_id": node.get("source_id"),
                "created_at": node.get("created_at"),
                "freshness_score": node.get("freshness_score"),
                "status": node.get("status"),
                "history": history,
            }
        except Exception as exc:
            logger.warning("[GraphManager] Failed to load provenance from DB: %s", exc)

    # Fallback
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
