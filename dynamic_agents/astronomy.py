"""Dynamic astronomy orchestration agent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_astronomy.astronomy import (
    CelestialEvent,
    DynamicAstronomy,
    ObservationLogEntry,
    ObservationRequest,
    ObservatorySite,
)

__all__ = ["AstronomyAgentInsight", "DynamicAstronomyAgent"]


@dataclass(slots=True)
class AstronomyAgentInsight:
    """Wrapper providing typed access to astronomy insight details."""

    raw: AgentInsight
    planned_requests: tuple[ObservationRequest, ...]
    pending_requests: tuple[ObservationRequest, ...]
    history: tuple[ObservationLogEntry, ...]


class DynamicAstronomyAgent:
    """Coordinate :class:`DynamicAstronomy` planning flows."""

    domain = "Dynamic Astronomy"

    def __init__(self, *, engine: DynamicAstronomy | None = None) -> None:
        self._engine = engine or DynamicAstronomy()
        self._site_registry = set(getattr(self._engine, "_sites", {}).keys())
        self._event_registry = set(getattr(self._engine, "_events", {}).keys())

    # ------------------------------------------------------------------
    # registration helpers

    @property
    def engine(self) -> DynamicAstronomy:
        return self._engine

    def register_site(self, site: ObservatorySite | Mapping[str, object]) -> ObservatorySite:
        record = self._engine.register_site(site)
        self._site_registry.add(record.name.lower())
        return record

    def register_event(self, event: CelestialEvent | Mapping[str, object]) -> CelestialEvent:
        record = self._engine.register_event(event)
        self._event_registry.add(record.identifier.lower())
        return record

    def submit_request(self, request: ObservationRequest | Mapping[str, object]) -> ObservationRequest:
        return self._engine.submit_request(request)

    def record_observation(self, entry: ObservationLogEntry | Mapping[str, object]) -> ObservationLogEntry:
        return self._engine.record_observation(entry)

    # ------------------------------------------------------------------
    # insight synthesis

    def _score_requests(
        self, requests: Sequence[ObservationRequest], *, limit: int | None
    ) -> tuple[ObservationRequest, ...]:
        scored = [
            (self._engine.evaluate_request(request), request) for request in requests
        ]
        scored.sort(key=lambda item: item[0], reverse=True)
        selected = [item[1] for item in scored]
        if limit is not None:
            selected = selected[: max(limit, 0)]
        return tuple(selected)

    def generate_insight(self, *, limit: int | None = None) -> AgentInsight:
        pending = self._engine.pending_requests()
        planned = self._score_requests(pending, limit=limit)
        success_rate = self._engine.success_rate()
        utilisation = self._engine.utilisation_index()
        metrics = {
            "pending_requests": float(len(pending)),
            "planned_requests": float(len(planned)),
            "registered_events": float(len(self._event_registry)),
            "registered_sites": float(len(self._site_registry)),
            "success_rate": float(success_rate),
            "utilisation_index": float(utilisation),
        }
        highlights: list[str] = []
        if planned:
            top = planned[0]
            highlights.append(
                f"Priority {top.event_id} @ {top.site} via {top.telescope} ({top.priority.name.title()})"
            )
        if success_rate < 0.5:
            highlights.append("Observation success rate is trending low.")
        elif success_rate > 0.8:
            highlights.append("Observation cadence performing strongly.")
        details = {
            "planned_requests": planned,
            "pending_requests": pending,
            "history": self._engine.history(),
        }
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title="Astronomy Observation Outlook",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def detailed_insight(self, *, limit: int | None = None) -> AstronomyAgentInsight:
        raw = self.generate_insight(limit=limit)
        planned = raw.details.get("planned_requests", ()) if raw.details else ()
        pending = raw.details.get("pending_requests", ()) if raw.details else ()
        history = raw.details.get("history", ()) if raw.details else ()
        return AstronomyAgentInsight(
            raw=raw,
            planned_requests=tuple(planned),
            pending_requests=tuple(pending),
            history=tuple(history),
        )
