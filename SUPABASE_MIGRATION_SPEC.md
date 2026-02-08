# Feature Specification: Supabase Database Migration

> Generated on 2026-02-07

## Overview

**Feature:** Migrate NEXUS from in-memory Python dicts to Supabase (hosted PostgreSQL + pgvector + Realtime)

NEXUS currently stores ALL state in-memory — graph nodes, edges, embeddings, mutation history, notifications, conversations, task graphs, scan history, and LLM usage. Everything is lost on restart. This migration moves all persistent state to Supabase, adds pgvector for semantic search, and enables Realtime subscriptions for live frontend updates.

## User Preferences (from elicitation)

| Decision | User Choice |
|----------|-------------|
| Supabase setup | Need to create new project |
| Migration scope | Everything — all in-memory state moves to DB |
| Supabase Realtime | Yes, enable now |
| Auth / RLS | Skip for hackathon |

## Requirements

### R1: Supabase Project Setup
- Create a new Supabase project
- Enable pgvector extension
- Configure environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- Install `supabase-py` async client

### R2: Schema Design — Knowledge Graph

**Approach: Hybrid — common columns + JSONB extras**

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ── NODES ─────────────────────────────────────────────
CREATE TABLE nodes (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('person','agent','team','decision','fact','commitment','question','topic')),
  label         TEXT NOT NULL,
  division      TEXT,
  department    TEXT,
  team          TEXT,
  health        TEXT DEFAULT 'green',
  size          INTEGER DEFAULT 1,
  x             FLOAT,
  y             FLOAT,
  status        TEXT DEFAULT 'active',
  freshness_score FLOAT DEFAULT 1.0,
  half_life_days  INTEGER DEFAULT 14,
  source_type   TEXT,
  source_id     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  extras        JSONB DEFAULT '{}'::jsonb   -- type-specific fields
);

CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_division ON nodes(division);
CREATE INDEX idx_nodes_status ON nodes(status);

