"""Centralized OpenAI LLM client with model routing, caching, retries, and usage tracking."""

import os
import json
import hashlib
import asyncio
import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI
from dotenv import load_dotenv

from .usage import UsageTracker

load_dotenv()
logger = logging.getLogger("nexus.llm")

# ── Model routing ────────────────────────────────────────────────────────────

HEAVY_TASKS = {
    "immune_agent", "briefing", "onboarding", "task_scheduling",
    "conflict_analysis", "contradiction_detection", "executive_summary",
    "complex_ask", "decision_chain_analysis", "relationship_extraction",
    "info_routing", "worker_analysis",
}

FAST_TASKS = {
    "classify", "extract_entities", "route_info", "simple_ask",
    "infodrop_classify", "summarize_short", "dedup_check",
}


def route_model(task_type: str) -> str:
    if task_type in FAST_TASKS:
        return os.getenv("NEXUS_MODEL_FAST", "gpt-4o-mini")
    return os.getenv("NEXUS_MODEL_HEAVY", "gpt-4o")


# ── Response cache ───────────────────────────────────────────────────────────

class ResponseCache:
    def __init__(self, ttl: int = 300):
        self._cache: dict[str, tuple[float, str]] = {}
        self._ttl = ttl

    def _key(self, model: str, system: str, user: str) -> str:
        raw = f"{model}:{system}:{user}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, model: str, system: str, user: str) -> str | None:
        import time
        k = self._key(model, system, user)
        if k in self._cache:
            ts, val = self._cache[k]
            if time.time() - ts < self._ttl:
                return val
            del self._cache[k]
        return None

    def put(self, model: str, system: str, user: str, value: str):
        import time
        k = self._key(model, system, user)
        self._cache[k] = (time.time(), value)


# ── Main client ──────────────────────────────────────────────────────────────

class LLMClient:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=api_key) if api_key else None
        self.cache = ResponseCache(ttl=int(os.getenv("NEXUS_LLM_CACHE_TTL", "300")))
        self.usage = UsageTracker()
        self.max_retries = int(os.getenv("NEXUS_LLM_MAX_RETRIES", "3"))
        self.timeout = int(os.getenv("NEXUS_LLM_TIMEOUT", "30"))

    async def complete(
        self,
        task_type: str,
        system_prompt: str,
        user_prompt: str,
        response_format: dict | None = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        stream: bool = False,
        use_cache: bool = True,
    ) -> str:
        """Make a completion call with model routing, caching, and retries."""
        model = route_model(task_type)

        # Check cache
        if use_cache and not stream:
            cached = self.cache.get(model, system_prompt, user_prompt)
            if cached:
                logger.info(f"[LLM] Cache hit for {task_type}")
                return cached

        if not self.client:
            raise RuntimeError("OpenAI client not initialized — set OPENAI_API_KEY")

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        kwargs: dict = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if response_format:
            kwargs["response_format"] = {"type": "json_object"}

        # Retry loop
        last_error = None
        for attempt in range(self.max_retries):
            try:
                if stream:
                    return await self._stream(kwargs)

                resp = await asyncio.wait_for(
                    self.client.chat.completions.create(**kwargs),
                    timeout=self.timeout,
                )
                content = resp.choices[0].message.content or ""

                # Track usage
                if resp.usage:
                    self.usage.record(
                        model=model,
                        input_tokens=resp.usage.prompt_tokens,
                        output_tokens=resp.usage.completion_tokens,
                        task_type=task_type,
                    )

                # Cache result
                if use_cache:
                    self.cache.put(model, system_prompt, user_prompt, content)

                logger.info(f"[LLM] {task_type} via {model} — {resp.usage.prompt_tokens}+{resp.usage.completion_tokens} tokens")
                return content

            except Exception as e:
                last_error = e
                logger.warning(f"[LLM] Attempt {attempt+1}/{self.max_retries} failed: {e}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(1 * (attempt + 1))

        raise RuntimeError(f"LLM call failed after {self.max_retries} attempts: {last_error}")

    async def complete_json(
        self,
        task_type: str,
        system_prompt: str,
        user_prompt: str,
        **kwargs,
    ) -> dict:
        """Complete and parse as JSON."""
        raw = await self.complete(
            task_type=task_type,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_format={"type": "json_object"},
            **kwargs,
        )
        # Strip markdown fences if present
        text = raw.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)
        return json.loads(text)

    async def _stream(self, kwargs: dict) -> AsyncGenerator[str, None]:
        """Stream tokens via async generator."""
        kwargs["stream"] = True
        stream = await self.client.chat.completions.create(**kwargs)
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content

    async def embed(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        """Generate embeddings for a list of texts."""
        if not self.client:
            raise RuntimeError("OpenAI client not initialized")

        emb_model = model or os.getenv("NEXUS_EMBEDDING_MODEL", "text-embedding-3-large")

        # Batch in groups of 100
        all_embeddings = []
        for i in range(0, len(texts), 100):
            batch = texts[i:i+100]
            resp = await self.client.embeddings.create(model=emb_model, input=batch)
            all_embeddings.extend([d.embedding for d in resp.data])

            if resp.usage:
                self.usage.record(
                    model=emb_model,
                    input_tokens=resp.usage.total_tokens,
                    output_tokens=0,
                    task_type="embedding",
                )

        return all_embeddings


# ── Singleton ────────────────────────────────────────────────────────────────

_client: LLMClient | None = None

def get_llm_client() -> LLMClient:
    global _client
    if _client is None:
        _client = LLMClient()
    return _client
