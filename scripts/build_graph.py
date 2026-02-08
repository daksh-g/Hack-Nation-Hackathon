#!/usr/bin/env python3
"""
Build ALL synthetic data for the NEXUS hackathon demo.
Company: Meridian Technologies

Generates:
  mock_data/company_structure.json
  mock_data/graph.json
  mock_data/hierarchy.json
  mock_data/alerts.json
  mock_data/ask_cache.json

Then copies everything to nexus-ui/public/mock_data/
"""

import json
import os
import shutil
import math
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOCK_DIR = os.path.join(ROOT, "mock_data")
UI_MOCK_DIR = os.path.join(ROOT, "nexus-ui", "public", "mock_data")

NOW = datetime(2026, 2, 7, 14, 30, 0)
ISO_NOW = NOW.isoformat() + "Z"


def iso(dt):
    return dt.isoformat() + "Z"


# ---------------------------------------------------------------------------
# 1. COMPANY STRUCTURE
# ---------------------------------------------------------------------------

divisions = [
    {"id": "div-na", "name": "North America", "code": "NA"},
    {"id": "div-emea", "name": "EMEA", "code": "EMEA"},
    {"id": "div-apac", "name": "Asia Pacific", "code": "APAC"},
    {"id": "div-hq", "name": "HQ / Corporate", "code": "HQ"},
]

departments = [
    # NA
    {"id": "dept-na-eng", "name": "NA Engineering", "division": "NA"},
    {"id": "dept-na-product", "name": "NA Product", "division": "NA"},
    {"id": "dept-na-sales", "name": "NA Sales", "division": "NA"},
    # EMEA
    {"id": "dept-emea-eng", "name": "EMEA Engineering", "division": "EMEA"},
    {"id": "dept-emea-ops", "name": "EMEA Operations", "division": "EMEA"},
    {"id": "dept-emea-sales", "name": "EMEA Sales", "division": "EMEA"},
    # APAC
    {"id": "dept-apac-eng", "name": "APAC Engineering", "division": "APAC"},
    {"id": "dept-apac-growth", "name": "APAC Growth", "division": "APAC"},
    # HQ
    {"id": "dept-hq-strategy", "name": "Strategy", "division": "HQ"},
    {"id": "dept-hq-finance", "name": "Finance", "division": "HQ"},
    {"id": "dept-hq-legal", "name": "Legal & Compliance", "division": "HQ"},
    {"id": "dept-hq-executive", "name": "Executive Office", "division": "HQ"},
]

teams = [
    # NA Engineering
    {"id": "team-payments", "name": "Payments", "department": "dept-na-eng", "division": "NA"},
    {"id": "team-platform", "name": "Platform", "department": "dept-na-eng", "division": "NA"},
    {"id": "team-infra", "name": "Infrastructure", "department": "dept-na-eng", "division": "NA"},
    # NA Product
    {"id": "team-product-na", "name": "NA Product Management", "department": "dept-na-product", "division": "NA"},
    # NA Sales
    {"id": "team-sales-na", "name": "NA Sales", "department": "dept-na-sales", "division": "NA"},
    {"id": "team-solutions", "name": "Solutions Engineering", "department": "dept-na-sales", "division": "NA"},
    # EMEA Eng
    {"id": "team-billing-emea", "name": "EMEA Billing", "department": "dept-emea-eng", "division": "EMEA"},
    {"id": "team-backend-emea", "name": "EMEA Backend", "department": "dept-emea-eng", "division": "EMEA"},
    # EMEA Ops
    {"id": "team-ops-emea", "name": "EMEA Ops", "department": "dept-emea-ops", "division": "EMEA"},
    # EMEA Sales
    {"id": "team-sales-emea", "name": "EMEA Sales", "department": "dept-emea-sales", "division": "EMEA"},
    # APAC Eng
    {"id": "team-mobile-apac", "name": "APAC Mobile", "department": "dept-apac-eng", "division": "APAC"},
    # APAC Growth
    {"id": "team-growth-apac", "name": "APAC Growth", "department": "dept-apac-growth", "division": "APAC"},
    # HQ
    {"id": "team-strategy", "name": "Strategy", "department": "dept-hq-strategy", "division": "HQ"},
    {"id": "team-fp-a", "name": "FP&A", "department": "dept-hq-finance", "division": "HQ"},
    {"id": "team-legal", "name": "Legal", "department": "dept-hq-legal", "division": "HQ"},
    {"id": "team-compliance", "name": "Compliance", "department": "dept-hq-legal", "division": "HQ"},
    {"id": "team-exec", "name": "Executive Team", "department": "dept-hq-executive", "division": "HQ"},
    # Additional teams
    {"id": "team-data-eng", "name": "Data Engineering", "department": "dept-na-eng", "division": "NA"},
    {"id": "team-security", "name": "Security", "department": "dept-hq-legal", "division": "HQ"},
    {"id": "team-customer-success", "name": "Customer Success", "department": "dept-na-sales", "division": "NA"},
]

# 20 people
people = [
    # NA Engineering
    {"id": "person-1",  "name": "Marcus Rivera",    "role": "VP of Engineering",      "team": "team-payments",   "department": "dept-na-eng",     "division": "NA",   "cognitive_load": 72, "active_commitments": 6, "pending_decisions": 4},
    {"id": "person-2",  "name": "Priya Sharma",     "role": "Senior Backend Engineer","team": "team-payments",   "department": "dept-na-eng",     "division": "NA",   "cognitive_load": 55, "active_commitments": 4, "pending_decisions": 2},
    {"id": "person-3",  "name": "James Liu",        "role": "Staff Engineer",         "team": "team-platform",   "department": "dept-na-eng",     "division": "NA",   "cognitive_load": 48, "active_commitments": 3, "pending_decisions": 2},
    {"id": "person-4",  "name": "Anika Patel",      "role": "Engineering Manager",    "team": "team-infra",      "department": "dept-na-eng",     "division": "NA",   "cognitive_load": 62, "active_commitments": 5, "pending_decisions": 3},
    # NA Product
    {"id": "person-5",  "name": "David Kim",        "role": "Head of Product",        "team": "team-product-na", "department": "dept-na-product", "division": "NA",   "cognitive_load": 78, "active_commitments": 7, "pending_decisions": 5},
    # NA Sales
    {"id": "person-6",  "name": "Sarah Chen",       "role": "VP of Sales",            "team": "team-sales-na",   "department": "dept-na-sales",   "division": "NA",   "cognitive_load": 68, "active_commitments": 5, "pending_decisions": 3},
    {"id": "person-7",  "name": "Tom Bradley",      "role": "Account Executive",      "team": "team-sales-na",   "department": "dept-na-sales",   "division": "NA",   "cognitive_load": 45, "active_commitments": 3, "pending_decisions": 1},
    {"id": "person-8",  "name": "Rachel Nguyen",    "role": "Solutions Architect",     "team": "team-solutions",  "department": "dept-na-sales",   "division": "NA",   "cognitive_load": 51, "active_commitments": 4, "pending_decisions": 2},
    # EMEA Engineering
    {"id": "person-9",  "name": "Henrik Johansson", "role": "EMEA Engineering Lead",  "team": "team-billing-emea","department": "dept-emea-eng",  "division": "EMEA", "cognitive_load": 58, "active_commitments": 4, "pending_decisions": 3},
    {"id": "person-10", "name": "Elena Kowalski",   "role": "Senior Engineer",        "team": "team-billing-emea","department": "dept-emea-eng",  "division": "EMEA", "cognitive_load": 42, "active_commitments": 3, "pending_decisions": 1},
    {"id": "person-11", "name": "Omar Hassan",      "role": "Backend Developer",      "team": "team-backend-emea","department": "dept-emea-eng",  "division": "EMEA", "cognitive_load": 35, "active_commitments": 2, "pending_decisions": 1},
    # EMEA Ops / Sales
    {"id": "person-12", "name": "Sophie Dubois",    "role": "EMEA Operations Manager","team": "team-ops-emea",   "department": "dept-emea-ops",   "division": "EMEA", "cognitive_load": 50, "active_commitments": 4, "pending_decisions": 2},
    {"id": "person-13", "name": "Lars Mueller",     "role": "EMEA Sales Director",    "team": "team-sales-emea", "department": "dept-emea-sales", "division": "EMEA", "cognitive_load": 61, "active_commitments": 5, "pending_decisions": 3},
    # APAC
    {"id": "person-14", "name": "Yuki Tanaka",      "role": "APAC Engineering Lead",  "team": "team-mobile-apac","department": "dept-apac-eng",   "division": "APAC", "cognitive_load": 44, "active_commitments": 3, "pending_decisions": 2},
    {"id": "person-15", "name": "Wei Zhang",        "role": "Growth Lead",            "team": "team-growth-apac","department": "dept-apac-growth","division": "APAC", "cognitive_load": 53, "active_commitments": 4, "pending_decisions": 2},
    # HQ
    {"id": "person-16", "name": "Catherine Moore",  "role": "Chief Strategy Officer",  "team": "team-strategy",  "department": "dept-hq-strategy","division": "HQ",  "cognitive_load": 88, "active_commitments": 8, "pending_decisions": 6},
    {"id": "person-17", "name": "Robert Daniels",   "role": "CFO",                    "team": "team-fp-a",       "department": "dept-hq-finance", "division": "HQ",  "cognitive_load": 75, "active_commitments": 6, "pending_decisions": 4},
    {"id": "person-18", "name": "Nina Volkov",      "role": "General Counsel",        "team": "team-legal",      "department": "dept-hq-legal",   "division": "HQ",  "cognitive_load": 60, "active_commitments": 5, "pending_decisions": 3},
    {"id": "person-19", "name": "Alex Reeves",      "role": "CEO",                    "team": "team-exec",       "department": "dept-hq-executive","division": "HQ", "cognitive_load": 82, "active_commitments": 7, "pending_decisions": 5},
    {"id": "person-20", "name": "Maria Santos",     "role": "VP of Customer Success", "team": "team-customer-success","department": "dept-na-sales","division": "NA", "cognitive_load": 56, "active_commitments": 4, "pending_decisions": 2},
]

# 4 AI agents
agents = [
    {
        "id": "agent-1", "name": "Atlas-Code", "agent_type": "coding",
        "trust_level": "supervised", "supervising_human": "person-2",
        "team": "team-payments", "department": "dept-na-eng", "division": "NA",
        "active_tasks": ["Building billing REST API v3 endpoint", "Writing unit tests for retry logic", "Refactoring payment gateway adapter"],
        "cognitive_load": 65, "active_commitments": 3, "pending_decisions": 0,
    },
    {
        "id": "agent-2", "name": "Iris-Research", "agent_type": "research",
        "trust_level": "supervised", "supervising_human": "person-16",
        "team": "team-strategy", "department": "dept-hq-strategy", "division": "HQ",
        "active_tasks": ["Synthesizing Q4 market data", "Competitor pricing analysis", "TAM expansion modeling"],
        "cognitive_load": 40, "active_commitments": 3, "pending_decisions": 0,
    },
    {
        "id": "agent-3", "name": "Sentinel-Compliance", "agent_type": "operations",
        "trust_level": "review_required", "supervising_human": "person-18",
        "team": "team-compliance", "department": "dept-hq-legal", "division": "HQ",
        "active_tasks": ["Reviewing vendor contracts batch 12", "GDPR audit for EMEA data flows", "SOC2 evidence collection"],
        "cognitive_load": 50, "active_commitments": 3, "pending_decisions": 0,
    },
    {
        "id": "agent-4", "name": "Nova-Sales", "agent_type": "customer",
        "trust_level": "autonomous", "supervising_human": "person-6",
        "team": "team-sales-na", "department": "dept-na-sales", "division": "NA",
        "active_tasks": ["Generating Acme Corp proposal", "Drafting follow-up for Beta Inc", "Pricing sheet update"],
        "cognitive_load": 55, "active_commitments": 3, "pending_decisions": 0,
    },
]


