# NEXUS: Implementation Plan v2

**Hack-Nation MIT x OpenAI | Feb 7-8, 2026 | 24-Hour Build**
**Track: Build the Superhuman AI Chief of Staff**

> Generated on 2026-02-07. Incorporates triad review (Alpha/Beta/Gamma) findings and user elicitation decisions. This document is the **single source of truth** for all implementation decisions. Where it conflicts with IDEATION.md, UI_UX_DESIGN.md, DEMO_FEATURES.md, or NEXUS_Project_Brief_1.md, **this document wins**.

---

## Resolved Decisions

All open questions from v1 are now closed:

| Decision | Resolution | Rationale |
|---|---|---|
| Team size | **4+ people** | Enables ambitious scope with parallelism |
| Data source | **Fully synthetic** | Eliminates Enron curation risk (4-6h saved). All 3 reviewers recommended this. |
| Voice pipeline | **Cut entirely** | Saves 2-3h dev time. Text-only interaction. No Whisper/TTS. |
| Semantic zoom | **Full hierarchical force layouts** | 4-level animated zoom. Allocated to dedicated frontend dev. |
| Backend | **Full FastAPI** | Real API endpoints. Enables live Ask NEXUS + Info Drop. |
| Graph library | **react-force-graph-2d** | Canvas-based, handles 100+ nodes, good React integration. |
| Demo script | **New canonical script** (Section 6.1) | Merges best beats from all 3 prior scripts. 5 beats, not 7. |
| Knowledge unit types | **4 types** (Decision, Fact, Commitment, Question) | Per Project Brief reasoning: "Kept to four for LLM reliability." Sentiment and Ownership Change are cut. |
| Demo mode | **Offline-first with live overlay** | All demo queries have pre-computed responses. Live API enhances but is not required. |

---

## Architecture Overview

NEXUS is a 5-layer system. The **Knowledge Graph is the center** — everything feeds into it or reads from it. The LLM is infrastructure, not the product.

```
DATA SOURCES (Info Drop + Synthetic Pre-load)
        |
        v
  SENSORY SYSTEM (GPT-4o Classification)
        |
        v
  KNOWLEDGE GRAPH (Core — the product)
        |           |
        v           v
  CIRCULATORY    IMMUNE SYSTEM
  (Routing)      (6 Deconfliction Agents)
        |           |
        v           v
      CORTEX (UI: Pulse View + Alerts + Ask NEXUS + Decisions)
        |
        v
  FEEDBACK LOOP (back to Knowledge Graph)
```

---

## Data Schema Contract

> CRITICAL: This schema is the contract between backend and frontend. Both teams build to this. Defined before any code is written.

### graph.json — Main Graph Data

```typescript
interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    generated_at: string;        // ISO timestamp
    node_count: number;
    edge_count: number;
    company_name: string;        // "Meridian Technologies"
  };
}

interface GraphNode {
  id: string;                     // "person-1", "agent-1", "decision-1", etc.
  type: "person" | "agent" | "team" | "decision" | "fact" | "commitment" | "question" | "topic";
  label: string;                  // Display name
  division?: string;              // "NA" | "EMEA" | "APAC" | "HQ"
  department?: string;
  team?: string;

  // Person-specific
  role?: string;
  cognitive_load?: number;        // 0-100
  active_commitments?: number;
  pending_decisions?: number;

  // Agent-specific
  agent_type?: "coding" | "research" | "operations" | "customer";
  trust_level?: "autonomous" | "supervised" | "review_required";
  supervising_human?: string;     // person ID
  active_tasks?: string[];
  delegated_authority_scope?: string;

  // Knowledge unit-specific (Decision, Fact, Commitment, Question)
  content?: string;
  source_type?: "human" | "ai_agent";
  source_id?: string;
  created_at?: string;
  freshness_score?: number;       // 0.0 (fresh) to 2.0+ (stale)
  half_life_days?: number;
  blast_radius?: number;          // Count of downstream dependent nodes
  status?: "active" | "superseded" | "resolved";

  // Visual hints (pre-computed for demo reliability)
  health?: "green" | "yellow" | "orange" | "red";
  size?: number;                  // 20-52, pre-computed from activity
  x?: number;                     // Golden layout position
  y?: number;                     // Golden layout position
}

interface GraphEdge {
  id: string;
  source: string;                 // Node ID
  target: string;                 // Node ID
  type: "DECIDED_BY" | "AFFECTS" | "OWNS" | "BLOCKS" | "DEPENDS_ON"
      | "CONTRADICTS" | "SUPERSEDES" | "ABOUT" | "MEMBER_OF" | "CAN_ANSWER"
      | "EXPERT_IN" | "COMMUNICATES_WITH" | "ASSIGNED_TO" | "REPORTS_TO"
      | "DELEGATES_TO" | "SUPERVISED_BY" | "REVIEWS_OUTPUT_OF"
      | "CONTEXT_FEEDS" | "PRODUCED_BY" | "HANDOFF";
  weight?: number;                // 0-1, communication volume
  interaction_type?: "human-human" | "human-ai" | "ai-ai";
  label?: string;                 // Optional display label
}
```

### hierarchy.json — Semantic Zoom Structure

