from fastapi import APIRouter

router = APIRouter(prefix="/api")

@router.get("/decisions")
async def get_decisions():
    return {"cross_division": [], "by_division": {}}

@router.get("/decisions/{decision_id}/chain")
async def get_decision_chain(decision_id: str):
    return {"chain": [], "downstream_impact": []}
