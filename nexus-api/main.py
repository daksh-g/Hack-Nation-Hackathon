import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

DEMO_MODE = os.getenv("NEXUS_DEMO_MODE", "true").lower() == "true"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: verify Supabase connection and build embedding index."""
    # Verify Supabase connection
    from services.supabase_client import is_supabase_configured
    if is_supabase_configured():
        try:
            from services.supabase_client import get_supabase
            sb = get_supabase()
            result = sb.table("nodes").select("id", count="exact").limit(1).execute()
            logging.info(f"Supabase connected — {result.count} nodes in database")
        except Exception as e:
            logging.warning(f"Supabase connection check failed (will use fallback): {e}")
    else:
        logging.info("Supabase not configured — using in-memory/JSON fallback")

    # Build embedding index
    if os.getenv("OPENAI_API_KEY"):
        try:
            from services.llm.embeddings import get_embedding_service
            emb = get_embedding_service()
            await emb.build_index()
            logging.info("Embedding index built on startup")
        except Exception as e:
            logging.warning(f"Could not build embedding index on startup: {e}")
    yield


app = FastAPI(title="NEXUS API", version="3.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Original routers (backward-compatible) ────────────────────────────────────
from routers import graph, alerts, decisions, ask, info, feedback

app.include_router(graph.router)
app.include_router(alerts.router)
app.include_router(decisions.router)
app.include_router(ask.router)
app.include_router(info.router)
app.include_router(feedback.router)

# ── New LLM-powered routers ──────────────────────────────────────────────────
from routers import ingest, tasks, workers, immune, briefing, routing

app.include_router(ingest.router)
app.include_router(tasks.router)
app.include_router(workers.router)
app.include_router(immune.router)
app.include_router(briefing.router)
app.include_router(routing.router)


@app.get("/")
async def root():
    llm_status = "configured" if os.getenv("OPENAI_API_KEY") else "not configured"
    from services.supabase_client import is_supabase_configured
    db_status = "connected" if is_supabase_configured() else "not configured"
    return {
        "name": "NEXUS API",
        "version": "3.0.0",
        "demo_mode": DEMO_MODE,
        "llm_status": llm_status,
        "db_status": db_status,
        "llm_model_heavy": os.getenv("NEXUS_MODEL_HEAVY", "gpt-4o"),
        "llm_model_fast": os.getenv("NEXUS_MODEL_FAST", "gpt-4o-mini"),
        "storage_backend": "supabase" if is_supabase_configured() else "memory",
    }


@app.get("/api/llm/usage")
async def llm_usage():
    """Get LLM token usage and cost summary."""
    try:
        from services.llm.client import get_llm_client
        client = get_llm_client()
        return client.usage.get_summary()
    except Exception:
        return {"total_calls": 0, "total_cost_usd": 0, "message": "LLM client not initialized"}
