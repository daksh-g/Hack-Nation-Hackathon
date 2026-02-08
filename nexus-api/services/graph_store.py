"""Graph data store — reads from Supabase with in-memory cache, falls back to mock JSON."""

import json
import os
import logging
from datetime import datetime

logger = logging.getLogger("nexus.graph_store")

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'mock_data')

# ---------------------------------------------------------------------------
# In-memory cache
# ---------------------------------------------------------------------------
_cache: dict[str, object] = {}


def invalidate_cache():
    """Clear the in-memory cache so the next read re-fetches from Supabase."""
    _cache.clear()
    logger.info("[GraphStore] Cache invalidated")


# ---------------------------------------------------------------------------
# Column definitions — everything NOT in these sets goes into/comes from extras
# ---------------------------------------------------------------------------
NODE_COLUMNS = {
    "id", "type", "label", "division", "department", "team",
    "health", "size", "x", "y", "status", "freshness_score",
    "half_life_days", "source_type", "source_id", "created_at", "updated_at",
}

EDGE_COLUMNS = {
    "id", "source", "target", "type", "weight", "animated",
    "label", "interaction_type", "created_at",
}


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------
def _supabase_available() -> bool:
    """Check if Supabase is configured without importing at module level."""
    try:
        from .supabase_client import is_supabase_configured
        return is_supabase_configured()
    except Exception:
        return False


def _get_sb():
    from .supabase_client import get_supabase
    return get_supabase()


def _flatten_node(row: dict) -> dict:
    """Merge the extras JSONB column back into a flat node dict."""
    node = {}
    extras = row.pop("extras", None) or {}
    for key, value in row.items():
        if value is not None:
            node[key] = value
    # Extras fields override nothing already set (they are type-specific)
    for key, value in extras.items():
        if key not in node:
            node[key] = value
    return node


def _flatten_edge(row: dict) -> dict:
    """Merge the extras JSONB column back into a flat edge dict."""
    edge = {}
    extras = row.pop("extras", None) or {}
    for key, value in row.items():
        if value is not None:
            edge[key] = value
    for key, value in extras.items():
        if key not in edge:
            edge[key] = value
    return edge


# ---------------------------------------------------------------------------
# Mock-data fallback
# ---------------------------------------------------------------------------
def _load_json(filename: str, default: object):
    """Load a JSON file from the mock_data directory."""
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return default


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_graph() -> dict:
    """Return the full graph: {nodes, edges, metadata}.

    Tries Supabase first, falls back to mock_data/graph.json.
    Results are cached in-memory until invalidate_cache() is called.
    """
    if "graph" in _cache:
        return _cache["graph"]

    if _supabase_available():
        try:
            sb = _get_sb()

            # --- nodes ---
            node_result = sb.table("nodes").select("*").execute()
            nodes = [_flatten_node(row) for row in (node_result.data or [])]

            # --- edges ---
            edge_result = sb.table("edges").select("*").execute()
            edges = [_flatten_edge(row) for row in (edge_result.data or [])]

            # --- metadata ---
            meta_result = sb.table("graph_metadata").select("*").execute()
            if meta_result.data:
                metadata = meta_result.data[0]
            else:
                metadata = {
                    "generated_at": datetime.now().isoformat(),
                    "node_count": len(nodes),
                    "edge_count": len(edges),
                    "company_name": "Meridian Technologies",
                }

            graph = {"nodes": nodes, "edges": edges, "metadata": metadata}
            _cache["graph"] = graph
            logger.info(
                "[GraphStore] Loaded graph from Supabase: %d nodes, %d edges",
                len(nodes), len(edges),
            )
            return graph

        except Exception as exc:
            logger.warning("[GraphStore] Supabase load failed, falling back to JSON: %s", exc)

    # Fallback to mock JSON
    graph = _load_json("graph.json", {
        "nodes": [], "edges": [],
        "metadata": {
            "generated_at": "",
            "node_count": 0,
            "edge_count": 0,
            "company_name": "Meridian Technologies",
        },
    })
    _cache["graph"] = graph
    logger.info("[GraphStore] Loaded graph from mock JSON")
    return graph


