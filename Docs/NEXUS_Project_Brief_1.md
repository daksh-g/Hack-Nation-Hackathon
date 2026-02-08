# NEXUS

**Organizational Intelligence Layer**

Hack-Nation · MIT Sloan AI Club x OpenAI · Feb 7–8, 2026
Track: Build the Superhuman AI Chief of Staff

> An AI system that turns raw company information into structured knowledge, routes it intelligently across teams and AI agents, detects conflicts and redundancies, and visualizes how work actually flows inside an organization.

---

## At a Glance

| | |
|---|---|
| **What** | An AI operating system that ingests information, structures it, routes it to the right people and AI agents, and detects misalignment — visualized as a living organizational graph. |
| **Why** | Hybrid workforces (humans + AI agents) have no coordination layer. Decisions drift, context goes stale, work duplicates, agents operate on outdated information. |
| **Insight** | AI agents are first-class organizational actors — with profiles, task loads, delegation chains, and trust levels — in the same graph as human workers. |
| **Demo** | Living graph visualization with animated information flow, contradiction alerts, voice briefings, and real-time delegation routing. |
| **Stack** | FastAPI, SQLite, NetworkX, OpenAI GPT-4o (structured outputs, embeddings, Whisper, TTS), React / Next.js, D3.js, WebSockets |
| **Scope** | Hack-on-demo only. No live integrations. All inputs simulated via info-drop box + pre-loaded data. Architecture + intelligence + clarity, not production polish. |

---

## System Map

Five layers. Each with a clear input and output. Information flows top to bottom.

| Layer | Purpose | Mechanism | Output |
|---|---|---|---|
| **Intake** | Receives raw information from manual input box or pre-loaded data | Text input → Information Objects with metadata (source, timestamp, tags) | Structured info objects in canonical store |
| **Analyst** | Classifies and enriches every info object into structured knowledge | GPT-4o structured outputs: type, domain, urgency, effort, dependencies, confidence | Decision, Fact, Commitment, Question objects |
| **Ledger** | Stores all knowledge in a versioned, append-only graph | NetworkX graph. Person, Agent, Team, Topic, Claim nodes. SUPERSEDES / CONTRADICTS edges | Queryable truth graph with time-travel |
| **Operator** | Routes knowledge to the right actor and delegates tasks | Relevance scoring + agent delegation logic. Hierarchical: company → division → team → individual | Task assignments, briefings, escalation signals |
| **Oversight** | Detects conflicts, redundancies, overload, and drift | Contradiction Agent + Staleness Agent (built); Silo, Overload, Drift (mocked) | Conflict tickets, revalidation alerts, load warnings |

---

## Interface Views

Three views. Clean, minimal, zero clutter. Every pixel earns its place.

| View | What It Shows | Interaction |
|---|---|---|
| **Pulse** | Full-screen animated org graph. Nodes = people (circles) and AI agents (hexagons). Edges = animated information flow. Color = health status. Size = activity level. | Click node → drill into sub-graph. Time slider. Topic filter. Contradiction zones glow red. |
| **Briefing** | Voice-driven or text query interface. "What changed today?" returns a triaged, role-specific summary. Shows affected graph nodes simultaneously. | Voice in (Whisper) → GPT-4o reasoning → voice out (TTS) + Pulse animation sync. |
| **Context Pack** | Onboarding view for new stakeholders. 5 key decisions for their role, key people + agents, open tensions, active commitments. | Auto-generated from graph. Targeted to role. 5 minutes to full context. |

---

## Judging Criteria Alignment

| Criterion | How NEXUS Delivers |
|---|---|
| **Communication Intelligence** | 4 claim types from human + AI sources; relevance-scored routing; load-aware delivery |
| **Knowledge Graph** | Temporal versioning, 5 node types (incl. Agent), SUPERSEDES / CONTRADICTS edges, decision archaeology |
| **UI & Visualization** | Pulse: circles vs hexagons, animated flow, decision ripples, health colors, time slider, topic filter |
| **UX & Interaction** | Voice-first briefings, zero-click onboarding via Context Pack, info-drop input box |
| **Creativity & Moonshot** | Hybrid org thesis: AI agents as first-class graph actors. Not a chatbot — an intelligence layer |
| **Deconfliction** | Contradiction, Staleness, Silo, Overload, and Drift detection with resolution routing |
| **Demo Quality** | Story-driven 7-scene demo. Dramatic tension. Hybrid workforce moment. Moonshot close. |