def build_company_structure():
    """Build company_structure.json"""
    div_map = {}
    for d in divisions:
        div_map[d["code"]] = {**d, "departments": []}

    dept_map = {}
    for d in departments:
        entry = {**d, "teams": []}
        dept_map[d["id"]] = entry
        div_map[d["division"]]["departments"].append(entry)

    for t in teams:
        team_entry = {**t, "members": [], "agents": []}
        dept_map[t["department"]]["teams"].append(team_entry)
        for p in people:
            if p["team"] == t["id"]:
                team_entry["members"].append(p)
        for a in agents:
            if a["team"] == t["id"]:
                team_entry["agents"].append(a)

    return {
        "company": "Meridian Technologies",
        "generated_at": ISO_NOW,
        "divisions": list(div_map.values()),
        "people_count": len(people),
        "agent_count": len(agents),
        "team_count": len(teams),
        "department_count": len(departments),
    }


# ---------------------------------------------------------------------------
# 2. GRAPH — Nodes + Edges
# ---------------------------------------------------------------------------

# Golden layout positions: cluster by division quadrant
# NA = top-left, EMEA = top-right, APAC = bottom-right, HQ = center-bottom
DIVISION_CENTERS = {
    "NA":   (-250, -200),
    "EMEA": ( 250, -200),
    "APAC": ( 250,  250),
    "HQ":   (   0,  200),
}

# Team-level offsets within division cluster (spread teams out)
team_positions = {}
_team_offsets_by_div = {}
for t in teams:
    div = t["division"]
    if div not in _team_offsets_by_div:
        _team_offsets_by_div[div] = 0
    idx = _team_offsets_by_div[div]
    cx, cy = DIVISION_CENTERS[div]
    # Arrange in a circle around division center
    angle = (2 * math.pi * idx) / max(1, sum(1 for tt in teams if tt["division"] == div))
    radius = 120
    tx = cx + radius * math.cos(angle)
    ty = cy + radius * math.sin(angle)
    team_positions[t["id"]] = (round(tx), round(ty))
    _team_offsets_by_div[div] += 1


def health_from_load(load):
    if load < 40:
        return "green"
    elif load < 65:
        return "yellow"
    elif load < 85:
        return "orange"
    return "red"


def size_from_activity(ac, pd):
    val = ac + pd
    # map [0, 10] -> [20, 52]
    return round(20 + (min(val, 10) / 10) * 32)


def position_near(team_id, idx, total):
    """Place a node near its team cluster."""
    if team_id not in team_positions:
        return (0, 0)
    tx, ty = team_positions[team_id]
    if total <= 1:
        return (tx, ty)
    angle = (2 * math.pi * idx) / total
    r = 30 + 10 * (idx % 3)
    return (round(tx + r * math.cos(angle)), round(ty + r * math.sin(angle)))