def load_hierarchy() -> dict:
    """Build the enterprise hierarchy from node data.

    Groups nodes by division -> department -> team and attaches member lists.
    Tries Supabase (via load_graph), falls back to mock_data/hierarchy.json.

    Returns: {"enterprise": {"id": ..., "name": ..., "health": ..., "divisions": [...]}}
    """
    if "hierarchy" in _cache:
        return _cache["hierarchy"]

    graph = load_graph()
    nodes = graph.get("nodes", [])

    # If we have no nodes at all, fall back to the static hierarchy file
    if not nodes:
        hierarchy = _load_json("hierarchy.json", {
            "enterprise": {
                "id": "meridian",
                "name": "Meridian Technologies",
                "health": "yellow",
                "divisions": [],
            }
        })
        _cache["hierarchy"] = hierarchy
        return hierarchy

    # ---- Build hierarchy from flat node list ----
    # Collect divisions, departments, teams, and members
    divisions: dict[str, dict] = {}     # division_id -> div info
    departments: dict[str, dict] = {}   # dept_id -> dept info
    teams: dict[str, dict] = {}         # team_id -> team info
    members_by_team: dict[str, list[str]] = {}      # team_id -> [node_ids]
    edges_by_team: dict[str, list[str]] = {}         # team_id -> [edge_ids]

    # Health aggregation: track worst health per grouping
    health_order = {"red": 0, "orange": 1, "yellow": 2, "green": 3}

    def worst_health(a: str, b: str) -> str:
        return a if health_order.get(a, 3) < health_order.get(b, 3) else b

    # First pass: identify teams and their properties
    for node in nodes:
        node_type = node.get("type", "")
        division = node.get("division", "")
        department = node.get("department", "")
        team_id = node.get("team", "")
        node_health = node.get("health", "green")

        if not division:
            continue

        # Ensure division exists
        div_key = division
        if div_key not in divisions:
            divisions[div_key] = {
                "id": f"div-{division.lower().replace(' ', '-')}",
                "name": division,
                "health": "green",
                "node_count": 0,
                "alert_count": 0,
                "departments": {},
            }
        divisions[div_key]["node_count"] += 1
        divisions[div_key]["health"] = worst_health(divisions[div_key]["health"], node_health)

        # Ensure department exists
        if department:
            if department not in departments:
                departments[department] = {
                    "id": department,
                    "name": department.replace("dept-", "").replace("-", " ").title(),
                    "health": "green",
                    "division": div_key,
                    "teams": {},
                }
            departments[department]["health"] = worst_health(
                departments[department]["health"], node_health
            )

        # If this node IS a team node, register it
        if node_type == "team":
            tid = node.get("id", "")
            if tid:
                teams[tid] = {
                    "id": tid,
                    "name": node.get("label", tid),
                    "health": node_health,
                    "department": department,
                    "division": div_key,
                }
                members_by_team.setdefault(tid, [])
                edges_by_team.setdefault(tid, [])
                # Link team into its department
                if department and department in departments:
                    departments[department]["teams"][tid] = True

        # If this node is a member of a team, record membership
        if node_type in ("person", "agent") and team_id:
            members_by_team.setdefault(team_id, []).append(node.get("id", ""))

    # Collect edges per team
    for edge in graph.get("edges", []):
        eid = edge.get("id", "")
        src = edge.get("source", "")
        tgt = edge.get("target", "")
        # An edge belongs to a team if either endpoint is a member or IS the team
        for team_id, member_list in members_by_team.items():
            if src == team_id or tgt == team_id or src in member_list or tgt in member_list:
                edges_by_team.setdefault(team_id, []).append(eid)

    # Assemble final hierarchy
    division_list = []
    for div_key, div_info in sorted(divisions.items()):
        dept_list = []
        for dept_id, dept_info in sorted(departments.items()):
            if dept_info["division"] != div_key:
                continue
            team_list = []
            for tid in sorted(dept_info["teams"].keys()):
                t = teams.get(tid, {"id": tid, "name": tid, "health": "green"})
                team_list.append({
                    "id": t["id"],
                    "name": t["name"],
                    "health": t["health"],
                    "members": members_by_team.get(tid, []),
                    "edges": list(set(edges_by_team.get(tid, []))),
                })
            dept_list.append({
                "id": dept_info["id"],
                "name": dept_info["name"],
                "health": dept_info["health"],
                "teams": team_list,
            })
        division_list.append({
            "id": div_info["id"],
            "name": div_info["name"],
            "health": div_info["health"],
            "node_count": div_info["node_count"],
            "alert_count": div_info["alert_count"],
            "departments": dept_list,
        })

    enterprise_health = "green"
    for d in division_list:
        enterprise_health = worst_health(enterprise_health, d["health"])

    hierarchy = {
        "enterprise": {
            "id": "enterprise-meridian",
            "name": "Meridian Technologies",
            "health": enterprise_health,
            "divisions": division_list,
        }
    }
    _cache["hierarchy"] = hierarchy
    logger.info("[GraphStore] Built hierarchy from node data: %d divisions", len(division_list))
    return hierarchy


