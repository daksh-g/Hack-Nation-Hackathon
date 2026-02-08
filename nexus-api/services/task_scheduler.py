"""Module 4: Task Scheduling Engine — LLM-powered task graph generation."""

import logging
from .llm.client import get_llm_client
from .llm.context_builder import ContextBuilder
from .llm import prompts

logger = logging.getLogger("nexus.task_scheduler")

# In-memory task state
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
    tasks = result.get("tasks", [])
    logger.info(f"[TaskScheduler] Generated {len(tasks)} tasks, critical path: {result.get('critical_path', [])}")
    return result


def get_current_tasks() -> dict | None:
    """Get the current task graph."""
    return _current_tasks


def get_tasks_for_person(person_id: str) -> list[dict]:
    """Get tasks assigned to a specific person or agent."""
    if not _current_tasks:
        return []
    return [t for t in _current_tasks.get("tasks", []) if t.get("assigned_to") == person_id]


def complete_task(task_id: str) -> bool:
    """Mark a task as complete."""
    if not _current_tasks:
        return False
    for task in _current_tasks.get("tasks", []):
        if task.get("id") == task_id:
            task["status"] = "completed"
            # Unblock dependent tasks
            for other in _current_tasks.get("tasks", []):
                if task_id in other.get("blocked_by", []):
                    other["blocked_by"].remove(task_id)
            logger.info(f"[TaskScheduler] Task {task_id} completed")
            return True
    return False


def get_critical_path() -> list[str]:
    """Get the critical path task IDs."""
    if not _current_tasks:
        return []
    return _current_tasks.get("critical_path", [])
