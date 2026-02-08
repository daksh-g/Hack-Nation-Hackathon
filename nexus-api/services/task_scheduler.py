"""Module 4: Task Scheduling Engine — LLM-powered task graph generation."""

import json
import logging
from .llm.client import get_llm_client
from .llm.context_builder import ContextBuilder
from .llm import prompts
from .supabase_client import get_supabase, is_supabase_configured

logger = logging.getLogger("nexus.task_scheduler")

# In-memory task state (fallback)
_current_tasks: dict | None = None


async def generate_task_graph() -> dict:
    """Analyze org state and generate actionable task graph."""
    global _current_tasks

    client = get_llm_client()
    ctx = ContextBuilder()

    org_summary = ctx.build_org_summary()
    org_context = ctx.build_org_context()
    alerts_context = ctx.build_alerts_context()
    knowledge_context = ctx.build_knowledge_context()

    system = prompts.NEXUS_BASE.format(**org_summary) + "\n\n" + prompts.TASK_SCHEDULER

    result = await client.complete_json(
        task_type="task_scheduling",
        system_prompt=system,
        user_prompt=(
            f"Current organizational state:\n{org_context[:6000]}\n\n"
            f"Active alerts:\n{alerts_context}\n\n"
            f"Knowledge units:\n{knowledge_context[:4000]}"
        ),
        use_cache=False,
    )

    _current_tasks = result

    # Persist to Supabase
    if is_supabase_configured():
        try:
            sb = get_supabase()
            # Deactivate all previous task graphs
            sb.table("task_graphs").update({"active": False}).eq("active", True).execute()
            # Insert the new one as active
            sb.table("task_graphs").insert({
                "tasks": json.loads(json.dumps(result.get("tasks", []), default=str)),
                "critical_path": json.loads(json.dumps(result.get("critical_path", []), default=str)),
                "active": True,
            }).execute()
            logger.info("[TaskScheduler] Task graph persisted to Supabase")
        except Exception as e:
            logger.warning(f"[TaskScheduler] Failed to persist task graph to Supabase: {e}")

    tasks = result.get("tasks", [])
    logger.info(f"[TaskScheduler] Generated {len(tasks)} tasks, critical path: {result.get('critical_path', [])}")
    return result


def get_current_tasks() -> dict | None:
    """Get the current task graph."""
    if is_supabase_configured():
        try:
            sb = get_supabase()
            result = (
                sb.table("task_graphs")
                .select("*")
                .eq("active", True)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if result.data:
                row = result.data[0]
                return {
                    "tasks": row.get("tasks", []),
                    "critical_path": row.get("critical_path", []),
                }
        except Exception as e:
            logger.warning(f"[TaskScheduler] Failed to read tasks from Supabase: {e}")

    return _current_tasks


def get_tasks_for_person(person_id: str) -> list[dict]:
    """Get tasks assigned to a specific person or agent."""
    current = get_current_tasks()
    if not current:
        return []
    return [t for t in current.get("tasks", []) if t.get("assigned_to") == person_id]


def complete_task(task_id: str) -> bool:
    """Mark a task as complete."""
    global _current_tasks

    current = get_current_tasks()
    if not current:
        return False

    found = False
    for task in current.get("tasks", []):
        if task.get("id") == task_id:
            task["status"] = "completed"
            # Unblock dependent tasks
            for other in current.get("tasks", []):
                if task_id in other.get("blocked_by", []):
                    other["blocked_by"].remove(task_id)
            found = True
            break

    if not found:
        return False

    # Update in-memory
    _current_tasks = current

    # Persist updated tasks to Supabase
    if is_supabase_configured():
        try:
            sb = get_supabase()
            sb.table("task_graphs").update({
                "tasks": json.loads(json.dumps(current.get("tasks", []), default=str)),
            }).eq("active", True).execute()
            logger.info(f"[TaskScheduler] Task {task_id} completed, updated in Supabase")
        except Exception as e:
            logger.warning(f"[TaskScheduler] Failed to update task in Supabase: {e}")

    logger.info(f"[TaskScheduler] Task {task_id} completed")
    return True


def get_critical_path() -> list[str]:
    """Get the critical path task IDs."""
    current = get_current_tasks()
    if not current:
        return []
    return current.get("critical_path", [])