def load_alerts() -> list:
    """Return the list of alerts.

    Tries Supabase `alerts` table first, falls back to mock_data/alerts.json.
    """
    if "alerts" in _cache:
        return _cache["alerts"]

    if _supabase_available():
        try:
            sb = _get_sb()
            result = sb.table("alerts").select("*").execute()
            alerts = result.data or []
            _cache["alerts"] = alerts
            logger.info("[GraphStore] Loaded %d alerts from Supabase", len(alerts))
            return alerts
        except Exception as exc:
            logger.warning("[GraphStore] Supabase alerts load failed: %s", exc)

    # Fallback
    data = _load_json("alerts.json", [])
    if isinstance(data, dict):
        data = data.get("alerts", [])
    _cache["alerts"] = data
    logger.info("[GraphStore] Loaded alerts from mock JSON")
    return data


def load_ask_cache() -> dict:
    """Return the ask cache: {"queries": {...}}.

    Tries Supabase `ask_cache` table first, falls back to mock_data/ask_cache.json.
    """
    if "ask_cache" in _cache:
        return _cache["ask_cache"]

    if _supabase_available():
        try:
            sb = _get_sb()
            result = sb.table("ask_cache").select("*").execute()
            rows = result.data or []
            # Reconstruct the queries dict keyed by the query string
            queries = {}
            for row in rows:
                query_key = row.get("query", "")
                if query_key:
                    queries[query_key] = row.get("response", row)
            ask_cache = {"queries": queries}
            _cache["ask_cache"] = ask_cache
            logger.info("[GraphStore] Loaded %d ask_cache entries from Supabase", len(queries))
            return ask_cache
        except Exception as exc:
            logger.warning("[GraphStore] Supabase ask_cache load failed: %s", exc)

    # Fallback
    ask_cache = _load_json("ask_cache.json", {"queries": {}})
    _cache["ask_cache"] = ask_cache
    logger.info("[GraphStore] Loaded ask_cache from mock JSON")
    return ask_cache


def get_node_by_id(node_id: str):
    """Return a specific node with its edges and connected nodes, or None."""
    graph = load_graph()
    for node in graph.get("nodes", []):
        if node["id"] == node_id:
            edges = [
                e for e in graph.get("edges", [])
                if e["source"] == node_id or e["target"] == node_id
            ]
            connected_ids = set()
            for e in edges:
                connected_ids.add(e["source"])
                connected_ids.add(e["target"])
            connected_ids.discard(node_id)
            connected_nodes = [n for n in graph["nodes"] if n["id"] in connected_ids]
            return {"node": node, "edges": edges, "connected_nodes": connected_nodes}
    return None
