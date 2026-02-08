"""Module 8: Dynamic briefing and onboarding generation."""

import logging
from .llm.client import get_llm_client
from .llm.context_builder import ContextBuilder
from .llm import prompts

logger = logging.getLogger("nexus.briefing")


async def generate_briefing(person_id: str) -> dict:
    """Generate a personalized executive briefing for a specific person."""
    client = get_llm_client()
    ctx = ContextBuilder()

    org_summary = ctx.build_org_summary()
    person_context = ctx.build_person_context(person_id)
    alerts_context = ctx.build_alerts_context()
    knowledge_context = ctx.build_knowledge_context()

    # Extract person info from context
    lines = person_context.split("\n")
    person_name = "Executive"
    role = "Leader"
    division = "HQ"
    for line in lines:
        if line.startswith("Person:"):
            person_name = line.split(":", 1)[1].strip()
        elif line.startswith("Role:"):
            role = line.split(":", 1)[1].strip()
        elif line.startswith("Division:"):
            division = line.split(":", 1)[1].strip()

    system = prompts.NEXUS_BASE.format(**org_summary) + "\n\n" + prompts.BRIEFING_GENERATOR.format(
        person_name=person_name,
        role=role,
        division=division,
        temporal_context=knowledge_context[:4000],
        alerts_context=alerts_context,
        person_context=person_context,
    )

    text = await client.complete(
        task_type="briefing",
        system_prompt=system,
        user_prompt=f"Generate the briefing for {person_name} now. Today's date is 2026-02-07.",
        use_cache=False,
    )

    logger.info(f"[Briefing] Generated briefing for {person_name} ({len(text)} chars)")
    return {
        "person_id": person_id,
        "person_name": person_name,
        "role": role,
        "briefing_text": text,
    }


async def generate_briefing_stream(person_id: str):
    """Stream briefing tokens for real-time typewriter effect."""
    client = get_llm_client()
    ctx = ContextBuilder()

    org_summary = ctx.build_org_summary()
    person_context = ctx.build_person_context(person_id)
    alerts_context = ctx.build_alerts_context()
    knowledge_context = ctx.build_knowledge_context()

    lines = person_context.split("\n")
    person_name = "Executive"
    role = "Leader"
    division = "HQ"
    for line in lines:
        if line.startswith("Person:"):
            person_name = line.split(":", 1)[1].strip()
        elif line.startswith("Role:"):
            role = line.split(":", 1)[1].strip()
        elif line.startswith("Division:"):
            division = line.split(":", 1)[1].strip()

    system = prompts.NEXUS_BASE.format(**org_summary) + "\n\n" + prompts.BRIEFING_GENERATOR.format(
        person_name=person_name,
        role=role,
        division=division,
        temporal_context=knowledge_context[:4000],
        alerts_context=alerts_context,
        person_context=person_context,
    )

    async for token in await client.complete(
        task_type="briefing",
        system_prompt=system,
        user_prompt=f"Generate the briefing for {person_name} now. Today's date is 2026-02-07.",
        stream=True,
        use_cache=False,
    ):
        yield token


async def generate_onboarding(team_name: str, division: str) -> dict:
    """Generate a personalized onboarding package for a new team member."""
    client = get_llm_client()
    ctx = ContextBuilder()

    org_summary = ctx.build_org_summary()
    division_context = ctx.build_division_context(division)
    alerts_context = ctx.build_alerts_context()
    knowledge_context = ctx.build_knowledge_context()

    system = prompts.NEXUS_BASE.format(**org_summary) + "\n\n" + prompts.ONBOARDING_GENERATOR.format(
        team_name=team_name,
        division=division,
        team_context=division_context + "\n\n" + knowledge_context[:3000],
        alerts_context=alerts_context,
    )

    result = await client.complete_json(
        task_type="onboarding",
        system_prompt=system,
        user_prompt=f"Generate the onboarding package now for a new engineer joining {team_name} in {division}.",
        use_cache=False,
    )

    logger.info(f"[Onboarding] Generated {len(result.get('steps', []))} steps for {team_name}")
    return result
