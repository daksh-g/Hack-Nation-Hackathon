"""Worker tracker endpoints."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/workers", tags=["workers"])


@router.get("/status")
async def worker_status():
    """Get latest worker analysis (conflicts, duplicates, overloads, etc.)."""
    from services.worker_tracker import get_worker_status
    return get_worker_status()


@router.post("/analyze")
async def analyze():
    """Run full worker analysis via LLM."""
    try:
        from services.worker_tracker import analyze_workers
        return await analyze_workers()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/analyze-team/{division}")
async def analyze_team(division: str):
    """Run team-level sub-agent analysis for a specific division."""
    try:
        from services.worker_tracker import analyze_team
        return await analyze_team(division)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/{worker_id}/assignments")
async def assignments(worker_id: str):
    """Get what a worker is currently assigned to."""
    from services.worker_tracker import get_worker_assignments
    return get_worker_assignments(worker_id)
