# NEXUS LLM Implementation Plan

**Model**: OpenAI GPT-5.2 (primary) + GPT-4o-mini (fast classification)
**Scope**: Full vision — all 6 modules from the original architecture diagram
**Goal**: Production-grade LLM integration where the LLM is the central nervous system hub

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Model Strategy](#2-model-strategy)
3. [Module 0: LLM Service Layer (Foundation)](#3-module-0-llm-service-layer-foundation)
4. [Module 1: Transcript Classification & Entity Extraction](#4-module-1-transcript-classification--entity-extraction)
5. [Module 2: Information Tracking (Source of Truth)](#5-module-2-information-tracking-source-of-truth)
6. [Module 3: Automated Information Routing](#6-module-3-automated-information-routing)
7. [Module 4: Task Scheduling Engine](#7-module-4-task-scheduling-engine)
8. [Module 5: Worker Tracker & Conflict Detection](#8-module-5-worker-tracker--conflict-detection)
9. [Module 6: Immune System Agents (LLM-Powered)](#9-module-6-immune-system-agents-llm-powered)
10. [Module 7: Ask NEXUS (Real RAG + Generation)](#10-module-7-ask-nexus-real-rag--generation)
11. [Module 8: Briefing & Onboarding Generation](#11-module-8-briefing--onboarding-generation)
12. [Module 9: InfoDrop Intelligence](#12-module-9-infodrop-intelligence)
13. [Frontend Integration & Streaming](#13-frontend-integration--streaming)
14. [Testing & Evaluation Harness](#14-testing--evaluation-harness)
15. [Dependency Graph](#15-dependency-graph)
16. [Data Flow: End to End](#16-data-flow-end-to-end)
17. [File Plan](#17-file-plan)
18. [Environment & Configuration](#18-environment--configuration)

---

## 1. Architecture Overview

The original architecture diagram places the **LLM at the center** connecting six modules:

```
                    Data Sources (meetings, notes, emails)
                              │
                    ┌─────────▼──────────┐
                    │  Transcript Tables  │
                    │  (Classification)   │ ◄── Module 1
                    └─────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼────┐  ┌──────▼──────┐  ┌─────▼─────────┐
    │  Information  │  │             │  │    Worker      │
    │  Tracking     │  │    L L M    │  │    Tracker     │ ◄── Module 5
    │  (Source of   │  │   (GPT-5.2) │  │    ┌──────┐   │
    │   Truth)      │  │             │  │    │ Team │   │
    └───────┬───────┘  └──────┬──────┘  │    │ Sub  │   │
       Module 2        │      │         │    │Agent │   │
              │        │      │         └────┴──────┘───┘
    ┌─────────▼────┐   │  ┌───▼──────────┐
    │  Automated   │   │  │    Task       │
    │  Info        │   │  │  Scheduling   │ ◄── Module 4
    │  Routing     │   │  │              │
    └──────────────┘   │  └──────────────┘
       Module 3        │
                 ┌─────▼─────────┐
                 │ Graph Database │
                 │  (Knowledge   │
                 │   Graph)      │
                 └───────┬───────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
         Immune     Ask NEXUS   Briefings
         Agents     (RAG)       & Onboarding
         Module 6   Module 7    Module 8
```

**Key principle**: The LLM doesn't just answer questions — it **ingests**, **classifies**, **routes**, **schedules**, **monitors**, and **generates** across the entire system. Every piece of information flows through it.

---

## 2. Model Strategy

### Tiered Model Routing

| Tier | Model | Use Cases | Latency | Cost |
|------|-------|-----------|---------|------|
| **Heavy** | `gpt-5.2` | Immune agents, briefing generation, executive summaries, contradiction analysis, task scheduling reasoning | 3-8s | $1.75/$14 per 1M tokens |
| **Fast** | `gpt-4o-mini` | Entity extraction, classification, keyword routing, simple Q&A, embeddings preprocessing | 0.3-1s | $0.15/$0.60 per 1M tokens |
| **Embeddings** | `text-embedding-3-large` | Semantic search, similarity matching, knowledge graph vector index | <0.5s | $0.13 per 1M tokens |

### Routing Logic

```python
def route_model(task_type: str) -> str:
    HEAVY_TASKS = {
        "immune_agent", "briefing", "onboarding",
        "task_scheduling", "conflict_analysis",
        "contradiction_detection", "executive_summary",
        "complex_ask", "decision_chain_analysis"
    }
    FAST_TASKS = {
        "classify", "extract_entities", "route_info",
        "simple_ask", "infodrop_classify", "summarize_short"
    }
    if task_type in HEAVY_TASKS:
        return "gpt-5.2"
    elif task_type in FAST_TASKS:
        return "gpt-4o-mini"
    else:
        return "gpt-5.2"  # default to best
```

### Why This Split

- **GPT-5.2** for anything that requires reasoning about organizational dynamics, detecting subtle contradictions, generating executive-quality prose, or making scheduling decisions. These are the tasks where quality directly impacts trust.
- **GPT-4o-mini** for high-throughput, low-latency tasks like classifying incoming text, extracting entities, or routing information. These run hundreds of times per day and need to be fast and cheap.
- **Embeddings** for vector similarity — finding related knowledge units, semantic search in Ask NEXUS, duplicate detection.

---

## 3. Module 0: LLM Service Layer (Foundation)

**Beads ID**: `Hack-Nation-Hackathon-e0d`
**Priority**: P0 (everything depends on this)

### What It Is

A centralized service that abstracts all LLM interactions. Every module calls this service rather than making raw OpenAI API calls. This gives us:
- Consistent error handling and retries
- Token usage tracking and budgeting
- Response caching (same prompt → cached response)
- Structured output parsing (JSON mode)
- Streaming support for real-time UI
- Audit logging (every LLM call is recorded)

### Files to Create

```
nexus-api/
├── services/
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── client.py          # OpenAI client singleton + config
│   │   ├── router.py          # Model routing (gpt-5.2 vs gpt-4o-mini)
│   │   ├── prompts.py         # All prompt templates (centralized)
│   │   ├── structured.py      # JSON schema enforcement + parsing
│   │   ├── embeddings.py      # Embedding generation + caching
│   │   ├── cache.py           # Response cache (in-memory + optional Redis)
│   │   ├── context_builder.py # Assembles graph context for prompts
│   │   └── usage.py           # Token counting, cost tracking, audit log
```

### Client Configuration

```python
# client.py
class LLMClient:
    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.cache = ResponseCache(ttl_seconds=300)
        self.usage_tracker = UsageTracker()

    async def complete(
        self,
        task_type: str,           # For model routing
        system_prompt: str,
        user_prompt: str,
        response_format: dict | None = None,  # JSON schema
        temperature: float = 0.3,
        max_tokens: int = 4096,
        stream: bool = False,
        cache_key: str | None = None,
    ) -> str | AsyncGenerator[str, None]:
        model = route_model(task_type)
        # Check cache
        # Make API call
        # Track usage
        # Parse structured output if schema provided
        # Return response

    async def embed(self, texts: list[str]) -> list[list[float]]:
        # Uses text-embedding-3-large
        # Batch processing (up to 2048 texts per call)
        # Caching for repeated texts
```

### Context Builder

The context builder is critical — it assembles relevant portions of the knowledge graph into a prompt-friendly format. Every LLM call needs organizational context.

```python
# context_builder.py
class ContextBuilder:
    def __init__(self, graph_store):
        self.graph = graph_store

    def build_org_context(self, scope: str = "full") -> str:
        """Build org-wide context string for system prompts."""
        # Returns: company name, divisions, team counts, agent list

    def build_node_context(self, node_id: str, depth: int = 2) -> str:
        """Build context around a specific node (neighbors up to N hops)."""
        # Returns: the node + all connected nodes + edges

    def build_division_context(self, division: str) -> str:
        """Build context for a specific division."""
        # Returns: all nodes/edges in that division

    def build_alert_context(self, alert_id: str) -> str:
        """Build context around an alert for immune agent analysis."""
        # Returns: the alert + affected nodes + their neighborhoods

    def build_temporal_context(self, hours: int = 24) -> str:
        """Build context of recent changes (last N hours)."""
        # Returns: recently created/modified knowledge units

    def graph_to_text(self, nodes: list, edges: list) -> str:
        """Convert graph subsets to natural language descriptions."""
        # Structured text that the LLM can reason about
```

### Prompt Templates

All prompts live in one file for consistency and versioning:

```python
# prompts.py
SYSTEM_PROMPTS = {
    "nexus_base": """You are NEXUS, an organizational nervous system for Meridian Technologies.
You have access to a knowledge graph of {node_count} nodes and {edge_count} edges spanning
{division_count} divisions with {person_count} people and {agent_count} AI agents.
Your role is to monitor organizational health, detect anomalies, and help leaders make decisions.""",

    "classifier": """You are an entity extraction and classification system.
Given raw text input (meeting notes, emails, messages), extract:
1. Entities (people, teams, projects, decisions)
2. Facts and claims made
3. Commitments and promises
4. Open questions
5. Relationships between entities
Return structured JSON.""",

    "immune_agent": """You are the {agent_name} agent in the NEXUS immune system.
Your job: {agent_description}
Analyze the following organizational context and identify anomalies.
Be specific. Cite node IDs. Quantify impact where possible.""",

    # ... (20+ prompt templates, one per task type)
}
```

### Structured Output Schemas

Every LLM response that feeds back into the system uses JSON Schema enforcement:

```python
# structured.py
SCHEMAS = {
    "entity_extraction": {
        "type": "object",
        "properties": {
            "entities": {"type": "array", "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "type": {"type": "string", "enum": ["person", "agent", "team", "project", "decision", "fact", "commitment", "question"]},
                    "division": {"type": "string"},
                    "attributes": {"type": "object"}
                }
            }},
            "relationships": {"type": "array", "items": {
                "type": "object",
                "properties": {
                    "source": {"type": "string"},
                    "target": {"type": "string"},
                    "type": {"type": "string"},
                    "description": {"type": "string"}
                }
            }},
            "confidence": {"type": "number"}
        }
    },
    "immune_alert": {
        "type": "object",
        "properties": {
            "detected": {"type": "boolean"},
            "severity": {"type": "string", "enum": ["critical", "warning", "info"]},
            "headline": {"type": "string"},
            "detail": {"type": "string"},
            "affected_node_ids": {"type": "array", "items": {"type": "string"}},
            "estimated_cost": {"type": "string"},
            "recommended_action": {"type": "string"},
            "confidence": {"type": "number"}
        }
    },
    # ... schemas for every structured response type
}
```

---

## 4. Module 1: Transcript Classification & Entity Extraction

**Beads ID**: `Hack-Nation-Hackathon-gs8`
**Depends on**: Module 0 (Service Layer)

### What It Is

The **sensory system** — the first point of contact for all incoming data. Raw text (meeting transcripts, emails, Slack messages, documents) enters here and gets:

1. **Classified** into one of 6 categories
2. **Entity-extracted** (people, decisions, facts, commitments, questions)
3. **Relationship-mapped** (who said what, who decided what, what affects what)
4. **Timestamped** and **provenance-tagged** (source, confidence, date)

### The 6 Classification Areas

From the original diagram, incoming data is classified into:

| Category | Description | Examples |
|----------|-------------|----------|
| **Strategic** | High-level company direction | Board decisions, M&A discussions, market positioning |
| **Operational** | Day-to-day execution | Sprint planning, deployment schedules, incident reports |
| **Financial** | Money-related | Pricing changes, budget approvals, cost estimates |
| **Technical** | Engineering decisions | API changes, architecture choices, tech debt |
| **Organizational** | People & structure | Hiring, team changes, role assignments |
| **External** | Client/market facing | Client calls, competitor intel, market research |

### Pipeline

```
Raw Text Input
     │
     ▼
┌─────────────────────────┐
│ Step 1: Classification  │  ◄── GPT-4o-mini (fast, cheap)
│ "What category is this?"│
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Step 2: Entity Extract  │  ◄── GPT-4o-mini (structured JSON output)
│ People, decisions, facts│
│ commitments, questions  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Step 3: Relationship    │  ◄── GPT-5.2 (needs reasoning for complex relations)
│ Extraction              │
│ Who decided what?       │
│ What contradicts what?  │
│ What depends on what?   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Step 4: Embedding       │  ◄── text-embedding-3-large
│ Vector for semantic     │
│ search & similarity     │
└────────────┬────────────┘
             │
             ▼
    Graph Database Update
    (Module 2: Information Tracking)
```

### API Endpoint

```
POST /api/ingest
Body: {
    "text": "Meeting notes from the pricing review...",
    "source_type": "meeting_transcript",  // email, slack, document, meeting_transcript
    "source_id": "meeting-2026-02-07-pricing",
    "participants": ["person-6", "agent-4"],  // optional
    "timestamp": "2026-02-07T14:00:00Z"
}

Response: {
    "classification": {
        "primary": "financial",
        "secondary": "strategic",
        "confidence": 0.92
    },
    "entities_extracted": [
        {"name": "Acme Corp Pricing", "type": "decision", "attributes": {...}},
        {"name": "Sarah Chen", "type": "person", "reference": "person-6"},
        ...
    ],
    "relationships_extracted": [
        {"source": "person-6", "target": "decision-acme-pricing", "type": "DECIDED_BY"},
        ...
    ],
    "knowledge_units_created": ["fact-abc", "commitment-def"],
    "graph_updates": 12  // number of nodes/edges modified
}
```

### Prompt Design (Classification)

```
System: You classify organizational communications into categories.
Respond with JSON: {"primary": "...", "secondary": "...", "confidence": 0.0-1.0}
Categories: strategic, operational, financial, technical, organizational, external

User: [Raw text]
```

### Prompt Design (Entity Extraction)

```
System: You extract structured entities from organizational text.
Given the following text and organizational context, extract all entities.

Current org context:
{org_context}

Known people: {people_list}
Known AI agents: {agent_list}
Known active decisions: {decisions_list}

For each entity found, provide:
- name, type, division, attributes
- confidence score (0.0-1.0)
- whether it matches an existing node (reference ID) or is new

User: [Raw text]
```

### Demo Simulation

For the hackathon demo, we pre-load 5 "incoming transcripts" that the user can ingest one by one:

1. **Sarah Chen's client call transcript** — triggers the Acme pricing extraction
2. **Nova-Sales auto-proposal log** — triggers the contradicting $15/seat fact
3. **NA Engineering sprint retro** — reveals the GraphQL migration discussion
4. **EMEA weekly standup notes** — shows the duplicate retry logic work
5. **Catherine Moore's executive review** — reveals overload indicators

Each one demonstrates the full classify → extract → update pipeline.

---

## 5. Module 2: Information Tracking (Source of Truth)

**Beads ID**: `Hack-Nation-Hackathon-7jp`
**Depends on**: Module 0 (Service Layer)

### What It Is

The **knowledge graph manager** — the ONE SOURCE OF TRUTH as written in the original diagram. This module:

1. **Persists** all extracted entities and relationships into the knowledge graph
2. **Deduplicates** — if an entity already exists, merge rather than duplicate
3. **Tracks provenance** — every fact records who said it, when, and how confident we are
4. **Computes freshness** — half-life decay model, freshness scores update continuously
5. **Detects conflicts** — when new info contradicts existing info, flag immediately
6. **Maintains versions** — when facts are superseded, keep history

### Graph Mutation Operations

```python
class GraphManager:
    async def upsert_node(self, node_data: dict) -> str:
        """Create or update a node. Uses LLM for dedup matching."""
        # 1. Embed the node's content
        # 2. Search for similar existing nodes (cosine similarity > 0.85)
        # 3. If match found, merge attributes (LLM decides what to keep)
        # 4. If new, create node with full metadata
        # 5. Return node ID

    async def upsert_edge(self, source: str, target: str, edge_type: str, metadata: dict) -> str:
        """Create or update an edge."""
        # Check for existing edge between same nodes
        # If same type exists, update weight/metadata
        # If CONTRADICTS type, trigger immune system alert

    async def supersede(self, old_node_id: str, new_node_id: str) -> None:
        """Mark old knowledge unit as superseded by new one."""
        # Create SUPERSEDES edge
        # Update old node status to "superseded"
        # Recompute freshness scores for dependents

    async def compute_freshness(self) -> None:
        """Recompute freshness scores for all knowledge units."""
        # freshness = 2^(-age_days / half_life_days)
        # Batch update across all knowledge nodes
```

### LLM-Powered Deduplication

When new entities arrive, the system uses embeddings + LLM to deduplicate:

```
Step 1: Embed new entity text → vector
Step 2: Find top-5 similar existing nodes (cosine similarity)
Step 3: For each candidate with similarity > 0.85:
    Ask GPT-4o-mini: "Is this new entity the same as this existing one?"
    {
        "new": {"name": "Enterprise pricing update", "content": "..."},
        "existing": {"id": "decision-pricing-enterprise", "label": "...", "content": "..."}
    }
Step 4: If match → merge (keep newer info, preserve provenance chain)
Step 5: If no match → create new node
```

### Provenance Chain

Every knowledge unit tracks its full provenance:

```json
{
    "id": "fact-acme-pricing-20",
    "content": "Sarah Chen committed $20/seat to Acme Corp",
    "provenance": {
        "source_type": "meeting_transcript",
        "source_id": "meeting-2026-02-07-client-call",
        "extracted_by": "gpt-5.2",
        "extraction_confidence": 0.95,
        "created_at": "2026-02-07T14:30:00Z",
        "verified_by": null,
        "superseded_by": null,
        "version": 1
    }
}
```

### API Endpoints

```
POST /api/graph/mutate     — Apply a batch of node/edge mutations
GET  /api/graph/history/{id} — Get version history of a node
GET  /api/graph/provenance/{id} — Get full provenance chain
POST /api/graph/refresh-freshness — Recompute all freshness scores
```

---

## 6. Module 3: Automated Information Routing

**Beads ID**: `Hack-Nation-Hackathon-3oy`
**Depends on**: Module 2 (Information Tracking)

### What It Is

From the original diagram: "Automatically send information to the relevant person — when new info comes in, synthesize information." This module:

1. **Determines who needs to know** when new information enters the graph
2. **Generates personalized summaries** tailored to each recipient's context
3. **Prioritizes** notifications (critical vs. FYI)
4. **Avoids noise** — only routes genuinely relevant information

### Routing Algorithm

```
New Knowledge Unit enters graph
        │
        ▼
┌───────────────────────────┐
│ Step 1: Impact Analysis   │  ◄── GPT-5.2
│ "Who is affected by this? │
│  Who needs to know?"      │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Step 2: Priority Scoring  │  ◄── GPT-4o-mini
│ For each affected person: │
│ - Direct impact (0-1)     │
│ - Urgency (0-1)           │
│ - Need to act (0-1)       │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Step 3: Summary Gen       │  ◄── GPT-5.2
│ Personalized summary      │
│ tailored to each person's │
│ role, current context,    │
│ and what they care about  │
└───────────┬───────────────┘
            │
            ▼
    Route to notification queue
    (UI shows in Alerts / briefing)
```

### Routing Prompt

```
System: You are the NEXUS information routing engine. Given a new piece of information
and the organizational context, determine who needs to know about it.

Consider:
- Who is directly affected (their work, their decisions, their team)?
- Who has the authority to act on this?
- Who has expertise relevant to this topic?
- Who is currently working on related things?

New information:
{new_knowledge_unit}

Organizational context:
{org_context}

For each person who needs to know, provide:
{
    "routes": [
        {
            "person_id": "...",
            "reason": "Why they need to know",
            "priority": "critical|high|medium|low",
            "action_required": true/false,
            "suggested_action": "What they should do",
            "personalized_summary": "2-3 sentence summary tailored to their role"
        }
    ]
}
```

### Demo Simulation

When the user ingests the "Nova-Sales auto-proposal" transcript:
- Routes to **Sarah Chen** (critical — contradicts her pricing commitment)
- Routes to **Robert Daniels** (high — CFO, financial impact)
- Routes to **Tom Bradley** (high — account exec for Acme, needs to know)
- Routes to **Catherine Moore** (medium — CSO, strategic pricing decision)
- Generates personalized summaries for each (different framing based on role)

### API Endpoint

```
GET /api/routing/pending      — Get pending notifications for a person
GET /api/routing/history       — Get routing history for a knowledge unit
POST /api/routing/acknowledge  — Mark a notification as seen
```

---

## 7. Module 4: Task Scheduling Engine

**Beads ID**: `Hack-Nation-Hackathon-c6c`
**Depends on**: Module 2 (Information Tracking)

### What It Is

From the original diagram:
- What needs to be done
- What order it should be done
- What can be done at once/parallelized
- What blocks what (BLOCKERS)
- Who would be best suited for this (AI Task vs Human Task)
- "THINK GRAPH OF WHAT CAN BE DONE"
- Done on team-wide scale then sent to sub agent

### How It Works

The Task Scheduling Engine periodically scans the knowledge graph and:

1. **Identifies actionable items** — unresolved questions, uncommitted decisions, open alerts
2. **Generates a task graph** — directed acyclic graph of what needs to be done
3. **Computes dependencies** — which tasks block which other tasks
4. **Identifies parallelism** — which tasks can run concurrently
5. **Assigns owners** — matches tasks to the best-suited person or AI agent
6. **Estimates effort** — based on similar past tasks and current workload

### LLM Task Generation

```
System: You are the NEXUS Task Scheduling Engine. Analyze the current state of the
organization and generate an actionable task graph.

Current organizational state:
{full_graph_context}

Active alerts:
{alerts_context}

Unresolved items:
{unresolved_questions_and_decisions}

Current workloads:
{workload_summary}

Generate a task graph in JSON:
{
    "tasks": [
        {
            "id": "task-001",
            "title": "Resolve Acme Corp pricing contradiction",
            "description": "Sarah Chen and Nova-Sales sent conflicting quotes...",
            "type": "human",  // or "ai"
            "assigned_to": "person-6",
            "reason_for_assignment": "Sarah is VP Sales and made the original commitment",
            "priority": "critical",
            "estimated_effort_hours": 1,
            "blocks": ["task-003"],
            "blocked_by": [],
            "parallel_with": ["task-002"],
            "deadline_suggestion": "2026-02-07T18:00:00Z"
        },
        ...
    ],
    "critical_path": ["task-001", "task-003", "task-005"],
    "parallelization_opportunities": [
        {"group": ["task-002", "task-004"], "reason": "Independent divisions, no shared resources"}
    ]
}
```

### Assignment Logic

The LLM considers multiple factors when assigning tasks:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Expertise** | 30% | Who has domain knowledge for this task? |
| **Authority** | 25% | Who has the authority to make this decision? |
| **Current load** | 20% | Who has capacity right now? |
| **Proximity** | 15% | Who is already connected to the affected nodes? |
| **AI suitability** | 10% | Can an AI agent handle this, or does it need a human? |

### Human vs AI Task Classification

```
System: For each task, determine whether it should be done by a human or an AI agent.

Human tasks:
- Require judgment, empathy, or authority (e.g., client calls, final decisions)
- Involve external stakeholders
- Have legal or compliance implications
- Require creative or strategic thinking

AI agent tasks:
- Data gathering, analysis, summarization
- Code changes, documentation updates
- Routine communications (status updates, notifications)
- Monitoring and alerting
```

### API Endpoints

```
GET  /api/tasks/generate        — Run task scheduling, return task graph
GET  /api/tasks/current         — Get current task graph
GET  /api/tasks/for/{person_id} — Get tasks assigned to a person/agent
POST /api/tasks/{id}/complete   — Mark task as complete (triggers re-scheduling)
GET  /api/tasks/critical-path   — Get the critical path
```

---

## 8. Module 5: Worker Tracker & Conflict Detection

**Beads ID**: `Hack-Nation-Hackathon-9ms`
**Depends on**: Module 4 (Task Scheduling)

### What It Is

From the original diagram:
- Who works on what
- If there is any conflicting work currently being done
- Can that work be more efficiently allocated somewhere else
- Should we collaborate

### How It Works

The Worker Tracker maintains a real-time view of what every person and AI agent is working on, and uses the LLM to detect:

1. **Conflicting work** — two people/agents working on contradictory solutions
2. **Duplicate effort** — two teams building the same thing independently (silo detection on steroids)
3. **Reallocation opportunities** — overloaded people who could delegate to underutilized agents
4. **Collaboration recommendations** — people who should be talking but aren't

### Conflict Detection Prompt

```
System: You are the NEXUS Worker Tracker. Analyze the current work assignments
and detect conflicts, duplications, and inefficiencies.

Current assignments:
{assignments_context}

For each person/agent, you have:
- What they're currently working on
- Their cognitive load
- Their commitments and deadlines
- Their communication patterns (who they talk to)

Detect:
1. CONFLICTS: Two workers producing contradictory outputs
2. DUPLICATES: Two workers building the same thing independently
3. OVERLOADS: Workers who need immediate help
4. REALLOCATION: Work that could be moved to a better-suited worker
5. COLLABORATION: Workers who should connect but haven't

Return:
{
    "conflicts": [...],
    "duplicates": [...],
    "overloads": [...],
    "reallocation_suggestions": [...],
    "collaboration_recommendations": [...]
}
```

### Team Sub-Agent

From the original diagram, the Worker Tracker has a "Team Sub Agent" that operates at the team level. This is implemented as a **per-team analysis** that runs periodically:

```python
async def analyze_team(team_id: str) -> TeamAnalysis:
    """Run the Team Sub Agent for a specific team."""
    team_context = context_builder.build_team_context(team_id)

    result = await llm_client.complete(
        task_type="conflict_analysis",
        system_prompt=PROMPTS["team_sub_agent"],
        user_prompt=team_context,
        response_format=SCHEMAS["team_analysis"]
    )

    return TeamAnalysis.parse(result)
```

### API Endpoints

```
GET  /api/workers/status           — Full worker status dashboard
GET  /api/workers/{id}/assignments — What a person/agent is working on
GET  /api/workers/conflicts        — Detected conflicts and duplicates
GET  /api/workers/recommendations  — Reallocation and collaboration suggestions
POST /api/workers/reassign         — Trigger a reallocation
```

---

## 9. Module 6: Immune System Agents (LLM-Powered)

**Beads ID**: `Hack-Nation-Hackathon-n8p`
**Depends on**: Module 0 (Service Layer)

### What Changes

Currently the immune system agents are **rule-based** (Python functions checking thresholds). We upgrade them to **LLM-powered reasoning agents** that can:

- Understand **semantic contradictions** (not just "CONTRADICTS" edge type)
- Detect **subtle staleness** (not just freshness_score < 0.4)
- Find **hidden silos** (not just "< 2 cross-division edges")
- Assess **real overload risk** (not just cognitive_load > 0.8)
- Evaluate **trust calibration** (not just trust_level == "review_required")
- Detect **strategic drift** (not just superseded edges)

### Agent Prompts

Each agent gets a specialized system prompt and the relevant graph context:

**Contradiction Agent**:
```
System: You are the NEXUS Contradiction Detection Agent. Your job is to find
conflicting information in the knowledge graph.

Look for:
- Direct contradictions (fact A says X, fact B says not-X)
- Implicit contradictions (decision A implies X, decision B implies not-X)
- Temporal contradictions (fact was true last week but actions assume it's still true)
- Cross-source contradictions (human says one thing, AI agent assumes another)

For each contradiction found, provide:
- The two conflicting nodes (with IDs)
- Why they contradict
- The downstream impact
- Who has the authority to resolve it
- Estimated cost of not resolving

Be precise. Don't flag trivial inconsistencies. Focus on contradictions that
could lead to real organizational harm.
```

**Silo Agent**:
```
System: You are the NEXUS Silo Detection Agent. Your job is to find teams or
individuals who should be communicating but aren't.

Look for:
- Teams working on overlapping problems with no communication edges
- People with complementary expertise who aren't connected
- Cross-division dependencies with no direct communication channels
- Duplicated effort across teams (same code, same analysis, same research)

Don't just count edges. Analyze whether the CONTENT of work overlaps,
whether EXPERTISE is being underutilized, and whether DECISIONS in one
area affect another area without any information flow.
```

**Drift Agent**:
```
System: You are the NEXUS Strategic Drift Detection Agent. Your job is to find
AI agents or people who are operating on outdated context.

Look for:
- AI agents producing work based on superseded decisions
- People making commitments based on old information
- Teams whose plans don't reflect recent strategic changes
- Context feeds that haven't been updated after significant changes

Compare each agent's recent outputs against the current knowledge graph state.
Flag any gaps between what they THINK is true and what IS true.
```

### Execution Pattern

```python
async def run_immune_scan() -> list[Alert]:
    """Run all 6 immune system agents and collect findings."""
    graph = await graph_store.load_graph()
    context = context_builder.build_org_context("full")

    # Run all 6 agents in parallel
    results = await asyncio.gather(
        run_agent("contradiction", context, graph),
        run_agent("staleness", context, graph),
        run_agent("silo", context, graph),
        run_agent("overload", context, graph),
        run_agent("coordination", context, graph),
        run_agent("drift", context, graph),
    )

    alerts = []
    for agent_name, result in zip(AGENT_NAMES, results):
        if result["detected"]:
            alerts.append(Alert(
                agent=agent_name,
                severity=result["severity"],
                headline=result["headline"],
                detail=result["detail"],
                affected_node_ids=result["affected_node_ids"],
                estimated_cost=result.get("estimated_cost"),
                resolution={"authority": result["resolver"], "action": result["recommended_action"]},
            ))

    return alerts
```

### API Endpoints

```
POST /api/immune/scan            — Run full immune scan (all 6 agents)
POST /api/immune/scan/{agent}    — Run a single agent
GET  /api/immune/history          — History of all scans with findings
```

---

## 10. Module 7: Ask NEXUS (Real RAG + Generation)

**Beads ID**: `Hack-Nation-Hackathon-0j7`
**Depends on**: Module 0 (Service Layer)

### What Changes

Currently Ask NEXUS uses fuzzy string matching against 5 cached responses. We upgrade to:

1. **Embedding-based semantic search** across the entire knowledge graph
2. **LLM-generated answers** grounded in retrieved graph context
3. **Multi-turn conversation** with memory
4. **Citation of sources** (every claim links to a specific node)
5. **Streaming responses** for real-time UI

### RAG Pipeline

```
User Query: "Why did we switch pricing?"
        │
        ▼
┌────────────────────────────┐
│ Step 1: Query Embedding    │  ◄── text-embedding-3-large
│ Embed the query            │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│ Step 2: Vector Search      │  ◄── Cosine similarity against all node embeddings
│ Find top-20 relevant nodes │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│ Step 3: Graph Expansion    │  ◄── BFS from retrieved nodes (1-2 hops)
│ Pull in connected context  │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│ Step 4: Context Assembly   │  ◄── context_builder.graph_to_text()
│ Format as natural language  │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│ Step 5: LLM Generation     │  ◄── GPT-5.2 (streaming)
│ Answer with citations      │
└────────────┬───────────────┘
             │
             ▼
    Streamed response to UI
```

### Answer Generation Prompt

```
System: You are NEXUS, the organizational knowledge system for Meridian Technologies.
Answer the user's question using ONLY the retrieved context below. If the context
doesn't contain enough information, say so.

Rules:
- Cite specific nodes by name (e.g., "According to Sarah Chen (VP Sales)...")
- Quantify impact where possible (dollar amounts, percentages, timelines)
- Flag any contradictions or uncertainties you notice in the data
- Suggest concrete next actions when relevant
- If multiple perspectives exist, present all of them

Retrieved context:
{retrieved_context}

Active alerts related to this query:
{related_alerts}

Recent changes (last 24h):
{recent_changes}
```

### Conversation Memory

```python
class ConversationMemory:
    def __init__(self):
        self.turns: list[dict] = []  # {"role": "user"|"assistant", "content": "..."}

    def add_turn(self, role: str, content: str):
        self.turns.append({"role": role, "content": content})
        # Keep last 10 turns to stay within context window
        if len(self.turns) > 20:
            self.turns = self.turns[-20:]

    def get_context(self) -> list[dict]:
        return self.turns
```

### API Endpoint

```
POST /api/ask
Body: {
    "query": "Why did we switch pricing?",
    "conversation_id": "conv-abc",  // optional, for multi-turn
    "stream": true                  // optional, for SSE streaming
}

Response (non-streaming): {
    "answer": "The pricing change was driven by...",
    "citations": [
        {"node_id": "decision-pricing-enterprise", "text": "Enterprise pricing raised to $20/seat", "relevance": 0.95}
    ],
    "items": [...],  // backward-compatible with current format
    "highlight_node_ids": ["decision-pricing-enterprise", "person-6"],
    "suggested_followups": [
        "What's the impact on the Acme deal?",
        "Who approved this change?"
    ]
}

Response (streaming): Server-Sent Events
    data: {"type": "token", "content": "The "}
    data: {"type": "token", "content": "pricing "}
    ...
    data: {"type": "citations", "content": [...]}
    data: {"type": "done"}
```

---

## 11. Module 8: Briefing & Onboarding Generation

**Beads ID**: `Hack-Nation-Hackathon-atl`
**Depends on**: Module 7 (Ask NEXUS)

### Executive Briefing

Currently the briefing is a hardcoded string. We make it **dynamically generated** by the LLM:

```
System: You are NEXUS generating an executive briefing for {person_name} ({role}).
Analyze the last 24 hours of organizational activity and produce a concise briefing.

Structure:
1. Lead with the most critical issue requiring immediate attention
2. Follow with 2-3 other notable changes
3. End with a forward-looking note (upcoming deadlines, risks on the horizon)

Style: Direct, executive-level, no fluff. Quantify everything.
Address the reader directly ("your team", "you should", etc.)

Organizational context (last 24h):
{temporal_context}

Active alerts:
{alerts}

{person_name}'s team and responsibilities:
{person_context}
```

### Onboarding Package

Currently the 5-step onboarding is hardcoded. We make each step **dynamically generated**:

```python
async def generate_onboarding(team_id: str, new_person_name: str) -> OnboardingPackage:
    """Generate a personalized onboarding package for a new team member."""

    team_context = context_builder.build_team_context(team_id)

    steps = await llm_client.complete(
        task_type="onboarding",
        system_prompt=PROMPTS["onboarding_generator"],
        user_prompt=f"""
        Generate a 5-step onboarding package for {new_person_name} joining {team_id}.

        Team context:
        {team_context}

        Steps:
        1. The World You're Joining (team overview, culture, key stats)
        2. Key Decisions That Shape Your Work (recent decisions with impact)
        3. People & AI Agents You Need to Know (key contacts with WHY)
        4. Open Tensions & Unresolved Issues (current problems to be aware of)
        5. What's Expected of You (objectives, deliverables, timeline)
        """,
        response_format=SCHEMAS["onboarding_package"]
    )

    return OnboardingPackage.parse(steps)
```

### API Endpoints

```
POST /api/briefing/generate    — Generate executive briefing for a person
POST /api/onboarding/generate  — Generate onboarding package for a team
GET  /api/briefing/latest       — Get most recently generated briefing
```

---

## 12. Module 9: InfoDrop Intelligence

**Beads ID**: `Hack-Nation-Hackathon-yk6`
**Depends on**: Module 1 (Classification)

### What Changes

Currently InfoDrop does keyword matching. We upgrade to:

1. **LLM classification** — determine the type of knowledge being dropped
2. **Smart entity linking** — find which existing nodes this relates to
3. **Contradiction check** — immediately check if this contradicts existing facts
4. **Auto-routing** — determine who needs to know about this new information
5. **Graph update** — create proper nodes and edges with full provenance

### Pipeline

```
User drops text: "Atlas-Code is still using REST v3 for the payments endpoint"
        │
        ▼
┌───────────────────────────┐
│ 1. Classify (GPT-4o-mini) │  → type: "fact", category: "technical"
│ 2. Extract entities       │  → Atlas-Code (agent-1), REST v3, payments
│ 3. Link to existing nodes │  → agent-1, decision-graphql-migration
│ 4. Check contradictions   │  → CONTRADICTION: GraphQL migration was decided
│ 5. Create knowledge unit  │  → fact-atlas-rest-v3
│ 6. Route notifications    │  → Marcus Rivera, Priya Sharma
│ 7. Trigger immune scan    │  → Drift agent detects the issue
└───────────────────────────┘
        │
        ▼
    Response: "Classified as 'fact' (technical).
    ⚠ CONTRADICTION: This conflicts with the GraphQL migration decision (Feb 7).
    Notified: Marcus Rivera, Priya Sharma.
    Immune system: Drift alert created."
```

---

## 13. Frontend Integration & Streaming

**Beads ID**: `Hack-Nation-Hackathon-8yt`
**Depends on**: Module 7 (Ask NEXUS)

### Streaming for Ask NEXUS

```typescript
// lib/api.ts
export async function askNexusStream(
    query: string,
    onToken: (token: string) => void,
    onDone: (response: AskResponse) => void
): Promise<void> {
    const response = await fetch(`${BASE_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, stream: true }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        // Parse SSE events
        for (const line of text.split('\n')) {
            if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'token') onToken(data.content);
                if (data.type === 'done') onDone(data.response);
            }
        }
    }
}
```

### DemoView Dynamic Briefing

Replace the hardcoded `BRIEFING_TEXT` with a real LLM call:

```typescript
// In DemoView.tsx
const generateBriefing = async () => {
    setShowBriefing(true);
    const response = await fetch('/api/briefing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: 'person-19', stream: true }),
    });
    // Stream tokens into briefingText state for typewriter effect
};
```

### Real-Time Immune Alerts

When an immune scan completes, push new alerts to the frontend via SSE:

```
GET /api/events — Server-Sent Events stream
    data: {"type": "new_alert", "alert": {...}}
    data: {"type": "graph_update", "changes": {...}}
    data: {"type": "routing_notification", "route": {...}}
```

---

## 14. Testing & Evaluation Harness

**Beads ID**: `Hack-Nation-Hackathon-5p1`
**Depends on**: Module 0 (Service Layer)

### LLM Output Quality Testing

```python
# tests/test_llm_quality.py

class TestImmuneAgents:
    """Test that immune agents correctly detect known anomalies."""

    async def test_contradiction_detection(self):
        """The contradiction agent should find the Acme pricing conflict."""
        alerts = await run_agent("contradiction", test_context, test_graph)
        assert alerts["detected"] == True
        assert "Acme" in alerts["headline"]
        assert "person-6" in alerts["affected_node_ids"]

    async def test_silo_detection(self):
        """The silo agent should find the NA/EMEA retry logic duplication."""
        alerts = await run_agent("silo", test_context, test_graph)
        assert alerts["detected"] == True
        assert "83%" in alerts["detail"] or "overlap" in alerts["detail"].lower()

class TestClassification:
    """Test entity extraction accuracy on known transcripts."""

    async def test_pricing_transcript(self):
        """Should extract Sarah Chen, Acme Corp, $20/seat from the pricing call."""
        result = await classify_and_extract(PRICING_TRANSCRIPT)
        entities = [e["name"] for e in result["entities_extracted"]]
        assert "Sarah Chen" in entities or any("person-6" in str(e) for e in result["entities_extracted"])

class TestRAG:
    """Test that Ask NEXUS returns grounded, accurate answers."""

    async def test_pricing_query(self):
        """Asking about pricing should reference the $20/seat decision."""
        response = await ask_nexus("Why did we switch pricing?")
        assert "$20" in response["answer"]
        assert len(response["citations"]) > 0
```

### Cost Tracking

```python
# services/llm/usage.py
class UsageTracker:
    def __init__(self):
        self.calls: list[dict] = []

    def record(self, model: str, input_tokens: int, output_tokens: int, task_type: str):
        cost = self.compute_cost(model, input_tokens, output_tokens)
        self.calls.append({
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": cost,
            "task_type": task_type,
            "timestamp": datetime.now().isoformat()
        })

    def get_summary(self) -> dict:
        return {
            "total_calls": len(self.calls),
            "total_cost_usd": sum(c["cost_usd"] for c in self.calls),
            "by_model": {...},
            "by_task_type": {...}
        }
```

---

## 15. Dependency Graph

```
                    ┌──────────────────┐
                    │  Module 0        │
                    │  Service Layer   │
                    │  (e0d)           │
                    └───────┬──────────┘
                            │
          ┌─────────┬───────┼───────┬──────────┐
          │         │       │       │          │
          ▼         ▼       ▼       ▼          ▼
     ┌─────────┐ ┌──────┐ ┌────┐ ┌──────┐ ┌───────┐
     │Module 1 │ │Mod 2 │ │M 6 │ │M 7   │ │ Test  │
     │Classify │ │Info  │ │Immu│ │Ask   │ │Harness│
     │(gs8)    │ │Track │ │ne  │ │NEXUS │ │(5p1)  │
     └────┬────┘ │(7jp) │ │(n8p│ │(0j7) │ └───────┘
          │      └──┬───┘ └────┘ └──┬───┘
          ▼         │               │
     ┌─────────┐    ├────────┐      ├──────────┐
     │Module 9 │    │        │      │          │
     │InfoDrop │    ▼        ▼      ▼          ▼
     │(yk6)    │ ┌──────┐ ┌─────┐ ┌──────┐ ┌──────┐
     └─────────┘ │Mod 3 │ │M 4  │ │M 8   │ │M 10  │
                 │Route │ │Task │ │Brief │ │Front │
                 │(3oy) │ │Sched│ │& Onb │ │end   │
                 └──────┘ │(c6c)│ │(atl) │ │(8yt) │
                          └──┬──┘ └──────┘ └──────┘
                             │
                             ▼
                          ┌──────┐
                          │M 5   │
                          │Worker│
                          │Track │
                          │(9ms) │
                          └──────┘
```

### Recommended Build Order

| Phase | Modules | Rationale |
|-------|---------|-----------|
| **Phase 1** | Module 0 (Service Layer) | Foundation — everything depends on this |
| **Phase 2** | Modules 1, 2, 6, 7 in parallel | Core capabilities — classify, track, detect, query |
| **Phase 3** | Modules 3, 4, 8, 9 | Dependent features — routing, scheduling, generation |
| **Phase 4** | Module 5 (Worker Tracker) | Depends on task scheduling |
| **Phase 5** | Module 10 (Frontend) + Tests | Wire everything up, verify quality |

---

## 16. Data Flow: End to End

### Complete Lifecycle of a Piece of Information

```
1. RAW INPUT
   Sarah Chen has a client call. Meeting transcript is generated.

2. INGEST (Module 1)
   POST /api/ingest with the transcript.
   → Classified as: financial + strategic
   → Entities extracted: Sarah Chen, Acme Corp, $20/seat, 500 seats
   → Relationships: Sarah DECIDED_BY Acme pricing, AFFECTS Acme deal

3. PERSIST (Module 2)
   Graph updated: new fact node "fact-acme-pricing-20" created.
   Provenance recorded. Embedding generated. Freshness set to 1.0.
   Dedup check: no existing match → create new.

4. ROUTE (Module 3)
   LLM determines who needs to know:
   → Robert Daniels (CFO): "New pricing commitment made: $20/seat for Acme Corp"
   → Tom Bradley (Account Exec): "Your VP committed $20/seat for Acme. Prepare proposal."

5. THREE HOURS LATER...
   Nova-Sales auto-generates a proposal at $15/seat (old pricing sheet).
   This enters the system via the agent activity log.

6. INGEST (Module 1) again
   → Fact extracted: "fact-acme-pricing-15" — $15/seat proposal sent

7. PERSIST (Module 2) — CONTRADICTION DETECTED
   Graph updated. Dedup check finds "fact-acme-pricing-20".
   LLM confirms: these are contradictory. CONTRADICTS edge created.

8. IMMUNE SCAN (Module 6)
   Contradiction Agent fires:
   → Alert: "Conflicting Pricing Sent to Acme Corp"
   → Severity: critical
   → Affected: person-6, agent-4
   → Cost: $30K ARR at risk

9. ROUTE (Module 3)
   → Sarah Chen: CRITICAL — "Nova-Sales contradicted your pricing. Act now."
   → Robert Daniels: HIGH — "Pricing conflict on Acme deal. $30K at risk."

10. TASK SCHEDULING (Module 4)
    → Task 1: Sarah Chen — call Acme, confirm $20/seat (CRITICAL, 1hr)
    → Task 2: AI Agent — update Nova-Sales pricing database (AI task, 15min)
    → Task 3: Robert Daniels — review pricing governance (HIGH, 2hr)

11. WORKER TRACKER (Module 5)
    Monitors execution. Sarah Chen's load increases.
    If she doesn't act within 2 hours, escalate to Catherine Moore.

12. USER QUERIES (Module 7)
    CEO asks: "What changed today?"
    → RAG retrieves the pricing facts, contradiction alert, resolution status
    → LLM generates a briefing grounded in actual data

13. UI DISPLAYS
    → DemoView briefing shows the dynamically generated text
    → Alerts view shows the contradiction with real LLM analysis
    → Decision Explorer traces the full chain
    → Pulse View highlights the affected nodes
```

---

## 17. File Plan

### New Files to Create

```
nexus-api/
├── services/
│   ├── llm/
│   │   ├── __init__.py           # Exports LLMClient, ContextBuilder, etc.
│   │   ├── client.py             # OpenAI async client, complete(), embed()
│   │   ├── router.py             # Model routing logic (gpt-5.2 vs gpt-4o-mini)
│   │   ├── prompts.py            # All 20+ prompt templates
│   │   ├── schemas.py            # JSON schemas for structured outputs
│   │   ├── embeddings.py         # Embedding generation, vector store, similarity search
│   │   ├── cache.py              # Response cache (TTL-based)
│   │   ├── context_builder.py    # Graph → prompt context conversion
│   │   ├── usage.py              # Token counting, cost tracking
│   │   └── streaming.py          # SSE streaming helpers
│   ├── ingest.py                 # Module 1: Classification + entity extraction pipeline
│   ├── graph_manager.py          # Module 2: Graph mutations, dedup, versioning
│   ├── info_router.py            # Module 3: Information routing engine
│   ├── task_scheduler.py         # Module 4: Task graph generation
│   ├── worker_tracker.py         # Module 5: Conflict detection, reallocation
│   ├── immune_llm.py             # Module 6: LLM-powered immune agents
│   ├── rag_v2.py                 # Module 7: Real RAG pipeline
│   ├── briefing_generator.py     # Module 8: Dynamic briefing/onboarding
│   └── infodrop_v2.py            # Module 9: Smart InfoDrop pipeline
├── routers/
│   ├── ingest.py                 # POST /api/ingest
│   ├── tasks.py                  # GET/POST /api/tasks/*
│   ├── workers.py                # GET /api/workers/*
│   ├── immune.py                 # POST /api/immune/scan
│   ├── briefing.py               # POST /api/briefing/generate
│   └── events.py                 # GET /api/events (SSE stream)

nexus-ui/src/
├── lib/
│   ├── api.ts                    # Updated with new endpoints + streaming
│   └── sse.ts                    # Server-Sent Events client helper
├── views/
│   ├── DemoView.tsx              # Updated: dynamic briefing, real-time alerts
│   └── AskNexusView.tsx          # Updated: streaming responses, conversation

tests/
├── test_llm_quality.py           # LLM output quality tests
├── test_immune_agents.py         # Immune agent accuracy tests
├── test_rag.py                   # RAG retrieval + generation tests
├── test_classification.py        # Entity extraction tests
└── test_routing.py               # Information routing tests
```

### Files to Modify

```
nexus-api/main.py                 # Add new routers, OPENAI_API_KEY config
nexus-api/requirements.txt        # Add: openai>=1.0.0 (already there), tiktoken
nexus-ui/src/lib/api.ts           # Add streaming support, new endpoints
nexus-ui/src/views/DemoView.tsx   # Dynamic briefing, real immune scan
nexus-ui/src/views/AskNexusView.tsx  # Streaming answers, conversation memory
nexus-ui/src/views/AlertsView.tsx # Real-time alert updates via SSE
```

---

## 18. Environment & Configuration

### Required Environment Variables

```bash
# .env (nexus-api/)
OPENAI_API_KEY=sk-...                    # Required
NEXUS_MODEL_HEAVY=gpt-5.2               # Default: gpt-5.2
NEXUS_MODEL_FAST=gpt-4o-mini            # Default: gpt-4o-mini
NEXUS_EMBEDDING_MODEL=text-embedding-3-large  # Default
NEXUS_LLM_CACHE_TTL=300                 # Cache TTL in seconds
NEXUS_LLM_MAX_RETRIES=3                 # Retry count on failure
NEXUS_LLM_TIMEOUT=30                    # Timeout per request in seconds
NEXUS_DEMO_MODE=true                    # Use synthetic data
```

### Cost Estimate (Demo Session)

| Operation | Model | Calls | Avg Tokens | Est. Cost |
|-----------|-------|-------|------------|-----------|
| Immune scan (6 agents) | gpt-5.2 | 6 | ~4K in, ~1K out | ~$0.13 |
| Ask NEXUS query | gpt-5.2 | 1 | ~3K in, ~500 out | ~$0.01 |
| Briefing generation | gpt-5.2 | 1 | ~5K in, ~800 out | ~$0.02 |
| Onboarding (5 steps) | gpt-5.2 | 1 | ~6K in, ~2K out | ~$0.04 |
| Classification | gpt-4o-mini | 1 | ~1K in, ~200 out | ~$0.0003 |
| Entity extraction | gpt-4o-mini | 1 | ~2K in, ~500 out | ~$0.0006 |
| Embeddings (87 nodes) | text-embedding-3-large | 1 | ~20K | ~$0.003 |
| **Full demo run** | | **~15** | | **~$0.21** |

With near-unlimited credits, cost is negligible. Optimize for quality, not tokens.

---

## Acceptance Criteria

The LLM integration is **done** when:

- [ ] Every "Ask NEXUS" response is generated by GPT-5.2 grounded in graph context (not cached)
- [ ] Immune system agents use LLM reasoning to detect anomalies (not rule-based thresholds)
- [ ] Briefings and onboarding packages are dynamically generated per-person
- [ ] InfoDrop classifies, extracts, and routes using the LLM pipeline
- [ ] New information can be ingested (POST /api/ingest) and flows through the full pipeline
- [ ] Task scheduling generates a real task graph with dependencies and assignments
- [ ] Worker tracker detects conflicts and suggests reallocation
- [ ] Information routing determines who needs to know and generates personalized summaries
- [ ] All LLM calls are logged with token usage and cost tracking
- [ ] Streaming works for Ask NEXUS and briefing generation
- [ ] The DemoView uses real LLM calls instead of hardcoded data
- [ ] Quality tests pass for all 5 demo scenarios
