"""Information routing endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/routing", tags=["routing"])


@router.get("/pending")
async def pending_notifications(person_id: str | None = None):
    """Get pending notifications, optionally filtered by person."""
    from services.info_router import get_pending_notifications
    return {"notifications": get_pending_notifications(person_id)}


@router.get("/history")
async def routing_history(unit_id: str | None = None):
    """Get routing history."""
    from services.info_router import get_routing_history
    return {"history": get_routing_history(unit_id)}


class AckRequest(BaseModel):
    person_id: str
    source_unit: str


@router.post("/acknowledge")
async def acknowledge(req: AckRequest):
    """Mark a notification as seen."""
    from services.info_router import acknowledge_notification
    ok = acknowledge_notification(req.person_id, req.source_unit)
    return {"acknowledged": ok}
