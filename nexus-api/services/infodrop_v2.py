"""Module 9: Smart InfoDrop — LLM-powered classification, linking, and routing."""

import uuid
import logging
from datetime import datetime
from .llm.client import get_llm_client
from .llm.context_builder import ContextBuilder
from .llm import prompts
from . import graph_manager

logger = logging.getLogger("nexus.infodrop")


async def process_infodrop(text: str) -> dict:
    """Full InfoDrop pipeline: classify → extract → link → check contradictions → route."""
    client = get_llm_client()
    ctx = ContextBuilder()

    org_context = ctx.build_org_context()

    # Step 1: LLM classification and entity linking
    system = prompts.INFODROP_CLASSIFIER.format(graph_context=org_context[:6000])

    result = await client.complete_json(
        task_type="infodrop_classify",
        system_prompt=system,
        user_prompt=text,
        use_cache=False,
    )

    unit_type = result.get("type", "fact")
    content = result.get("content", text)
    division = result.get("division")
    related_ids = result.get("related_node_ids", [])
    contradiction = result.get("contradiction_detected", False)
    contradiction_detail = result.get("contradiction_detail", "")
    route_to = result.get("route_to", [])
    confidence = result.get("confidence", 0.5)

    # Step 2: Create knowledge unit in graph
    unit_id = f"{unit_type}-infodrop-{uuid.uuid4().hex[:8]}"
    node_data = {
        "id": unit_id,
        "type": unit_type,
        "label": content[:80],
        "content": content,
        "division": division,
        "source_type": "human",
        "source_id": "infodrop",
        "created_at": datetime.now().isoformat(),
        "freshness_score": 1.0,
        "status": "active",
    }
    graph_manager.upsert_node(node_data)

    # Step 3: Create edges to related nodes
    new_edges = []
    ripple_target = None
    for related_id in related_ids:
        edge_id = graph_manager.upsert_edge(unit_id, related_id, "ABOUT", {"weight": confidence})
        new_edges.append({
            "id": edge_id,
            "source": unit_id,
            "target": related_id,
            "type": "ABOUT",
        })
        if ripple_target is None:
            ripple_target = related_id

    # Step 4: Handle contradictions
    immune_alert = None
    if contradiction:
        logger.warning(f"[InfoDrop] Contradiction detected: {contradiction_detail}")
        immune_alert = {
            "type": "contradiction",
            "detail": contradiction_detail,
            "source_node": unit_id,
        }

    # Step 5: Route notifications
    notifications = []
    if route_to:
        from . import info_router
        routing_result = await info_router.route_information(
            knowledge_unit=node_data,
            source_context=f"InfoDrop input: {text}",
        )
        notifications = routing_result.get("routes", [])

    logger.info(
        f"[InfoDrop] Created {unit_type} '{content[:40]}...' | "
        f"{len(new_edges)} edges | Contradiction: {contradiction} | "
        f"Routed to {len(notifications)} people"
    )

    return {
        "unit": node_data,
        "new_edges": new_edges,
        "ripple_target": ripple_target or (related_ids[0] if related_ids else unit_id),
        "contradiction_detected": contradiction,
        "contradiction_detail": contradiction_detail,
        "notifications_sent": len(notifications),
        "notifications": notifications,
        "confidence": confidence,
    }
