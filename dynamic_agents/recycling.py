"""Operational agent coordinating the dynamic recycling engine."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, Mapping

from dynamic_recycling import (
    DynamicRecyclingEngine,
    RecyclingEvent,
    RecyclingFacilityProfile,
    RecyclingInsight,
    RecyclingStrategy,
)

__all__ = [
    "DynamicRecyclingAgent",
    "RecyclingAgentConfig",
    "RecyclingAgentReport",
]


@dataclass(slots=True)
class RecyclingAgentConfig:
    """Configuration inputs for :class:`DynamicRecyclingAgent`."""

    facility: RecyclingFacilityProfile | None = None
    history_limit: int = 240


@dataclass(slots=True)
class RecyclingAgentReport:
    """Bundle of the latest recycling insight and strategy."""

    insight: RecyclingInsight
    strategy: RecyclingStrategy
    generated_at: datetime


class DynamicRecyclingAgent:
    """High-level coordinator around :class:`DynamicRecyclingEngine`."""

    def __init__(
        self,
        config: RecyclingAgentConfig | None = None,
        *,
        engine: DynamicRecyclingEngine | None = None,
        facility: RecyclingFacilityProfile | None = None,
        history_limit: int | None = None,
    ) -> None:
        if engine is not None and (facility is not None or history_limit is not None):
            raise ValueError("facility/history_limit overrides are not supported when supplying an engine")

        resolved_facility = facility
        resolved_history = history_limit

        if config is not None:
            if resolved_facility is None:
                resolved_facility = config.facility
            if resolved_history is None:
                resolved_history = config.history_limit

        if resolved_history is None:
            resolved_history = 240

        self._engine = engine or DynamicRecyclingEngine(
            facility=resolved_facility,
            history_limit=resolved_history,
        )

    # ------------------------------------------------------------------
    # properties

    @property
    def engine(self) -> DynamicRecyclingEngine:
        """Expose the underlying engine for advanced workflows."""

        return self._engine

    @property
    def history_size(self) -> int:
        return self._engine.history_size

    # ------------------------------------------------------------------
    # intake helpers

    def ingest_event(
        self,
        event: RecyclingEvent | Mapping[str, object],
        /,
        **overrides: object,
    ) -> RecyclingEvent:
        """Register a single recycling event with the engine."""

        return self._engine.register_event(event, **overrides)

    def ingest_events(
        self, events: Iterable[RecyclingEvent | Mapping[str, object]]
    ) -> list[RecyclingEvent]:
        """Bulk-register events, mirroring :meth:`DynamicRecyclingEngine.bulk_register`."""

        return self._engine.bulk_register(events)

    def reset(self) -> None:
        """Clear the agent state."""

        self._engine.clear_history()

    def configure_facility(
        self, profile: RecyclingFacilityProfile | None
    ) -> None:
        """Update the facility profile used by the engine."""

        self._engine.facility = profile

    # ------------------------------------------------------------------
    # analysis

    def analyse(self, *, window: int | None = None) -> RecyclingInsight:
        return self._engine.summarise(window=window)

    def strategise(self, *, window: int | None = None) -> RecyclingStrategy:
        return self._engine.recommend_strategy(window=window)

    def report(self, *, window: int | None = None) -> RecyclingAgentReport:
        """Generate a consolidated insight + strategy report."""

        insight = self.analyse(window=window)
        strategy = self.strategise(window=window)
        return RecyclingAgentReport(
            insight=insight,
            strategy=strategy,
            generated_at=datetime.now(timezone.utc),
        )

    def forecast(
        self,
        additional_mass_kg: float,
        *,
        recovery_rate: float | None = None,
    ) -> Mapping[str, float]:
        """Proxy to :meth:`DynamicRecyclingEngine.forecast_recovery`."""

        return self._engine.forecast_recovery(
            additional_mass_kg, recovery_rate=recovery_rate
        )
