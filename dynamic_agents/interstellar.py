"""Dynamic interstellar space orchestration agent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_interstellar_space.space import (
    CosmicCurrent,
    DynamicInterstellarSpace,
    InterstellarEvent,
    StellarBody,
    WormholeCorridor,
)

__all__ = ["InterstellarAgentInsight", "DynamicInterstellarAgent"]


@dataclass(slots=True)
class InterstellarAgentInsight:
    raw: AgentInsight
    radiant_bodies: tuple[StellarBody, ...]
    corridors: Mapping[str, list[WormholeCorridor]]


class DynamicInterstellarAgent:
    """Coordinate :class:`DynamicInterstellarSpace` bodies and corridors."""

    domain = "Dynamic Interstellar Space"

    def __init__(self, *, engine: DynamicInterstellarSpace | None = None) -> None:
        self._engine = engine or DynamicInterstellarSpace()

    @property
    def engine(self) -> DynamicInterstellarSpace:
        return self._engine

    def register_body(self, body: StellarBody) -> None:
        self._engine.register_body(body)

    def register_corridor(self, corridor: WormholeCorridor) -> None:
        self._engine.register_corridor(corridor)

    def register_current(self, current: CosmicCurrent) -> None:
        self._engine.register_current(current)

    def record_event(self, event: InterstellarEvent) -> InterstellarEvent:
        return self._engine.record_event(event)

    def generate_insight(self) -> AgentInsight:
        snapshot = self._engine.narrative_snapshot()
        metrics = {
            "body_density": float(snapshot.get("body_density", 0.0)),
            "corridor_resilience": float(snapshot.get("corridor_resilience", 0.0)),
            "current_coherence": float(snapshot.get("current_coherence", 0.0)),
            "topology_health": float(snapshot.get("topology_health", 0.0)),
        }
        radiant = tuple(self._engine.radiant_bodies())
        highlights: list[str] = []
        if radiant:
            primary = radiant[0]
            highlights.append(
                f"Radiant body {primary.name} flux {primary.radiation_flux():.2f}"
            )
        details = {
            "radiant_bodies": radiant,
            "corridors": self._engine.corridor_map(),
        }
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title="Interstellar Network Health",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def detailed_insight(self) -> InterstellarAgentInsight:
        raw = self.generate_insight()
        radiant = raw.details.get("radiant_bodies") if raw.details else ()
        corridors = raw.details.get("corridors") if raw.details else {}
        return InterstellarAgentInsight(
            raw=raw,
            radiant_bodies=tuple(radiant),
            corridors=corridors,
        )
