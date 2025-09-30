"""Dynamic cosmic orchestration agent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_cosmic.cosmic import (
    CosmicBridge,
    CosmicPhenomenon,
    CosmicSignal,
    CosmicTimelineEvent,
    DynamicCosmic,
)

__all__ = ["CosmicAgentInsight", "DynamicCosmicAgent"]


@dataclass(slots=True)
class CosmicAgentInsight:
    raw: AgentInsight
    snapshot: Mapping[str, object]


class DynamicCosmicAgent:
    """Coordinate :class:`DynamicCosmic` phenomena and bridges."""

    domain = "Dynamic Cosmic"

    def __init__(self, *, engine: DynamicCosmic | None = None) -> None:
        self._engine = engine or DynamicCosmic()

    @property
    def engine(self) -> DynamicCosmic:
        return self._engine

    # ------------------------------------------------------------------
    # registration helpers

    def register_phenomenon(self, phenomenon: CosmicPhenomenon | Mapping[str, object]) -> CosmicPhenomenon:
        return self._engine.register_phenomenon(phenomenon)

    def register_bridge(self, bridge: CosmicBridge | Mapping[str, object]) -> CosmicBridge:
        return self._engine.register_bridge(bridge)

    def ingest_signal(self, identifier: str, signal: CosmicSignal | Mapping[str, object]) -> CosmicPhenomenon:
        return self._engine.ingest_signal(identifier, signal)

    def record_event(self, event: CosmicTimelineEvent | Mapping[str, object]) -> CosmicTimelineEvent:
        return self._engine.record_event(event)

    # ------------------------------------------------------------------
    # insight synthesis

    def generate_insight(self) -> AgentInsight:
        snapshot = self._engine.snapshot()
        phenomena = snapshot.get("phenomena", [])
        bridges = snapshot.get("bridges", [])
        events = snapshot.get("events", [])
        resilience = float(snapshot.get("resilience", 0.0) or 0.0)
        expansion = snapshot.get("expansion", {}) if isinstance(snapshot, Mapping) else {}
        metrics = {
            "phenomena": float(len(phenomena)),
            "bridges": float(len(bridges)),
            "events": float(len(events)),
            "resilience": resilience,
        }
        if isinstance(expansion, Mapping):
            friedmann = float(expansion.get("friedmann_acceleration", 0.0) or 0.0)
            continuity = float(expansion.get("continuity_residual", 0.0) or 0.0)
            modifier = float(expansion.get("stability_modifier", 0.0) or 0.0)
            metrics.update(
                {
                    "friedmann_acceleration": friedmann,
                    "continuity_residual": continuity,
                    "stability_modifier": modifier or 1.0,
                }
            )
            equation_of_state = expansion.get("equation_of_state")
            if isinstance(equation_of_state, (int, float)):
                metrics["equation_of_state"] = float(equation_of_state)
        highlights: list[str] = []
        if phenomena:
            dominant = max(phenomena, key=lambda item: item.get("magnitude", 0.0))
            highlights.append(
                f"Dominant phenomenon {dominant.get('identifier')} magnitude {dominant.get('magnitude', 0.0):.2f}"
            )
        if bridges:
            highlights.append(f"Network bridges active: {len(bridges)}")
        if isinstance(expansion, Mapping):
            friedmann = float(expansion.get("friedmann_acceleration", 0.0) or 0.0)
            continuity = float(expansion.get("continuity_residual", 0.0) or 0.0)
            if friedmann > 0.05:
                highlights.append(f"Expansion acceleration {friedmann:.2f}")
            if continuity > 0.05:
                highlights.append(f"Runway drag index {continuity:.2f}")
        details = {"snapshot": snapshot}
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title="Cosmic Systems Telemetry",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def detailed_insight(self) -> CosmicAgentInsight:
        raw = self.generate_insight()
        snapshot = raw.details.get("snapshot") if raw.details else {}
        return CosmicAgentInsight(raw=raw, snapshot=snapshot)