---

## Architecture

### Backend Design

> **Design Principles:** Single source of truth. Event-driven pipeline. LLMs are stateless and reproducible. Every step is inspectable. Graceful degradation: if an LLM fails, the system still works, just dumber.

#### Data Flow

```
Info Drop → INFO_CREATED → Analyst Worker → INFO_CLASSIFIED → Enrichment Worker → TASK_CREATED → Operator → TASK_ASSIGNED → Oversight → CONFLICT_DETECTED
```

#### API Layer

Thin, stateless. Validates input, emits events. Never does intelligence.

- **POST /info** — accepts info-drop text, creates Information Object, emits INFO_CREATED
- **GET /graph** — returns current graph state for Pulse rendering
- **GET /node/:id** — returns detail for drill-down (sub-graph, tasks, health)
- **POST /simulate** — loads pre-built scenario data for demo
- **WS /stream** — WebSocket for live Pulse updates (new events, assignments, conflicts)

#### Event Queue

Decouples ingestion from processing. If an LLM call fails, events wait in queue — they don't crash the system. For hackathon: Redis streams or a simple in-memory queue.

#### Processing Workers

Independent, stateless, idempotent. Each worker can be retried or swapped.

| Worker | Trigger | Action | Output |
|---|---|---|---|
| **Classifier** | INFO_CREATED | GPT-4o structured output: type (Decision / Fact / Commitment / Question), domain, urgency, confidence | Emits INFO_CLASSIFIED |
| **Enricher** | INFO_CLASSIFIED | Second LLM pass: estimated effort, dependencies, required skills, risk level, priority score | Emits TASK_CREATED |
| **Conflict Scanner** | TASK_CREATED + periodic sweep | Embedding similarity scan across same-topic claims. GPT-4o classify: contradicts vs supersedes | Emits CONFLICT_DETECTED or creates SUPERSEDES edge |

#### Storage

| Store | Contains | Properties |
|---|---|---|
| **Canonical** | All Information Objects, Task Objects, Decision Objects, Conflict Objects | SQLite. Append-only. Immutable. Source of truth. Everything else derives from this. |
| **Graph** | Person, Agent, Team, Topic, Claim nodes + edges (AFFECTS, DEPENDS_ON, CONTRADICTS, SUPERSEDES, etc.) | NetworkX. Derived from canonical store. Rebuildable. Temporal via created_at. |
| **Cache** | Graph snapshots for Pulse rendering, pre-computed health scores, briefing caches | In-memory dict or Redis. If it dies, recompute. Never authoritative. |

#### Agent Architecture

One agent per graph node. Agents are not long-running processes — they are policy + prompt + permissions, invoked when a task enters their scope.

- **Company Agent** — receives all tasks, decides which division
- **Division Agent** — routes to appropriate team
- **Team Agent** — assigns internally or escalates
- **Individual Agent** — accepts task (simulated execution)

Agents only: route, assign, escalate, flag. They never mutate state directly — they emit events.

#### Failure Model

This is what makes the architecture defensible under questioning.

- **LLM fails:** event stays in queue, retry with backoff. System still stores and displays info.
- **Graph store fails:** rebuild from canonical store. No data loss.
- **Cache fails:** UI slower, not broken. Recompute on demand.
- **One worker fails:** others continue. No global crash.

---

### Frontend Design

> **Design Language:** Apple-minimal. Dark UI with strategic color. No gradients, no shadows, no rounded-everything. Monospace for data, sans-serif for labels. White space is a feature, not a waste.

#### Pulse (Hero Feature)

