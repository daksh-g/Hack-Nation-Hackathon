import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'mock_data')

_cache: dict[str, object] = {}


def _load_json(filename: str, default: object):
    if filename in _cache:
        return _cache[filename]
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path) as f:
            data = json.load(f)
        _cache[filename] = data
        return data
    return default


def load_graph() -> dict:
    return _load_json('graph.json', {
        "nodes": [], "edges": [],
        "metadata": {"generated_at": "", "node_count": 0, "edge_count": 0, "company_name": "Meridian Technologies"}
    })


def load_hierarchy() -> dict:
    return _load_json('hierarchy.json', {
        "enterprise": {"id": "meridian", "name": "Meridian Technologies", "health": "yellow", "divisions": []}
    })


def load_alerts() -> list:
    data = _load_json('alerts.json', [])
    # alerts.json is a plain list
    if isinstance(data, dict):
        return data.get("alerts", [])
    return data


def load_ask_cache() -> dict:
    return _load_json('ask_cache.json', {"queries": {}})


def get_node_by_id(node_id: str):
    graph = load_graph()
    for node in graph.get("nodes", []):
        if node["id"] == node_id:
            edges = [e for e in graph.get("edges", []) if e["source"] == node_id or e["target"] == node_id]
            connected_ids = set()
            for e in edges:
                connected_ids.add(e["source"])
                connected_ids.add(e["target"])
            connected_ids.discard(node_id)
            connected_nodes = [n for n in graph["nodes"] if n["id"] in connected_ids]
            return {"node": node, "edges": edges, "connected_nodes": connected_nodes}
    return None
