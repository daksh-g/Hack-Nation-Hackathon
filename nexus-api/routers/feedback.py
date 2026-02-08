from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api")

class FeedbackRequest(BaseModel):
    node_id: str
    useful: bool
    reason: Optional[str] = None

@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    return {"acknowledged": True, "adjustment": "none"}
