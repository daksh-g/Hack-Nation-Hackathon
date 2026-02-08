from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api")

class InfoRequest(BaseModel):
    text: str

@router.post("/info")
async def info_drop(request: InfoRequest):
    return {
        "unit": {"id": "new-1", "type": "decision", "label": "New info"},
        "new_edges": [],
        "ripple_target": ""
    }