def build_graph():
    nodes = []
    edges = []
    edge_id_counter = [0]

    def add_edge(source, target, etype, weight=1.0, interaction_type=None, label=None):
        edge_id_counter[0] += 1
        e = {
            "id": f"edge-{edge_id_counter[0]}",
            "source": source,
            "target": target,
            "type": etype,
            "weight": weight,
        }
        if interaction_type:
            e["interaction_type"] = interaction_type
        if label:
            e["label"] = label
        edges.append(e)
        return e["id"]

    # --- Team nodes ---
    for t in teams:
        tx, ty = team_positions[t["id"]]
        # team health = worst health of members
        member_loads = [p["cognitive_load"] for p in people if p["team"] == t["id"]]
        agent_loads = [a["cognitive_load"] for a in agents if a["team"] == t["id"]]
        all_loads = member_loads + agent_loads
        max_load = max(all_loads) if all_loads else 0
        avg_load = sum(all_loads) / len(all_loads) if all_loads else 0
        nodes.append({
            "id": t["id"],
            "type": "team",
            "label": t["name"],
            "division": t["division"],
            "department": t["department"],
            "health": health_from_load(avg_load),
            "size": 40,
            "x": tx,
            "y": ty,
        })

    # --- Person nodes ---
    for i, p in enumerate(people):
        team_members_in_same = [pp for pp in people if pp["team"] == p["team"]]
        idx_in_team = team_members_in_same.index(p)
        total_in_team = len(team_members_in_same) + len([a for a in agents if a["team"] == p["team"]])
        px, py = position_near(p["team"], idx_in_team, total_in_team)
        nodes.append({
            "id": p["id"],
            "type": "person",
            "label": p["name"],
            "division": p["division"],
            "department": p["department"],
            "team": p["team"],
            "role": p["role"],
            "cognitive_load": p["cognitive_load"],
            "active_commitments": p["active_commitments"],
            "pending_decisions": p["pending_decisions"],
            "health": health_from_load(p["cognitive_load"]),
            "size": size_from_activity(p["active_commitments"], p["pending_decisions"]),
            "x": px,
            "y": py,
        })
        # MEMBER_OF team
        add_edge(p["id"], p["team"], "MEMBER_OF", interaction_type="human-human")

    # --- Agent nodes ---
    for i, a in enumerate(agents):
        team_members_total = len([pp for pp in people if pp["team"] == a["team"]]) + len([aa for aa in agents if aa["team"] == a["team"]])
        agent_idx_in_team = len([pp for pp in people if pp["team"] == a["team"]]) + [aa["id"] for aa in agents if aa["team"] == a["team"]].index(a["id"])
        ax, ay = position_near(a["team"], agent_idx_in_team, team_members_total)
        nodes.append({
            "id": a["id"],
            "type": "agent",
            "label": a["name"],
            "division": a["division"],
            "department": a["department"],
            "team": a["team"],
            "agent_type": a["agent_type"],
            "trust_level": a["trust_level"],
            "supervising_human": a["supervising_human"],
            "active_tasks": a["active_tasks"],
            "cognitive_load": a["cognitive_load"],
            "active_commitments": a["active_commitments"],
            "pending_decisions": a["pending_decisions"],
            "health": health_from_load(a["cognitive_load"]),
            "size": size_from_activity(a["active_commitments"], a["pending_decisions"]),
            "x": ax,
            "y": ay,
        })
        # MEMBER_OF team
        add_edge(a["id"], a["team"], "MEMBER_OF", interaction_type="human-ai")
        # SUPERVISED_BY
        add_edge(a["id"], a["supervising_human"], "SUPERVISED_BY", interaction_type="human-ai")

    # --- REPORTS_TO hierarchy ---
    # CEO -> VPs / C-suite
    add_edge("person-1",  "person-19", "REPORTS_TO", interaction_type="human-human")  # VP Eng -> CEO
    add_edge("person-5",  "person-19", "REPORTS_TO", interaction_type="human-human")  # Head Product -> CEO
    add_edge("person-6",  "person-19", "REPORTS_TO", interaction_type="human-human")  # VP Sales -> CEO
    add_edge("person-16", "person-19", "REPORTS_TO", interaction_type="human-human")  # CSO -> CEO
    add_edge("person-17", "person-19", "REPORTS_TO", interaction_type="human-human")  # CFO -> CEO
    add_edge("person-18", "person-19", "REPORTS_TO", interaction_type="human-human")  # GC -> CEO
    # Engineers -> VP Eng
    add_edge("person-2",  "person-1",  "REPORTS_TO", interaction_type="human-human")
    add_edge("person-3",  "person-1",  "REPORTS_TO", interaction_type="human-human")
    add_edge("person-4",  "person-1",  "REPORTS_TO", interaction_type="human-human")
    # EMEA Eng -> VP Eng (dotted line)
    add_edge("person-9",  "person-1",  "REPORTS_TO", weight=0.5, interaction_type="human-human")
    # Sales team -> VP Sales
    add_edge("person-7",  "person-6",  "REPORTS_TO", interaction_type="human-human")
    add_edge("person-8",  "person-6",  "REPORTS_TO", interaction_type="human-human")
    add_edge("person-20", "person-6",  "REPORTS_TO", interaction_type="human-human")
    # EMEA
    add_edge("person-10", "person-9",  "REPORTS_TO", interaction_type="human-human")
    add_edge("person-11", "person-9",  "REPORTS_TO", interaction_type="human-human")
    add_edge("person-12", "person-9",  "REPORTS_TO", weight=0.5, interaction_type="human-human")
    add_edge("person-13", "person-6",  "REPORTS_TO", weight=0.5, interaction_type="human-human")
    # APAC
    add_edge("person-14", "person-1",  "REPORTS_TO", weight=0.5, interaction_type="human-human")
    add_edge("person-15", "person-5",  "REPORTS_TO", weight=0.5, interaction_type="human-human")

    # --- DELEGATES_TO (human -> agent) ---
    add_edge("person-2",  "agent-1", "DELEGATES_TO", interaction_type="human-ai", label="Code generation for billing API")
    add_edge("person-16", "agent-2", "DELEGATES_TO", interaction_type="human-ai", label="Market research synthesis")
    add_edge("person-18", "agent-3", "DELEGATES_TO", interaction_type="human-ai", label="Contract review automation")
    add_edge("person-6",  "agent-4", "DELEGATES_TO", interaction_type="human-ai", label="Proposal generation")

    # --- REVIEWS_OUTPUT_OF (human reviews agent work) ---
    add_edge("person-2",  "agent-1", "REVIEWS_OUTPUT_OF", interaction_type="human-ai")
    add_edge("person-1",  "agent-1", "REVIEWS_OUTPUT_OF", interaction_type="human-ai")
    add_edge("person-16", "agent-2", "REVIEWS_OUTPUT_OF", interaction_type="human-ai")
    add_edge("person-18", "agent-3", "REVIEWS_OUTPUT_OF", interaction_type="human-ai")
    add_edge("person-6",  "agent-4", "REVIEWS_OUTPUT_OF", interaction_type="human-ai")
    add_edge("person-7",  "agent-4", "REVIEWS_OUTPUT_OF", interaction_type="human-ai")

    # -----------------------------------------------------------------------
    # Knowledge Units — Decisions, Facts, Commitments, Questions, Topics
    # -----------------------------------------------------------------------

    knowledge_nodes = []

    def add_knowledge(kid, ktype, label, content, division, source_type, source_id,
                      created_at=None, freshness=0.1, half_life=30, blast_radius=1,
                      status="active", team=None, department=None):
        if created_at is None:
            created_at = iso(NOW - timedelta(days=1))
        tx, ty = DIVISION_CENTERS.get(division, (0, 0))
        # Place knowledge nodes slightly further out
        idx = len(knowledge_nodes)
        angle = (2 * math.pi * idx) / 50  # spread
        r = 180 + (idx % 5) * 15
        kx = round(tx + r * math.cos(angle))
        ky = round(ty + r * math.sin(angle))
        node = {
            "id": kid,
            "type": ktype,
            "label": label,
            "content": content,
            "division": division,
            "source_type": source_type,
            "source_id": source_id,
            "created_at": created_at,
            "freshness_score": freshness,
            "half_life_days": half_life,
            "blast_radius": blast_radius,
            "status": status,
            "health": "green" if freshness < 0.5 else ("yellow" if freshness < 1.0 else ("orange" if freshness < 1.5 else "red")),
            "size": min(52, 20 + blast_radius * 5),
            "x": kx,
            "y": ky,
        }
        if team:
            node["team"] = team
        if department:
            node["department"] = department
        knowledge_nodes.append(node)
        nodes.append(node)
        # PRODUCED_BY edge
        add_edge(kid, source_id, "PRODUCED_BY",
                 interaction_type="human-ai" if source_type == "ai_agent" else "human-human")
        return kid

    # ============== SCENARIO 1: Human-AI Contradiction ==============
    # Sarah Chen told Acme Corp $20/seat, Nova-Sales sent $15/seat

    c1_human = add_knowledge(
        "commitment-1", "commitment",
        "Acme Corp pricing: $20/seat",
        "VP of Sales Sarah Chen verbally committed to Acme Corp a pricing of $20/seat/month for their enterprise deal during the call on Feb 3. This was based on the standard enterprise tier with volume discount.",
        "NA", "human", "person-6",
        created_at=iso(NOW - timedelta(days=4)),
        freshness=0.1, half_life=90, blast_radius=5,
        team="team-sales-na", department="dept-na-sales",
    )

    c1_ai = add_knowledge(
        "commitment-2", "commitment",
        "Acme Corp automated proposal: $15/seat",
        "Nova-Sales generated and sent an automated proposal to Acme Corp with pricing at $15/seat/month, pulling from the outdated Q3 pricing sheet which had not been updated to reflect the January price increase.",
        "NA", "ai_agent", "agent-4",
        created_at=iso(NOW - timedelta(hours=6)),
        freshness=0.0, half_life=90, blast_radius=5,
        team="team-sales-na", department="dept-na-sales",
    )

    add_edge("commitment-1", "commitment-2", "CONTRADICTS", weight=1.0,
             interaction_type="human-ai", label="Conflicting prices: $20 vs $15/seat")

    # Decision that led to pricing
    d1 = add_knowledge(
        "decision-1", "decision",
        "Enterprise pricing increase to $20/seat",
        "Decision made in Jan 2026 pricing review to raise enterprise tier from $15 to $20/seat effective Feb 1. Approved by CFO and VP Sales. Nova-Sales pricing database was not updated.",
        "HQ", "human", "person-17",
        created_at=iso(NOW - timedelta(days=37)),
        freshness=0.3, half_life=180, blast_radius=6,
        team="team-fp-a", department="dept-hq-finance",
    )
    add_edge("commitment-1", "decision-1", "DEPENDS_ON", interaction_type="human-human")
    add_edge("decision-1", "person-17", "DECIDED_BY", interaction_type="human-human")
    add_edge("decision-1", "person-6", "DECIDED_BY", interaction_type="human-human")
    add_edge("decision-1", "agent-4", "AFFECTS", interaction_type="human-ai",
             label="Pricing DB not updated")

    # The Acme Corp topic
    topic_acme = add_knowledge(
        "topic-1", "topic",
        "Acme Corp Enterprise Deal",
        "High-value enterprise deal with Acme Corp. 500-seat deployment. Final negotiation phase. Multiple stakeholders involved across Sales and Finance.",
        "NA", "human", "person-6",
        freshness=0.0, half_life=60, blast_radius=4,
        team="team-sales-na",
    )
    add_edge("commitment-1", "topic-1", "ABOUT")
    add_edge("commitment-2", "topic-1", "ABOUT")
    add_edge("person-6", "topic-1", "EXPERT_IN", interaction_type="human-human")
    add_edge("person-7", "topic-1", "CAN_ANSWER", interaction_type="human-human")
    add_edge("agent-4", "topic-1", "ABOUT", interaction_type="human-ai")

    # ============== SCENARIO 2: AI Stale Context ==============
    # Atlas-Code working on REST API v3, but team switched to GraphQL 3hrs ago

    d2_old = add_knowledge(
        "decision-2", "decision",
        "Billing API: use REST v3 architecture",
        "Team decided on Jan 30 to build the billing API using REST v3 with OpenAPI spec. Atlas-Code was tasked with implementation.",
        "NA", "human", "person-1",
        created_at=iso(NOW - timedelta(days=8)),
        freshness=0.8, half_life=14, blast_radius=4,
        status="superseded",
        team="team-payments", department="dept-na-eng",
    )

    d2_new = add_knowledge(
        "decision-3", "decision",
        "Billing API: switch to GraphQL",
        "Emergency decision 3 hours ago: team switches billing API from REST to GraphQL after Priya's analysis showed 40% fewer round trips for the mobile client. Atlas-Code was not notified.",
        "NA", "human", "person-2",
        created_at=iso(NOW - timedelta(hours=3)),
        freshness=0.0, half_life=14, blast_radius=5,
        team="team-payments", department="dept-na-eng",
    )

    add_edge("decision-3", "decision-2", "SUPERSEDES", interaction_type="human-human",
             label="GraphQL replaces REST v3")
    add_edge("decision-2", "person-1", "DECIDED_BY", interaction_type="human-human")
    add_edge("decision-3", "person-2", "DECIDED_BY", interaction_type="human-human")
    add_edge("decision-3", "person-1", "DECIDED_BY", interaction_type="human-human")
    add_edge("agent-1", "decision-2", "DEPENDS_ON", interaction_type="human-ai",
             label="Atlas-Code still using REST v3 spec")
    add_edge("decision-3", "agent-1", "AFFECTS", interaction_type="human-ai",
             label="Agent not yet notified of switch")

    # Context feed that is stale
    add_edge("decision-2", "agent-1", "CONTEXT_FEEDS", interaction_type="human-ai",
             label="Stale context: REST v3 spec")

    fact_graphql = add_knowledge(
        "fact-1", "fact",
        "GraphQL reduces mobile round trips by 40%",
        "Performance analysis by Priya Sharma showed that switching from REST to GraphQL for the billing API would reduce mobile client round trips by 40% and cut P95 latency from 800ms to 320ms.",
        "NA", "human", "person-2",
        created_at=iso(NOW - timedelta(hours=4)),
        freshness=0.0, half_life=30, blast_radius=3,
        team="team-payments",
    )
    add_edge("decision-3", "fact-1", "DEPENDS_ON", interaction_type="human-human")

    # ============== SCENARIO 3: Silo Detection ==============
    # NA Payments and EMEA Billing building similar retry logic

    fact_retry_na = add_knowledge(
        "fact-2", "fact",
        "NA Payments retry logic implementation",
        "NA Payments team is building exponential backoff retry logic for failed payment transactions. Using jitter + circuit breaker pattern. Sprint started Feb 3, est. completion Feb 10.",
        "NA", "human", "person-2",
        created_at=iso(NOW - timedelta(days=4)),
        freshness=0.1, half_life=14, blast_radius=3,
        team="team-payments", department="dept-na-eng",
    )

    fact_retry_emea = add_knowledge(
        "fact-3", "fact",
        "EMEA Billing retry logic implementation",
        "EMEA Billing team independently designing retry mechanism for recurring billing failures. Also using exponential backoff. Sprint started Feb 2, est. completion Feb 9. No coordination with NA.",
        "EMEA", "human", "person-9",
        created_at=iso(NOW - timedelta(days=5)),
        freshness=0.1, half_life=14, blast_radius=3,
        team="team-billing-emea", department="dept-emea-eng",
    )

    # These two should have a CONTRADICTS or at least show zero communication
    add_edge("fact-2", "fact-3", "CONTRADICTS", weight=0.7,
             interaction_type="human-human", label="Duplicate effort: no cross-team communication")
    add_edge("fact-2", "person-2", "OWNS", interaction_type="human-human")
    add_edge("fact-3", "person-9", "OWNS", interaction_type="human-human")
    add_edge("fact-3", "person-10", "OWNS", interaction_type="human-human")

    topic_retry = add_knowledge(
        "topic-2", "topic",
        "Payment Retry Logic",
        "Retry mechanism for failed payment/billing transactions. Critical infrastructure shared across regions.",
        "NA", "human", "person-1",
        freshness=0.0, half_life=60, blast_radius=5,
    )
    add_edge("fact-2", "topic-2", "ABOUT")
    add_edge("fact-3", "topic-2", "ABOUT")
    add_edge("person-2", "topic-2", "EXPERT_IN", interaction_type="human-human")
    add_edge("person-9", "topic-2", "EXPERT_IN", interaction_type="human-human")

    # ============== SCENARIO 4: Stale Fact ==============
    # Iris-Research market analysis is 45 days old, half_life 14 days

    fact_market = add_knowledge(
        "fact-4", "fact",
        "Q4 2025 Market Analysis — Enterprise SaaS TAM",
        "Iris-Research synthesized market data showing enterprise SaaS TAM at $142B with 12% YoY growth. Key finding: mid-market segment growing 18% faster than enterprise. Used for 3 downstream decisions.",
        "HQ", "ai_agent", "agent-2",
        created_at=iso(NOW - timedelta(days=45)),
        freshness=1.8,  # 45 days / 14 day half-life => very stale
        half_life=14, blast_radius=6,
        team="team-strategy", department="dept-hq-strategy",
    )

    # 3 decisions that depend on this stale fact
    d4a = add_knowledge(
        "decision-4", "decision",
        "Mid-market expansion initiative",
        "Based on Iris-Research market analysis, the board approved a $2.5M mid-market expansion initiative targeting 18% growth segment. Hiring 8 new sales reps.",
        "HQ", "human", "person-19",
        created_at=iso(NOW - timedelta(days=30)),
        freshness=0.5, half_life=60, blast_radius=5,
        team="team-exec",
    )
    add_edge("decision-4", "fact-4", "DEPENDS_ON", label="Based on potentially stale market data")
    add_edge("decision-4", "person-19", "DECIDED_BY", interaction_type="human-human")

    d4b = add_knowledge(
        "decision-5", "decision",
        "APAC market entry timeline",
        "Strategy team set APAC market entry for Q2 2026 based on TAM growth projections from Iris-Research analysis. Budget allocated: $800K.",
        "HQ", "human", "person-16",
        created_at=iso(NOW - timedelta(days=25)),
        freshness=0.4, half_life=60, blast_radius=4,
        team="team-strategy",
    )
    add_edge("decision-5", "fact-4", "DEPENDS_ON", label="Based on potentially stale market data")
    add_edge("decision-5", "person-16", "DECIDED_BY", interaction_type="human-human")

    d4c = add_knowledge(
        "decision-6", "decision",
        "Q1 2026 hiring plan",
        "Finance approved Q1 hiring plan for 12 new positions based on growth projections from market analysis. $1.8M budget impact.",
        "HQ", "human", "person-17",
        created_at=iso(NOW - timedelta(days=20)),
        freshness=0.3, half_life=60, blast_radius=4,
        team="team-fp-a",
    )
    add_edge("decision-6", "fact-4", "DEPENDS_ON", label="Based on potentially stale market data")
    add_edge("decision-6", "person-17", "DECIDED_BY", interaction_type="human-human")

    add_edge("person-16", "fact-4", "OWNS", interaction_type="human-ai")
    add_edge("agent-2", "fact-4", "CONTEXT_FEEDS", interaction_type="human-ai")

    # ============== SCENARIO 5: Cross-Division Contradiction ==============
    # NA Product says March 15 launch, EMEA Engineering says April 1

    c5_na = add_knowledge(
        "commitment-3", "commitment",
        "Product launch: March 15, 2026",
        "NA Product team committed to March 15 launch date for v2.0 at the all-hands on Jan 28. Marketing materials already in production. Press embargo set for March 10.",
        "NA", "human", "person-5",
        created_at=iso(NOW - timedelta(days=10)),
        freshness=0.1, half_life=30, blast_radius=7,
        team="team-product-na", department="dept-na-product",
    )

    c5_emea = add_knowledge(
        "commitment-4", "commitment",
        "EMEA integration ready: April 1, 2026",
        "EMEA Engineering is working toward April 1 completion for the localization and payment gateway integration required for v2.0 in EU markets. Henrik flagged this timeline in standup but it hasn't propagated to NA Product.",
        "EMEA", "human", "person-9",
        created_at=iso(NOW - timedelta(days=7)),
        freshness=0.1, half_life=30, blast_radius=6,
        team="team-billing-emea", department="dept-emea-eng",
    )

    add_edge("commitment-3", "commitment-4", "CONTRADICTS", weight=1.0,
             interaction_type="human-human",
             label="Launch date conflict: March 15 vs April 1")
    add_edge("commitment-3", "person-5", "DECIDED_BY", interaction_type="human-human")
    add_edge("commitment-4", "person-9", "DECIDED_BY", interaction_type="human-human")
    add_edge("commitment-3", "person-19", "AFFECTS", interaction_type="human-human",
             label="CEO announced March 15 publicly")
    add_edge("commitment-4", "person-12", "AFFECTS", interaction_type="human-human",
             label="EMEA ops planning around April 1")

    topic_launch = add_knowledge(
        "topic-3", "topic",
        "v2.0 Product Launch",
        "Major product launch for Meridian Technologies v2.0 platform. Cross-division coordination required. Marketing, engineering, and ops all have dependencies.",
        "NA", "human", "person-5",
        freshness=0.0, half_life=30, blast_radius=8,
    )
    add_edge("commitment-3", "topic-3", "ABOUT")
    add_edge("commitment-4", "topic-3", "ABOUT")
    add_edge("person-5", "topic-3", "EXPERT_IN", interaction_type="human-human")
    add_edge("person-9", "topic-3", "CAN_ANSWER", interaction_type="human-human")

    # ============== Additional Knowledge Units for richness ==============

    # More decisions
    d_pricing_review = add_knowledge(
        "decision-7", "decision",
        "Quarterly pricing review cadence",
        "Established quarterly pricing review process. CFO, VP Sales, and Head of Product meet first Monday of each quarter to review and adjust pricing tiers.",
        "HQ", "human", "person-17",
        created_at=iso(NOW - timedelta(days=60)),
        freshness=0.5, half_life=90, blast_radius=3,
        team="team-fp-a",
    )
    add_edge("decision-1", "decision-7", "DEPENDS_ON")

    d_soc2 = add_knowledge(
        "decision-8", "decision",
        "SOC2 Type II certification by Q2",
        "Board mandated SOC2 Type II certification completion by end of Q2 2026. Sentinel-Compliance tasked with evidence collection and audit preparation.",
        "HQ", "human", "person-19",
        created_at=iso(NOW - timedelta(days=45)),
        freshness=0.4, half_life=90, blast_radius=4,
        team="team-exec",
    )
    add_edge("decision-8", "agent-3", "ASSIGNED_TO", interaction_type="human-ai")
    add_edge("decision-8", "person-18", "DECIDED_BY", interaction_type="human-human")

    d_mobile = add_knowledge(
        "decision-9", "decision",
        "APAC mobile-first strategy",
        "APAC division adopting mobile-first approach for all new features. Web dashboard secondary. Decision driven by 78% mobile usage in target markets.",
        "APAC", "human", "person-14",
        created_at=iso(NOW - timedelta(days=20)),
        freshness=0.2, half_life=60, blast_radius=3,
        team="team-mobile-apac",
    )
    add_edge("decision-9", "person-14", "DECIDED_BY", interaction_type="human-human")
    add_edge("decision-9", "person-15", "AFFECTS", interaction_type="human-human")

    d_data_platform = add_knowledge(
        "decision-10", "decision",
        "Unified data platform migration",
        "Engineering approved migration from legacy data warehouse to unified Snowflake + dbt platform. 6-month timeline, $400K budget.",
        "NA", "human", "person-1",
        created_at=iso(NOW - timedelta(days=15)),
        freshness=0.2, half_life=60, blast_radius=5,
        team="team-data-eng",
    )
    add_edge("decision-10", "person-1", "DECIDED_BY", interaction_type="human-human")
    add_edge("decision-10", "person-4", "ASSIGNED_TO", interaction_type="human-human")

    # More facts
    fact_churn = add_knowledge(
        "fact-5", "fact",
        "Enterprise churn rate at 2.1% — below target",
        "January churn report shows enterprise segment at 2.1% monthly churn, beating the 2.5% target. Mid-market at 4.3%, above 3.5% target.",
        "HQ", "human", "person-20",
        created_at=iso(NOW - timedelta(days=7)),
        freshness=0.2, half_life=30, blast_radius=3,
        team="team-customer-success",
    )
    add_edge("fact-5", "person-20", "OWNS", interaction_type="human-human")
    add_edge("fact-5", "person-6", "AFFECTS", interaction_type="human-human")

    fact_outage = add_knowledge(
        "fact-6", "fact",
        "Payment gateway P1 incident on Feb 5",
        "Stripe integration experienced 23-minute outage on Feb 5 affecting 1,200 transactions. Root cause: rate limiting. Retry logic would have prevented 80% of failures.",
        "NA", "human", "person-4",
        created_at=iso(NOW - timedelta(days=2)),
        freshness=0.0, half_life=7, blast_radius=4,
        team="team-infra",
    )
    add_edge("fact-6", "person-4", "OWNS", interaction_type="human-human")
    add_edge("fact-6", "fact-2", "AFFECTS", label="Validates need for retry logic")
    add_edge("fact-6", "fact-3", "AFFECTS", label="Validates need for retry logic")

    fact_competitor = add_knowledge(
        "fact-7", "fact",
        "Competitor Zenith raised Series C at $2B valuation",
        "Zenith Technologies closed $150M Series C at $2B valuation, 3x their revenue multiple. Expanding into same mid-market segment Meridian is targeting.",
        "HQ", "ai_agent", "agent-2",
        created_at=iso(NOW - timedelta(days=3)),
        freshness=0.0, half_life=14, blast_radius=4,
        team="team-strategy",
    )
    add_edge("fact-7", "person-16", "AFFECTS", interaction_type="human-ai")
    add_edge("fact-7", "decision-4", "AFFECTS", label="Competitive threat to mid-market strategy")

    fact_gdpr = add_knowledge(
        "fact-8", "fact",
        "GDPR audit finding: 3 data flows non-compliant",
        "Sentinel-Compliance identified 3 EMEA data flows that do not meet GDPR data residency requirements. Customer PII transiting through US servers before EU processing.",
        "EMEA", "ai_agent", "agent-3",
        created_at=iso(NOW - timedelta(days=1)),
        freshness=0.0, half_life=7, blast_radius=5,
        team="team-compliance",
    )
    add_edge("fact-8", "person-18", "AFFECTS", interaction_type="human-ai")
    add_edge("fact-8", "person-12", "AFFECTS", interaction_type="human-ai")
    add_edge("fact-8", "agent-3", "OWNS", interaction_type="human-ai")

    fact_nps = add_knowledge(
        "fact-9", "fact",
        "NPS score dropped from 72 to 64 in January",
        "Net Promoter Score for enterprise customers declined 8 points in January. Primary driver: billing disputes and invoice clarity. 40% of detractors cited pricing confusion.",
        "NA", "human", "person-20",
        created_at=iso(NOW - timedelta(days=5)),
        freshness=0.1, half_life=30, blast_radius=4,
        team="team-customer-success",
    )
    add_edge("fact-9", "person-20", "OWNS", interaction_type="human-human")
    add_edge("fact-9", "topic-1", "ABOUT")
    add_edge("fact-9", "decision-1", "AFFECTS", label="Pricing change may be driving NPS drop")

    # More commitments
    commit_beta = add_knowledge(
        "commitment-5", "commitment",
        "Beta Inc renewal: $500K ARR by Feb 28",
        "Tom Bradley committed to closing the Beta Inc renewal at $500K ARR by end of February. Currently in negotiation phase. Legal review pending.",
        "NA", "human", "person-7",
        created_at=iso(NOW - timedelta(days=10)),
        freshness=0.1, half_life=30, blast_radius=3,
        team="team-sales-na",
    )
    add_edge("commitment-5", "person-7", "OWNS", interaction_type="human-human")
    add_edge("commitment-5", "person-18", "BLOCKS", interaction_type="human-human",
             label="Legal review not started")

    commit_apac_launch = add_knowledge(
        "commitment-6", "commitment",
        "APAC market soft launch: March 1",
        "APAC Growth team committed to soft launch in Japan and Australia markets by March 1. Depends on localization completion and payment provider integration.",
        "APAC", "human", "person-15",
        created_at=iso(NOW - timedelta(days=12)),
        freshness=0.1, half_life=30, blast_radius=4,
        team="team-growth-apac",
    )
    add_edge("commitment-6", "person-15", "OWNS", interaction_type="human-human")
    add_edge("commitment-6", "person-14", "AFFECTS", interaction_type="human-human")
    add_edge("commitment-6", "decision-9", "DEPENDS_ON")

    commit_security = add_knowledge(
        "commitment-7", "commitment",
        "Penetration test completion by Feb 15",
        "Security team committed to completing annual penetration test by Feb 15. External firm Securitas engaged. Three critical findings from last year need re-validation.",
        "HQ", "human", "person-18",
        created_at=iso(NOW - timedelta(days=14)),
        freshness=0.2, half_life=14, blast_radius=3,
        team="team-security",
    )
    add_edge("commitment-7", "person-18", "OWNS", interaction_type="human-human")
    add_edge("commitment-7", "decision-8", "DEPENDS_ON", label="Required for SOC2")

    # Questions
    q1 = add_knowledge(
        "question-1", "question",
        "Should we unify retry logic across NA and EMEA?",
        "Given both teams are building retry logic independently, should we create a shared library? Trade-off: coordination overhead vs. long-term maintenance cost.",
        "NA", "human", "person-1",
        created_at=iso(NOW - timedelta(hours=12)),
        freshness=0.0, half_life=7, blast_radius=4,
    )
    add_edge("question-1", "fact-2", "ABOUT")
    add_edge("question-1", "fact-3", "ABOUT")
    add_edge("question-1", "person-1", "DECIDED_BY", interaction_type="human-human")
    add_edge("question-1", "person-9", "CAN_ANSWER", interaction_type="human-human")

    q2 = add_knowledge(
        "question-2", "question",
        "Can we ship v2.0 to NA without EMEA integration?",
        "If EMEA integration won't be ready until April 1, can we do a phased launch: NA on March 15, EMEA on April 1? What are the marketing implications?",
        "NA", "human", "person-5",
        created_at=iso(NOW - timedelta(hours=8)),
        freshness=0.0, half_life=7, blast_radius=5,
    )
    add_edge("question-2", "commitment-3", "ABOUT")
    add_edge("question-2", "commitment-4", "ABOUT")
    add_edge("question-2", "person-5", "DECIDED_BY", interaction_type="human-human")
    add_edge("question-2", "person-19", "CAN_ANSWER", interaction_type="human-human")

    q3 = add_knowledge(
        "question-3", "question",
        "What is the real Acme Corp price?",
        "Two conflicting quotes sent to Acme Corp. Need resolution: honor $20/seat (Sarah's verbal) or $15/seat (Nova-Sales automated). Credibility at stake.",
        "NA", "human", "person-7",
        created_at=iso(NOW - timedelta(hours=4)),
        freshness=0.0, half_life=3, blast_radius=5,
    )
    add_edge("question-3", "commitment-1", "ABOUT")
    add_edge("question-3", "commitment-2", "ABOUT")
    add_edge("question-3", "person-6", "CAN_ANSWER", interaction_type="human-human")
    add_edge("question-3", "person-17", "CAN_ANSWER", interaction_type="human-human")

    # More topics
    topic_billing = add_knowledge(
        "topic-4", "topic",
        "Billing Infrastructure",
        "Core billing and payment processing infrastructure. Spans multiple teams and divisions. Critical path for revenue collection.",
        "NA", "human", "person-1",
        freshness=0.0, half_life=90, blast_radius=6,
    )
    add_edge("fact-2", "topic-4", "ABOUT")
    add_edge("fact-3", "topic-4", "ABOUT")
    add_edge("fact-6", "topic-4", "ABOUT")
    add_edge("decision-3", "topic-4", "ABOUT")
    add_edge("person-1", "topic-4", "EXPERT_IN", interaction_type="human-human")
    add_edge("agent-1", "topic-4", "ABOUT", interaction_type="human-ai")

    topic_compliance = add_knowledge(
        "topic-5", "topic",
        "Compliance & Security",
        "Regulatory compliance, security certifications, and data privacy. Includes SOC2, GDPR, and penetration testing.",
        "HQ", "human", "person-18",
        freshness=0.0, half_life=90, blast_radius=5,
    )
    add_edge("decision-8", "topic-5", "ABOUT")
    add_edge("fact-8", "topic-5", "ABOUT")
    add_edge("commitment-7", "topic-5", "ABOUT")
    add_edge("person-18", "topic-5", "EXPERT_IN", interaction_type="human-human")
    add_edge("agent-3", "topic-5", "ABOUT", interaction_type="human-ai")

    topic_growth = add_knowledge(
        "topic-6", "topic",
        "Growth Strategy 2026",
        "Company-wide growth strategy for 2026. Includes mid-market expansion, APAC entry, and enterprise upsell.",
        "HQ", "human", "person-16",
        freshness=0.0, half_life=90, blast_radius=7,
    )
    add_edge("decision-4", "topic-6", "ABOUT")
    add_edge("decision-5", "topic-6", "ABOUT")
    add_edge("fact-4", "topic-6", "ABOUT")
    add_edge("fact-7", "topic-6", "ABOUT")
    add_edge("person-16", "topic-6", "EXPERT_IN", interaction_type="human-human")
    add_edge("person-19", "topic-6", "EXPERT_IN", interaction_type="human-human")

    # Additional facts for richness
    fact_api_perf = add_knowledge(
        "fact-10", "fact",
        "API response time P95 at 340ms",
        "Platform team's latest monitoring report shows API P95 response time at 340ms, within the 500ms SLA. However, billing endpoints are at 780ms due to legacy REST architecture.",
        "NA", "human", "person-3",
        created_at=iso(NOW - timedelta(days=1)),
        freshness=0.0, half_life=7, blast_radius=2,
        team="team-platform",
    )
    add_edge("fact-10", "person-3", "OWNS", interaction_type="human-human")
    add_edge("fact-10", "decision-3", "AFFECTS", label="Validates GraphQL migration decision")

    fact_revenue = add_knowledge(
        "fact-11", "fact",
        "January revenue: $4.2M (+8% MoM)",
        "January 2026 revenue came in at $4.2M, 8% above December. Enterprise segment drove growth. Mid-market flat. APAC pre-revenue.",
        "HQ", "human", "person-17",
        created_at=iso(NOW - timedelta(days=5)),
        freshness=0.1, half_life=30, blast_radius=3,
        team="team-fp-a",
    )
    add_edge("fact-11", "person-17", "OWNS", interaction_type="human-human")
    add_edge("fact-11", "topic-6", "ABOUT")

    fact_hiring = add_knowledge(
        "fact-12", "fact",
        "3 of 12 open positions filled in Q1",
        "Hiring pipeline for Q1 2026: 12 positions approved, 3 filled so far. Engineering roles filling fastest. Sales hiring lagging — need to revisit recruiter strategy.",
        "HQ", "human", "person-19",
        created_at=iso(NOW - timedelta(days=3)),
        freshness=0.0, half_life=14, blast_radius=3,
        team="team-exec",
    )
    add_edge("fact-12", "decision-6", "AFFECTS", label="Hiring progress below plan")
    add_edge("fact-12", "person-19", "OWNS", interaction_type="human-human")

    # Board directive fact (for drift scenario)
    fact_board = add_knowledge(
        "fact-13", "fact",
        "Board directive: focus on enterprise, not mid-market",
        "Board of Directors in January meeting emphasized enterprise-first strategy. Cautioned against spreading too thin into mid-market before achieving $10M ARR in enterprise.",
        "HQ", "human", "person-19",
        created_at=iso(NOW - timedelta(days=35)),
        freshness=0.3, half_life=90, blast_radius=6,
        team="team-exec",
    )
    add_edge("fact-13", "person-19", "OWNS", interaction_type="human-human")
    add_edge("fact-13", "decision-4", "CONTRADICTS", weight=0.8,
             interaction_type="human-human", label="Mid-market expansion contradicts board directive")
    add_edge("fact-13", "topic-6", "ABOUT")

    # Agent-produced facts
    fact_contract_review = add_knowledge(
        "fact-14", "fact",
        "12 vendor contracts reviewed, 2 flagged",
        "Sentinel-Compliance completed review of 12 vendor contracts in batch 12. Two contracts flagged: DataCorp (missing DPA) and CloudSync (auto-renewal clause unfavorable).",
        "HQ", "ai_agent", "agent-3",
        created_at=iso(NOW - timedelta(days=1)),
        freshness=0.0, half_life=30, blast_radius=2,
        team="team-compliance",
    )
    add_edge("fact-14", "person-18", "AFFECTS", interaction_type="human-ai")

    fact_proposal_stats = add_knowledge(
        "fact-15", "fact",
        "Nova-Sales: 23 proposals generated this month",
        "Nova-Sales has generated 23 automated proposals in February so far. 18 used current pricing, 5 used outdated Q3 pricing sheet (including Acme Corp).",
        "NA", "ai_agent", "agent-4",
        created_at=iso(NOW - timedelta(hours=12)),
        freshness=0.0, half_life=7, blast_radius=3,
        team="team-sales-na",
    )
    add_edge("fact-15", "person-6", "AFFECTS", interaction_type="human-ai")
    add_edge("fact-15", "commitment-2", "AFFECTS", label="5 proposals may have wrong pricing")

    # More decisions for realism
    d_emea_expansion = add_knowledge(
        "decision-11", "decision",
        "EMEA sales headcount: +3 in Q1",
        "Approved 3 new EMEA sales hires to support growing pipeline. Focus on DACH and Nordics regions.",
        "EMEA", "human", "person-13",
        created_at=iso(NOW - timedelta(days=18)),
        freshness=0.2, half_life=60, blast_radius=2,
        team="team-sales-emea",
    )
    add_edge("decision-11", "person-13", "DECIDED_BY", interaction_type="human-human")
    add_edge("decision-11", "person-6", "DECIDED_BY", interaction_type="human-human")

    d_infra = add_knowledge(
        "decision-12", "decision",
        "Migrate to Kubernetes by Q3",
        "Infrastructure team approved Kubernetes migration plan. Current ECS setup hitting scaling limits. 3-phase rollout starting with non-critical services.",
        "NA", "human", "person-4",
        created_at=iso(NOW - timedelta(days=10)),
        freshness=0.1, half_life=60, blast_radius=4,
        team="team-infra",
    )
    add_edge("decision-12", "person-4", "DECIDED_BY", interaction_type="human-human")
    add_edge("decision-12", "person-1", "DECIDED_BY", interaction_type="human-human")

    # Additional COMMUNICATES_WITH edges (human-human collaboration)
    add_edge("person-1", "person-9",  "COMMUNICATES_WITH", interaction_type="human-human", label="Weekly cross-region eng sync")
    add_edge("person-5", "person-9",  "COMMUNICATES_WITH", interaction_type="human-human", label="Launch coordination")
    add_edge("person-6", "person-13", "COMMUNICATES_WITH", interaction_type="human-human", label="Global sales alignment")
    add_edge("person-16", "person-19", "COMMUNICATES_WITH", interaction_type="human-human", label="Strategy briefings")
    add_edge("person-17", "person-6",  "COMMUNICATES_WITH", interaction_type="human-human", label="Revenue reviews")
    add_edge("person-1", "person-5",  "COMMUNICATES_WITH", interaction_type="human-human", label="Eng-Product sync")
    add_edge("person-2", "person-3",  "COMMUNICATES_WITH", interaction_type="human-human", label="Technical design reviews")
    add_edge("person-14", "person-15", "COMMUNICATES_WITH", interaction_type="human-human", label="APAC coordination")
    add_edge("person-18", "person-17", "COMMUNICATES_WITH", interaction_type="human-human", label="Legal-finance reviews")
    add_edge("person-12", "person-13", "COMMUNICATES_WITH", interaction_type="human-human", label="EMEA ops-sales sync")

    # AI-AI edges
    add_edge("agent-1", "agent-3", "COMMUNICATES_WITH", interaction_type="ai-ai",
             label="Code review compliance checks")
    add_edge("agent-2", "agent-4", "CONTEXT_FEEDS", interaction_type="ai-ai",
             label="Market data feeds into proposal generation")

    # HANDOFF edges
    add_edge("agent-4", "person-6", "HANDOFF", interaction_type="human-ai",
             label="Proposal requires human approval for deals > $100K")
    add_edge("agent-3", "person-18", "HANDOFF", interaction_type="human-ai",
             label="Flagged contracts need human legal review")
    add_edge("agent-1", "person-2", "HANDOFF", interaction_type="human-ai",
             label="PR ready for code review")

    # Additional EXPERT_IN / CAN_ANSWER
    add_edge("person-4", "topic-4", "CAN_ANSWER", interaction_type="human-human")
    add_edge("person-3", "topic-4", "CAN_ANSWER", interaction_type="human-human")
    add_edge("person-17", "topic-6", "CAN_ANSWER", interaction_type="human-human")
    add_edge("person-8", "topic-1", "CAN_ANSWER", interaction_type="human-human")
    add_edge("person-11", "topic-4", "CAN_ANSWER", interaction_type="human-human")

    # Additional BLOCKS edges
    add_edge("fact-8", "commitment-4", "BLOCKS", label="GDPR non-compliance blocks EMEA launch")
    add_edge("commitment-4", "commitment-3", "BLOCKS", label="EMEA timeline blocks unified launch")

    # AFFECTS edges for scenario richness
    add_edge("commitment-1", "person-7", "AFFECTS", interaction_type="human-human",
             label="Tom managing Acme relationship")
    add_edge("commitment-2", "person-7", "AFFECTS", interaction_type="human-ai",
             label="Tom needs to explain conflicting quotes")
    add_edge("decision-3", "person-3", "AFFECTS", interaction_type="human-human",
             label="Platform team needs to support GraphQL")

    # Ensure every person has at least 2 edges (verify below)
    # Additional edges for less-connected people
    add_edge("person-11", "person-9", "COMMUNICATES_WITH", interaction_type="human-human")
    add_edge("person-10", "fact-3", "OWNS", interaction_type="human-human")
    add_edge("person-15", "decision-5", "AFFECTS", interaction_type="human-human",
             label="Growth team impacted by APAC entry timeline")

    # -----------------------------------------------------------------------
    # Validate: every person + agent appears in >= 2 edges
    # -----------------------------------------------------------------------
    all_entity_ids = set(p["id"] for p in people) | set(a["id"] for a in agents)
    edge_counts = {eid: 0 for eid in all_entity_ids}
    for e in edges:
        if e["source"] in edge_counts:
            edge_counts[e["source"]] += 1
        if e["target"] in edge_counts:
            edge_counts[e["target"]] += 1
    for eid, count in edge_counts.items():
        if count < 2:
            print(f"  WARNING: {eid} has only {count} edge(s)")

    # -----------------------------------------------------------------------
    # Verify all 20 edge types are used
    # -----------------------------------------------------------------------
    used_types = set(e["type"] for e in edges)
    all_types = {
        "DECIDED_BY", "AFFECTS", "OWNS", "BLOCKS", "DEPENDS_ON",
        "CONTRADICTS", "SUPERSEDES", "ABOUT", "MEMBER_OF", "CAN_ANSWER",
        "EXPERT_IN", "COMMUNICATES_WITH", "ASSIGNED_TO", "REPORTS_TO",
        "DELEGATES_TO", "SUPERVISED_BY", "REVIEWS_OUTPUT_OF",
        "CONTEXT_FEEDS", "PRODUCED_BY", "HANDOFF",
    }
    missing_types = all_types - used_types
    if missing_types:
        print(f"  WARNING: Missing edge types: {missing_types}")

    graph = {
        "nodes": nodes,
        "edges": edges,
        "metadata": {
            "generated_at": ISO_NOW,
            "node_count": len(nodes),
            "edge_count": len(edges),
            "company_name": "Meridian Technologies",
        },
    }
    return graph


