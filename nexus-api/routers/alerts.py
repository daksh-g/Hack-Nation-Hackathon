from fastapi import APIRouter, HTTPException
from services.graph_store import load_alerts

router = APIRouter(prefix="/api")

# In-memory resolved set for demo
_resolved_ids: set[str] = set()


@router.get("/alerts")
async def get_alerts():
    alerts = load_alerts()
    # Mark any that were resolved in this session
    for a in alerts:
        if a["id"] in _resolved_ids:
            a["resolved"] = True
    return {"alerts": alerts}


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    alerts = load_alerts()
    alert = next((a for a in alerts if a["id"] == alert_id), None)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")

    _resolved_ids.add(alert_id)
    alert["resolved"] = True

    return {
        "alert": alert,
        "affected_nodes": alert.get("affected_node_ids", []),
    }
