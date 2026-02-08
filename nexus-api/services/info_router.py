"""Module 3: Automated Information Routing — determine who needs to know and generate personalized summaries."""

import logging
from .llm.client import get_llm_client
from .llm.context_builder import ContextBuilder
from .llm import prompts
from .supabase_client import get_supabase, is_supabase_configured

logger = logging.getLogger("nexus.info_router")

# In-memory notification queue (fallback)
_pending_notifications: list[dict] = []
_notification_history: list[dict] = []


async def route_information(knowledge_unit: dict, source_context: str = "") -> dict:
    """Determine who needs to know about new information and generate personalized summaries."""
    client = get_llm_client()
    ctx = ContextBuilder()

    org_summary = ctx.build_org_summary()
    org_context = ctx.build_org_context()

    import json
    unit_text = json.dumps(knowledge_unit, indent=2, default=str)

    system = prompts.NEXUS_BASE.format(**org_summary) + "\n\n" + prompts.INFO_ROUTER

    result = await client.complete_json(
        task_type="info_routing",
        system_prompt=system,
        user_prompt=f"New information entering the knowledge graph:\n{unit_text}\n\nAdditional context:\n{source_context}\n\nOrganizational context:\n{org_context[:6000]}",
        use_cache=False,
    )

    routes = result.get("routes", [])
    logger.info(f"[InfoRouter] Routed to {len(routes)} people")

    # Store notifications
    for route in routes:
        notification = {
            "person_id": route.get("person_id"),
            "person_name": route.get("person_name"),
            "priority": route.get("priority"),
            "action_required": route.get("action_required", False),
            "suggested_action": route.get("suggested_action"),
            "summary": route.get("personalized_summary"),
            "source_unit": knowledge_unit.get("id", "unknown"),
            "acknowledged": False,
        }

        # Persist to Supabase
        if is_supabase_configured():
            try:
                sb = get_supabase()
                sb.table("notifications").insert({
                    "person_id": notification["person_id"],
                    "person_name": notification["person_name"],
                    "priority": notification["priority"],
                    "action_required": notification["action_required"],
                    "suggested_action": notification["suggested_action"],
                    "summary": notification["summary"],
                    "source_unit": notification["source_unit"],
                    "acknowledged": False,
                }).execute()
                logger.info(f"[InfoRouter] Notification for {notification['person_id']} persisted to Supabase")
            except Exception as e:
                logger.warning(f"[InfoRouter] Failed to persist notification to Supabase: {e}")

        # Always keep in-memory copy as fallback
        _pending_notifications.append(notification)
        _notification_history.append(notification)

    return result


def get_pending_notifications(person_id: str | None = None) -> list[dict]:
    """Get pending notifications, optionally filtered by person."""
    if is_supabase_configured():
        try:
            sb = get_supabase()
            query = sb.table("notifications").select("*").eq("acknowledged", False)
            if person_id:
                query = query.eq("person_id", person_id)
            result = query.execute()
            if result.data is not None:
                return result.data
        except Exception as e:
            logger.warning(f"[InfoRouter] Failed to read pending notifications from Supabase: {e}")

    # In-memory fallback
    if person_id:
        return [n for n in _pending_notifications if n["person_id"] == person_id and not n["acknowledged"]]
    return [n for n in _pending_notifications if not n["acknowledged"]]


def acknowledge_notification(person_id: str, source_unit: str) -> bool:
    """Mark a notification as seen."""
    acknowledged = False

    # Update in Supabase
    if is_supabase_configured():
        try:
            sb = get_supabase()
            result = sb.table("notifications").update({
                "acknowledged": True,
            }).eq("person_id", person_id).eq("source_unit", source_unit).execute()
            if result.data:
                acknowledged = True
                logger.info(f"[InfoRouter] Notification acknowledged in Supabase for {person_id}/{source_unit}")
        except Exception as e:
            logger.warning(f"[InfoRouter] Failed to acknowledge notification in Supabase: {e}")

    # Always update in-memory copy as well
    for n in _pending_notifications:
        if n["person_id"] == person_id and n["source_unit"] == source_unit:
            n["acknowledged"] = True
            acknowledged = True

    return acknowledged


def get_routing_history(unit_id: str | None = None) -> list[dict]:
    """Get routing history, optionally filtered by knowledge unit."""
    if is_supabase_configured():
        try:
            sb = get_supabase()
            query = sb.table("notifications").select("*")
            if unit_id:
                query = query.eq("source_unit", unit_id)
            result = query.order("created_at", desc=True).execute()
            if result.data is not None:
                return result.data
        except Exception as e:
            logger.warning(f"[InfoRouter] Failed to read routing history from Supabase: {e}")

    # In-memory fallback
    if unit_id:
        return [n for n in _notification_history if n["source_unit"] == unit_id]
    return _notification_history
