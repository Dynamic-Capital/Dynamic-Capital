"""Keeper abstractions for recycling intelligence flows."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, Mapping

from dynamic_agents.recycling import DynamicRecyclingAgent, RecyclingAgentReport
from dynamic_recycling import (
    RecyclingEvent,
    RecyclingFacilityProfile,
    RecyclingInsight,
    RecyclingStrategy,
)

__all__ = ["DynamicRecyclingKeeper", "RecyclingKeeperSnapshot"]


@dataclass(slots=True)
class RecyclingKeeperSnapshot:
    """Immutable record of the latest recycling state."""

    insight: RecyclingInsight
    strategy: RecyclingStrategy
    generated_at: datetime
    event_count: int


class DynamicRecyclingKeeper:
    """Synchronise recycling data pipelines and provide auditable snapshots."""

    def __init__(
        self,
        *,
        agent: DynamicRecyclingAgent | None = None,
        facility: RecyclingFacilityProfile | None = None,
        history_limit: int = 240,
    ) -> None:
        if agent is not None and (facility is not None or history_limit != 240):
            raise ValueError("facility/history_limit parameters require implicit agent construction")
        self._agent = agent or DynamicRecyclingAgent(
            facility=facility,
            history_limit=history_limit,
        )

    @property
    def agent(self) -> DynamicRecyclingAgent:
        return self._agent

    def configure_facility(
        self, profile: RecyclingFacilityProfile | None
    ) -> None:
        self._agent.configure_facility(profile)

    def reset(self) -> None:
        self._agent.reset()

    def sync(
        self,
        events: Iterable[RecyclingEvent | Mapping[str, object]] | None = None,
        *,
        window: int | None = None,
    ) -> RecyclingKeeperSnapshot:
        """Ingest optional events and return a fresh snapshot."""

        if events is not None:
            self._agent.ingest_events(events)
        report = self._agent.report(window=window)
        return RecyclingKeeperSnapshot(
            insight=report.insight,
            strategy=report.strategy,
            generated_at=report.generated_at,
            event_count=self._agent.history_size,
        )

    def latest_report(self, *, window: int | None = None) -> RecyclingAgentReport:
        return self._agent.report(window=window)