# ---------------------------------------------------------------------------
# 3. HIERARCHY
# ---------------------------------------------------------------------------

def build_hierarchy(graph):
    """Build semantic zoom hierarchy from graph data."""
    node_map = {n["id"]: n for n in graph["nodes"]}

    def team_health(team_id):
        members = [n for n in graph["nodes"]
                   if n.get("team") == team_id and n["type"] in ("person", "agent")]
        if not members:
            return "green"
        loads = [m.get("cognitive_load", 0) for m in members]
        avg = sum(loads) / len(loads)
        return health_from_load(avg)

    def dept_health(dept_id):
        dept_teams = [t for t in teams if t["department"] == dept_id]
        healths = [team_health(t["id"]) for t in dept_teams]
        order = {"red": 3, "orange": 2, "yellow": 1, "green": 0}
        if not healths:
            return "green"
        worst = max(healths, key=lambda h: order.get(h, 0))
        return worst

    def div_health(div_code):
        div_depts = [d for d in departments if d["division"] == div_code]
        healths = [dept_health(d["id"]) for d in div_depts]
        order = {"red": 3, "orange": 2, "yellow": 1, "green": 0}
        if not healths:
            return "green"
        worst = max(healths, key=lambda h: order.get(h, 0))
        return worst

    # Count alerts per division (will be filled from alerts later)
    div_alerts = {"NA": 3, "EMEA": 2, "APAC": 0, "HQ": 2}

    hierarchy_divisions = []
    for div in divisions:
        div_depts_list = []
        for dept in departments:
            if dept["division"] != div["code"]:
                continue
            dept_teams_list = []
            for t in teams:
                if t["department"] != dept["id"]:
                    continue
                members = [n["id"] for n in graph["nodes"]
                           if n.get("team") == t["id"] and n["type"] in ("person", "agent")]
                team_edges = [e["id"] for e in graph["edges"]
                              if e["source"] in members or e["target"] in members]
                dept_teams_list.append({
                    "id": t["id"],
                    "name": t["name"],
                    "health": team_health(t["id"]),
                    "members": members,
                    "edges": team_edges[:20],  # cap for readability
                })
            div_depts_list.append({
                "id": dept["id"],
                "name": dept["name"],
                "health": dept_health(dept["id"]),
                "teams": dept_teams_list,
            })

        div_node_count = sum(1 for n in graph["nodes"] if n.get("division") == div["code"])
        hierarchy_divisions.append({
            "id": div["id"],
            "name": div["name"],
            "health": div_health(div["code"]),
            "node_count": div_node_count,
            "alert_count": div_alerts.get(div["code"], 0),
            "departments": div_depts_list,
        })

    # Enterprise health = worst division
    order = {"red": 3, "orange": 2, "yellow": 1, "green": 0}
    enterprise_health = max(
        [d["health"] for d in hierarchy_divisions],
        key=lambda h: order.get(h, 0),
    )

    return {
        "enterprise": {
            "id": "enterprise-meridian",
            "name": "Meridian Technologies",
            "health": enterprise_health,
            "divisions": hierarchy_divisions,
        }
    }


