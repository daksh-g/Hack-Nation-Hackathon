"""Module 5: Worker Tracker & Conflict Detection."""

import logging
from .llm.client import get_llm_client
from .llm.context_builder import ContextBuilder
from .llm import prompts

logger = logging.getLogger("nexus.worker_tracker")

_latest_analysis: dict | None = None


async def analyze_workers() -> dict:
    """Run full worker analysis: conflicts, duplicates, overloads, reallocation, collaboration."""
    global _latest_analysis

    client = get_llm_client()
    ctx = ContextBuilder()

    org_summary = ctx.build_org_summary()
    org_context = ctx.build_org_context()
    alerts_context = ctx.build_alerts_context()

    system = prompts.NEXUS_BASE.format(**org_summary) + "\n\n" + prompts.WORKER_TRACKER

    result = await client.complete_json(
        task_type="worker_analysis",
        system_prompt=system,
        user_prompt=(
            f"Current work assignments and organizational state:\n{org_context[:8000]}\n\n"
            f"Active alerts (for overload/conflict signals):\n{alerts_context}"
        ),
        use_cache=False,
    )

    _latest_analysis = result
    logger.info(
        f"[WorkerTracker] Found: "
        f"{len(result.get('conflicts', []))} conflicts, "
        f"{len(result.get('duplicates', []))} duplicates, "
        f"{len(result.get('overloads', []))} overloads, "
        f"{len(result.get('reallocation_suggestions', []))} reallocation suggestions, "
        f"{len(result.get('collaboration_recommendations', []))} collaboration recs"
    )
    return result


async def analyze_team(team_id: str) -> dict:
    """Run team-level sub-agent analysis."""
    client = get_llm_client()
    ctx = ContextBuilder()

    org_summary = ctx.build_org_summary()
    division_context = ctx.build_division_context(team_id)

    system = (
        prompts.NEXUS_BASE.format(**org_summary) + "\n\n"
        "You are a Team Sub Agent. Analyze this specific team/division for issues.\n\n"
        + prompts.WORKER_TRACKER
    )

    result = await client.complete_json(
        task_type="conflict_analysis",
        system_prompt=system,
        user_prompt=f"Team/Division context:\n{division_context}",
    )
    return result


def get_worker_status() -> dict:
    """Get the latest worker analysis."""
    return _latest_analysis or {
        "conflicts": [],
        "duplicates": [],
        "overloads": [],
        "reallocation_suggestions": [],
        "collaboration_recommendations": [],
    }


def get_worker_assignments(worker_id: str) -> dict:
    """Get what a specific worker is assigned to."""
    ctx = ContextBuilder()
    return {"context": ctx.build_person_context(worker_id)}
