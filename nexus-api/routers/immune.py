"""LLM-powered immune system scan endpoints."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/immune", tags=["immune"])


@router.post("/scan")
async def full_scan():
    """Run all 6 immune system agents in parallel using LLM reasoning."""
    try:
        from services.immune_llm import run_full_scan
        return await run_full_scan()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/scan/{agent_name}")
async def single_scan(agent_name: str):
    """Run a single immune system agent."""
    valid = ["contradiction", "staleness", "silo", "overload", "coordination", "drift"]
    if agent_name not in valid:
        raise HTTPException(status_code=400, detail=f"Unknown agent. Valid: {valid}")
    try:
        from services.immune_llm import run_single_agent
        return await run_single_agent(agent_name)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/history")
async def scan_history():
    """Get history of all immune scans."""
    from services.immune_llm import get_scan_history
    return {"scans": get_scan_history()}
