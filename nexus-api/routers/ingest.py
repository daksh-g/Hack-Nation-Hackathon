"""POST /api/ingest — Transcript classification & entity extraction pipeline."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


class IngestRequest(BaseModel):
    text: str
    source_type: str = "unknown"
    source_id: str | None = None
    participants: list[str] | None = None
    timestamp: str | None = None


@router.post("")
async def ingest_text(req: IngestRequest):
    """Ingest raw text through the full classification + extraction pipeline."""
    try:
        from services.ingest import full_ingest_pipeline
        result = await full_ingest_pipeline(
            text=req.text,
            source_type=req.source_type,
            source_id=req.source_id,
            participants=req.participants,
            timestamp=req.timestamp,
        )
        return result
    except RuntimeError as e:
        if "OPENAI_API_KEY" in str(e) or "quota" in str(e).lower():
            raise HTTPException(status_code=503, detail=f"LLM service unavailable: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classify")
async def classify_only(req: IngestRequest):
    """Classify text without full extraction (fast)."""
    try:
        from services.ingest import classify_text
        return await classify_text(req.text)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
