"""Task scheduling endpoints."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.post("/generate")
async def generate_tasks():
    """Run the task scheduling engine to generate a task graph."""
    try:
        from services.task_scheduler import generate_task_graph
        return await generate_task_graph()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/current")
async def get_current():
    """Get the current task graph."""
    from services.task_scheduler import get_current_tasks
    tasks = get_current_tasks()
    if tasks is None:
        return {"tasks": [], "message": "No task graph generated yet. POST /api/tasks/generate first."}
    return tasks


@router.get("/for/{person_id}")
async def get_for_person(person_id: str):
    """Get tasks assigned to a specific person or agent."""
    from services.task_scheduler import get_tasks_for_person
    return {"tasks": get_tasks_for_person(person_id)}


@router.post("/{task_id}/complete")
async def complete_task(task_id: str):
    """Mark a task as complete."""
    from services.task_scheduler import complete_task
    ok = complete_task(task_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return {"completed": True, "task_id": task_id}


@router.get("/critical-path")
async def critical_path():
    """Get the critical path."""
    from services.task_scheduler import get_critical_path
    return {"critical_path": get_critical_path()}