```typescript
interface Hierarchy {
  enterprise: {
    id: string;
    name: string;                 // "Meridian Technologies"
    health: "green" | "yellow" | "orange" | "red";
    divisions: Division[];
  };
}

interface Division {
  id: string;
  name: string;                   // "North America", "EMEA", etc.
  health: "green" | "yellow" | "orange" | "red";
  node_count: number;             // Aggregate people + agents
  alert_count: number;
  departments: Department[];
}

interface Department {
  id: string;
  name: string;
  health: "green" | "yellow" | "orange" | "red";
  teams: Team[];
}

interface Team {
  id: string;
  name: string;
  health: "green" | "yellow" | "orange" | "red";
  members: string[];              // Node IDs (people + agents)
  edges: string[];                // Edge IDs within this team
}
```

### alerts.json — Immune System Alerts

```typescript
interface Alert {
  id: string;
  agent: "contradiction" | "coordination" | "staleness" | "silo" | "overload" | "drift";
  severity: "critical" | "warning" | "info";
  scope: "cross-division" | "NA" | "EMEA" | "APAC" | "HQ";
  headline: string;
  detail: string;
  affected_node_ids: string[];
  resolution: {
    authority: string;            // Person ID who resolves
    action: string;               // Description of resolution
    endpoint?: string;            // API endpoint to trigger
  };
  estimated_cost?: string;        // "$20K", "$50K-100K"
  timestamp: string;              // ISO timestamp
  resolved: boolean;
}
```

### ask_cache.json — Pre-Computed Ask NEXUS Responses

```typescript
interface AskCache {
  queries: {
    [normalized_query: string]: {
      items: AskResponseItem[];
      highlight_node_ids: string[];  // Nodes to highlight on Pulse View
    };
  };
}

interface AskResponseItem {
  type: "contradiction" | "staleness" | "silo" | "overload" | "drift" | "answer";
  headline: string;
  detail: string;
  division: string;
  affected_node_ids: string[];
  actions: { label: string; route: string }[];
}
```

---

## Phase 0: Data Preparation (Hours 0-3)

### 0.1 Design the Synthetic Company

**What:** Create "Meridian Technologies" — a modern fictional company purpose-built for the demo narrative.

**Company structure:**
- **4 divisions:** North America (NA), EMEA, APAC, HQ/Corporate
- **~12 departments** across divisions (Engineering, Sales, Product, Finance, etc.)
- **~20 teams** across departments
- **20 named humans** (key individuals for demo scenarios)
- **4 AI agents** with distinct roles:
  - `Atlas-Code` — AI coding agent on the Payments team. Currently building billing API integration.
  - `Iris-Research` — AI research agent synthesizing market data for Strategy team.
  - `Sentinel-Compliance` — AI agent reviewing contracts for Legal.
  - `Nova-Sales` — AI sales agent generating proposals and follow-ups.

**Pre-planned demo scenarios (seed these into the data):**
1. **Human-AI Contradiction:** VP of Sales (Sarah Chen) told customer Acme Corp the price is $20/seat in a call. Nova-Sales sent Acme an automated proposal at $15/seat based on last quarter's pricing authority. Two conflicting quotes exist.
2. **AI Stale Context:** Atlas-Code has been working 4 hours on a REST API v3 integration, but the team switched to GraphQL 3 hours ago. Agent is building against a superseded spec.
3. **Silo Detection:** NA Payments team and EMEA Billing team are building semantically similar retry logic independently with zero communication edges.
4. **Stale Fact:** A key market analysis from Iris-Research (half-life: 14 days) is now 45 days old. 3 active decisions depend on it.
5. **Cross-Division Contradiction:** NA Product set launch date for March 15. EMEA Engineering working toward April 1. Neither team knows.

**Output:** `mock_data/company_structure.json` describing org hierarchy, all named individuals, and agent profiles.

**Done when:** JSON file contains 4 divisions, 12+ departments, 20+ teams, 20 named people, 4 AI agents, and all 5 demo scenarios are reflected in the data. Spot-check: every demo scenario can be traced through the data.

### 0.2 Generate Knowledge Units

**What:** Create ~200 knowledge units (Decisions, Facts, Commitments, Questions) attributed to the 20 humans and 4 AI agents.

**Method:** Use GPT-4o with structured output to generate realistic organizational communications and extract atomic units. Provide the company structure as context.

**GPT-4o prompt:**
```
Given this company structure: [company_structure.json]
Generate 200 realistic organizational knowledge units spanning the last 3 months.
Each unit is one of: Decision, Fact, Commitment, Question.

Requirements:
- Each unit has: id, type, content, source_type (human|ai_agent), source_id, created_at, division, department, team
- Include the 5 pre-planned contradiction/silo/staleness scenarios
- Decisions: 25 total (5 cross-division). Each has: decided_by, affects[], supersedes?
- Facts: 80 total. Each has: source, half_life_days, last_validated, dependent_decisions[]
- Commitments: 60 total. Each has: owner, deadline, depends_on[], blocks[], status
- Questions: 35 total. Each has: asked_by, can_answer[], urgency, blocks[], days_open

Return as JSON array matching the GraphNode schema.
```

**Output:** `mock_data/knowledge_units.json`

**Done when:** 200 knowledge units exist with correct types and all required fields. The 5 demo scenarios are clearly present in the data. No unit references a person/agent not in the company structure.

### 0.3 Build the Knowledge Graph