# ---------------------------------------------------------------------------
# 4. ALERTS
# ---------------------------------------------------------------------------

def build_alerts():
    return [
        {
            "id": "alert-1",
            "agent": "contradiction",
            "severity": "critical",
            "scope": "NA",
            "headline": "Conflicting pricing sent to Acme Corp",
            "detail": "VP of Sales Sarah Chen verbally committed $20/seat to Acme Corp on Feb 3. Nova-Sales autonomously sent an automated proposal at $15/seat 6 hours ago using the outdated Q3 pricing sheet. Acme Corp now has two conflicting quotes. Estimated deal value: $120K ARR (500 seats).",
            "affected_node_ids": [
                "person-6", "agent-4", "person-7", "commitment-1",
                "commitment-2", "decision-1", "question-3", "topic-1",
            ],
            "resolution": {
                "authority": "person-6",
                "action": "Sarah Chen must contact Acme Corp to confirm $20/seat pricing and retract the automated $15/seat proposal. Nova-Sales pricing database must be updated to reflect February pricing.",
                "endpoint": "/api/resolve/alert-1",
            },
            "estimated_cost": "$30K ARR difference (500 seats x $5/seat/month x 12 months = $30K)",
            "timestamp": iso(NOW - timedelta(hours=5)),
            "resolved": False,
        },
        {
            "id": "alert-2",
            "agent": "contradiction",
            "severity": "critical",
            "scope": "cross-division",
            "headline": "v2.0 launch date conflict: NA says March 15, EMEA says April 1",
            "detail": "NA Product committed to March 15 launch at the company all-hands. Marketing materials in production, press embargo set. EMEA Engineering is working toward April 1 for localization and EU payment gateway integration. Henrik Johansson flagged this in standup but it hasn't reached NA Product. A unified launch on March 15 is impossible without EMEA readiness.",
            "affected_node_ids": [
                "person-5", "person-9", "person-19", "person-12",
                "commitment-3", "commitment-4", "question-2", "topic-3",
            ],
            "resolution": {
                "authority": "person-19",
                "action": "CEO Alex Reeves must convene David Kim (NA Product) and Henrik Johansson (EMEA Eng) to decide: (a) phased launch NA March 15 / EMEA April 1, or (b) unified launch April 1. Marketing must be notified immediately.",
                "endpoint": "/api/resolve/alert-2",
            },
            "estimated_cost": "2-week delay risk + marketing rework ($50K+)",
            "timestamp": iso(NOW - timedelta(hours=8)),
            "resolved": False,
        },
        {
            "id": "alert-3",
            "agent": "staleness",
            "severity": "warning",
            "scope": "NA",
            "headline": "Atlas-Code working on superseded REST v3 spec",
            "detail": "Atlas-Code has been building the billing REST API v3 endpoint for 4 hours. However, the Payments team decided 3 hours ago to switch to GraphQL after Priya Sharma's analysis showed 40% fewer round trips. Atlas-Code's context has not been updated — it is generating code against a superseded specification. Estimated wasted compute: 4 hours of agent time.",
            "affected_node_ids": [
                "agent-1", "person-2", "person-1", "decision-2",
                "decision-3", "fact-1",
            ],
            "resolution": {
                "authority": "person-2",
                "action": "Priya Sharma (supervising engineer) must update Atlas-Code's context to reflect the GraphQL decision. Current REST v3 work should be archived, not deleted, in case of rollback.",
                "endpoint": "/api/resolve/alert-3",
            },
            "estimated_cost": "4 hours agent compute + potential rework",
            "timestamp": iso(NOW - timedelta(hours=3)),
            "resolved": False,
        },
        {
            "id": "alert-4",
            "agent": "silo",
            "severity": "warning",
            "scope": "cross-division",
            "headline": "Duplicate retry logic: NA Payments and EMEA Billing",
            "detail": "NA Payments team (Priya Sharma) and EMEA Billing team (Henrik Johansson, Elena Kowalski) are independently building exponential backoff retry logic for payment failures. Both use the same pattern (jitter + circuit breaker). Zero cross-team communication detected. The Feb 5 payment gateway outage validates the need — but a shared library would save ~2 weeks of engineering time.",
            "affected_node_ids": [
                "person-2", "person-9", "person-10", "fact-2",
                "fact-3", "fact-6", "question-1", "topic-2", "topic-4",
            ],
            "resolution": {
                "authority": "person-1",
                "action": "Marcus Rivera (VP Eng) should schedule a cross-team sync between NA Payments and EMEA Billing to evaluate creating a shared retry library. Recommend pausing EMEA implementation until sync.",
                "endpoint": "/api/resolve/alert-4",
            },
            "estimated_cost": "~2 weeks duplicated engineering effort",
            "timestamp": iso(NOW - timedelta(hours=12)),
            "resolved": False,
        },
        {
            "id": "alert-5",
            "agent": "staleness",
            "severity": "warning",
            "scope": "HQ",
            "headline": "Iris-Research market analysis is 45 days old (half-life: 14 days)",
            "detail": "The Q4 2025 Market Analysis produced by Iris-Research on Dec 24 has a freshness score of 1.8 (critical staleness). This fact has a 14-day half-life but is now 45 days old. Three active decisions depend on this data: mid-market expansion ($2.5M), APAC market entry ($800K), and Q1 hiring plan ($1.8M). Total downstream budget exposure: $5.1M.",
            "affected_node_ids": [
                "agent-2", "person-16", "fact-4", "decision-4",
                "decision-5", "decision-6", "topic-6",
            ],
            "resolution": {
                "authority": "person-16",
                "action": "Catherine Moore (CSO) must commission Iris-Research to produce an updated market analysis immediately. All three dependent decisions should be flagged for re-evaluation once new data is available.",
                "endpoint": "/api/resolve/alert-5",
            },
            "estimated_cost": "$5.1M in decisions based on stale data",
            "timestamp": iso(NOW - timedelta(hours=24)),
            "resolved": False,
        },
        {
            "id": "alert-6",
            "agent": "overload",
            "severity": "info",
            "scope": "HQ",
            "headline": "Catherine Moore (CSO) cognitive load at 88%",
            "detail": "Chief Strategy Officer Catherine Moore has a cognitive load of 88% with 8 active commitments and 6 pending decisions. She is the single point of authority for strategy decisions and supervises Iris-Research. Risk of decision fatigue and bottleneck. No delegate identified for strategy decisions.",
            "affected_node_ids": [
                "person-16", "agent-2", "decision-4", "decision-5",
                "topic-6",
            ],
            "resolution": {
                "authority": "person-19",
                "action": "CEO Alex Reeves should discuss delegation options with Catherine. Consider appointing a VP of Strategy to handle operational strategy decisions and reduce single-point-of-failure risk.",
                "endpoint": "/api/resolve/alert-6",
            },
            "timestamp": iso(NOW - timedelta(hours=48)),
            "resolved": False,
        },
        {
            "id": "alert-7",
            "agent": "drift",
            "severity": "info",
            "scope": "HQ",
            "headline": "Strategy team direction drifting from board directive",
            "detail": "The Board of Directors emphasized enterprise-first strategy in January, cautioning against mid-market expansion before reaching $10M enterprise ARR. However, the Strategy team approved a $2.5M mid-market expansion initiative based on Iris-Research's (now stale) market analysis. Current enterprise ARR is ~$4.2M — well below the $10M threshold. The strategy team's actions contradict the board's stated priority.",
            "affected_node_ids": [
                "person-16", "person-19", "fact-13", "decision-4",
                "fact-4", "topic-6",
            ],
            "resolution": {
                "authority": "person-19",
                "action": "CEO Alex Reeves must reconcile the mid-market expansion initiative with the board directive. Options: (a) pause mid-market expansion until $10M enterprise ARR, (b) present updated analysis to board for revised guidance, (c) scale back mid-market initiative to pilot-only.",
                "endpoint": "/api/resolve/alert-7",
            },
            "estimated_cost": "$2.5M initiative potentially misaligned with board",
            "timestamp": iso(NOW - timedelta(hours=36)),
            "resolved": False,
        },
    ]


