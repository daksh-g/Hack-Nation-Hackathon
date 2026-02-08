import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="NEXUS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEMO_MODE = os.getenv("NEXUS_DEMO_MODE", "true").lower() == "true"

from routers import graph, alerts, decisions, ask, info, feedback

app.include_router(graph.router)
app.include_router(alerts.router)
app.include_router(decisions.router)
app.include_router(ask.router)
app.include_router(info.router)
app.include_router(feedback.router)

@app.get("/")
async def root():
    return {"name": "NEXUS API", "version": "1.0.0", "demo_mode": DEMO_MODE}
