import os
import json
import logging
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.graph_store import load_graph, load_ask_cache
from services.rag import query_with_rag

router = APIRouter(prefix="/api")
logger = logging.getLogger("nexus.ask")


class AskRequest(BaseModel):
    query: str
    stream: bool = False
    conversation_id: str | None = None


@router.post("/ask")
async def ask_nexus(request: AskRequest):
    # Try LLM-powered RAG if OpenAI key is configured
    if os.getenv("OPENAI_API_KEY"):
        try:
            if request.stream:
                return StreamingResponse(
                    _stream_ask(request.query),
                    media_type="text/event-stream",
                )
            from services.rag_v2 import query_rag
            result = await query_rag(
                request.query,
                conversation_id=request.conversation_id,
            )
            logger.info(f"[Ask] LLM RAG response for: {request.query[:50]}")
            return result
        except Exception as e:
            logger.warning(f"[Ask] LLM RAG failed, falling back: {e}")

    # Fallback to cache-based RAG
    graph = load_graph()
    cache = load_ask_cache()
    return await query_with_rag(request.query, graph, cache)


async def _stream_ask(query: str):
    """SSE stream for Ask NEXUS."""
    try:
        from services.rag_v2 import query_rag_stream
        async for token in query_rag_stream(query):
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