Full-screen. Dark background (#0A0A0A). The graph is the entire interface.

- **People** = circles. Sized by activity. Border color = health.
- **AI Agents** = hexagons. Distinct cyan accent. Visually separated at a glance.
- **Teams** = clusters. Gravity-grouped via force layout. No explicit boundaries — proximity implies membership.
- **Edges** = thin animated lines. Particles flow along them showing direction. White = human-human. Cyan = human-AI. Subtle, not flashy.
- **Events** = when new info enters, a ripple expands from the source node. When a conflict is detected, the zone pulses red once, then settles to a steady red border.
- **Click** any node to zoom. Sub-graph expands. Side panel shows: incoming info, outgoing tasks, current load, health indicators.
- **Time slider** at bottom. Scrub to see historical state. Everything else dims except the selected timeframe.
- **Topic filter** top-right. Select a topic → everything unrelated fades to 10% opacity.

**Tech:** D3.js force-directed layout on dark canvas. SVG for nodes, CSS animations for particles. WebSocket for live updates.

#### Info Drop (Input)

Minimal text box. Bottom-left of Pulse view. Type or paste a message, update, or document snippet. Hits POST /info. The new information appears as a ripple on the graph within seconds.

#### Briefing Panel

Right-side slide-out. Triggered by voice ("What changed?") or click. Shows triaged summary: blockers on your work, decisions that affect you, commitment status, load warnings. 90-second read.

#### Context Pack

Full-screen overlay for onboarding. Five clean pages: your team (mini Pulse), 5 key decisions, key people + agents, open questions, active commitments. Auto-generated from graph.

---

## Knowledge Model

### Four Claim Types

Every piece of information is decomposed into one or more of these. Kept to four for LLM reliability.

| Type | What It Captures | Key Fields |
|---|---|---|
| **Decision** | Something was decided, by whom, affecting what. Carries a supersedes link if it replaces a prior decision. | decided_by, affects[], supersedes, confidence |
| **Fact** | A stated truth with a shelf life. Every fact decays; staleness triggers alerts when downstream decisions depend on it. | source, half_life_days, last_validated, dependent_decisions[] |
| **Commitment** | Someone (human or AI) promised to deliver something by a deadline. Tracked with full dependency awareness. | owner, deadline, depends_on[], blocks[], status |
| **Question** | An unresolved question. Organizational debt. NEXUS knows who can answer and what it blocks. | asked_by, can_answer[], urgency, blocks[], days_open |

### Graph Schema

#### Nodes

- **Person** — role, team, expertise, current load, active commitments
- **Agent** — type (coding / research / ops / customer), capabilities, trust level, supervising human, active tasks
- **Team** — members (human + agent), capacity, current load %, health
- **Topic** — auto-clustered via embedding similarity
- **Claim** — Decision / Fact / Commitment / Question node

#### Edges (Priority Order)

- **MADE_BY** — Claim → Person / Agent
- **ABOUT** — Claim → Topic
- **AFFECTS** — Decision → Team / Person / Agent
- **DEPENDS_ON** — Commitment → Decision
- **BLOCKS** — Commitment / Question → Commitment
- **CONTRADICTS** — Claim → Claim
- **SUPERSEDES** — Claim → Claim (temporal chain)
- **ASSIGNED_TO** — Task → Person / Agent / Team

#### Derived Scores

- **Staleness** = days_since_validation / half_life_days
- **Blast Radius** = BFS count along DEPENDS_ON + AFFECTS edges
- **Load %** = active tasks / capacity (per node)

---

## Oversight Agents

Five detection agents. Two built. Three mocked with pre-computed outputs.

> **Scope:** Build Contradiction Agent and Staleness Agent. Mock Silo, Overload, and Drift with scripted demo data. All five appear in the Pulse visualization.

### Contradiction Agent (Build)

1. On every new claim, compute embedding similarity against existing claims in the same topic cluster.
2. For pairs with similarity > 0.75, run GPT-4o: "Do these contradict, or does B supersede A?"
3. If contradiction: create CONTRADICTS edge, compute blast radius, generate resolution ticket.
4. Route ticket to the person with authority. Flag zone red on Pulse.

### Staleness Agent (Build)

1. Sweep all Fact nodes where staleness_score > 1.0.
2. Traverse DEPENDS_ON to find active Decisions / Commitments at risk.
3. Rank by blast radius. Generate alert: stale fact, what depends on it, who re-validates.

### Mocked Agents

- **Silo:** Two teams with high topic overlap, zero communication. Show overlap warning.
- **Overload:** One person with load > 90%, bus factor > 5. Show bottleneck warning.
- **Drift:** Alignment ratio showing 70% of effort on non-priority work. Show drift chart.

---

## Demo Script

4 minutes. Seven scenes. Story arc, not feature tour.

| # | Scene | Action | Judges See | Time |
|---|---|---|---|---|
| 1 | **Pulse** | Open on full-screen dark Pulse. Organization is alive. Clusters breathe. Particles flow. One zone glows red. | Living intelligence | 0:30 |
| 2 | **Contradiction** | Zoom into red zone. Two conflicting facts. Blast radius: 4 commitments, 2 external communications at risk. Resolution ticket routes to authority. | Conflict detection | 0:45 |
| 3 | **Info Drop** | Live: type a new update into the info-drop box. Watch it flow through the pipeline: classification, graph update, routing, Pulse ripple. Real-time. | End-to-end flow | 0:30 |
| 4 | **Briefing** | Voice: "What changed today?" NEXUS speaks a 45-second personalized briefing. Pulse animates: ripples, fading nodes, new edges. | Voice + visual sync | 0:45 |
| 5 | **Silo** | Highlight two teams with overlapping work. Silo Agent explains duplication. Click "connect" — coordination edge appears. | Proactive insight | 0:20 |
| 6 | **Context Pack** | New stakeholder joins. Context Pack generates: decision timeline, key people + agents, open tensions. Months in a minute. | Instant onboarding | 0:25 |
| 7 | **Close** | Zoom out. Full org. "Every company's information flows blindly. NEXUS makes it intelligent." | Moonshot vision | 0:15 |

---

## Build Order

Sequential. Each phase produces a shippable increment. If time runs out, cut from the bottom.

> **Minimum Viable Demo:** Pulse visualization + info-drop pipeline + one working Oversight agent + voice briefing. This combination can win without anything below phase 5.

| # | Hours | Deliverable | Focus |
|---|---|---|---|
| 1 | 0 – 2 | Data prep. Curate demo dataset (pre-loaded org structure + ~200 info objects). Repo setup. Deps installed. | Backend |
| 2 | 2 – 5 | Intake + Analyst. Info-drop UI → POST /info → GPT-4o classification → SQLite. Four claim types flowing. | Full stack |
| 3 | 5 – 8 | Ledger. NetworkX graph from classified data. Core nodes + edges. SUPERSEDES chains. Derive staleness + blast radius. | Backend |
| 4 | 5 – 10 | Pulse. D3.js force layout on dark canvas. Node shapes. Edge animations. Color coding. Click drill-down. WebSocket live updates. | Frontend |
| 5 | 8 – 11 | Oversight. Contradiction Agent (build). Staleness Agent (build). Resolution tickets rendered on Pulse. | Backend |
| 6 | 10 – 13 | Operator. Relevance scoring. Agent delegation logic. Task routing visible on Pulse as animated edge flows. | Full stack |
| 7 | 11 – 14 | Briefing. Voice loop: Whisper → GPT-4o → TTS. Briefing panel slide-out. Pulse animation sync. | Full stack |
| 8 | 14 – 17 | Context Pack onboarding. Mocked agent outputs (silo, overload, drift). Decision ripple animation. Time slider. | Frontend |
| 9 | 17 – 20 | Polish. Animation smoothness. Transitions. Dark-mode color tuning. Loading states. Exact demo data for 7-scene script. | Frontend |
| 10 | 20 – 24 | Rehearsal. Script timing. Edge-case handling. Backup video. Final polish. | All |

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Pulse jank** | Graph stutters. Kills the "living" impression. | Cap at 150 nodes. requestAnimationFrame. Pre-render if needed. |
| **LLM latency** | Info-drop demo moment has a 5-second pause. | Pre-classify demo inputs. Show Pulse animation during wait. |
| **Extraction errors** | Wrong claim type or missing fields. | Hand-verify all demo data. Structured outputs with strict schema. |
| **Voice loop silence** | Awkward dead air during briefing scene. | Pre-cache the response. Animate Pulse during processing. |
| **Scope creep** | Build all 5 agents, miss Pulse polish. | 2 built, 3 mocked. Visualization always wins. |
| **Demo crash** | Fatal failure during live judging. | Backup video. Pre-loaded states. Reset endpoint. |

---

*Every company's information flows blindly. NEXUS makes it intelligent.*
