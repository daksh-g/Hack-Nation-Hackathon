import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'mock_data')

def load_graph():
    path = os.path.join(DATA_DIR, 'graph.json')
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {"nodes": [], "edges": [], "metadata": {"generated_at": "", "node_count": 0, "edge_count": 0, "company_name": "Meridian Technologies"}}

def load_hierarchy():
    path = os.path.join(DATA_DIR, 'hierarchy.json')
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {"enterprise": {"id": "meridian", "name": "Meridian Technologies", "health": "yellow", "divisions": []}}

def load_alerts():
    path = os.path.join(DATA_DIR, 'alerts.json')
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {"alerts": []}

def load_ask_cache():
    path = os.path.join(DATA_DIR, 'ask_cache.json')
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {"queries": {}}

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
