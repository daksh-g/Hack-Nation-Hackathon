"""Briefing and onboarding generation endpoints."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json

router = APIRouter(prefix="/api/briefing", tags=["briefing"])


class BriefingRequest(BaseModel):
    person_id: str
    stream: bool = False


class OnboardingRequest(BaseModel):
    team_name: str
    division: str


@router.post("/generate")
async def generate_briefing(req: BriefingRequest):
    """Generate a personalized executive briefing."""
    if req.stream:
        return StreamingResponse(
            _stream_briefing(req.person_id),
            media_type="text/event-stream",
        )
    try:
        from services.briefing_generator import generate_briefing
        return await generate_briefing(req.person_id)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


async def _stream_briefing(person_id: str):
    """SSE stream for briefing generation."""
    try:
        from services.briefing_generator import generate_briefing_stream
        async for token in generate_briefing_stream(person_id):
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"


@router.post("/onboarding")
async def generate_onboarding(req: OnboardingRequest):
    """Generate a personalized onboarding package."""
    try:
        from services.briefing_generator import generate_onboarding
        return await generate_onboarding(req.team_name, req.division)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
