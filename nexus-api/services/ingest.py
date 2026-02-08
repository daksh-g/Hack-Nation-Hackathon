"""Module 1: Transcript Classification & Entity Extraction pipeline."""

import logging
from datetime import datetime
from .llm.client import get_llm_client
from .llm.context_builder import ContextBuilder
from .llm import prompts

logger = logging.getLogger("nexus.ingest")


async def classify_text(text: str) -> dict:
    """Classify raw text into organizational categories."""
    client = get_llm_client()
    result = await client.complete_json(
        task_type="classify",
        system_prompt=prompts.CLASSIFIER,
        user_prompt=text[:4000],  # Truncate for token limits
    )
    return result


async def extract_entities(text: str, source_type: str = "unknown", source_id: str | None = None) -> dict:
    """Extract entities and relationships from text."""
    client = get_llm_client()
    ctx = ContextBuilder()

    people_list = ctx.build_people_list()
    agents_list = ctx.build_agents_list()

    system = prompts.ENTITY_EXTRACTOR.format(
        people_list=people_list,
        agent_list=agents_list,
    )

    result = await client.complete_json(
        task_type="extract_entities",
        system_prompt=system,
        user_prompt=f"Source type: {source_type}\nSource ID: {source_id or 'unknown'}\n\nText:\n{text[:6000]}",
    )
    return result


async def extract_relationships(entities: list[dict], existing_context: str) -> dict:
    """Extract complex relationships using GPT-5.2 for reasoning."""
    client = get_llm_client()

    import json
    entities_text = json.dumps(entities, indent=2)

    result = await client.complete_json(
        task_type="relationship_extraction",
        system_prompt=prompts.RELATIONSHIP_EXTRACTOR,
        user_prompt=f"Extracted entities:\n{entities_text}\n\nExisting knowledge graph:\n{existing_context[:8000]}",
    )
    return result


async def full_ingest_pipeline(
    text: str,
    source_type: str = "unknown",
    source_id: str | None = None,
    participants: list[str] | None = None,
    timestamp: str | None = None,
) -> dict:
    """Run the complete ingestion pipeline: classify → extract → relate → embed."""
    ts = timestamp or datetime.now().isoformat()

    # Step 1: Classification (fast model)
    classification = await classify_text(text)
    logger.info(f"[Ingest] Classified as {classification.get('primary', '?')} (conf: {classification.get('confidence', '?')})")

    # Step 2: Entity extraction (fast model)
    extraction = await extract_entities(text, source_type, source_id)
    entities = extraction.get("entities", [])
    relationships = extraction.get("relationships", [])
    logger.info(f"[Ingest] Extracted {len(entities)} entities, {len(relationships)} relationships")

    # Step 3: Deep relationship analysis (heavy model)
    ctx = ContextBuilder()
    knowledge_context = ctx.build_knowledge_context()
    deep_rels = await extract_relationships(entities, knowledge_context)
    additional_rels = deep_rels.get("relationships", [])
    contradictions = deep_rels.get("contradictions", [])
    relationships.extend(additional_rels)

    # Step 4: Build graph updates
    knowledge_units_created = []
    graph_updates = 0

    for entity in entities:
        if entity.get("type") in ("decision", "fact", "commitment", "question"):
            import uuid
            unit_id = entity.get("existing_id") or f"{entity['type']}-{uuid.uuid4().hex[:8]}"
            knowledge_units_created.append({
                "id": unit_id,
                "type": entity["type"],
                "label": entity["name"],
                "content": entity.get("content", entity["name"]),
                "division": entity.get("division"),
                "source_type": "human" if source_type != "agent_log" else "ai_agent",
                "source_id": source_id,
                "created_at": ts,
                "freshness_score": 1.0,
                "status": "active",
            })
            graph_updates += 1

    for rel in relationships:
        graph_updates += 1

    return {
        "classification": classification,
        "entities_extracted": entities,
        "relationships_extracted": relationships,
        "contradictions_detected": contradictions,
        "knowledge_units_created": knowledge_units_created,
        "graph_updates": graph_updates,
        "timestamp": ts,
    }
