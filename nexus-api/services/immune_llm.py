"""Module 6: LLM-powered immune system agents."""

import asyncio
import json
import logging
from datetime import datetime
from .llm.client import get_llm_client
from .llm.context_builder import ContextBuilder
from .llm import prompts
from .supabase_client import get_supabase, is_supabase_configured

logger = logging.getLogger("nexus.immune")

AGENT_NAMES = ["contradiction", "staleness", "silo", "overload", "coordination", "drift"]

# In-memory scan history (fallback)
_scan_history: list[dict] = []


async def run_single_agent(agent_name: str) -> dict:
    """Run a single immune system agent with LLM reasoning."""
    if agent_name not in prompts.IMMUNE_AGENTS:
        raise ValueError(f"Unknown agent: {agent_name}")

    client = get_llm_client()
    ctx = ContextBuilder()

    org_summary = ctx.build_org_summary()
    org_context = ctx.build_org_context()
    alerts_context = ctx.build_alerts_context()

    system = (
        prompts.NEXUS_BASE.format(**org_summary) + "\n\n"
        + prompts.IMMUNE_AGENTS[agent_name]
    )

    result = await client.complete_json(
        task_type="immune_agent",
        system_prompt=system,
        user_prompt=(
            f"Organizational knowledge graph:\n{org_context[:8000]}\n\n"
            f"Existing alerts (avoid duplicating):\n{alerts_context}"
        ),
        use_cache=False,
    )

    findings = result.get("findings", [])
    logger.info(f"[Immune:{agent_name}] Found {len(findings)} issues")
    return {"agent": agent_name, "findings": findings}


async def run_full_scan() -> dict:
    """Run all 6 immune system agents in parallel."""
    results = await asyncio.gather(
        *[run_single_agent(name) for name in AGENT_NAMES],
        return_exceptions=True,
    )

    all_findings = []
    agent_results = {}

    for name, result in zip(AGENT_NAMES, results):
        if isinstance(result, Exception):
            logger.error(f"[Immune:{name}] Failed: {result}")
            agent_results[name] = {"error": str(result), "findings": []}
        else:
            agent_results[name] = result
            for finding in result.get("findings", []):
                finding["agent"] = name
                all_findings.append(finding)

    # Convert findings to alert format
    alerts = []
    for f in all_findings:
        if f.get("detected", True):
            alert = {
                "id": f"alert-llm-{f['agent']}-{len(alerts)}",
                "agent": f["agent"],
                "severity": f.get("severity", "warning"),
                "scope": _infer_scope(f),
                "headline": f.get("headline", "Issue detected"),
                "detail": f.get("detail", ""),
                "affected_node_ids": f.get("affected_node_ids", []),
                "resolution": {
                    "authority": f.get("resolver_id", f.get("supervisor_id", "")),
                    "action": f.get("recommended_action", "Review and take action"),
                },
                "estimated_cost": f.get("estimated_cost"),
                "timestamp": datetime.now().isoformat(),
                "resolved": False,
                "llm_generated": True,
            }
            alerts.append(alert)

    scan_result = {
        "timestamp": datetime.now().isoformat(),
        "agents_run": AGENT_NAMES,
        "total_findings": len(all_findings),
        "alerts_generated": len(alerts),
        "alerts": alerts,
        "by_agent": agent_results,
    }

    # Persist to Supabase
    if is_supabase_configured():
        try:
            sb = get_supabase()
            sb.table("immune_scans").insert({
                "agents_run": scan_result["agents_run"],
                "total_findings": scan_result["total_findings"],
                "alerts_generated": scan_result["alerts_generated"],
                "alerts": json.loads(json.dumps(scan_result["alerts"], default=str)),
                "by_agent": json.loads(json.dumps(scan_result["by_agent"], default=str)),
            }).execute()
            logger.info("[Immune] Scan result persisted to Supabase")
        except Exception as e:
            logger.warning(f"[Immune] Failed to persist scan to Supabase, using in-memory fallback: {e}")

    # Always keep in-memory copy as fallback
    _scan_history.append(scan_result)
    logger.info(f"[Immune] Full scan complete: {len(alerts)} alerts from {len(all_findings)} findings")
    return scan_result


def _infer_scope(finding: dict) -> str:
    """Infer the division scope from a finding's affected nodes."""
    affected = finding.get("affected_node_ids", [])
    # Simple heuristic: if we have node IDs, check for cross-division
    groups = set()
    for nid in affected:
        if "NA" in nid.upper() or nid.startswith("person-1") or nid.startswith("person-2"):
            groups.add("NA")
        elif "EMEA" in nid.upper() or nid.startswith("person-9"):
            groups.add("EMEA")
    if len(groups) > 1:
        return "cross-division"
    if groups:
        return groups.pop()
    return "cross-division"


def get_scan_history() -> list[dict]:
    """Get all past scan results."""
    if is_supabase_configured():
        try:
            sb = get_supabase()
            result = sb.table("immune_scans").select("*").order("created_at", desc=True).execute()
            if result.data:
                return result.data
        except Exception as e:
            logger.warning(f"[Immune] Failed to read scan history from Supabase, using in-memory fallback: {e}")

    return _scan_history
