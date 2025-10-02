"""Workflow managers coordinating crawlers, agents, and bots."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple

from .bots import BTMMExecutionBot
from .crawlers import BTMMDataCrawler
from .model import BTMMDecision

__all__ = ["BTMMWorkflowManager"]


@dataclass(slots=True)
class BTMMWorkflowManager:
    """Coordinate BTMM data ingestion and decision execution."""

    crawler: BTMMDataCrawler
    bot: BTMMExecutionBot

    def evaluate_latest(self) -> BTMMDecision | None:
        """Fetch the latest snapshot and return the bot decision."""

        snapshot = self.crawler.latest()
        if snapshot is None:
            return None
        return self.bot.decide(snapshot)

    def evaluate_all(self) -> Tuple[BTMMDecision, ...]:
        """Fetch all snapshots and evaluate them sequentially."""

        snapshots = self.crawler.fetch()
        if not snapshots:
            return ()
        return self.bot.run(snapshots)

    def telemetry(self) -> Dict[str, object]:
        """Return lightweight diagnostics for observability hooks."""

        results = self.bot.agent.batch_ingest(self.crawler.fetch())
        bias = self.bot.agent.bias()
        return {
            "decisions": tuple(result.decision for result in results),
            "bias": bias,
            "samples": len(results),
        }