**What:** Construct the full graph from company structure + knowledge units using a Python script.

**Script:** `scripts/build_graph.py`

**Steps:**
1. Create Person nodes from company structure (20 nodes)
2. Create Agent nodes from company structure (4 nodes)
3. Create Team nodes (20 nodes)
4. Create knowledge unit nodes (~200 nodes, but only ~40 rendered on Pulse View at any time due to semantic zoom)
5. Create edges based on knowledge unit metadata:
   - `DECIDED_BY`, `AFFECTS`, `OWNS`, `BLOCKS`, `DEPENDS_ON` from unit fields
   - `DELEGATES_TO`, `SUPERVISED_BY`, `REVIEWS_OUTPUT_OF`, `CONTEXT_FEEDS`, `PRODUCED_BY` for human-AI relationships
   - `CONTRADICTS` for the 2 contradiction scenarios
   - `SUPERSEDES` for decision chains
   - `COMMUNICATES_WITH` for human-human and human-AI communication
   - `MEMBER_OF` for team membership
6. Compute derived scores:
   - `freshness_score` = days_since_validation / half_life_days (for Facts)
   - `cognitive_load` = active_commitments * 10 + pending_decisions * 15 + communication_volume * 5 (for Persons)
   - `blast_radius` = BFS count along DEPENDS_ON + AFFECTS edges (for Decisions)
   - `health` = green (<40 load), yellow (40-65), orange (65-85), red (>85)
   - `size` = map(active_commitments + pending_decisions, [0,10], [20,52])
7. Build hierarchy.json from team/department/division structure
8. Build alerts.json from the 5 pre-planned scenarios + any detected contradictions
9. Build ask_cache.json with pre-computed responses for 5 demo queries
10. Pre-compute golden layout: run force simulation, let it converge, save (x, y) positions

**Output:** `mock_data/graph.json`, `mock_data/hierarchy.json`, `mock_data/alerts.json`, `mock_data/ask_cache.json`

**Done when:** Graph renders 80-100 nodes with correct shapes, all 5 demo scenarios appear in alerts, hierarchy has 4 levels, ask_cache has responses for "What changed today?", "Is anything about to go wrong?", "Why did we switch pricing?", "Who should be in the payments review?", "What is Atlas-Code working on?"

### 0.4 Pre-Compute Embeddings

**What:** Generate embeddings for all knowledge units to enable semantic search in Ask NEXUS.

**Method:** Use `text-embedding-3-large` to embed all 200 knowledge unit content fields. Store alongside graph data.

**Output:** `mock_data/embeddings.json` — `{ [node_id]: number[] }`

**Done when:** All 200 knowledge units have embeddings. Cosine similarity between the two contradiction pairs is > 0.75.

---

## Phase 1: Backend — Knowledge Graph API (Hours 2-8)

### 1.1 FastAPI Server Setup

**What:** Python FastAPI server serving graph data and handling LLM-powered queries.

**Endpoints:**

| Endpoint | Method | Purpose | Response |
|---|---|---|---|
| `/api/graph` | GET | Full graph for Pulse View | `GraphData` |
| `/api/graph/hierarchy` | GET | Hierarchical structure for semantic zoom | `Hierarchy` |
| `/api/graph/node/{id}` | GET | Single node detail with connected edges | `{ node, edges, connected_nodes }` |
| `/api/alerts` | GET | All Immune System alerts | `{ alerts: Alert[] }` |
| `/api/alerts/{id}/resolve` | POST | Resolve an alert | `{ alert, affected_nodes }` |
| `/api/decisions` | GET | All decisions grouped by scope | `{ cross_division: [], by_division: {} }` |
| `/api/decisions/{id}/chain` | GET | Causal chain for decision archaeology | `{ chain: ChainNode[], downstream_impact: [] }` |
| `/api/ask` | POST | Natural language query | `AskResponse` |
| `/api/info` | POST | Info Drop — live ingestion of new information | `{ unit, graph_update, ripple_target }` |
| `/api/feedback` | POST | Submit feedback on a knowledge unit | `{ acknowledged, adjustment }` |

**Demo mode toggle:** Environment variable `NEXUS_DEMO_MODE=true`. When enabled:
- `/api/ask` checks `ask_cache.json` first. If match found, return cached response instantly. If no match, fall through to live GPT-4o.
- `/api/info` processes the input but returns a pre-computed ripple animation target.
- All other endpoints serve from static JSON files.
- If OpenAI API times out (>3s), silently return cached response.

**Done when:** All 10 endpoints return valid JSON. Demo mode works offline. Live mode calls GPT-4o successfully.

### 1.2 Ask NEXUS — LLM Query Engine

**What:** The `/api/ask` endpoint takes a natural language question and returns a structured, graph-aware response.

**How it works:**

1. **Cache check** — If `NEXUS_DEMO_MODE=true`, check `ask_cache.json` for a fuzzy match (cosine similarity > 0.9 with the query embedding). If found, return cached response with 200ms artificial delay (feels more natural than instant).

2. **Query classification** — GPT-4o classifies the query type:
   - "What changed?" → Temporal diff query
   - "Who should be in the meeting?" → Authority/stakeholder query
   - "Is anything about to go wrong?" → Immune System summary
   - "Why did we do X?" → Decision archaeology
   - Free-form → RAG over knowledge units

