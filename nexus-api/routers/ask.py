from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api")

class AskRequest(BaseModel):
    query: str

@router.post("/ask")
async def ask_nexus(request: AskRequest):
    return {"items": [], "highlight_node_ids": []}
