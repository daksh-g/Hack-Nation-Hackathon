from fastapi import APIRouter

router = APIRouter(prefix="/api")

@router.get("/alerts")
async def get_alerts():
    return {"alerts": []}

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    return {"alert": {"id": alert_id}, "affected_nodes": []}
