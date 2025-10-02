"""Automation helpers for running ingestion cycles."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .agent import DynamicFineTuneAgent
from .crawler import FineTuneCrawler
from .keeper import FineTuneKeeper


@dataclass(slots=True)
class FineTuneBot:
    """Simple orchestrator that runs crawler/harvest cycles."""

    agent: DynamicFineTuneAgent
    keeper: FineTuneKeeper = field(default_factory=FineTuneKeeper)

    def cycle(
        self,
        crawler: FineTuneCrawler,
        *,
        batch_size: int = 32,
        minimum_quality: float = 0.6,
        remove: bool = False,
        persist_path: str | None = None,
        notes: Optional[str] = None,
    ) -> dict[str, object]:
        ingested = self.agent.ingest_from_crawler(crawler)
        batch = self.agent.harvest(
            batch_size=batch_size,
            minimum_quality=minimum_quality,
            remove=remove,
            notes=notes,
        )
        if persist_path:
            self.keeper.save(self.agent.model, persist_path)
        return {"ingested": ingested, "batch": batch}

