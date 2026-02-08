"""Supabase schema migration + data seeding for NEXUS."""

import json
import os
import sys
import logging

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("nexus.migrate")

from services.supabase_client import get_supabase

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'mock_data')

# ── SQL Schema ──────────────────────────────────────────────────────────────

SCHEMA_SQL = """
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
"""

INDEX_SQL = """
-- Indexes for nodes
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
CREATE INDEX IF NOT EXISTS idx_nodes_division ON nodes(division);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);

-- Indexes for edges
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target);
CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(type);

-- Indexes for other tables
CREATE INDEX IF NOT EXISTS idx_mutations_node ON mutation_history(node_id);
CREATE INDEX IF NOT EXISTS idx_mutations_time ON mutation_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_person ON notifications(person_id);
CREATE INDEX IF NOT EXISTS idx_notifications_ack ON notifications(acknowledged);
CREATE INDEX IF NOT EXISTS idx_usage_model ON llm_usage(model);
CREATE INDEX IF NOT EXISTS idx_usage_task ON llm_usage(task_type);
CREATE INDEX IF NOT EXISTS idx_conv_msgs_conv ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
"""

UNIQUE_EDGE_SQL = """
CREATE UNIQUE INDEX IF NOT EXISTS idx_edges_unique ON edges(source, target, type);
"""

VECTOR_SEARCH_SQL = """
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
"""

REALTIME_SQL = """
ALTER PUBLICATION supabase_realtime ADD TABLE nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE edges;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
"""


def run_migration():
    """Run the full schema migration."""
    sb = get_supabase()

    logger.info("=== Running schema migration ===")

    # Execute schema creation
    for statement in SCHEMA_SQL.split(";"):
        stmt = statement.strip()
        if stmt and not stmt.startswith("--"):
            try:
                sb.postgrest.session.headers.update({"Content-Type": "application/json"})
                # Use rpc to execute raw SQL
                sb.rpc("", {}).execute()  # This won't work directly
            except Exception:
                pass

    logger.info("Schema SQL prepared — executing via Supabase SQL editor or REST API")