-- ── EDGES ─────────────────────────────────────────────
CREATE TABLE edges (
  id            TEXT PRIMARY KEY,
  source        TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target        TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  weight        FLOAT DEFAULT 1.0,
  animated      BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  extras        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_edges_source ON edges(source);
CREATE INDEX idx_edges_target ON edges(target);
CREATE INDEX idx_edges_type ON edges(type);
CREATE UNIQUE INDEX idx_edges_unique ON edges(source, target, type);

-- ── GRAPH METADATA ────────────────────────────────────
CREATE TABLE graph_metadata (
  key           TEXT PRIMARY KEY,
  value         JSONB NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

### R3: Schema Design — Embeddings (pgvector)

```sql
-- ── NODE EMBEDDINGS ───────────────────────────────────
CREATE TABLE node_embeddings (
  node_id       TEXT PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
  text_content  TEXT NOT NULL,
  embedding     vector(3072),   -- text-embedding-3-large
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- HNSW index for fast approximate nearest-neighbor search
CREATE INDEX idx_embeddings_hnsw ON node_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**Vector search function:**
```sql
CREATE OR REPLACE FUNCTION search_similar_nodes(
  query_embedding vector(3072),
  match_count INT DEFAULT 20,
  similarity_threshold FLOAT DEFAULT 0.0
)
RETURNS TABLE (node_id TEXT, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT ne.node_id, 1 - (ne.embedding <=> query_embedding) AS similarity
  FROM node_embeddings ne
  WHERE 1 - (ne.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ne.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### R4: Schema Design — Mutation History

```sql
CREATE TABLE mutation_history (
  id            BIGSERIAL PRIMARY KEY,
  action        TEXT NOT NULL,
  node_id       TEXT,
  edge_id       TEXT,
  data          JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mutations_node ON mutation_history(node_id);
CREATE INDEX idx_mutations_time ON mutation_history(created_at DESC);
```

### R5: Schema Design — Notifications

```sql
CREATE TABLE notifications (
  id            BIGSERIAL PRIMARY KEY,
  person_id     TEXT NOT NULL,
  person_name   TEXT,
  priority      TEXT DEFAULT 'medium',
  action_required BOOLEAN DEFAULT false,
  suggested_action TEXT,
  summary       TEXT,
  source_unit   JSONB,
  acknowledged  BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_person ON notifications(person_id);
CREATE INDEX idx_notifications_ack ON notifications(acknowledged);
```

### R6: Schema Design — Conversations (RAG)

```sql
CREATE TABLE conversations (
  id            TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content       TEXT NOT NULL,
  seq           SERIAL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id, seq)
);

CREATE INDEX idx_conversations_id ON conversations(id);
```

### R7: Schema Design — Task Scheduler

```sql
CREATE TABLE task_graphs (
  id            BIGSERIAL PRIMARY KEY,
  tasks         JSONB NOT NULL DEFAULT '[]',
  critical_path JSONB NOT NULL DEFAULT '[]',
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### R8: Schema Design — Immune System Scan History

```sql
CREATE TABLE immune_scans (
  id            BIGSERIAL PRIMARY KEY,
  agents_run    JSONB NOT NULL DEFAULT '[]',
  total_findings INTEGER DEFAULT 0,
  alerts_generated INTEGER DEFAULT 0,
  alerts        JSONB NOT NULL DEFAULT '[]',
  by_agent      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### R9: Schema Design — Worker Analysis

```sql
CREATE TABLE worker_analyses (
  id            BIGSERIAL PRIMARY KEY,
  conflicts     JSONB DEFAULT '[]',
  duplicates    JSONB DEFAULT '[]',
  overloads     JSONB DEFAULT '[]',
  reallocation_suggestions JSONB DEFAULT '[]',
  collaboration_recommendations JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### R10: Schema Design — LLM Usage Tracking

```sql
CREATE TABLE llm_usage (
  id            BIGSERIAL PRIMARY KEY,
  model         TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd      FLOAT NOT NULL,
  task_type     TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usage_model ON llm_usage(model);
CREATE INDEX idx_usage_task ON llm_usage(task_type);
CREATE INDEX idx_usage_time ON llm_usage(created_at DESC);
```

### R11: Supabase Realtime

Enable Realtime on these tables for live frontend push:
- `nodes` — frontend graph updates when nodes change
- `edges` — frontend graph updates when edges change
- `notifications` — live notification feed

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE edges;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### R12: Data Seeding

Migrate existing mock_data/ JSON files into Supabase:
1. Read `graph.json` → insert all nodes into `nodes` table, all edges into `edges` table
2. Read `alerts.json` → seed initial immune scan record
3. Read `ask_cache.json` → keep as local fallback (not migrated)
4. Read `hierarchy.json` → extract metadata into `graph_metadata` table
5. Rebuild embeddings from graph nodes using pgvector

### R13: Service Layer Migration

Every module that currently uses in-memory state must be updated:

| File | Current State | Migration Target |
|------|---------------|-----------------|
| `graph_store.py` | `_cache` dict → JSON files | Supabase `nodes`, `edges`, `graph_metadata` tables |
| `graph_manager.py` | `_graph_state` dict, `_history` list | Supabase `nodes`, `edges`, `mutation_history` tables |
| `llm/embeddings.py` | `_index` dict (numpy arrays) | Supabase `node_embeddings` table + pgvector search |
| `llm/usage.py` | `UsageTracker.calls` list | Supabase `llm_usage` table |
| `llm/client.py` | `ResponseCache._cache` dict | **Keep in-memory** (TTL=5min, not worth DB roundtrip) |
| `immune_llm.py` | `_scan_history` list | Supabase `immune_scans` table |
| `info_router.py` | `_pending_notifications`, `_notification_history` | Supabase `notifications` table |
| `rag_v2.py` | `_conversations` dict | Supabase `conversations` table |
| `task_scheduler.py` | `_current_tasks` dict | Supabase `task_graphs` table |
| `worker_tracker.py` | `_latest_analysis` dict | Supabase `worker_analyses` table |

### R14: Supabase Client Module

Create `nexus-api/services/supabase_client.py`:
- Async singleton using `supabase-py` `create_async_client()`
- Read config from environment variables
- Expose typed helper functions for common operations

### R15: Frontend Realtime Integration

Update the React frontend to subscribe to Supabase Realtime channels:
- Subscribe to `nodes` and `edges` changes → update PulseView graph live
- Subscribe to `notifications` → show live notification badges

## Acceptance Criteria

- [ ] Supabase project created with pgvector enabled
- [ ] All 10 tables created via SQL migration
- [ ] Seed script loads graph.json data into nodes/edges tables
- [ ] `graph_store.py` reads from Supabase instead of JSON files
- [ ] `graph_manager.py` writes mutations to Supabase
- [ ] `embeddings.py` uses pgvector for similarity search
- [ ] `usage.py` writes usage records to Supabase
- [ ] `immune_llm.py` persists scan history to Supabase
- [ ] `info_router.py` persists notifications to Supabase
- [ ] `rag_v2.py` persists conversations to Supabase
- [ ] `task_scheduler.py` persists task graphs to Supabase
- [ ] `worker_tracker.py` persists analyses to Supabase
- [ ] Supabase Realtime enabled on nodes, edges, notifications
- [ ] Frontend subscribes to Realtime and updates graph live
- [ ] All existing API endpoints continue to work (no regressions)
- [ ] Data persists across server restarts
- [ ] LLM response cache remains in-memory (intentional)
- [ ] Graceful fallback to in-memory if Supabase is unavailable

## Technical Approach

### Phase 0: Setup (30 min)
1. Create Supabase project at supabase.com
2. Enable pgvector extension in SQL editor
3. Run full schema migration SQL
4. Add `supabase-py` to requirements.txt
5. Create `.env` entries for Supabase credentials

### Phase 1: Core Data Layer (2-3 hours)
1. Create `supabase_client.py` — async singleton client
2. Rewrite `graph_store.py` — read from Supabase with in-memory cache
3. Rewrite `graph_manager.py` — write mutations to Supabase
4. Create seed script to load mock_data/ into Supabase
5. Test: all existing graph endpoints work

### Phase 2: Embeddings Migration (1-2 hours)
1. Rewrite `embeddings.py` — store vectors in `node_embeddings` table
2. Replace numpy cosine similarity with pgvector `<=>` operator
3. Use `search_similar_nodes()` RPC function
4. Test: Ask NEXUS semantic search works

### Phase 3: Application State (2-3 hours)
1. Migrate `usage.py` → `llm_usage` table
2. Migrate `immune_llm.py` → `immune_scans` table
3. Migrate `info_router.py` → `notifications` table
4. Migrate `rag_v2.py` → `conversations` table
5. Migrate `task_scheduler.py` → `task_graphs` table
6. Migrate `worker_tracker.py` → `worker_analyses` table

### Phase 4: Realtime (1-2 hours)
1. Enable Realtime publication on nodes, edges, notifications
2. Add Supabase JS client to frontend
3. Subscribe to changes in PulseView
4. Subscribe to notifications
5. Test: Info Drop → graph updates → frontend reflects change

### Phase 5: Verification (1 hour)
1. Restart backend — verify data persists
2. Run all endpoints — verify no regressions
3. Test fallback — stop Supabase → verify graceful degradation
4. Verify embedding search quality matches in-memory version

*Assumptions made:*
- **LLM response cache stays in-memory.** TTL is 5 minutes; the DB roundtrip cost exceeds the benefit. This is the only state that intentionally stays ephemeral.
- **text-embedding-3-large (3072 dims)** is used. This matches the existing codebase's default in `client.py:190`.
- **No RLS policies.** Skip auth for hackathon speed per user preference.
- **Foreign keys with CASCADE.** Deleting a node auto-deletes its edges and embeddings.
- **HNSW index** for approximate nearest neighbor. Exact search is unnecessary at 87 nodes but HNSW scales if the graph grows.
- **Supabase JS client** (`@supabase/supabase-js`) for frontend Realtime subscriptions — this is the standard approach.

## Edge Cases

1. **Supabase unavailable at startup:** Fall back to loading from mock_data/ JSON files (existing behavior). Log a warning.
2. **Embedding dimension mismatch:** If model changes from 3072 to 1536, the vector column and index must be recreated. Pin the model in env vars.
3. **Concurrent writes:** Supabase handles row-level locking. The UNIQUE index on edges prevents duplicate edge creation.
4. **Large JSONB fields:** The `extras` column could grow unbounded. At hackathon scale (87 nodes) this is a non-issue.
5. **Realtime connection drops:** Frontend should auto-reconnect (Supabase JS client handles this by default).

## Open Questions

1. **Supabase region:** Which region to create the project in? (Recommend: closest to hackathon venue for lowest latency)
2. **Free tier limits:** Supabase free tier allows 500MB database, 2 Realtime connections, 50MB file storage. Should be sufficient for hackathon.

---

- [x] Ready for implementation
