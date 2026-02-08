"""Builds prompt-friendly context from the knowledge graph."""

from ..graph_store import load_graph, load_alerts, load_hierarchy


class ContextBuilder:
    def __init__(self):
        self._graph = None
        self._alerts = None

    async def _ensure_loaded(self):
        if self._graph is None:
            self._graph = load_graph()
        if self._alerts is None:
            self._alerts = load_alerts()

    def _get_graph(self):
        if self._graph is None:
            self._graph = load_graph()
        return self._graph

    def _get_alerts(self):
        if self._alerts is None:
            self._alerts = load_alerts()
        return self._alerts

    def build_org_summary(self) -> dict:
        """Return org metadata for prompt template formatting."""
        g = self._get_graph()
        nodes = g.get("nodes", [])
        people = [n for n in nodes if n.get("type") == "person"]
        agents = [n for n in nodes if n.get("type") == "agent"]
        divisions = set(n.get("division") for n in nodes if n.get("division"))
        return {
            "company_name": g.get("metadata", {}).get("company_name", "Meridian Technologies"),
            "node_count": len(nodes),
            "edge_count": len(g.get("edges", [])),
            "person_count": len(people),
            "agent_count": len(agents),
            "division_count": len(divisions),
        }

    def build_org_context(self) -> str:
        """Full org context as natural language for system prompts."""
        g = self._get_graph()
        nodes = g.get("nodes", [])
        edges = g.get("edges", [])
        meta = g.get("metadata", {})

        lines = [
            f"Company: {meta.get('company_name', 'Meridian Technologies')}",
            f"Knowledge graph: {len(nodes)} nodes, {len(edges)} edges",
            "",
            "== PEOPLE ==",
        ]
        for n in nodes:
            if n.get("type") == "person":
                load = n.get("cognitive_load", 0)
                lines.append(
                    f"- {n['label']} (ID: {n['id']}) | {n.get('role', '?')} | "
                    f"{n.get('division', '?')} | Load: {int(load*100) if isinstance(load, float) and load <= 1 else load}% | "
                    f"Commitments: {n.get('active_commitments', '?')}"
                )

        lines.append("\n== AI AGENTS ==")
        for n in nodes:
            if n.get("type") == "agent":
                lines.append(
                    f"- {n['label']} (ID: {n['id']}) | {n.get('agent_type', '?')} | "
                    f"Trust: {n.get('trust_level', '?')} | Supervisor: {n.get('supervising_human', '?')} | "
                    f"Tasks: {', '.join(n.get('active_tasks', []))}"
                )

        lines.append("\n== KEY KNOWLEDGE UNITS ==")
        for n in nodes:
            if n.get("type") in ("decision", "fact", "commitment", "question"):
                lines.append(
                    f"- [{n['type'].upper()}] {n['label']} (ID: {n['id']}) | "
                    f"Division: {n.get('division', '?')} | Status: {n.get('status', '?')} | "
                    f"Freshness: {n.get('freshness_score', '?')} | Blast: {n.get('blast_radius', '?')}"
                )
                if n.get("content") and n["content"] != n["label"]:
                    lines.append(f"  Content: {n['content'][:200]}")

        lines.append("\n== EDGES (key relationships) ==")
        # Include most important edges
        important_types = {"CONTRADICTS", "SUPERSEDES", "BLOCKS", "DEPENDS_ON", "DELEGATES_TO"}
        for e in edges:
            if e.get("type") in important_types:
                lines.append(f"- {e['source']} --[{e['type']}]--> {e['target']}")

        # Also include communication edges
        comm_edges = [e for e in edges if e.get("type") == "COMMUNICATES_WITH"]
        if comm_edges:
            lines.append("\n== COMMUNICATION CHANNELS ==")
            for e in comm_edges:
                lines.append(f"- {e['source']} <-> {e['target']} (weight: {e.get('weight', '?')})")

        return "\n".join(lines)

    def build_people_list(self) -> str:
        """Compact list of all people for entity matching."""
        g = self._get_graph()
        people = [n for n in g.get("nodes", []) if n.get("type") == "person"]
        return "\n".join(f"- {n['label']} (ID: {n['id']}, {n.get('role', '?')}, {n.get('division', '?')})" for n in people)

    def build_agents_list(self) -> str:
        """Compact list of all AI agents."""
        g = self._get_graph()
        agents = [n for n in g.get("nodes", []) if n.get("type") == "agent"]
        return "\n".join(f"- {n['label']} (ID: {n['id']}, {n.get('agent_type', '?')}, {n.get('division', '?')})" for n in agents)

    def build_alerts_context(self) -> str:
        """Format active alerts as context string."""
        alerts = self._get_alerts()
        if not alerts:
            return "No active alerts."
        lines = []
        for a in alerts:
            if not a.get("resolved"):
                lines.append(
                    f"- [{a.get('severity', '?').upper()}] [{a.get('agent', '?')}] {a.get('headline', '?')} | "
                    f"Scope: {a.get('scope', '?')} | Affected: {', '.join(a.get('affected_node_ids', []))}"
                )
                if a.get("detail"):
                    lines.append(f"  Detail: {a['detail'][:200]}")
        return "\n".join(lines) if lines else "No active alerts."

    def build_node_context(self, node_id: str, depth: int = 2) -> str:
        """Build context around a specific node including N-hop neighbors."""
        g = self._get_graph()
        nodes_by_id = {n["id"]: n for n in g.get("nodes", [])}
        edges = g.get("edges", [])

        if node_id not in nodes_by_id:
            return f"Node {node_id} not found."

        # BFS to find neighbors
        visited = {node_id}
        frontier = {node_id}
        for _ in range(depth):
            next_frontier = set()
            for e in edges:
                if e["source"] in frontier and e["target"] not in visited:
                    next_frontier.add(e["target"])
                    visited.add(e["target"])
                if e["target"] in frontier and e["source"] not in visited:
                    next_frontier.add(e["source"])
                    visited.add(e["source"])
            frontier = next_frontier

        lines = [f"== Context around {nodes_by_id[node_id].get('label', node_id)} =="]
        for nid in visited:
            n = nodes_by_id.get(nid)
            if n:
                lines.append(f"- {n['label']} (ID: {n['id']}, type: {n['type']}, division: {n.get('division', '?')})")
                if n.get("content"):
                    lines.append(f"  Content: {n['content'][:150]}")

        # Relevant edges
        lines.append("\nRelationships:")
        for e in edges:
            if e["source"] in visited and e["target"] in visited:
                lines.append(f"- {e['source']} --[{e['type']}]--> {e['target']}")

        return "\n".join(lines)

    def build_person_context(self, person_id: str) -> str:
        """Build detailed context for a specific person."""
        g = self._get_graph()
        nodes_by_id = {n["id"]: n for n in g.get("nodes", [])}
        edges = g.get("edges", [])

        person = nodes_by_id.get(person_id)
        if not person:
            return f"Person {person_id} not found."

        # Find connected nodes
        connected = []
        for e in edges:
            if e["source"] == person_id:
                target = nodes_by_id.get(e["target"])
                if target:
                    connected.append((e["type"], target))
            elif e["target"] == person_id:
                source = nodes_by_id.get(e["source"])
                if source:
                    connected.append((e["type"], source))

        lines = [
            f"Person: {person['label']}",
            f"Role: {person.get('role', '?')}",
            f"Division: {person.get('division', '?')}",
            f"Cognitive Load: {person.get('cognitive_load', '?')}",
            f"Active Commitments: {person.get('active_commitments', '?')}",
            f"Pending Decisions: {person.get('pending_decisions', '?')}",
            "",
            "Connected nodes:",
        ]
        for edge_type, node in connected:
            lines.append(f"- [{edge_type}] {node['label']} ({node['type']}, {node.get('division', '?')})")

        return "\n".join(lines)

    def build_division_context(self, division: str) -> str:
        """Build context for a specific division."""
        g = self._get_graph()
        nodes = [n for n in g.get("nodes", []) if n.get("division") == division]
        edges = g.get("edges", [])
        node_ids = {n["id"] for n in nodes}

        lines = [f"== Division: {division} ({len(nodes)} nodes) =="]
        for n in nodes:
            lines.append(f"- {n['label']} (ID: {n['id']}, type: {n['type']})")

        div_edges = [e for e in edges if e["source"] in node_ids or e["target"] in node_ids]
        lines.append(f"\nEdges involving {division}: {len(div_edges)}")
        cross = [e for e in div_edges if e["source"] not in node_ids or e["target"] not in node_ids]
        lines.append(f"Cross-division edges: {len(cross)}")

        return "\n".join(lines)

    def build_knowledge_context(self) -> str:
        """Build context of all knowledge units (decisions, facts, commitments, questions)."""
        g = self._get_graph()
        knowledge_types = {"decision", "fact", "commitment", "question"}
        nodes = [n for n in g.get("nodes", []) if n.get("type") in knowledge_types]

        lines = []
        for n in sorted(nodes, key=lambda x: x.get("created_at", ""), reverse=True):
            lines.append(
                f"[{n['type'].upper()}] {n['label']} (ID: {n['id']})\n"
                f"  Division: {n.get('division', '?')} | Status: {n.get('status', '?')} | "
                f"Freshness: {n.get('freshness_score', '?')} | Source: {n.get('source_type', '?')}\n"
                f"  Content: {(n.get('content') or '')[:200]}"
            )
        return "\n\n".join(lines)

    def get_all_node_texts(self) -> list[tuple[str, str]]:
        """Return (node_id, text) pairs for embedding."""
        g = self._get_graph()
        results = []
        for n in g.get("nodes", []):
            text_parts = [n.get("label", "")]
            if n.get("content"):
                text_parts.append(n["content"])
            if n.get("role"):
                text_parts.append(n["role"])
            if n.get("type"):
                text_parts.append(n["type"])
            results.append((n["id"], " | ".join(text_parts)))
        return results
