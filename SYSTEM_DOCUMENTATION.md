# NEXUS System Documentation

**Version**: 2.0.0
**Date**: February 8, 2026
**Stack**: FastAPI (Python) + React/TypeScript + OpenAI GPT-4o / GPT-4o-mini

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Data Storage & State Management](#2-data-storage--state-management)
3. [Data Ingestion Pipelines](#3-data-ingestion-pipelines)
4. [LLM Service Layer](#4-llm-service-layer)
5. [Backend Modules (9 Services)](#5-backend-modules-9-services)
6. [API Endpoints (35 Routes)](#6-api-endpoints-35-routes)
7. [Frontend Views (5 Views)](#7-frontend-views-5-views)
8. [Fallback & Degradation Strategy](#8-fallback--degradation-strategy)
9. [Current Limitations](#9-current-limitations)
10. [What Is Complete](#10-what-is-complete)
11. [What Is Not Yet Built](#11-what-is-not-yet-built)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                                │
│  scripts/build_graph.py    POST /api/ingest    POST /api/info       │
│  (one-time seed data)      (transcript pipe)   (quick InfoDrop)     │
└─────────────┬──────────────────┬──────────────────┬─────────────────┘
              │                  │                  │
              ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE GRAPH (in-memory)                       │
│                                                                     │
│  graph_store.py          graph_manager.py        embeddings.py      │
│  (read-only layer)       (mutation layer)        (vector store)     │
│  Loads JSON from disk    Upsert nodes/edges      Cosine similarity  │
│  Caches in Python dict   Tracks mutation history  search over nodes │
│                          Freshness decay                            │
└─────────────┬──────────────────┬──────────────────┬─────────────────┘
              │                  │                  │
              ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      LLM SERVICE LAYER                              │
│                                                                     │
│  client.py         prompts.py        context_builder.py  usage.py   │
│  AsyncOpenAI       20+ templates     Graph → text        Cost track │
│  Model routing     Structured JSON   BFS expansion       Per-call   │
│  Response cache    output specs      Division context    breakdown  │
│  Retry w/ backoff                    People/agent lists             │
└─────────────┬──────────────────┬──────────────────┬─────────────────┘
              │                  │                  │
              ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    9 SERVICE MODULES                                 │
│                                                                     │
│  ingest.py        info_router.py     task_scheduler.py              │
│  (classify +      (who needs to      (generate task                 │
│   extract)         know + notify)     DAGs + deps)                  │
│                                                                     │
│  worker_tracker   immune_llm.py      rag_v2.py                     │
│  (conflicts +     (6 parallel        (embed → search               │
│   overload)        agents)            → expand → gen)              │
│                                                                     │
│  briefing_gen     infodrop_v2.py     graph_manager.py               │
│  (exec briefing   (classify +        (mutations +                   │
│   + onboarding)    link + route)      versioning)                  │
└─────────────┬──────────────────┬──────────────────┬─────────────────┘
              │                  │                  │
              ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FastAPI (35 routes)                               │
│                                                                     │
│  /api/graph/*          /api/ask           /api/immune/*             │
│  /api/alerts/*         /api/info          /api/briefing/*           │
│  /api/decisions/*      /api/ingest/*      /api/routing/*            │
│  /api/feedback         /api/tasks/*       /api/workers/*            │
│  /api/llm/usage        /                                            │
└─────────────┬──────────────────┬──────────────────┬─────────────────┘
              │                  │                  │
              ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)                     │
│                                                                     │
│  DemoView          PulseView          AlertsView                    │
│  (cinematic        (force-graph       (immune system                │
│   full-screen)      + InfoDrop)        alert cards)                 │
│                                                                     │
│  AskNexusView      DecisionExplorer                                 │
│  (RAG + stream)    (archaeology)                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Storage & State Management

### There Is No Traditional Database

All data lives in one of four in-memory locations:

### 2.1 Static Seed Data (read-only)

**Location**: `mock_data/` directory (5 JSON files, ~143KB total)

| File | Size | Contents | Generated By |
|------|------|----------|-------------|
| `graph.json` | 87KB | 87 nodes, 243 edges | `scripts/build_graph.py` |
| `hierarchy.json` | 14KB | Enterprise hierarchy (divisions → departments → teams) | `scripts/build_graph.py` |
| `alerts.json` | 8KB | 7 pre-built immune system alerts | `scripts/build_graph.py` |
| `ask_cache.json` | 16KB | 5 pre-computed RAG responses | `scripts/build_graph.py` |
| `company_structure.json` | 19KB | Division/department/team metadata | `scripts/build_graph.py` |

These are loaded by `services/graph_store.py` on first access and cached in a module-level Python dict (`_cache`). They never change at runtime.

The fictional company is **Meridian Technologies**: 20 people, 4 AI agents, 4 divisions (NA, EMEA, APAC, HQ), 15 teams, and ~50 knowledge units (decisions, facts, commitments, questions).

### 2.2 Mutable Graph State (read-write, in-memory)

**Location**: `services/graph_manager.py` → `_graph_state` (module-level dict)

On first write operation, the graph manager copies the static `graph.json` into `_graph_state`. All mutations happen here:

- **`upsert_node()`** — create or merge a node (dedup by ID)
- **`upsert_edge()`** — create or update an edge (dedup by source+target+type)
- **`supersede_node()`** — mark old knowledge as superseded, link to replacement
- **`compute_freshness()`** — half-life decay: `freshness = 2^(-age_days / half_life)`

Every mutation is logged in `_history` (list of dicts with action, node_id, data, timestamp) for provenance tracking.

**All mutations are lost on server restart.**

### 2.3 Vector Store (in-memory)

**Location**: `services/llm/embeddings.py` → `EmbeddingService._index` (dict of node_id → float[])

On startup (if OpenAI key is available), all 87 nodes are embedded using `text-embedding-3-large` and stored as numpy arrays. Search uses cosine similarity.

Falls back to keyword matching when embeddings are unavailable.

### 2.4 Application State (in-memory)

Several services maintain their own in-memory state:

| Service | State Variable | Contents |
|---------|---------------|----------|
| `info_router.py` | `_pending_notifications` | Unacknowledged routing notifications |
| `info_router.py` | `_notification_history` | All routing decisions ever made |
| `task_scheduler.py` | `_current_tasks` | Latest generated task DAG |
| `immune_llm.py` | `_scan_history` | All immune scan results |
| `rag_v2.py` | `_conversations` | Conversation memory for Ask NEXUS |
| `llm/client.py` | `ResponseCache._cache` | TTL-based LLM response cache (5min default) |
| `llm/usage.py` | `UsageTracker.calls` | Every LLM API call with tokens and cost |

---

## 3. Data Ingestion Pipelines

### 3.1 Seed Data Generation (offline, one-time)

```
scripts/build_graph.py
    → Hardcoded Python dicts defining Meridian Technologies
    → Writes 5 JSON files to mock_data/
    → Copies to nexus-ui/public/mock_data/ (frontend fallback)
```

This runs once. The data is checked into git.

### 3.2 Full Ingestion Pipeline (POST /api/ingest)

For structured text like meeting transcripts, documents, or email threads:

```
Raw text input
    │
    ├── Step 1: Classification (GPT-4o-mini, fast)
    │   Returns: { primary: "technical", secondary: "operational", confidence: 0.92 }
    │
    ├── Step 2: Entity Extraction (GPT-4o-mini, fast)
    │   Input: text + list of known people + known agents
    │   Returns: { entities: [...], relationships: [...] }
    │   Entities: people references, decisions, facts, commitments
    │   Relationships: DECIDED_BY, AFFECTS, BLOCKS, CONTRADICTS, etc.
    │
    ├── Step 3: Deep Relationship Analysis (GPT-4o, heavy)
    │   Input: extracted entities + full knowledge graph context
    │   Returns: additional relationships + contradiction detections
    │   This step finds non-obvious connections the fast model misses
    │
    └── Step 4: Graph Updates
        Creates knowledge unit nodes + relationship edges in graph_manager
        Returns full pipeline result with entity count, relationship count, contradictions
```

**Cost per ingestion**: ~$0.01-0.03 depending on text length (fast model for steps 1-2, heavy for step 3).

### 3.3 InfoDrop Pipeline (POST /api/info)

For quick, informal information snippets from the UI:

```
Short text (e.g. "Engineering decided to switch to Kubernetes")
    │
    ├── LLM Path (when OpenAI key works):
    │   │
    │   ├── Step 1: LLM Classification (GPT-4o-mini)
    │   │   Determines: type, division, related nodes, contradictions, who to notify
    │   │   Uses full org context in the prompt
    │   │
    │   ├── Step 2: Graph Mutation
    │   │   Creates 1 node + edges to related nodes via graph_manager
    │   │
    │   ├── Step 3: Contradiction Check
    │   │   If LLM detects contradiction → generates immune system alert
    │   │
    │   └── Step 4: Auto-Routing
    │       Calls info_router to determine who should be notified
    │       Returns: { unit, new_edges, ripple_target, notifications, confidence }
    │
    └── Fallback Path (when LLM unavailable):
        Keyword overlap matching against all graph nodes
        Creates node classified as generic "fact"
        Returns: { unit, new_edges, ripple_target }
```

### 3.4 What Is NOT Ingested

- **No file upload** — no PDF, CSV, or document parsing
- **No email integration** — no IMAP/SMTP or Gmail/Outlook connectors
- **No real-time feeds** — no Slack, Teams, or webhook listeners
- **No scheduled pulls** — no cron jobs or background scrapers

All data enters through explicit API calls.

---

## 4. LLM Service Layer

### 4.1 Client (`services/llm/client.py`)

Singleton `LLMClient` wrapping `AsyncOpenAI`:

- **Model routing**: task_type → model mapping
  - FAST tasks (gpt-4o-mini): classify, extract_entities, infodrop_classify, route_info, dedup_check, summarize_short
  - HEAVY tasks (gpt-4o): immune_agent, briefing, onboarding, complex_ask, relationship_extraction, worker_analysis, task_scheduling, info_routing
- **Response cache**: SHA256-keyed TTL cache (default 5 minutes). Prevents duplicate LLM calls for the same prompt.
- **Retry logic**: exponential backoff, up to 3 attempts (configurable via `NEXUS_LLM_MAX_RETRIES`)
- **Streaming**: `_stream()` returns an async generator yielding tokens
- **Embedding**: batches of 100, using `text-embedding-3-large`

### 4.2 Prompts (`services/llm/prompts.py`)

20+ prompt templates, all requesting structured JSON output:

| Prompt | Used By | Output Format |
|--------|---------|--------------|
| `NEXUS_BASE` | All services (system preamble) | N/A (prepended to other prompts) |
| `CLASSIFIER` | ingest.py | `{ primary, secondary, confidence }` |
| `ENTITY_EXTRACTOR` | ingest.py | `{ entities: [...], relationships: [...] }` |
| `RELATIONSHIP_EXTRACTOR` | ingest.py | `{ relationships: [...], contradictions: [...] }` |
| `INFO_ROUTER` | info_router.py | `{ routes: [{ person_id, priority, summary }] }` |
| `TASK_SCHEDULER` | task_scheduler.py | `{ tasks: [...], critical_path: [...] }` |
| `WORKER_TRACKER` | worker_tracker.py | `{ conflicts, duplicates, overloads, suggestions }` |
| `IMMUNE_AGENTS[x]` (6) | immune_llm.py | `{ findings: [{ severity, headline, detail }] }` |
| `ASK_NEXUS` | rag_v2.py | Free-form text answer |
| `ASK_NEXUS_STRUCTURED` | rag_v2.py | `{ items: [...], highlight_node_ids: [...] }` |
| `BRIEFING_GENERATOR` | briefing_generator.py | `{ summary, sections: [...], actions: [...] }` |
| `ONBOARDING_GENERATOR` | briefing_generator.py | `{ team_context, key_decisions, people, tensions, expectations }` |
| `INFODROP_CLASSIFIER` | infodrop_v2.py | `{ type, division, related_node_ids, contradiction_detected }` |

### 4.3 Context Builder (`services/llm/context_builder.py`)

Converts the knowledge graph into natural language text for LLM prompts:

- `build_org_summary()` → metadata dict (counts)
- `build_org_context()` → full dump: people, agents, knowledge units, edges (~6-8KB of text)
- `build_people_list()` / `build_agents_list()` → compact lists for entity matching
- `build_alerts_context()` → unresolved alerts as text
- `build_node_context(id, depth)` → BFS N-hop expansion around a node
- `build_person_context(id)` → detailed profile with all connections
- `build_division_context(div)` → division-scoped view
- `build_knowledge_context()` → all decisions, facts, commitments, questions
- `get_all_node_texts()` → (node_id, text) pairs for embedding

### 4.4 Usage Tracking (`services/llm/usage.py`)

Every LLM call records: model, input_tokens, output_tokens, cost_usd, task_type, timestamp.

Pricing table (per 1M tokens):
| Model | Input | Output |
|-------|-------|--------|
| gpt-5.2 | $1.75 | $14.00 |
| gpt-4o | $2.50 | $10.00 |
| gpt-4o-mini | $0.15 | $0.60 |
| text-embedding-3-large | $0.13 | $0.00 |

Accessible via `GET /api/llm/usage`.

---

## 5. Backend Modules (9 Services)

| # | Module | File | LLM Model | What It Does |
|---|--------|------|-----------|-------------|
| 1 | Transcript Classification | `services/ingest.py` | mini + heavy | Classify text → extract entities → deep relationship analysis |
| 2 | Information Tracking | `services/graph_manager.py` | None (pure Python) | CRUD nodes/edges, versioning, freshness decay, provenance |
| 3 | Information Routing | `services/info_router.py` | heavy | Determine who needs to know, generate personalized summaries |
| 4 | Task Scheduling | `services/task_scheduler.py` | heavy | Generate task DAGs with dependencies and critical path |
| 5 | Worker Tracker | `services/worker_tracker.py` | heavy | Detect conflicts, duplicates, overloads, suggest reallocations |
| 6 | Immune System | `services/immune_llm.py` | heavy (x6 parallel) | 6 agents: contradiction, staleness, silo, overload, coordination, drift |
| 7 | Ask NEXUS (RAG) | `services/rag_v2.py` | heavy | Embed → vector search → graph expand → LLM generate with citations |
| 8 | Briefing & Onboarding | `services/briefing_generator.py` | heavy | Personalized executive briefings, 5-step onboarding packages |
| 9 | InfoDrop Intelligence | `services/infodrop_v2.py` | mini + heavy | Classify → create node → link → check contradictions → route |

---

## 6. API Endpoints (35 Routes)

### Original Endpoints (backward-compatible)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/graph` | Full knowledge graph |
| GET | `/api/graph/hierarchy` | Org hierarchy |
| GET | `/api/graph/node/{id}` | Node detail + neighbors |
| GET | `/api/alerts` | All immune alerts |
| POST | `/api/alerts/{id}/resolve` | Resolve an alert |
| GET | `/api/decisions` | All decisions by division |
| GET | `/api/decisions/{id}/chain` | Decision archaeology chain |
| POST | `/api/ask` | Ask NEXUS (RAG or cache fallback) |
| POST | `/api/info` | InfoDrop (LLM or keyword fallback) |
| POST | `/api/feedback` | Submit feedback on a node |

### New LLM-Powered Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ingest` | Full ingestion pipeline |
| POST | `/api/ingest/classify` | Classification only (fast) |
| POST | `/api/tasks/generate` | Generate task DAG |
| GET | `/api/tasks/current` | Current task graph |
| GET | `/api/tasks/for/{person_id}` | Tasks for a person |
| POST | `/api/tasks/{id}/complete` | Mark task done |
| GET | `/api/tasks/critical-path` | Critical path |
| GET | `/api/workers/status` | Worker analysis state |
| POST | `/api/workers/analyze` | Run full worker analysis |
| POST | `/api/workers/analyze-team/{div}` | Team-level analysis |
| GET | `/api/workers/{id}/assignments` | Worker assignments |
| POST | `/api/immune/scan` | Run all 6 immune agents |
| POST | `/api/immune/scan/{agent}` | Run single agent |
| GET | `/api/immune/history` | Scan history |
| POST | `/api/briefing/generate` | Generate exec briefing (supports SSE) |
| POST | `/api/briefing/onboarding` | Generate onboarding package |
| GET | `/api/routing/pending` | Pending notifications |
| GET | `/api/routing/history` | Routing history |
| POST | `/api/routing/acknowledge` | Acknowledge notification |
| GET | `/api/llm/usage` | Token usage and cost |
| GET | `/` | System info |

### Auto-Generated
| Path | Description |
|------|-------------|
| `/docs` | Swagger UI |
| `/redoc` | ReDoc |
| `/openapi.json` | OpenAPI spec |

---

## 7. Frontend Views (5 Views)

| View | Route | Description |
|------|-------|-------------|
| **DemoView** | `/demo` | Full-screen cinematic canvas. 24 animated nodes (circles=humans, hexagons=AI). Hardcoded data. 6 interactive features: contradiction, silo, ripple, briefing (with live LLM streaming), onboarding, node detail. |
| **PulseView** | `/pulse` | Force-directed graph (react-force-graph-2d). Semantic zoom. InfoDrop widget. Real graph data from API. |
| **AlertsView** | `/alerts` | Card list of immune system alerts with severity colors, resolution actions, scope badges. |
| **AskNexusView** | `/ask` | Search input with suggested queries. Structured card responses. Streaming toggle for live LLM output. |
| **DecisionExplorerView** | `/decisions` | Decision archaeology — decision chains showing cascading impact. |

### Frontend Streaming Support
- `lib/sse.ts` — SSE helper that parses `data: {"type": "token"|"done"|"error"}` events
- AskNexusView — toggle between structured JSON response and live streaming
- DemoView — "What Changed Today?" attempts live LLM briefing, falls back to hardcoded typewriter

---

## 8. Fallback & Degradation Strategy

Every LLM-dependent feature degrades gracefully:

| Feature | LLM Available | LLM Unavailable |
|---------|--------------|-----------------|
| Ask NEXUS | RAG: embed → search → generate | Cache match (fuzzy) → keyword search |
| InfoDrop | LLM classify → link → route | Keyword overlap → generic "fact" node |
| Immune Scan | 6 parallel LLM agents | HTTP 503 |
| Briefing | LLM generates personalized text | HTTP 503 (DemoView uses hardcoded text) |
| Onboarding | LLM generates 5-step package | HTTP 503 (DemoView uses hardcoded JSX) |
| Ingestion | LLM classify + extract + relate | HTTP 503 |
| Frontend | Calls API with 30s timeout | Loads static JSON from `/mock_data/` |

---

## 9. Current Limitations

1. **No persistent storage** — all mutations lost on restart
2. **No authentication** — all endpoints are public
3. **No rate limiting** — no protection against API abuse
4. **No WebSocket/polling** — frontend doesn't auto-update
5. **No file upload** — text-only input
6. **OpenAI quota blocked** — LLM features untested with live API
7. **Single-process** — no horizontal scaling, no background workers
8. **Hardcoded company** — Meridian Technologies only
9. **No database migrations** — no schema versioning

---

## 10. What Is Complete

- All 9 backend service modules (code written, imports clean)
- All 35 API routes (respond correctly)
- LLM service layer (client, routing, caching, retries, streaming, usage)
- 20+ prompt templates with structured JSON output specs
- Context builder (9 methods converting graph → text)
- Vector embedding service with keyword fallback
- All 5 frontend views
- Frontend SSE streaming helper
- AskNexusView streaming toggle
- DemoView live LLM briefing
- InfoDrop rich response display
- Graceful fallbacks on every endpoint
- TypeScript compiles with 0 errors
- Vite builds successfully (633KB JS, 39KB CSS)

---

## 11. What Is Not Yet Built

### Critical (blocks demo quality)
1. **Live LLM verification** — API key has no quota, so no LLM path has been tested with a real API call. Prompt quality, JSON parsing, and streaming are unverified.

### Important (missing UI for existing backends)
2. **Immune Scan UI** — no "Run Scan" button in AlertsView wired to `POST /api/immune/scan`
3. **Worker Analysis UI** — no view for `POST /api/workers/analyze`
4. **Task Scheduler UI** — no view for `POST /api/tasks/generate`
5. **Ingestion UI** — no "Upload Transcript" flow for `POST /api/ingest`
6. **LLM Usage Dashboard** — no frontend for `GET /api/llm/usage`
7. **Notification UI** — no display for `GET /api/routing/pending`

### Nice-to-Have
8. **Testing harness** — no `tests/` directory, no automated quality checks
9. **Real-time updates** — no WebSocket/polling for live graph changes
10. **Persistent write-back** — mutations could be saved to JSON on each change
