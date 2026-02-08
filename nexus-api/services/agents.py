"""Immune system agents — detect organizational anomalies from graph data."""


def detect_contradictions(graph_data: dict) -> list:
    """Find nodes connected by CONTRADICTS edges."""
    edges = graph_data.get("edges", [])
    nodes_map = {n["id"]: n for n in graph_data.get("nodes", [])}

    results = []
    for e in edges:
        if e["type"] == "CONTRADICTS":
            src = nodes_map.get(e["source"])
            tgt = nodes_map.get(e["target"])
            if src and tgt:
                results.append({
                    "type": "contradiction",
                    "nodes": [src, tgt],
                    "detail": f'"{src["label"]}" contradicts "{tgt["label"]}"',
                    "severity": "critical",
                })
    return results


def detect_stale_context(graph_data: dict) -> list:
    """Find nodes with low freshness scores."""
    results = []
    for node in graph_data.get("nodes", []):
        score = node.get("freshness_score")
        if score is not None and score < 0.4:
            results.append({
                "type": "staleness",
                "node": node,
                "freshness_score": score,
                "detail": f'"{node["label"]}" has freshness {score:.0%}',
                "severity": "warning" if score > 0.2 else "critical",
            })
    return results


def detect_silos(graph_data: dict) -> list:
    """Find divisions with few cross-division edges."""
    edges = graph_data.get("edges", [])
    nodes_map = {n["id"]: n for n in graph_data.get("nodes", [])}

    # Count cross-division communication edges
    division_pairs: dict[tuple, int] = {}
    for e in edges:
        if e["type"] in ("COMMUNICATES_WITH", "HANDOFF", "CONTEXT_FEEDS"):
            src = nodes_map.get(e["source"])
            tgt = nodes_map.get(e["target"])
            if src and tgt:
                d1 = src.get("division", "")
                d2 = tgt.get("division", "")
                if d1 and d2 and d1 != d2:
                    pair = tuple(sorted([d1, d2]))
                    division_pairs[pair] = division_pairs.get(pair, 0) + 1

    # Divisions with zero or very few cross-connections
    all_divisions = {n.get("division") for n in graph_data.get("nodes", []) if n.get("division")}
    results = []

    for d1 in all_divisions:
        connections = sum(v for k, v in division_pairs.items() if d1 in k)
        if connections < 2:
            results.append({
                "type": "silo",
                "division": d1,
                "cross_connections": connections,
                "detail": f"{d1} has only {connections} cross-division communication edges",
                "severity": "warning",
            })

    return results


def detect_overload(graph_data: dict) -> list:
    """Find people with high cognitive load."""
    results = []
    for node in graph_data.get("nodes", []):
        if node["type"] == "person":
            load = node.get("cognitive_load")
            if load is not None and load > 0.8:
                results.append({
                    "type": "overload",
                    "node": node,
                    "cognitive_load": load,
                    "detail": f'{node["label"]} has cognitive load {load:.0%}',
                    "severity": "critical" if load > 0.9 else "warning",
                })
    return results


def detect_coordination_issues(graph_data: dict) -> list:
    """Find human-AI pairs with misalignment signals."""
    edges = graph_data.get("edges", [])
    nodes_map = {n["id"]: n for n in graph_data.get("nodes", [])}

    results = []
    for e in edges:
        if e["type"] == "SUPERVISED_BY":
            agent = nodes_map.get(e["source"])
            human = nodes_map.get(e["target"])
            if agent and human:
                # Check if agent trust level is low or review_required
                if agent.get("trust_level") == "review_required":
                    results.append({
                        "type": "coordination",
                        "agent": agent,
                        "human": human,
                        "detail": f'{agent["label"]} requires review by {human["label"]}',
                        "severity": "warning",
                    })
    return results
