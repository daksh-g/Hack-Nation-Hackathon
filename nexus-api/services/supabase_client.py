"""Supabase async client singleton for NEXUS."""

import os
import logging
from supabase import create_client, Client

logger = logging.getLogger("nexus.supabase")

_client: Client | None = None


def get_supabase() -> Client:
    """Get or create the Supabase client singleton."""
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        if not url or not key:
            raise RuntimeError(
                "Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_KEY"
            )
        _client = create_client(url, key)
        logger.info(f"[Supabase] Connected to {url}")
    return _client


def is_supabase_configured() -> bool:
    """Check if Supabase credentials are available."""
    return bool(os.getenv("SUPABASE_URL") and (os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")))