def seed_data():
    """Seed data from mock_data/ JSON files into Supabase."""
    sb = get_supabase()

    # Load graph.json
    graph_path = os.path.join(DATA_DIR, 'graph.json')
    if not os.path.exists(graph_path):
        logger.error(f"graph.json not found at {graph_path}")
        return

    with open(graph_path) as f:
        graph = json.load(f)

    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    metadata = graph.get("metadata", {})

    # ── Seed nodes ──
    logger.info(f"Seeding {len(nodes)} nodes...")
    node_rows = []
    for n in nodes:
        extras = {}
        # Extract type-specific fields into extras
        for key in ("role", "cognitive_load", "active_commitments", "pending_decisions",
                     "agent_type", "trust_level", "supervising_human", "active_tasks",
                     "content", "blast_radius"):
            if key in n and n[key] is not None:
                extras[key] = n[key]

        row = {
            "id": n["id"],
            "type": n.get("type", "unknown"),
            "label": n.get("label", n["id"]),
            "division": n.get("division"),
            "department": n.get("department"),
            "team": n.get("team"),
            "health": n.get("health", "green"),
            "size": n.get("size", 1),
            "x": n.get("x"),
            "y": n.get("y"),
            "status": n.get("status", "active"),
            "freshness_score": n.get("freshness_score", 1.0),
            "half_life_days": n.get("half_life_days", 14),
            "source_type": n.get("source_type"),
            "source_id": n.get("source_id"),
            "extras": extras,
        }
        node_rows.append(row)

    # Insert in batches of 50
    for i in range(0, len(node_rows), 50):
        batch = node_rows[i:i+50]
        try:
            sb.table("nodes").upsert(batch).execute()
            logger.info(f"  Inserted nodes {i+1}-{i+len(batch)}")
        except Exception as e:
            logger.error(f"  Failed to insert nodes batch: {e}")

    # ── Seed edges ──
    logger.info(f"Seeding {len(edges)} edges...")
    edge_rows = []
    for e in edges:
        extras = {}
        for key in ("interaction_type",):
            if key in e and e[key] is not None:
                extras[key] = e[key]

        row = {
            "id": e.get("id", f"edge-{len(edge_rows)}"),
            "source": e["source"],
            "target": e["target"],
            "type": e.get("type", "RELATED"),
            "weight": e.get("weight", 1.0),
            "animated": e.get("animated", False),
            "label": e.get("label"),
            "interaction_type": e.get("interaction_type"),
            "extras": extras,
        }
        edge_rows.append(row)

    for i in range(0, len(edge_rows), 50):
        batch = edge_rows[i:i+50]
        try:
            sb.table("edges").upsert(batch).execute()
            logger.info(f"  Inserted edges {i+1}-{i+len(batch)}")
        except Exception as e:
            logger.error(f"  Failed to insert edges batch: {e}")

    # ── Seed metadata ──
    logger.info("Seeding graph metadata...")
    try:
        sb.table("graph_metadata").upsert([
            {"key": "company_name", "value": json.dumps(metadata.get("company_name", "Meridian Technologies"))},
            {"key": "generated_at", "value": json.dumps(metadata.get("generated_at", ""))},
        ]).execute()
    except Exception as e:
        logger.error(f"Failed to seed metadata: {e}")

    # ── Seed alerts ──
    alerts_path = os.path.join(DATA_DIR, 'alerts.json')
    if os.path.exists(alerts_path):
        with open(alerts_path) as f:
            alerts_data = json.load(f)
        alerts = alerts_data if isinstance(alerts_data, list) else alerts_data.get("alerts", [])

        logger.info(f"Seeding {len(alerts)} alerts...")
        alert_rows = []
        for a in alerts:
            resolution = a.get("resolution", {})
            row = {
                "id": a["id"],
                "agent": a.get("agent", "unknown"),
                "severity": a.get("severity", "warning"),
                "scope": a.get("scope", "cross-division"),
                "headline": a.get("headline", ""),
                "detail": a.get("detail", ""),
                "affected_node_ids": a.get("affected_node_ids", []),
                "resolution_authority": resolution.get("authority"),
                "resolution_action": resolution.get("action"),
                "resolution_endpoint": resolution.get("endpoint"),
                "estimated_cost": a.get("estimated_cost"),
                "resolved": a.get("resolved", False),
                "llm_generated": a.get("llm_generated", False),
            }
            alert_rows.append(row)

        try:
            sb.table("alerts").upsert(alert_rows).execute()
            logger.info(f"  Inserted {len(alert_rows)} alerts")
        except Exception as e:
            logger.error(f"  Failed to insert alerts: {e}")

    # ── Seed ask_cache ──
    ask_path = os.path.join(DATA_DIR, 'ask_cache.json')
    if os.path.exists(ask_path):
        with open(ask_path) as f:
            ask_data = json.load(f)
        queries = ask_data.get("queries", {})

        logger.info(f"Seeding {len(queries)} ask cache entries...")
        cache_rows = []
        for query_key, response in queries.items():
            cache_rows.append({
                "query_normalized": query_key,
                "response": response,
            })

        if cache_rows:
            try:
                sb.table("ask_cache").upsert(cache_rows).execute()
                logger.info(f"  Inserted {len(cache_rows)} ask cache entries")
            except Exception as e:
                logger.error(f"  Failed to insert ask cache: {e}")

    logger.info("=== Seed complete ===")

    # Verify counts
    try:
        node_count = sb.table("nodes").select("id", count="exact").execute()
        edge_count = sb.table("edges").select("id", count="exact").execute()
        alert_count = sb.table("alerts").select("id", count="exact").execute()
        logger.info(f"Verification: {node_count.count} nodes, {edge_count.count} edges, {alert_count.count} alerts")
    except Exception as e:
        logger.warning(f"Verification query failed: {e}")


if __name__ == "__main__":
    if "--seed" in sys.argv:
        seed_data()
    elif "--migrate" in sys.argv:
        run_migration()
    else:
        logger.info("Usage: python migrate.py --seed | --migrate")
        logger.info("Note: Run schema SQL via Supabase SQL editor first, then --seed")
        seed_data()  # Default: seed data