3. **Graph-augmented RAG:**
   - Embed the query using `text-embedding-3-large`
   - Find top-5 semantically similar knowledge units from pre-computed embeddings
   - For each match, traverse 2 hops in the graph for context
   - Pass query + retrieved context to GPT-4o with structured output format

4. **Response structure:**
   ```json
   {
     "items": [
       {
         "type": "contradiction" | "staleness" | "silo" | "overload" | "drift" | "answer",
         "headline": "...",
         "detail": "...",
         "division": "NA" | "EMEA" | "CROSS-DIVISION",
         "affected_node_ids": ["node-1", "node-2"],
         "actions": [{ "label": "...", "route": "/alerts/alert-1" }]
       }
     ],
     "highlight_node_ids": ["node-1", "node-2", "node-3"]
   }
   ```

**Done when:** 5 cached demo queries return correct responses in <200ms. At least 1 free-form query returns a relevant response via live GPT-4o in <5s.

### 1.3 Info Drop — Live Ingestion Pipeline

**What:** The `/api/info` endpoint accepts raw text, classifies it via GPT-4o, inserts a new knowledge unit into the graph, and returns a ripple target for the Pulse View animation.

**Pipeline:**
1. Receive raw text from Info Drop input
2. Send to GPT-4o with structured output: classify as Decision/Fact/Commitment/Question, extract all fields
3. Create new GraphNode from classified output
4. Compute edges to existing nodes (who it affects, what it relates to)
5. Insert into in-memory graph
6. Return: `{ unit: GraphNode, new_edges: GraphEdge[], ripple_target: string }` (ripple_target = the source node ID for animation)

**Demo script usage:** Presenter types "The Board approved the new pricing at $18/seat effective March 1" into Info Drop. NEXUS classifies it as a Decision, links it to the existing pricing contradiction, and the Pulse View shows a ripple from the Board node. The contradiction alert updates to show it's been partially resolved.

**Done when:** Typing a sentence into Info Drop produces a classified knowledge unit within 3 seconds, and the returned data includes correct edge connections to at least 2 existing nodes.

### 1.4 Decision Archaeology Engine

**What:** Given a decision node ID, traverse backward to construct the full causal chain.

**Algorithm:**
1. Start at the decision node
2. Follow `DEPENDS_ON` edges backward to find informing facts and preceding decisions
3. Follow `SUPERSEDES` edges backward for decision history
4. Follow `BLOCKS` edges backward to find triggering questions
5. For each node: collect type, content, source, date, division, freshness
6. Order chronologically (oldest first)
7. Collect downstream impact: follow `AFFECTS` and `BLOCKS` forward

**Output:** Ordered list of `{ node, relationship_to_next, division }` + `downstream_impact[]`

**Done when:** The pricing decision chain returns 5+ linked nodes spanning 2+ divisions with correct chronological ordering.

### 1.5 Immune System Agents

**What:** Detection logic that runs on graph load and produces alerts.

**Fully implemented (2 agents):**

1. **Contradiction Agent** — Compute embedding similarity between Facts/Decisions in same Topic cluster. For pairs with similarity > 0.75, use GPT-4o to classify as contradiction vs. supersession. Pre-seed 2 contradictions for reliable demo.

2. **Coordination Agent (Human-AI)** — Check all `CONTEXT_FEEDS` edges for staleness (fact updated after agent last synced). Check `REVIEWS_OUTPUT_OF` edges for queue depth. Pre-seed 1 human-AI contradiction + 1 stale context scenario.

**Mocked with pre-computed data (4 agents):**

3. **Staleness Agent** — Pre-computed staleness scores. 2 stale facts with blast radius in alerts.
4. **Silo Agent** — 1 manually identified silo scenario in alerts.
5. **Overload Agent** — 1 person flagged as overloaded (cognitive_load > 85).
6. **Drift Agent** — 1 drift scenario in alerts.

**Done when:** 7 alerts total appear in `/api/alerts`: 2 contradictions, 1 human-AI contradiction, 1 stale context, 1 silo, 1 overload, 1 stale fact chain. Each has headline, detail, affected nodes, and resolution authority.

---

## Phase 2: Frontend — The Cortex (Hours 3-16)

**Framework:** React + TypeScript + Tailwind CSS. Vite for bundling. Dark theme only.

### 2.1 Project Setup and Global Layout (1.5 hours)

**Steps:**
1. `npm create vite@latest nexus-ui -- --template react-ts`
2. Install: `tailwindcss`, `react-router-dom`, `framer-motion`, `react-force-graph-2d`, `lucide-react`
3. Configure Tailwind color tokens:
   ```
   background: #0F1419 (canvas — slightly brighter than v1 for projector visibility)
   sidebar:    #111827
   panels:     #1A2332
   cards:      #1F2937
   text:       #F9FAFB (primary), #D1D5DB (secondary), #9CA3AF (tertiary)
   accent:     #3B82F6 (blue), #22C55E (green), #EAB308 (amber), #F97316 (orange), #EF4444 (red)
   agent:      #06B6D4 (cyan), #8B5CF6 (violet)
   ```
4. Build sidebar (64px fixed left rail): Pulse, Alerts, Ask NEXUS, Decisions icons
5. Build top bar (48px): view title + breadcrumb + stats strip
6. Set up 4 routes: `/pulse`, `/alerts`, `/ask`, `/decisions`
7. Fonts: Inter + JetBrains Mono from Google Fonts

