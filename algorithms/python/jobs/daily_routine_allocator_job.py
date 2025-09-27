"""Entrypoint helpers for synchronising Dynamic AI routine prompts."""

from __future__ import annotations

import logging
import os
from typing import Mapping, Sequence

from ..daily_routine_allocator import DailyRoutineAllocator
from ..supabase_sync import SupabaseTableWriter

LOGGER = logging.getLogger(__name__)


def sync_daily_routine_prompts(
    blueprint_rows: Sequence[Mapping[str, object]],
    *,
    quotes: Sequence[str] | None = None,
    base_url: str | None = None,
    service_role_key: str | None = None,
) -> int:
    """Allocate prompts from blueprint rows and upsert them via Supabase."""

    writer = SupabaseTableWriter(
        table="routine_prompts",
        conflict_column="time_slot",
        base_url=base_url,
        service_role_key=service_role_key,
    )
    allocator = DailyRoutineAllocator(writer=writer, quotes=quotes)
    return allocator.sync(blueprint_rows)


def main() -> None:
    """Manual CLI entrypoint that reads blueprint rows from JSON via STDIN."""

    import json
    import sys

    logging.basicConfig(level=logging.INFO)

    try:
        raw_payload = sys.stdin.read()
        if not raw_payload.strip():
            LOGGER.error("No blueprint payload supplied on stdin")
            sys.exit(1)
        blueprint_rows = json.loads(raw_payload)
        if not isinstance(blueprint_rows, list):
            LOGGER.error("Blueprint payload must be a JSON list of rows")
            sys.exit(1)
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive guard
        LOGGER.error("Failed to parse blueprint JSON: %s", exc)
        sys.exit(1)

    base_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    count = sync_daily_routine_prompts(
        blueprint_rows,  # type: ignore[arg-type]
        base_url=base_url,
        service_role_key=service_key,
    )
    LOGGER.info("Upserted %s routine prompts", count)


if __name__ == "__main__":  # pragma: no cover - manual execution entrypoint
    main()
