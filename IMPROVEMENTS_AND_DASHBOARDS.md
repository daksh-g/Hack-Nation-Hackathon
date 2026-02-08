# NEXUS: Improvements, New Interfaces, and Dashboards

**Purpose**: Concrete proposals to make NEXUS significantly more useful, interactive, and production-ready. Organized by impact tier.

---

## Table of Contents

1. [Tier 1: High-Impact, Quick Wins](#tier-1-high-impact-quick-wins)
2. [Tier 2: New Dashboards & Views](#tier-2-new-dashboards--views)
3. [Tier 3: Improved Interaction Patterns](#tier-3-improved-interaction-patterns)
4. [Tier 4: Data Ingestion Expansion](#tier-4-data-ingestion-expansion)
5. [Tier 5: Intelligence Layer Upgrades](#tier-5-intelligence-layer-upgrades)
6. [Tier 6: Production Infrastructure](#tier-6-production-infrastructure)
7. [Dashboard Wireframes](#dashboard-wireframes)
8. [Priority Matrix](#priority-matrix)

---

## Tier 1: High-Impact, Quick Wins

These can be built in 2-4 hours each and immediately make the system more useful.

### 1.1 Command Center Dashboard (new view: `/command`)

**What**: A single-screen executive overview that combines the most critical information from every module into one glance.

**Layout**:
```
┌──────────────────────────────────────────────────────────┐
│  NEXUS COMMAND CENTER                    Feb 8, 2:30 PM  │
├────────────────┬─────────────────┬───────────────────────┤
│  ORG HEALTH    │  ACTIVE ALERTS  │  LLM USAGE TODAY      │
│  ● 3 critical  │  7 unresolved   │  142 calls            │
│  ● 2 warning   │  2 new today    │  $0.47 spent          │
│  ● 12 healthy  │                 │  84k tokens           │
├────────────────┴─────────────────┴───────────────────────┤
│  COGNITIVE LOAD HEATMAP                                   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                            │
│  │ HQ │ │ NA │ │EMEA│ │APAC│                            │
│  │ 76%│ │ 62%│ │ 45%│ │ 48%│   ← division averages     │
│  └────┘ └────┘ └────┘ └────┘                            │
├──────────────────────────────────────────────────────────┤
│  TOP 5 ACTIONS NEEDED                                     │
│  1. ● Resolve Acme pricing contradiction (Sarah Chen)    │
│  2. ● Update Atlas-Code context (Marcus Rivera)          │
│  3. ○ Merge duplicate retry logic (Henrik + Priya)       │
│  4. ○ Review APAC market timeline (Alex Reeves)          │
│  5. ○ Audit Nova-Sales pricing DB (Catherine Moore)      │
├──────────────────────────────────────────────────────────┤
│  RECENT ACTIVITY FEED                                     │
│  14:28  InfoDrop: "Q1 revenue target revised to $4.2M"  │
│  14:15  Immune: staleness agent found 3 stale facts     │
│  13:50  Ingest: Board meeting transcript processed       │
│  13:42  Ask NEXUS: "Who owns the billing migration?"    │
└──────────────────────────────────────────────────────────┘
```

**Backend**: Composite endpoint `GET /api/command/summary` that aggregates data from graph, alerts, usage, and routing in a single call.

**Why it matters**: Right now users have to click through 4-5 views to understand org state. This gives the full picture in one screen.

### 1.2 Immune System Control Panel (enhance AlertsView)

**What**: Add a "Run Full Scan" button and per-agent scan triggers directly into the AlertsView.

**New UI elements**:
- "Run Full Scan" button → `POST /api/immune/scan` → shows progress spinner → new alerts appear
- 6 agent toggle cards (contradiction, staleness, silo, overload, coordination, drift) — click to run individual scan
- Scan history timeline → `GET /api/immune/history`
- Alert comparison: "Last scan: 7 alerts. This scan: 9 alerts. +2 new."
- One-click resolution with confirmation modal

**Why it matters**: The immune system is the most impressive LLM feature but has zero frontend UI. The backend runs 6 agents in parallel and returns structured findings — it just needs a button.

### 1.3 LLM Usage Dashboard (new view: `/usage`)

**What**: Real-time visibility into LLM spending, model distribution, and per-feature cost.

**Panels**:
- **Total cost today**: big number with sparkline trend
- **Calls by model**: pie chart (gpt-4o vs gpt-4o-mini vs embedding)
- **Calls by feature**: bar chart (immune, ask, briefing, ingest, etc.)
- **Token efficiency**: input vs output ratio per feature
- **Cost per interaction**: average cost of an Ask NEXUS query vs an immune scan
- **Call log table**: sortable, filterable list of every LLM call with timestamps

**Backend**: Already exists — `GET /api/llm/usage` returns all of this data. Just needs a frontend.

### 1.4 Notification Center (sidebar badge + dropdown)

**What**: Show routing notifications in the UI. When InfoDrop or Ingest routes information to people, show it.

**UI**:
- Bell icon in sidebar with unread count badge
- Dropdown panel showing: "Marcus Rivera needs to see: Billing API migration affects 3 of your active commitments"
- Click to acknowledge → `POST /api/routing/acknowledge`
- Filter by person (for demo: let user pick which person's view they're seeing)

**Backend**: Already exists — `GET /api/routing/pending` and `POST /api/routing/acknowledge`.

---

## Tier 2: New Dashboards & Views

### 2.1 People Dashboard (new view: `/people`)

**What**: A person-centric view of the organization. Click any person to see everything NEXUS knows about them.

**Person Profile Card**:
```
┌─────────────────────────────────────────┐
│  👤 Marcus Rivera                        │
│  VP Engineering · NA Division            │
│                                          │
│  Cognitive Load  ████████░░  78%         │
│  Active Tasks    9                       │
│  Pending Decisions  3                    │
│  Bus Factor Score   7 (HIGH RISK)        │
│                                          │
│  ── Connected To ──                      │
│  Priya Sharma (0.85)   Atlas-Code (0.5)  │
│  James Liu (0.7)       David Kim (0.6)   │
│                                          │
│  ── Owns ──                              │
│  Decision: GraphQL migration             │
│  Commitment: Q1 API milestone            │
│                                          │
│  ── Recent Activity ──                   │
│  Feb 7: Approved billing API switch      │
│  Feb 5: Assigned Atlas-Code to payments  │
│                                          │
│  [Generate Briefing]  [View Tasks]       │
└─────────────────────────────────────────┘
```

**Key interactions**:
- Click "Generate Briefing" → streams LLM-generated personalized briefing
- Click "View Tasks" → shows `GET /api/tasks/for/{person_id}`
- Click any connected person → navigate to their profile
- "What if this person left?" → shows bus factor impact analysis

**Backend**: Most data exists in the graph. Add `GET /api/people/{id}/profile` composite endpoint.

### 2.2 Task Board (new view: `/tasks`)

**What**: Kanban-style view of LLM-generated tasks with dependency visualization.

**Columns**: Blocked → Ready → In Progress → Done

**Features**:
- "Generate Tasks" button → `POST /api/tasks/generate` → LLM analyzes org state and creates prioritized task list
- Dependency arrows between cards (task A blocks task B)
- Critical path highlighted in red
- Drag to reassign (updates assigned_to)
- Click task to see: why it was generated, which alert triggered it, who's assigned, what it blocks
- Filter by person, division, priority

**Backend**: Already exists — `POST /api/tasks/generate`, `GET /api/tasks/current`, `POST /api/tasks/{id}/complete`.

### 2.3 Worker Analysis View (new view: `/workers`)

**What**: Visualize workforce conflicts, duplicate efforts, and overload.

**Panels**:
- **Conflict Matrix**: Grid showing who is working on contradictory goals
- **Duplicate Effort Detector**: Side-by-side comparison of overlapping work (e.g., NA Payments vs EMEA Billing retry logic)
- **Overload Heatmap**: People sorted by cognitive load with threshold lines
- **Reallocation Suggestions**: LLM-generated recommendations for redistributing work
- **Human-AI Coordination**: Show which AI agents are supervised by which humans, trust levels, handoff points

**Backend**: Already exists — `POST /api/workers/analyze`, `GET /api/workers/status`.

### 2.4 Ingestion Console (new view: `/ingest`)

**What**: A proper interface for feeding information into NEXUS.

**Tabs**:
1. **Text Input** — paste a meeting transcript, email, or document → `POST /api/ingest`
2. **Quick Drop** — same as InfoDrop but full-screen with more context
3. **History** — log of everything ingested with classification results
4. **Bulk Upload** — paste multiple items separated by `---`

**Post-ingestion display**:
- Classification badge (strategic/technical/etc.) with confidence
- Extracted entities highlighted in the original text
- New graph nodes created (with links to PulseView)
- Contradictions found (with links to AlertsView)
- People notified (with notification details)

### 2.5 Conversation View for Ask NEXUS (enhance `/ask`)

**What**: Transform Ask NEXUS from single-query to persistent conversation.

**Changes**:
- Chat-style UI with message history (user messages + NEXUS responses)
- NEXUS remembers context across the conversation (backend already stores `_conversations`)
- "Deep Dive" mode: ask follow-up questions about previous answers
- Show which graph nodes were retrieved for each answer (expandable section)
- Citation links: click a referenced node to see its detail panel
- Export conversation as markdown

---

## Tier 3: Improved Interaction Patterns

### 3.1 Natural Language Commands

**What**: Let users control NEXUS through natural language instead of clicking buttons.

**Examples**:
- "Run an immune scan" → triggers `POST /api/immune/scan`
- "Show me Sarah Chen's workload" → navigates to People Dashboard for Sarah
- "What would happen if Marcus left?" → runs bus factor analysis
- "Generate tasks for this week" → triggers task scheduler
- "Ingest this: [paste text]" → runs ingestion pipeline
- "Who should I notify about the pricing change?" → runs info routing

**Implementation**: Add a command parser (could be another LLM call or regex patterns) to the Ask NEXUS input. If the query is a command, execute the action instead of doing RAG search.

### 3.2 Proactive Alerts (Push Instead of Pull)

**What**: NEXUS proactively tells users about problems instead of waiting to be asked.

**Mechanisms**:
- **Polling service**: Frontend polls `GET /api/routing/pending` every 30 seconds
- **Toast notifications**: When new alerts are generated, show a toast in the bottom-right
- **Sound alerts**: Optional audio ping for critical-severity findings
- **Daily digest**: Auto-generate morning briefing at a configured time

**Why it matters**: Currently the user has to actively run immune scans and check for problems. A real nervous system would push information to you.

### 3.3 Semantic Search Everywhere

**What**: Add a global search bar to the top bar that searches across all data types.

**What it searches**:
- Graph nodes (people, agents, decisions, facts)
- Alert headlines and details
- Immune scan findings
- Task descriptions
- Routing history

**Implementation**: Use the embedding service — embed the query, search across all indexed content, show results grouped by type.

### 3.4 Graph Interaction Improvements

**What**: Make the PulseView graph more interactive and informative.

**New features**:
- **Right-click context menu**: "Run immune scan on this node", "Generate briefing for this person", "Show all decisions affecting this node"
- **Path highlighting**: Click two nodes to see all paths between them
- **Time travel slider**: Show how the graph looked N days ago (using mutation history)
- **Cluster detection**: Auto-group tightly connected nodes, highlight isolated ones
- **Edge labels on hover**: Show relationship type and weight
- **Multi-select**: Select multiple nodes to see their combined context

---

## Tier 4: Data Ingestion Expansion

### 4.1 Slack/Teams Integration

**What**: Connect NEXUS to communication channels and auto-ingest messages.

**How it works**:
1. Slack bot listens to configured channels
2. Batches messages every 5 minutes
3. Runs through ingestion pipeline: classify → extract → link
4. Updates knowledge graph automatically
5. Routes critical information to relevant people

**Value**: This is the single highest-value improvement. Currently all data is manually entered. Slack integration would make the knowledge graph self-updating.

### 4.2 Email Connector

**What**: Pull emails from a mailbox and ingest them.

**Options**:
- IMAP polling (generic)
- Gmail API (Google Workspace)
- Microsoft Graph API (Outlook/O365)

**Pipeline**: Email → extract body/subject/participants/date → full ingestion pipeline → auto-tag with email thread context.

### 4.3 Document Upload & Parsing

**What**: Upload PDFs, DOCXs, slides, and spreadsheets.

**Pipeline**:
```
File upload → Document parser (PyPDF2/python-docx/etc.)
    → Text chunking (split into ~2000 token chunks)
    → Per-chunk ingestion pipeline
    → Cross-chunk relationship linking
    → Single composite result
```

### 4.4 Meeting Recorder Integration

**What**: Connect to Zoom/Teams/Google Meet recordings.

**Pipeline**: Audio file → Whisper transcription → speaker diarization → per-speaker transcript → ingestion pipeline with participant context.

### 4.5 Calendar Sync

**What**: Ingest calendar events as commitments and scheduling context.

**Value**: NEXUS could know about upcoming meetings, deadlines, and availability — making task scheduling and routing much smarter.

### 4.6 Webhook Receiver

**What**: Generic `POST /api/webhook` endpoint that accepts arbitrary JSON payloads from external systems (Jira, GitHub, PagerDuty, etc.).

**How**: Each webhook type gets a pre-processor that converts the payload to plain text, then runs through the standard ingestion pipeline.

---

## Tier 5: Intelligence Layer Upgrades

### 5.1 Multi-Turn Reasoning Chains

**What**: Instead of single LLM calls, chain multiple reasoning steps for complex questions.

**Example**: "What is the likely impact of losing Marcus Rivera?"
```
Step 1: Identify all of Marcus's commitments and dependencies
Step 2: For each commitment, identify who else could take over
Step 3: For each dependency, estimate the delay if Marcus leaves
Step 4: Aggregate into a risk assessment with timeline
Step 5: Suggest mitigation plan
```

**Implementation**: Agent loop — LLM generates a plan, executes each step, feeds results into next step.

### 5.2 Predictive Alerts

**What**: Instead of detecting current problems, predict future ones.

**New immune agents**:
- **Bottleneck Predictor**: "In 2 weeks, the EMEA billing migration will stall because Henrik is the only person who understands the legacy system"
- **Deadline Risk**: "The Q1 API milestone has a 35% chance of slipping based on current velocity and unresolved blockers"
- **Relationship Decay**: "Communication between NA Engineering and EMEA Engineering has dropped 60% in the last week — risk of silo forming"

### 5.3 Decision Simulation ("What-If")

**What**: Let users ask hypothetical questions and see predicted outcomes.

**Examples**:
- "What if we cancel the APAC expansion?"
- "What if Atlas-Code's trust level is raised to autonomous?"
- "What if we merge NA Payments and EMEA Billing teams?"

**Implementation**: Clone the graph state, apply the hypothetical change, run immune scan + worker analysis on the modified graph, show diff.

### 5.4 Auto-Generated Org Reports

**What**: Scheduled LLM-generated reports summarizing organizational state.

**Report types**:
- **Daily Standup Summary**: What happened yesterday across all divisions
- **Weekly Health Report**: Trends in cognitive load, alert frequency, knowledge freshness
- **Monthly Strategic Brief**: High-level patterns, emerging risks, opportunities
- **Ad-hoc Board Brief**: On-demand executive summary for board meetings

### 5.5 Knowledge Freshness Automation

**What**: Proactively identify and refresh stale knowledge.

**How**:
1. Freshness decay runs on a schedule (every hour)
2. When a node drops below threshold (e.g., 0.3), generate a notification: "The pricing decision from Jan 15 is getting stale — should it be reaffirmed?"
3. Send to the node's owner for confirmation
4. If confirmed, reset freshness to 1.0
5. If superseded, create a new node and link with SUPERSEDES

### 5.6 Cross-Organization Benchmarking

**What**: Compare this organization's health metrics against anonymous benchmarks.

**Metrics**: Average cognitive load, silo score, contradiction frequency, decision velocity, AI agent utilization.

---

## Tier 6: Production Infrastructure

### 6.1 Persistent Database

**What**: Replace in-memory dicts with a real database.

**Options**:
| Option | Pros | Cons |
|--------|------|------|
| **Neo4j** | Native graph DB, Cypher queries, built for this | Operational complexity |
| **PostgreSQL + pgvector** | Relational + vector search in one DB, widely supported | Graph queries need JOINs |
| **SQLite + json columns** | Zero setup, file-based persistence | Not suitable for multi-process |
| **Supabase** | Hosted Postgres, auth built in, real-time subscriptions | Cloud dependency |

**Recommended for hackathon upgrade**: SQLite — just add `sqlite3` calls in `graph_manager.py` to persist mutations. 30 minutes of work, infinite improvement.

### 6.2 Authentication & Authorization

**What**: Role-based access control.

**Roles**:
- **Executive**: Full access, can run immune scans, generate briefings
- **Manager**: Division-scoped access, can see their people and alerts
- **Individual Contributor**: Personal view — their tasks, their notifications, their briefings
- **Observer**: Read-only access to dashboards

**Implementation**: FastAPI dependency injection with JWT tokens. Each endpoint checks the user's role and division scope.

### 6.3 WebSocket Real-Time Updates

**What**: Push graph changes, new alerts, and notifications to the frontend in real time.

```
Backend: WebSocket server at /ws
    → On graph mutation: broadcast { type: "graph_update", node: {...} }
    → On new alert: broadcast { type: "new_alert", alert: {...} }
    → On notification: broadcast { type: "notification", target: "person-1", ... }

Frontend: WebSocket client
    → Updates PulseView graph in real time
    → Shows toast for new alerts
    → Updates badge counts
```

### 6.4 Background Job Queue

**What**: Move expensive LLM calls to a background queue.

**Why**: Immune scans (6 parallel LLM calls) and task generation take 10-30 seconds. Currently they block the API response.

**Options**: Celery + Redis, or simpler: Python `asyncio.create_task()` with a polling endpoint for status.

### 6.5 Caching Layer (Redis)

**What**: Replace in-memory `ResponseCache` with Redis for shared caching across processes.

**Benefits**: Cache survives restarts, shared between workers, configurable eviction policies.

### 6.6 Observability

**What**: Logging, metrics, and tracing.

- **Structured logging**: JSON logs with request IDs, LLM call durations, token counts
- **Metrics**: Prometheus endpoint with LLM latency histograms, cache hit rates, error rates
- **Tracing**: OpenTelemetry spans for the full request lifecycle (API → LLM → graph mutation → response)

---

## Dashboard Wireframes

### Command Center (`/command`)
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ ORG HEALTH  │   ALERTS    │   LLM $$$   │  FRESHNESS  │
│  ●●●○○○○○   │  7 active   │  $0.47      │  82% fresh  │
│  3 crit     │  2 critical │  142 calls  │  6 stale    │
├─────────────┴─────────────┴─────────────┴─────────────┤
│                                                        │
│  COGNITIVE LOAD BY DIVISION                            │
│  ┌──────────────────────────────────────────────┐     │
│  │  HQ  ██████████████████████████░░░░  76%     │     │
│  │  NA  ████████████████████░░░░░░░░░░  62%     │     │
│  │ EMEA ████████████░░░░░░░░░░░░░░░░░░  45%     │     │
│  │ APAC ██████████████░░░░░░░░░░░░░░░░  48%     │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
├──────────────────────────┬─────────────────────────────┤
│  TOP ACTIONS             │  ACTIVITY FEED              │
│  1. Resolve pricing ●    │  14:28 InfoDrop processed   │
│  2. Update Atlas-Code ●  │  14:15 Immune scan done     │
│  3. Merge retry logic ○  │  13:50 Transcript ingested  │
│  4. Review APAC plan  ○  │  13:42 Ask: "billing?"      │
│  5. Audit Nova-Sales  ○  │  13:30 Alert acknowledged   │
└──────────────────────────┴─────────────────────────────┘
```

### People Dashboard (`/people`)
```
┌─────────────────────────────────────────────────────────┐
│  PEOPLE & AI AGENTS           [Search: ___________]     │
├──────────┬──────────┬──────────┬────────────────────────┤
│    HQ    │    NA    │   EMEA   │         APAC           │
├──────────┴──────────┴──────────┴────────────────────────┤
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ A.Reeves │ │ M.Rivera │ │ H.Johans │ │ Y.Tanaka │   │
│  │ CEO      │ │ VP Eng   │ │ EMEA Eng │ │ APAC Eng │   │
│  │ Load:82% │ │ Load:72% │ │ Load:58% │ │ Load:44% │   │
│  │ ████████ │ │ ███████  │ │ █████    │ │ ████     │   │
│  │ Risk: ●  │ │ Risk: ●  │ │ Risk: ○  │ │ Risk: ○  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                          │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐             │
│  │⬡ Atlas    │ │⬡ Iris     │ │⬡ Nova     │  ← AI      │
│  │  Code     │ │  Research │ │  Sales    │    agents    │
│  │  Load:40% │ │  Load:65% │ │  Load:50% │             │
│  │  ⚠ STALE  │ │  ✓ OK     │ │  ⚠ DRIFT  │             │
│  └───────────┘ └───────────┘ └───────────┘             │
│                                                          │
│  ─── Selected: Marcus Rivera ───────────────────────    │
│  Commitments: 9  │  Decisions pending: 3                │
│  Connected: Priya, James, Anika, David, Atlas-Code      │
│  [Generate Briefing]  [View Tasks]  [Bus Factor: 7]     │
└─────────────────────────────────────────────────────────┘
```

### Task Board (`/tasks`)
```
┌─────────────────────────────────────────────────────────┐
│  TASK BOARD    [Generate Tasks]    Critical Path: A→C→E │
├──────────────┬──────────────┬──────────────┬────────────┤
│   BLOCKED    │    READY     │  IN PROGRESS │    DONE    │
├──────────────┼──────────────┼──────────────┼────────────┤
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │            │
│ │ Merge    │ │ │ Resolve  │ │ │ GraphQL  │ │            │
│ │ retry    │ │ │ Acme     │ │ │ migrate  │ │            │
│ │ logic    │ │ │ pricing  │ │ │ payments │ │            │
│ │          │ │ │ ● CRIT   │ │ │ ○ normal │ │            │
│ │ blocked  │ │ │ Sarah C. │ │ │ Priya S. │ │            │
│ │ by: scan │ │ └──────────┘ │ └──────────┘ │            │
│ └──────────┘ │ ┌──────────┐ │ ┌──────────┐ │            │
│              │ │ Update   │ │ │ Audit    │ │            │
│              │ │ Atlas    │ │ │ Nova     │ │            │
│              │ │ context  │ │ │ pricing  │ │            │
│              │ │ ● WARN   │ │ │ ○ normal │ │            │
│              │ │ Marcus R.│ │ │ David K. │ │            │
│              │ └──────────┘ │ └──────────┘ │            │
└──────────────┴──────────────┴──────────────┴────────────┘
```

### LLM Usage Dashboard (`/usage`)
```
┌─────────────────────────────────────────────────────────┐
│  LLM USAGE                              Session: 2h 15m │
├──────────────┬──────────────┬───────────────────────────┤
│  TOTAL COST  │  TOTAL CALLS │  TOTAL TOKENS             │
│   $0.47      │     142      │   84,230                  │
├──────────────┴──────────────┴───────────────────────────┤
│                                                          │
│  COST BY MODEL               COST BY FEATURE            │
│  ┌─────────────────┐        ┌─────────────────┐        │
│  │ gpt-4o    $0.38 │        │ immune     $0.18│        │
│  │ gpt-4o-   $0.06 │        │ ask nexus  $0.12│        │
│  │   mini          │        │ briefing   $0.08│        │
│  │ embedding $0.03 │        │ ingest     $0.05│        │
│  └─────────────────┘        │ infodrop   $0.04│        │
│                              └─────────────────┘        │
│                                                          │
│  CALL LOG                                                │
│  ┌─────────┬──────────┬────────┬────────┬──────────┐    │
│  │  Time   │  Feature │ Model  │ Tokens │   Cost   │    │
│  ├─────────┼──────────┼────────┼────────┼──────────┤    │
│  │ 14:28   │ infodrop │ mini   │   820  │  $0.001  │    │
│  │ 14:27   │ immune   │ 4o     │  4,200 │  $0.052  │    │
│  │ 14:26   │ ask      │ 4o     │  3,100 │  $0.038  │    │
│  │ 14:25   │ briefing │ 4o     │  2,800 │  $0.035  │    │
│  └─────────┴──────────┴────────┴────────┴──────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Priority Matrix

| Improvement | Impact | Effort | Priority |
|------------|--------|--------|----------|
| Command Center Dashboard | Very High | 3-4 hours | **Do first** |
| Immune Scan button in AlertsView | Very High | 1 hour | **Do first** |
| LLM Usage Dashboard | High | 2 hours | **Do first** |
| Notification Center (sidebar) | High | 2 hours | **Do first** |
| People Dashboard | Very High | 4-5 hours | **Do second** |
| Task Board | High | 4-5 hours | **Do second** |
| Conversation mode for Ask NEXUS | High | 3 hours | **Do second** |
| Ingestion Console | Medium | 3 hours | **Do second** |
| Worker Analysis View | Medium | 3-4 hours | **Do second** |
| Natural Language Commands | High | 4 hours | **Do third** |
| Proactive Alerts (polling) | High | 2 hours | **Do third** |
| Global Search | Medium | 3 hours | **Do third** |
| Graph Interaction (right-click, paths) | Medium | 4 hours | **Do third** |
| SQLite Persistence | High | 1 hour | **Do third** |
| WebSocket Real-Time | Medium | 4 hours | **Do third** |
| Slack Integration | Very High | 8 hours | **Future** |
| Document Upload | High | 6 hours | **Future** |
| Multi-Turn Reasoning | High | 6 hours | **Future** |
| What-If Simulation | Very High | 8 hours | **Future** |
| Predictive Alerts | Very High | 8 hours | **Future** |
| Auth & RBAC | Medium | 6 hours | **Future** |
| Redis Caching | Low | 2 hours | **Future** |
| Background Job Queue | Medium | 4 hours | **Future** |
| Meeting Recorder | High | 12 hours | **Future** |

---

## Quick Wins Checklist

If you have limited time, these 5 changes would make the biggest difference:

1. **Add "Run Immune Scan" button to AlertsView** (1 hour) — connects the most impressive backend feature to the UI
2. **Add LLM Usage panel to the sidebar** (2 hours) — shows judges that real LLM calls are happening and you're tracking cost
3. **Add notification badge** (2 hours) — shows the information routing system is working
4. **Build Command Center** (3 hours) — single screen that tells the whole story
5. **Add SQLite write-back** (1 hour) — mutations survive restart, shows "real" system
