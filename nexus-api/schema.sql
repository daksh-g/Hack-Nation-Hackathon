-- NEXUS Supabase Schema Migration
-- Run this via Supabase SQL Editor or CLI

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ── NODES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nodes (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL,
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
  extras        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
CREATE INDEX IF NOT EXISTS idx_nodes_division ON nodes(division);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);

-- ── EDGES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS edges (
  id            TEXT PRIMARY KEY,
  source        TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target        TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  weight        FLOAT DEFAULT 1.0,
  animated      BOOLEAN DEFAULT false,
  label         TEXT,
  interaction_type TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  extras        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target);
CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_edges_unique ON edges(source, target, type);

-- ── GRAPH METADATA ────────────────────────────────────
CREATE TABLE IF NOT EXISTS graph_metadata (
  key           TEXT PRIMARY KEY,
  value         JSONB NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── NODE EMBEDDINGS (pgvector) ────────────────────────
CREATE TABLE IF NOT EXISTS node_embeddings (
  node_id       TEXT PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
  text_content  TEXT NOT NULL,
  embedding     vector(3072),
  model         TEXT NOT NULL DEFAULT 'text-embedding-3-large',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── MUTATION HISTORY ──────────────────────────────────
CREATE TABLE IF NOT EXISTS mutation_history (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action        TEXT NOT NULL,
  node_id       TEXT,
  data          JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mutations_node ON mutation_history(node_id);
CREATE INDEX IF NOT EXISTS idx_mutations_time ON mutation_history(created_at DESC);

-- ── NOTIFICATIONS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  person_id     TEXT NOT NULL,
  person_name   TEXT,
  priority      TEXT DEFAULT 'medium',
  action_required BOOLEAN DEFAULT false,
  suggested_action TEXT,
  summary       TEXT,
  source_unit   TEXT,
  acknowledged  BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_person ON notifications(person_id);
CREATE INDEX IF NOT EXISTS idx_notifications_ack ON notifications(acknowledged);

-- ── ALERTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id            TEXT PRIMARY KEY,
  agent         TEXT NOT NULL,
  severity      TEXT NOT NULL DEFAULT 'warning',
  scope         TEXT NOT NULL DEFAULT 'cross-division',
  headline      TEXT NOT NULL,
  detail        TEXT NOT NULL DEFAULT '',
  affected_node_ids TEXT[] DEFAULT '{}',
  resolution_authority TEXT,
  resolution_action TEXT,
  resolution_endpoint TEXT,
  estimated_cost TEXT,
  timestamp     TIMESTAMPTZ DEFAULT now(),
  resolved      BOOLEAN DEFAULT false,
  llm_generated BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);

-- ── IMMUNE SCAN HISTORY ───────────────────────────────
CREATE TABLE IF NOT EXISTS immune_scans (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agents_run    TEXT[] DEFAULT '{}',
  total_findings INTEGER DEFAULT 0,
  alerts_generated INTEGER DEFAULT 0,
  alerts        JSONB DEFAULT '[]',
  by_agent      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── TASK GRAPHS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_graphs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tasks         JSONB NOT NULL DEFAULT '[]',
  critical_path JSONB NOT NULL DEFAULT '[]',
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── LLM USAGE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS llm_usage (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  model         TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd      FLOAT NOT NULL,
  task_type     TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_model ON llm_usage(model);
CREATE INDEX IF NOT EXISTS idx_usage_task ON llm_usage(task_type);

-- ── CONVERSATIONS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id            TEXT PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_msgs_conv ON conversation_messages(conversation_id);

-- ── WORKER ANALYSES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS worker_analyses (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  result        JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── ASK CACHE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ask_cache (
  query_normalized TEXT PRIMARY KEY,
  response      JSONB NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── VECTOR SEARCH FUNCTION ────────────────────────────
CREATE OR REPLACE FUNCTION search_similar_nodes(
  query_embedding vector(3072),
  match_count INT DEFAULT 20,
  similarity_threshold FLOAT DEFAULT 0.0
)
RETURNS TABLE (node_id TEXT, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT ne.node_id, (1 - (ne.embedding <=> query_embedding))::FLOAT AS similarity
  FROM node_embeddings ne
  WHERE ne.embedding IS NOT NULL
    AND (1 - (ne.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY ne.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ── REALTIME ──────────────────────────────────────────
DO $$
BEGIN
  -- Enable Realtime on key tables
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE nodes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE edges;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
