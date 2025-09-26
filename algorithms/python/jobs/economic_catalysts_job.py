"""Entrypoint for syncing automated economic catalysts via AwesomeAPI."""

from __future__ import annotations

import logging
import os
from typing import Mapping, Sequence

from ..awesome_api import AwesomeAPIAutoCalculator
from ..economic_catalysts import (
    EconomicCatalystGenerator,
    EconomicCatalystSyncJob,
)
from ..supabase_sync import SupabaseTableWriter

LOGGER = logging.getLogger(__name__)

DEFAULT_PAIRS: Mapping[str, Sequence[str]] = {
    "USD-BRL": ("USD", "BRL"),
    "EUR-USD": ("EUR", "USD"),
    "USD-JPY": ("USD", "JPY"),
    "GBP-USD": ("GBP", "USD"),
}


def sync_economic_catalysts(
    *,
    pairs: Mapping[str, Sequence[str]] | None = None,
    history: int = 96,
    base_url: str | None = None,
    service_role_key: str | None = None,
) -> int:
    calculator = AwesomeAPIAutoCalculator()
    generator = EconomicCatalystGenerator()
    writer = SupabaseTableWriter(
        table="economic_catalysts",
        conflict_column="pair",
        base_url=base_url,
        service_role_key=service_role_key,
    )
    job = EconomicCatalystSyncJob(
        pairs=pairs or DEFAULT_PAIRS,
        writer=writer,
        calculator=calculator,
        generator=generator,
        history=history,
    )
    return job.run()


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    base_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    count = sync_economic_catalysts(
        base_url=base_url,
        service_role_key=service_key,
    )
    LOGGER.info("Synced %s economic catalysts", count)


if __name__ == "__main__":  # pragma: no cover - manual execution entrypoint
    main()