# ---------------------------------------------------------------------------
# 5. ASK CACHE
# ---------------------------------------------------------------------------

def build_ask_cache():
    return {
        "queries": {
            "what changed today": {
                "items": [
                    {
                        "type": "answer",
                        "headline": "Billing API architecture switched from REST to GraphQL",
                        "detail": "The Payments team decided 3 hours ago to switch the billing API from REST v3 to GraphQL after Priya Sharma's performance analysis showed 40% fewer round trips for mobile clients. Atlas-Code has not been updated and is still generating REST v3 code.",
                        "division": "NA",
                        "affected_node_ids": ["decision-3", "decision-2", "agent-1", "person-2", "fact-1"],
                        "actions": [
                            {"label": "View decision chain", "route": "/archaeology/decision-3"},
                            {"label": "Update Atlas-Code context", "route": "/resolve/alert-3"},
                        ],
                    },
                    {
                        "type": "contradiction",
                        "headline": "Conflicting Acme Corp pricing discovered",
                        "detail": "Nova-Sales sent Acme Corp a $15/seat proposal this morning, contradicting Sarah Chen's verbal $20/seat commitment from Feb 3. The discrepancy stems from Nova-Sales using an outdated Q3 pricing sheet that wasn't updated after the January price increase.",
                        "division": "NA",
                        "affected_node_ids": ["commitment-1", "commitment-2", "person-6", "agent-4", "question-3"],
                        "actions": [
                            {"label": "View contradiction", "route": "/pulse?highlight=commitment-1,commitment-2"},
                            {"label": "Resolve pricing", "route": "/resolve/alert-1"},
                        ],
                    },
                    {
                        "type": "answer",
                        "headline": "GDPR audit found 3 non-compliant data flows",
                        "detail": "Sentinel-Compliance completed a GDPR audit and flagged 3 EMEA data flows where customer PII transits through US servers before EU processing. This needs immediate remediation and may impact the EMEA v2.0 launch timeline.",
                        "division": "EMEA",
                        "affected_node_ids": ["fact-8", "agent-3", "person-18", "person-12"],
                        "actions": [
                            {"label": "View audit findings", "route": "/pulse?highlight=fact-8"},
                            {"label": "Contact Legal", "route": "/pulse?highlight=person-18"},
                        ],
                    },
                ],
                "highlight_node_ids": [
                    "decision-3", "agent-1", "commitment-1", "commitment-2",
                    "fact-8", "person-6", "person-2",
                ],
            },
            "is anything about to go wrong": {
                "items": [
                    {
                        "type": "contradiction",
                        "headline": "Two conflicting quotes sent to Acme Corp",
                        "detail": "Sarah Chen committed $20/seat verbally. Nova-Sales sent $15/seat via automated proposal. Acme Corp has both documents. If not resolved within 24 hours, the $120K ARR deal is at risk. The client may leverage the lower price or lose trust in Meridian's professionalism.",
                        "division": "NA",
                        "affected_node_ids": ["commitment-1", "commitment-2", "person-6", "agent-4"],
                        "actions": [
                            {"label": "Resolve contradiction", "route": "/resolve/alert-1"},
                            {"label": "View decision chain", "route": "/archaeology/decision-1"},
                        ],
                    },
                    {
                        "type": "staleness",
                        "headline": "Atlas-Code building against superseded specification",
                        "detail": "Atlas-Code has invested 4 hours writing REST v3 billing API code, but the team switched to GraphQL 3 hours ago. Every additional hour increases throwaway work. The agent's context feed is pointing to the superseded decision-2 instead of the new decision-3.",
                        "division": "NA",
                        "affected_node_ids": ["agent-1", "decision-2", "decision-3", "person-2"],
                        "actions": [
                            {"label": "Update agent context", "route": "/resolve/alert-3"},
                            {"label": "View stale context", "route": "/pulse?highlight=agent-1,decision-2"},
                        ],
                    },
                    {
                        "type": "silo",
                        "headline": "NA and EMEA building identical retry logic in parallel",
                        "detail": "Two teams on different continents are independently implementing the same exponential backoff + circuit breaker pattern for payment retry. Zero communication detected between them. Combined, this represents ~4 weeks of engineering time that could be halved with a shared library.",
                        "division": "cross-division",
                        "affected_node_ids": ["fact-2", "fact-3", "person-2", "person-9", "person-10"],
                        "actions": [
                            {"label": "Schedule cross-team sync", "route": "/resolve/alert-4"},
                            {"label": "View silo details", "route": "/pulse?highlight=fact-2,fact-3"},
                        ],
                    },
                ],
                "highlight_node_ids": [
                    "commitment-1", "commitment-2", "agent-1", "decision-2",
                    "fact-2", "fact-3", "person-6", "person-2", "person-9",
                ],
            },
            "why did we switch pricing": {
                "items": [
                    {
                        "type": "answer",
                        "headline": "Enterprise pricing increased from $15 to $20/seat in January",
                        "detail": "In the January 2026 quarterly pricing review, CFO Robert Daniels and VP Sales Sarah Chen approved raising the enterprise tier from $15 to $20/seat effective February 1. The decision was driven by: (1) competitive positioning — Zenith charges $22/seat, (2) enterprise churn at 2.1% being well below target, suggesting price elasticity, and (3) need to fund the mid-market expansion initiative. The quarterly pricing review cadence (decision-7) mandates these reviews every quarter.",
                        "division": "HQ",
                        "affected_node_ids": ["decision-1", "decision-7", "person-17", "person-6", "fact-5"],
                        "actions": [
                            {"label": "View full decision chain", "route": "/archaeology/decision-1"},
                            {"label": "See pricing review process", "route": "/archaeology/decision-7"},
                        ],
                    },
                    {
                        "type": "contradiction",
                        "headline": "Nova-Sales was not updated with new pricing",
                        "detail": "The pricing change was approved and communicated to human sales staff, but Nova-Sales' pricing database was not updated. It continued using the Q3 pricing sheet ($15/seat). This led to 5 proposals being sent with incorrect pricing, including the Acme Corp deal.",
                        "division": "NA",
                        "affected_node_ids": ["agent-4", "fact-15", "commitment-2", "decision-1"],
                        "actions": [
                            {"label": "Update Nova-Sales pricing", "route": "/resolve/alert-1"},
                            {"label": "Review affected proposals", "route": "/pulse?highlight=fact-15"},
                        ],
                    },
                    {
                        "type": "answer",
                        "headline": "NPS impact may be related to pricing confusion",
                        "detail": "January NPS dropped 8 points (72 to 64). 40% of detractors cited pricing confusion. While the pricing increase is justified competitively, the inconsistency between human and AI-generated quotes may be amplifying customer dissatisfaction.",
                        "division": "NA",
                        "affected_node_ids": ["fact-9", "person-20", "topic-1"],
                        "actions": [
                            {"label": "View NPS data", "route": "/pulse?highlight=fact-9"},
                            {"label": "Contact Customer Success", "route": "/pulse?highlight=person-20"},
                        ],
                    },
                ],
                "highlight_node_ids": [
                    "decision-1", "decision-7", "agent-4", "fact-15",
                    "fact-9", "person-17", "person-6", "commitment-1", "commitment-2",
                ],
            },
            "who should be in the payments review": {
                "items": [
                    {
                        "type": "answer",
                        "headline": "Recommended stakeholders for payments review",
                        "detail": "Based on the knowledge graph, the following people have direct expertise or active involvement in payments infrastructure:\n\n1. **Marcus Rivera** (VP Eng) — decision authority for billing architecture, approved GraphQL switch\n2. **Priya Sharma** (Sr Backend Eng) — led GraphQL analysis, supervises Atlas-Code, owns NA retry logic\n3. **James Liu** (Staff Eng) — platform team, owns API performance monitoring\n4. **Anika Patel** (Eng Manager) — infrastructure, handled Feb 5 outage response\n5. **Henrik Johansson** (EMEA Eng Lead) — owns EMEA retry logic, critical for cross-region alignment\n6. **Atlas-Code** (AI Agent) — currently building billing API, needs context update",
                        "division": "cross-division",
                        "affected_node_ids": [
                            "person-1", "person-2", "person-3", "person-4",
                            "person-9", "agent-1",
                        ],
                        "actions": [
                            {"label": "View payments topology", "route": "/pulse?highlight=team-payments,team-billing-emea"},
                            {"label": "Schedule meeting", "route": "/resolve/alert-4"},
                        ],
                    },
                    {
                        "type": "answer",
                        "headline": "Optional attendees based on downstream impact",
                        "detail": "These stakeholders are indirectly affected and may want to attend or receive notes:\n\n- **Elena Kowalski** (EMEA Sr Eng) — working on EMEA retry implementation\n- **David Kim** (Head of Product) — v2.0 launch depends on billing readiness\n- **Sophie Dubois** (EMEA Ops) — operational impact of billing changes in EU",
                        "division": "cross-division",
                        "affected_node_ids": ["person-10", "person-5", "person-12"],
                        "actions": [
                            {"label": "View full impact graph", "route": "/pulse?highlight=topic-4"},
                        ],
                    },
                    {
                        "type": "answer",
                        "headline": "Key topics to cover in the review",
                        "detail": "Based on active issues in the payments domain:\n1. GraphQL migration decision — confirm direction and update Atlas-Code\n2. Retry logic unification — NA and EMEA building independently\n3. Feb 5 outage post-mortem — retry logic would have prevented 80% of failures\n4. v2.0 billing requirements for March 15 / April 1 launch",
                        "division": "NA",
                        "affected_node_ids": ["decision-3", "fact-2", "fact-3", "fact-6", "commitment-3"],
                        "actions": [
                            {"label": "View retry silo", "route": "/pulse?highlight=fact-2,fact-3"},
                            {"label": "View launch timeline", "route": "/pulse?highlight=commitment-3,commitment-4"},
                        ],
                    },
                ],
                "highlight_node_ids": [
                    "person-1", "person-2", "person-3", "person-4",
                    "person-9", "person-10", "agent-1", "team-payments",
                    "team-billing-emea", "topic-4",
                ],
            },
            "what is atlas-code working on": {
                "items": [
                    {
                        "type": "answer",
                        "headline": "Atlas-Code: currently generating REST v3 billing API code (STALE CONTEXT)",
                        "detail": "Atlas-Code is a coding agent supervised by Priya Sharma, assigned to the Payments team in NA Engineering. It has been working for 4 hours on:\n\n1. Building billing REST API v3 endpoint\n2. Writing unit tests for retry logic\n3. Refactoring payment gateway adapter\n\n**CRITICAL**: The team switched from REST to GraphQL 3 hours ago (decision-3), but Atlas-Code's context has not been updated. It is building against a superseded specification (decision-2). Trust level: supervised.",
                        "division": "NA",
                        "affected_node_ids": [
                            "agent-1", "person-2", "person-1", "decision-2",
                            "decision-3", "fact-1",
                        ],
                        "actions": [
                            {"label": "Update agent context", "route": "/resolve/alert-3"},
                            {"label": "View agent topology", "route": "/pulse?highlight=agent-1"},
                            {"label": "View superseded decision", "route": "/archaeology/decision-2"},
                        ],
                    },
                    {
                        "type": "staleness",
                        "headline": "Agent operating on stale context — immediate action needed",
                        "detail": "Atlas-Code's context feed is connected to decision-2 (REST v3 architecture), which was superseded by decision-3 (GraphQL) at 11:30 AM today. The CONTEXT_FEEDS edge from decision-2 to agent-1 is delivering outdated specifications. Every additional hour of work increases throwaway code and delays the actual GraphQL implementation.",
                        "division": "NA",
                        "affected_node_ids": ["agent-1", "decision-2", "decision-3"],
                        "actions": [
                            {"label": "Resolve stale context alert", "route": "/resolve/alert-3"},
                            {"label": "View context feed chain", "route": "/pulse?highlight=agent-1,decision-2,decision-3"},
                        ],
                    },
                    {
                        "type": "answer",
                        "headline": "Atlas-Code interaction summary",
                        "detail": "Atlas-Code interacts with:\n- **Priya Sharma** — supervising engineer, delegates code generation\n- **Marcus Rivera** — VP Eng, reviews output\n- **Sentinel-Compliance** — AI-AI communication for compliance checks on generated code\n- **Billing Infrastructure** topic — primary domain\n- **Payment Retry Logic** topic — secondary involvement via retry test generation\n\nAtlas-Code's handoff protocol requires Priya's code review before any PR is merged.",
                        "division": "NA",
                        "affected_node_ids": ["agent-1", "person-2", "person-1", "agent-3", "topic-4"],
                        "actions": [
                            {"label": "View agent relationships", "route": "/pulse?highlight=agent-1"},
                        ],
                    },
                ],
                "highlight_node_ids": [
                    "agent-1", "person-2", "person-1", "decision-2",
                    "decision-3", "fact-1", "topic-4",
                ],
            },
        },
    }


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    os.makedirs(MOCK_DIR, exist_ok=True)
    os.makedirs(UI_MOCK_DIR, exist_ok=True)

    print("Building Meridian Technologies synthetic data...")
    print()

    # 1. Company Structure
    cs = build_company_structure()
    with open(os.path.join(MOCK_DIR, "company_structure.json"), "w") as f:
        json.dump(cs, f, indent=2)
    print(f"  company_structure.json — {cs['people_count']} people, {cs['agent_count']} agents, {cs['team_count']} teams")

    # 2. Graph
    graph = build_graph()
    with open(os.path.join(MOCK_DIR, "graph.json"), "w") as f:
        json.dump(graph, f, indent=2)
    print(f"  graph.json — {graph['metadata']['node_count']} nodes, {graph['metadata']['edge_count']} edges")

    # Validate node/edge counts
    node_types = {}
    for n in graph["nodes"]:
        node_types[n["type"]] = node_types.get(n["type"], 0) + 1
    print(f"    Node breakdown: {node_types}")

    edge_types = {}
    for e in graph["edges"]:
        edge_types[e["type"]] = edge_types.get(e["type"], 0) + 1
    print(f"    Edge types used: {len(edge_types)}/20")
    for etype, count in sorted(edge_types.items()):
        print(f"      {etype}: {count}")

    # 3. Hierarchy
    hierarchy = build_hierarchy(graph)
    with open(os.path.join(MOCK_DIR, "hierarchy.json"), "w") as f:
        json.dump(hierarchy, f, indent=2)
    print(f"  hierarchy.json — {len(hierarchy['enterprise']['divisions'])} divisions")

    # 4. Alerts
    alerts = build_alerts()
    with open(os.path.join(MOCK_DIR, "alerts.json"), "w") as f:
        json.dump(alerts, f, indent=2)
    print(f"  alerts.json — {len(alerts)} alerts")

    # 5. Ask Cache
    ask_cache = build_ask_cache()
    with open(os.path.join(MOCK_DIR, "ask_cache.json"), "w") as f:
        json.dump(ask_cache, f, indent=2)
    print(f"  ask_cache.json — {len(ask_cache['queries'])} cached queries")

    # Copy to UI
    print()
    print("Copying to nexus-ui/public/mock_data/...")
    for fname in os.listdir(MOCK_DIR):
        if fname.endswith(".json"):
            src = os.path.join(MOCK_DIR, fname)
            dst = os.path.join(UI_MOCK_DIR, fname)
            shutil.copy2(src, dst)
            print(f"  {fname} -> nexus-ui/public/mock_data/{fname}")

    print()
    print("Done! All synthetic data generated successfully.")

    # Final validation
    print()
    print("=== VALIDATION ===")

    # Check all 5 scenarios
    scenarios = [
        ("Scenario 1: Human-AI Contradiction", ["commitment-1", "commitment-2"]),
        ("Scenario 2: AI Stale Context", ["decision-2", "decision-3", "agent-1"]),
        ("Scenario 3: Silo Detection", ["fact-2", "fact-3"]),
        ("Scenario 4: Stale Fact", ["fact-4", "decision-4", "decision-5", "decision-6"]),
        ("Scenario 5: Cross-Division Contradiction", ["commitment-3", "commitment-4"]),
    ]

    node_ids = set(n["id"] for n in graph["nodes"])
    for name, required_ids in scenarios:
        present = all(rid in node_ids for rid in required_ids)
        status = "PASS" if present else "FAIL"
        print(f"  [{status}] {name}")

    # Check edge type coverage
    all_required_types = {
        "DECIDED_BY", "AFFECTS", "OWNS", "BLOCKS", "DEPENDS_ON",
        "CONTRADICTS", "SUPERSEDES", "ABOUT", "MEMBER_OF", "CAN_ANSWER",
        "EXPERT_IN", "COMMUNICATES_WITH", "ASSIGNED_TO", "REPORTS_TO",
        "DELEGATES_TO", "SUPERVISED_BY", "REVIEWS_OUTPUT_OF",
        "CONTEXT_FEEDS", "PRODUCED_BY", "HANDOFF",
    }
    used = set(e["type"] for e in graph["edges"])
    missing = all_required_types - used
    if missing:
        print(f"  [FAIL] Edge type coverage — missing: {missing}")
    else:
        print(f"  [PASS] All 20 edge types used")

    # Check entity edge counts
    entity_ids = set(p["id"] for p in people) | set(a["id"] for a in agents)
    edge_counts = {eid: 0 for eid in entity_ids}
    for e in graph["edges"]:
        if e["source"] in edge_counts:
            edge_counts[e["source"]] += 1
        if e["target"] in edge_counts:
            edge_counts[e["target"]] += 1
    under = {eid: c for eid, c in edge_counts.items() if c < 2}
    if under:
        print(f"  [FAIL] Entities with <2 edges: {under}")
    else:
        print(f"  [PASS] All people/agents have >= 2 edges")

    # Node count in range
    nc = graph["metadata"]["node_count"]
    if 80 <= nc <= 100:
        print(f"  [PASS] Node count: {nc} (target: 80-100)")
    else:
        print(f"  [WARN] Node count: {nc} (target: 80-100)")

    # Edge count in range
    ec = graph["metadata"]["edge_count"]
    if 200 <= ec <= 300:
        print(f"  [PASS] Edge count: {ec} (target: 200-300)")
    else:
        print(f"  [WARN] Edge count: {ec} (target: 200-300)")


if __name__ == "__main__":
    main()
