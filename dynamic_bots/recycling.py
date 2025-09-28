"""Notification-oriented wrapper around the recycling agent."""

from __future__ import annotations

from typing import Iterable, Mapping

from dynamic_agents.recycling import DynamicRecyclingAgent, RecyclingAgentReport
from dynamic_helpers.recycling import format_recycling_digest
from dynamic_recycling import (
    RecyclingEvent,
    RecyclingFacilityProfile,
    RecyclingInsight,
    RecyclingStrategy,
)

__all__ = ["DynamicRecyclingBot"]


class DynamicRecyclingBot:
    """Streaming assistant that turns recycling insights into digests."""

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

    # ------------------------------------------------------------------
    # ingestion helpers

    @property
    def agent(self) -> DynamicRecyclingAgent:
        return self._agent

    def push_event(
        self,
        event: RecyclingEvent | Mapping[str, object],
        /,
        **overrides: object,
    ) -> RecyclingEvent:
        return self._agent.ingest_event(event, **overrides)

    def push_events(
        self, events: Iterable[RecyclingEvent | Mapping[str, object]]
    ) -> list[RecyclingEvent]:
        return self._agent.ingest_events(events)

    def reset(self) -> None:
        self._agent.reset()

    def configure_facility(
        self, profile: RecyclingFacilityProfile | None
    ) -> None:
        self._agent.configure_facility(profile)

    # ------------------------------------------------------------------
    # reporting helpers

    def report(self, *, window: int | None = None) -> RecyclingAgentReport:
        return self._agent.report(window=window)

    def insight(self, *, window: int | None = None) -> RecyclingInsight:
        return self._agent.analyse(window=window)

    def strategy(self, *, window: int | None = None) -> RecyclingStrategy:
        return self._agent.strategise(window=window)

    def compose_digest(self, *, window: int | None = None) -> str:
        report = self.report(window=window)
        return format_recycling_digest(report.insight, report.strategy)

    def handle_event(
        self,
        event: RecyclingEvent | Mapping[str, object],
        /,
        **overrides: object,
    ) -> str:
        self.push_event(event, **overrides)
        return self.compose_digest()
