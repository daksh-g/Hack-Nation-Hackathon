"""Token usage tracking and cost computation."""

import logging
from datetime import datetime
from ..supabase_client import get_supabase, is_supabase_configured

logger = logging.getLogger("nexus.llm.usage")

# Pricing per 1M tokens (as of Feb 2026)
PRICING = {
    "gpt-5.2":    {"input": 1.75, "output": 14.00},
    "gpt-4o":     {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "text-embedding-3-large": {"input": 0.13, "output": 0.0},
}


class UsageTracker:
    def __init__(self):
        self.calls: list[dict] = []

    def record(self, model: str, input_tokens: int, output_tokens: int, task_type: str):
        pricing = PRICING.get(model, {"input": 2.50, "output": 10.00})
        cost = (input_tokens * pricing["input"] + output_tokens * pricing["output"]) / 1_000_000
        entry = {
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": round(cost, 6),
            "task_type": task_type,
            "timestamp": datetime.now().isoformat(),
        }

        # Always keep in-memory copy
        self.calls.append(entry)

        # Persist to Supabase
        if is_supabase_configured():
            try:
                sb = get_supabase()
                sb.table("llm_usage").insert({
                    "model": model,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "cost_usd": round(cost, 6),
                    "task_type": task_type,
                }).execute()
            except Exception as e:
                logger.warning(f"[UsageTracker] Failed to persist usage to Supabase: {e}")

    def get_summary(self) -> dict:
        # Try Supabase first for a complete picture
        if is_supabase_configured():
            try:
                sb = get_supabase()
                result = sb.table("llm_usage").select("*").execute()
                if result.data is not None:
                    rows = result.data
                    total_cost = sum(r.get("cost_usd", 0) for r in rows)
                    total_input = sum(r.get("input_tokens", 0) for r in rows)
                    total_output = sum(r.get("output_tokens", 0) for r in rows)

                    by_model: dict[str, dict] = {}
                    by_task: dict[str, dict] = {}

                    for r in rows:
                        m = r.get("model", "unknown")
                        if m not in by_model:
                            by_model[m] = {"calls": 0, "cost_usd": 0, "input_tokens": 0, "output_tokens": 0}
                        by_model[m]["calls"] += 1
                        by_model[m]["cost_usd"] += r.get("cost_usd", 0)
                        by_model[m]["input_tokens"] += r.get("input_tokens", 0)
                        by_model[m]["output_tokens"] += r.get("output_tokens", 0)

                        t = r.get("task_type", "unknown")
                        if t not in by_task:
                            by_task[t] = {"calls": 0, "cost_usd": 0}
                        by_task[t]["calls"] += 1
                        by_task[t]["cost_usd"] += r.get("cost_usd", 0)

                    return {
                        "total_calls": len(rows),
                        "total_input_tokens": total_input,
                        "total_output_tokens": total_output,
                        "total_cost_usd": round(total_cost, 4),
                        "by_model": by_model,
                        "by_task_type": by_task,
                    }
            except Exception as e:
                logger.warning(f"[UsageTracker] Failed to read usage from Supabase, using in-memory fallback: {e}")

        # In-memory fallback
        total_cost = sum(c["cost_usd"] for c in self.calls)
        total_input = sum(c["input_tokens"] for c in self.calls)
        total_output = sum(c["output_tokens"] for c in self.calls)

        by_model: dict[str, dict] = {}
        by_task: dict[str, dict] = {}

        for c in self.calls:
            m = c["model"]
            if m not in by_model:
                by_model[m] = {"calls": 0, "cost_usd": 0, "input_tokens": 0, "output_tokens": 0}
            by_model[m]["calls"] += 1
            by_model[m]["cost_usd"] += c["cost_usd"]
            by_model[m]["input_tokens"] += c["input_tokens"]
            by_model[m]["output_tokens"] += c["output_tokens"]

            t = c["task_type"]
            if t not in by_task:
                by_task[t] = {"calls": 0, "cost_usd": 0}
            by_task[t]["calls"] += 1
            by_task[t]["cost_usd"] += c["cost_usd"]

        return {
            "total_calls": len(self.calls),
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "total_cost_usd": round(total_cost, 4),
            "by_model": by_model,
            "by_task_type": by_task,
        }
