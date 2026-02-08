from fastapi import APIRouter
from pydantic import BaseModel
from services.graph_store import load_graph, load_ask_cache
from services.rag import query_with_rag

router = APIRouter(prefix="/api")


class AskRequest(BaseModel):
    query: str


@router.post("/ask")
async def ask_nexus(request: AskRequest):
    graph = load_graph()
    cache = load_ask_cache()
    return await query_with_rag(request.query, graph, cache)