**Done when:** App renders dark shell with sidebar navigation between 4 empty views. Correct fonts and colors visible.

### 2.2 Pulse View — Force-Directed Graph (THE Critical Component)

**Library:** `react-force-graph-2d`

**IMPORTANT: Layer order has been revised from v1. Hexagonal AI nodes are now Layer 1, not Layer 6.**

**Layer 1: Graph with Human + AI Node Shapes (2.5 hours)**
- Render nodes and edges from `/api/graph`
- **Circles for humans, hexagons for AI agents** — custom `nodeCanvasObject` renderer
  - Hexagon: 6-pointed polygon with cyan glow (#06B6D4, 30% opacity blur)
  - Circle: standard with health-color glow
- Trust level badge on agent hexagons: small dot (green/yellow/red) at top-right
- Node size: mapped to pre-computed `size` field (20-52px)
- Node color: mapped to `health` field
- Edges: thin lines, colored by `interaction_type` (white=human-human, cyan=human-AI, violet=AI-AI)
- Force layout: `d3.forceCenter`, `d3.forceManyBody(-80)`, `d3.forceLink`, team-clustering via custom force
- **Load golden layout positions** from graph.json `x`/`y` fields as initial positions. Use very weak forces (alpha=0.05) to give organic movement without disrupting the layout.
- Click handler: select node, open detail panel

**Done when:** Graph renders with hexagons visually distinct from circles. AI agents have cyan glow. Clicking a node selects it. Graph stays stable (no jittering/tangling). 60fps.

**Layer 2: Visual Polish (1.5 hours)**
- Glow effect: larger blurred shape behind each node (same color, 30% opacity)
- Pulse animation: sinusoidal scale (97%-103%, 3s cycle, varied by activity)
- Heartbeat: global opacity oscillation (98%-100%, 2s cycle)
- Edge labels on hover
- Team cluster backgrounds: faint translucent convex hulls behind team groups

**Done when:** Graph feels "alive" — subtle movement visible. Team clusters are visually distinguishable. Edge labels appear on hover.

**Layer 3: Particle Flow on Edges (2 hours)**
- Animated dots flowing along edges
- Dot color matches edge `interaction_type`: white, cyan, violet
- Dot speed: proportional to edge `weight`
- Dot count: 1-5 per edge based on weight
- Implementation: Canvas rendering in `onRenderFramePost`. Track particles as `(edge, t)` where `t` ∈ [0,1]. Advance `t` by `speed * dt` each frame.

**Done when:** Particles flow visibly on at least 10 edges. Different colors for human-human vs. human-AI edges. No frame drops below 30fps.

**Layer 4: Decision Ripple Animation (1 hour)**
- Triggered by button click or Info Drop event
- Concentric circles expand from source node
- Color: blue (#3B82F6) fading to transparent
- Affected nodes flash when ripple reaches them
- Track state: `{ center, radius, maxRadius, opacity }`

**Done when:** Clicking "trigger ripple" on a decision node produces visible expanding circles. 3+ nodes flash when reached.

**Layer 5: Semantic Zoom — Full Hierarchical (4-5 hours)**
- Zoom stack: `[enterprise, division?, department?, team?]`
- L1 (Enterprise): 4-5 large division nodes with aggregate health
- L2 (Division): 8-12 department nodes within selected division
- L3 (Department): 3-6 team nodes within selected department
- L4 (Team): 5-15 person + agent nodes within selected team + knowledge unit connections
- Double-click node: push to zoom stack. Animate: current nodes scale down + fade out, child nodes scale up + fade in. Initialize new force simulation for children.
- Click breadcrumb: pop from stack, reverse animation.
- Stats strip updates at each level: "4 divisions | 47 teams | 2,340 people" → "NA | 3 departments | 580 people" → etc.
- **Performance guarantee:** At any zoom level, <50 nodes are rendered. Force graph never renders hundreds of nodes simultaneously.

**Done when:** Can zoom from L1 to L4 in 3 double-clicks. Breadcrumb shows full path. Animation is smooth (<300ms transition). Can zoom back out via breadcrumb. Stats strip updates correctly.

**Total Pulse View: 11-12 hours (dedicated to Frontend-Graph developer)**

### 2.3 Alerts View (2 hours)

**What:** Scrollable list of Immune System alerts.

**Implementation:**
- Fetch from `/api/alerts`
- Group: "CROSS-DIVISION" pinned top, then per-division sections
- Each alert = expandable card:
  - Severity badge (red/amber/blue) + agent name + division tag + timestamp
  - Headline (16px semibold)
  - Detail text with downstream impact
  - Resolution button → calls `/api/alerts/{id}/resolve`
  - "Trace Decision Chain →" link → navigates to Decision Explorer
  - Feedback widget (Useful / Not useful + reason picker)
- Filter tabs: All, Contradictions, Staleness, Silos, Overload, Drift, Coordination, Resolved

**Done when:** 7 alerts render correctly. Expanding a card shows detail. Resolve button works. "Trace Decision Chain" navigates to correct decision. Filters show correct subsets.

### 2.4 Ask NEXUS View (2 hours)

**What:** Text query interface with structured responses.

**Implementation:**
- Centered text input (48px height, max 640px)
- Submit sends to `/api/ask`
- Loading state: thinking animation with pulsing dots
- Response renders as numbered structured cards (type badge + division tag + detail + action links)
- Per-item feedback widgets (Useful / Not useful)
- Suggested queries below input (clickable): "What changed today?", "Is anything about to go wrong?", "Why did we switch pricing?", "Who should be in the payments review?", "What is Atlas-Code working on?"
- When response includes `highlight_node_ids`, navigate to Pulse View with those nodes highlighted (optional stretch)

**Done when:** Typing a suggested query returns a structured response within 3 seconds (from cache in demo mode). Response cards render with correct badges and formatting. At least 1 free-form query works via live API.

### 2.5 Info Drop — Live Ingestion Input (1.5 hours)

**What:** Minimal text input for typing/pasting new information into NEXUS live.

**Implementation:**
- Text area at bottom-left of Pulse View (collapsible, 200px wide)
- "Drop info into NEXUS" placeholder text
- Submit sends to `/api/info`
- On response: trigger ripple animation on Pulse View from the `ripple_target` node
- Show brief toast: "Classified as [Decision]. Linked to 2 existing items."
- New node appears on graph with a brief glow animation

**Done when:** Typing a sentence and submitting produces a ripple on the Pulse View. Toast shows correct classification. New node is visible on the graph.

### 2.6 Decision Explorer View (3 hours)

**What:** Split-pane view. Left: decision list. Right: causal chain visualization.

**Implementation:**
- Left pane (320px): Scrollable decisions from `/api/decisions`, grouped by scope
- Right pane: When selected, fetch `/api/decisions/{id}/chain` and render as vertical timeline
- Timeline nodes: type badge (colored pill) + division badge + date + headline + freshness indicator
- Vertical connecting line with relationship labels ("informed by", "prompted by", "triggered by")
- Downstream impact section below the chain: commitments grouped by division with status chips
- Correction widget (pencil icon) and endorsement widget (checkmark) on each timeline node — these store feedback via `/api/feedback`

**Done when:** Pricing decision chain renders 5+ nodes with correct chronological order. Division badges show cross-division flow. Downstream impact section lists affected commitments.

### 2.7 Node Detail Panel (1.5 hours)

**What:** Slide-in panel (400px from right) when clicking any node on Pulse View.

**For Person nodes:** Name, role, team, division, cognitive load bar (0-100), active commitments, pending decisions, alerts involving this person, AI agents supervised.

**For Agent nodes:** Name, type, trust level badge, active tasks, delegated authority, supervising human, review queue depth, recent outputs, context feeds with freshness indicators.

**For Decision/Fact/Commitment nodes:** Full content, source attribution, connected nodes, freshness, "View Decision Chain" link.

**Done when:** Clicking a person node shows correct load bar and commitments. Clicking an agent shows trust level and tasks. Panel slides in/out smoothly.

### 2.8 Shared Components (built alongside views, ~1 hour)

- `StatusTag` — pill for on-track/at-risk/overdue/blocked/active/superseded
- `KnowledgeTypeBadge` — DECISION/FACT/COMMITMENT/QUESTION
- `DivisionScopeBadge` — NA/EMEA/APAC/HQ/ENTERPRISE/CROSS-DIV
- `CognitiveLoadBar` — horizontal bar, health-color-mapped
- `FreshnessIndicator` — 8px dot + score
- `FeedbackWidget` — Useful/Not useful with reason picker. Posts to `/api/feedback`.
- `Breadcrumb` — clickable zoom path for Pulse View
- `StatsStrip` — "4 divisions | 47 teams | 2,340 people" bar

### 2.9 NEXUS Memory Panel — Static Mock (1 hour, stretch goal)

**What:** Side panel showing what NEXUS has "learned" about the current user.

**Implementation:** Static JSON with pre-populated data:
- User profile: "Maria Chen, VP Product, NA"
- 27 learned items: "Payments and infrastructure are always relevant to you (learned from 14 'useful' signals)"
- 3 corrections this month
- Preferred briefing time: 7:45am
- Items with "Adjusted based on your feedback" indicator (purple badge)

**Accessed via:** Brain icon in sidebar (5th icon, below the 4 main views).

**Done when:** Panel opens with static learning profile data. Purple badge indicators visible.

---

## Phase 3: Integration and Polish (Hours 14-18)

### 3.1 Connect Frontend to Backend (1.5 hours)

- Wire up all API calls with `fetch` + error handling
- Loading states: skeleton cards, shimmer on graph
- Toast notifications for errors
- **Demo mode fallback:** If any API call fails or times out (>3s), silently load from bundled static JSON in `public/mock_data/`. Presenter never needs to know which mode they're in.

**Done when:** All views load data from API. Switching to demo mode (kill backend) still renders everything from static JSON.

### 3.2 Demo Data Verification (2 hours)

- Walk through entire demo script (Section 6.1) end-to-end
- Verify all 5 scenarios render correctly
- Fix data issues (missing edges, wrong division assignments)
- Ensure Info Drop produces expected ripple
- Verify decision chain renders correct nodes
- Confirm Ask NEXUS cached responses match demo script

**Done when:** Complete demo script runs without any data-related issues. Every click in the script produces the expected visual result.

### 3.3 Animation Tuning (1.5 hours)

- Tune force graph physics per zoom level
- Tune particle speed and colors
- Tune ripple animation timing
- Tune zoom transition easing (target: 250ms)
- Tune heartbeat pulse timing
- **Save golden layout:** Run force simulation, let converge, save final (x,y) positions to graph.json
- **Test on external display** at least 2 hours before demo. Verify dark theme is visible on projector (the `#0F1419` background should be dark but not black).

**Done when:** Graph looks consistently good on both laptop and external display. Animations run at 60fps. Golden layout saved.

### 3.4 Feedback System Verification (30 minutes)

- Verify Feedback widgets on Alerts and Ask NEXUS post to `/api/feedback`
- Verify NEXUS Memory panel (if built) shows static learning data
- Ensure feedback interactions are part of the demo script rehearsal

---

## Phase 4: Demo Preparation (Hours 18-21)

### 4.1 Screen Recording Backup (30 minutes)

- Record the full demo script as a video
- If the app crashes during live demo, play the recording while narrating

### 4.2 Pitch Deck (30 minutes, only if slides required)

- Slide 1: "NEXUS: The Organizational Nervous System" (title)
- Slide 2: "The Problem" (3 bullet points: coordination gap, human-AI misalignment, $X cost)
- Slide 3: "Live Demo" (switch to app)
- Slide 4: "Architecture" (5-system diagram)
- Slide 5: "The Vision" (enterprise scale, market opportunity)

### 4.3 Demo Environment Setup (30 minutes)

- Test WiFi connectivity at venue
- Test audio/display hardware
- Verify demo mode works offline
- Confirm external display renders correctly

---

## Phase 5: Rehearsal (Hours 21-24)

### 5.1 Full Demo Rehearsal (2 hours)

- Run through complete demo script 3-4 times
- Time each beat. Adjust pacing.
- Identify UI glitches or data inconsistencies
- Practice transitions between views
- Practice Info Drop typing speed (should feel natural, not rushed)

### 5.2 Performance Check (30 minutes)

- Verify 60fps on Pulse View with demo dataset
- Verify semantic zoom transitions <300ms
- Verify particles don't cause frame drops
- Test on actual demo display hardware

### 5.3 Network Independence (30 minutes)

- Kill backend. Verify frontend runs from static JSON.
- Kill WiFi. Verify everything still works.
- Verify pre-computed Ask NEXUS responses render correctly in offline mode.

---

## 6. Canonical Demo Script (3 Minutes)

> This is the AUTHORITATIVE demo script. All other demo scripts in other documents are superseded.

### 5 Beats, ~35 seconds each, with 15 seconds buffer total.

| Beat | Time | View | Action | Narration |
|---|---|---|---|---|
| **1. The Pulse** | 0:00–0:35 | Pulse (L1→L4) | App loads at L1 showing 4 division nodes pulsing. Double-click NA → Engineering → Payments. Hexagons and circles visible at L4. | "This is NEXUS. A living map of an organization — every human, every AI agent, every flow of information. Watch — three clicks from the entire company down to 5 people and 2 AI agents on the Payments team. Those hexagons are AI agents. The particles flowing between them are knowledge moving in real-time." |
| **2. The Catch** | 0:35–1:15 | Pulse → Alerts | Red alert badge visible. Click into Alerts. Expand the human-AI contradiction card. | "See that red alert? NEXUS caught something no human would see. The VP quoted $20/seat to Acme Corp, but the AI sales agent sent them $15/seat three hours earlier based on last quarter's pricing. Two conflicting quotes to the same customer. NEXUS shows the conflict, the customer impact, and who resolves it. One click." |
| **3. The Trace** | 1:15–1:50 | Decisions | Click "Trace Decision Chain" on the pricing alert. Timeline renders. | "Where did this pricing decision come from? NEXUS traces backward — a board directive, informed by a market analysis from the AI research agent, triggered by a CFO question from last quarter. Three weeks of organizational history in 30 seconds. A new hire understands in a minute what took the org a month to figure out." |
| **4. Ask + Info Drop** | 1:50–2:25 | Ask NEXUS → Pulse | Type "Is anything about to go wrong?" See structured response with 3 items. Then switch to Pulse, type into Info Drop: "Board approved $18/seat pricing effective March 1." Watch ripple animation. | "You can just ask. Three enterprise-wide risks in 3 seconds. And watch — I drop in a new decision. NEXUS classifies it, links it to the existing pricing conflict, and shows the ripple through the organization in real-time." |
| **5. The Vision** | 2:25–3:00 | Pulse (L1) | Zoom back out to L1. Full enterprise pulsing. | "Every company is becoming a hybrid organization — humans and AI, side by side. But without a nervous system connecting them, it's chaos. NEXUS is that nervous system. 50 people or 50,000 — same interface, same intelligence. It catches contradictions across divisions, traces decisions across teams, and coordinates every human and every AI agent. The AI Chief of Staff." |

### Backup Scenarios

| If this breaks... | Do this instead |
|---|---|
| Semantic zoom fails | Start at L4 (team level). Skip the zoom moment. |
| Ask NEXUS is slow | Use a suggested query (cached). Show the response while it loads. |
| Info Drop fails | Skip the Info Drop beat. Spend more time on the decision chain. |
| Graph doesn't render | Play screen recording. Narrate over it. |
| API is down | App auto-falls back to static JSON. Presenter doesn't need to know. |

---

## 7. Cut Lines (What to Drop When Behind Schedule)

These are predetermined. Do NOT debate them at 2am. Follow the table.

| Hours Behind | What to Cut | Time Saved | Impact on Demo |
|---|---|---|---|
| **-2h** | Command palette (Cmd+K) + NEXUS Memory panel | 2h | Zero. Neither is in the demo script. |
| **-4h** | Particle flow (Pulse Layer 3) + Decision ripple (Layer 4) | 3h | Minor. Graph still looks alive from pulse/glow. Info Drop ripple is cut but ingestion still works. |
| **-6h** | Semantic zoom → replace with dropdown selector that swaps pre-filtered views | 3-4h | Moderate. Lose the "three clicks" moment. Replace with "select a team" dropdown. |
| **-8h** | Info Drop + live Ask NEXUS → all responses from cache | 3h | Moderate. Lose the live ingestion moment. Ask NEXUS still "works" from cache. |
| **-10h+** | **Go full MVP.** No backend. Static JSON only. Pulse View Layers 1-2 only. 3 alert cards. 1 static decision timeline. | Saves everything. | Still demonstrates: living graph with hexagons, immune system alerts, decision archaeology. Covers all 7 judging criteria. |

---

## 8. Team Division (4+ People)

| Role | Person | Scope | Hours | Start |
|---|---|---|---|---|
| **Data + Backend** | Dev A | Phase 0 (synthetic data) + Phase 1 (API) + embeddings | 12-14h | Hour 0 |
| **Frontend — Graph** | Dev B | Phase 2.1 setup + Phase 2.2 (ALL Pulse View layers including semantic zoom) | 12-14h | Hour 1 (after schema agreed) |
| **Frontend — Views** | Dev C | Phase 2.3 (Alerts) + 2.4 (Ask) + 2.5 (Info Drop) + 2.6 (Decisions) + 2.7 (Detail Panel) + 2.8 (Shared) | 10-12h | Hour 1 (after schema agreed) |
| **Integration + Demo** | Dev D | Phase 3 (integration, polish, animation tuning) + Phase 4 (demo prep) + Phase 5 (rehearsal) | 8-10h | Hour 12 (after features exist) |

**Parallelism:** Dev B and Dev C work against mock data from `public/mock_data/` from Hour 1. Dev A delivers real data at Hour 3-4. Dev D begins integration at Hour 12.

**First 30 minutes (all together):**
1. Review this spec
2. Agree on the data schema contract (Section: Data Schema Contract)
3. Set up repo: monorepo with `nexus-ui/` (React) and `nexus-api/` (FastAPI)
4. Dev A starts data generation
5. Dev B runs `npm create vite` and builds shell
6. Dev C helps Dev B with setup, then starts on shared components

---

## 9. Tech Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + TypeScript + Vite | SPA framework |
| Styling | Tailwind CSS | Dark theme design system |
| Graph Viz | react-force-graph-2d | Pulse View force-directed graph |
| Animation | Framer Motion + Canvas API | UI transitions + particle flow |
| Icons | Lucide React | Consistent icon set |
| Backend | Python + FastAPI | API server |
| Graph Data | NetworkX (Python) | Knowledge graph construction |
| LLM | OpenAI GPT-4o (structured output) | Data generation, query answering, classification |
| Embeddings | text-embedding-3-large | Semantic similarity for RAG + contradiction detection |
| Data | Fully synthetic (Meridian Technologies) | Purpose-built demo dataset |

---

## 10. Deferred Features (Explicitly NOT in Scope)

These features exist in other documents but are **intentionally cut** from the hackathon build:

- Voice pipeline (Whisper + TTS) — cut per user decision
- Time slider / historical graph state — requires temporal versioning, too complex
- Topic filter on Pulse View — nice-to-have, not in demo script
- Admin Calibration Dashboard — enterprise feature, not for demo
- Context Pack / Onboarding Time Machine — would require a 5th view, not enough time
- Cognitive Load Heatmap — the health colors on nodes already convey this
- AI Agent Trust Level management — trust badges are shown but not editable

---

## 11. Acceptance Criteria Summary

The demo is ready when ALL of these pass:

- [ ] Pulse View renders with hexagons (AI) and circles (humans) visually distinct
- [ ] Semantic zoom works L1→L4 in 3 double-clicks with smooth animation
- [ ] Breadcrumb navigation works to zoom back out
- [ ] Particle flow visible on edges with correct colors (white/cyan/violet)
- [ ] 7 alerts render in Alerts view with correct severity and detail
- [ ] Human-AI contradiction alert shows both conflicting quotes and customer impact
- [ ] Decision archaeology chain renders 5+ nodes for pricing decision
- [ ] Ask NEXUS returns structured response for 5 cached queries in <1s
- [ ] At least 1 free-form query works via live GPT-4o
- [ ] Info Drop classifies input and triggers Pulse View ripple
- [ ] Node detail panel shows correct data for person, agent, and decision nodes
- [ ] Demo mode works fully offline (no backend, no WiFi)
- [ ] Full demo script completes in under 3 minutes
- [ ] App renders correctly on external display / projector
- [ ] Screen recording backup exists

---

*Every company's information flows blindly. NEXUS makes it intelligent.*
