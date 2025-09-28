"""Dynamic interplanetary space orchestration agent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, Sequence

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_interplanetary_space.interplanetary_space import (
    DynamicInterplanetarySpace,
    NavigationAssessment,
    SpaceWeatherEvent,
    TransferWindow,
)

__all__ = ["InterplanetaryAgentInsight", "DynamicInterplanetaryAgent"]


@dataclass(slots=True)
class InterplanetaryAgentInsight:
    raw: AgentInsight
    upcoming_windows: tuple[TransferWindow, ...]
    recent_weather: tuple[SpaceWeatherEvent, ...]


class DynamicInterplanetaryAgent:
    """Coordinate :class:`DynamicInterplanetarySpace` logistics."""

    domain = "Dynamic Interplanetary Space"

    def __init__(self, *, engine: DynamicInterplanetarySpace | None = None) -> None:
        self._engine = engine or DynamicInterplanetarySpace()

    @property
    def engine(self) -> DynamicInterplanetarySpace:
        return self._engine

    def register_body(self, body) -> None:
        self._engine.register_body(body)

    def add_transfer_window(self, window: TransferWindow | Mapping[str, object]) -> TransferWindow:
        return self._engine.add_transfer_window(window)

    def record_space_weather(self, event: SpaceWeatherEvent | Mapping[str, object]) -> SpaceWeatherEvent:
        return self._engine.record_space_weather(event)

    def evaluate_itinerary(self, itinerary: Sequence[str], *, departure=None) -> NavigationAssessment:
        return self._engine.evaluate_itinerary(itinerary, departure=departure)

    def generate_insight(self) -> AgentInsight:
        body_count = len(getattr(self._engine, "_bodies", {}))
        routes = getattr(self._engine, "_routes", {})
        route_keys = list(routes.keys())
        transfer_counts = sum(len(windows) for windows in routes.values())
        upcoming: list[TransferWindow] = []
        for windows in routes.values():
            if windows:
                upcoming.append(min(windows, key=lambda item: item.departure_window[0]))
        upcoming.sort(key=lambda window: window.departure_window[0])
        recent_weather = self._engine.recent_space_weather()
        metrics = {
            "bodies": float(body_count),
            "routes": float(len(route_keys)),
            "transfer_windows": float(transfer_counts),
            "recent_weather": float(len(recent_weather)),
        }
        highlights: list[str] = []
        if upcoming:
            next_window = upcoming[0]
            highlights.append(
                f"Next window {next_window.origin}->{next_window.destination} departs {next_window.departure_window[0].date()}"
            )
        if recent_weather:
            severe = max(recent_weather, key=lambda event: event.severity)
            highlights.append(
                f"Severe weather {severe.event_type} severity {severe.severity:.2f}"
            )
        details = {
            "upcoming_windows": tuple(upcoming[:5]),
            "recent_weather": recent_weather,
        }
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title="Interplanetary Logistics Outlook",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def detailed_insight(self) -> InterplanetaryAgentInsight:
        raw = self.generate_insight()
        upcoming = raw.details.get("upcoming_windows") if raw.details else ()
        weather = raw.details.get("recent_weather") if raw.details else ()
        return InterplanetaryAgentInsight(
            raw=raw,
            upcoming_windows=tuple(upcoming),
            recent_weather=tuple(weather),
        )
