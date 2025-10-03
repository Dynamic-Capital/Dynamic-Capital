"""Dynamic energy orchestration agent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_energy.energy import DynamicEnergyEngine, EnergyEvent, EnergyProfile, EnergyVector

__all__ = ["EnergyAgentInsight", "DynamicEnergyAgent"]


@dataclass(slots=True)
class EnergyAgentInsight:
    raw: AgentInsight
    profile: EnergyProfile


class DynamicEnergyAgent:
    """Coordinate :class:`DynamicEnergyEngine` observations."""

    domain = "Dynamic Energy"

    def __init__(self, *, engine: DynamicEnergyEngine | None = None) -> None:
        self._engine = engine or DynamicEnergyEngine()

    @property
    def engine(self) -> DynamicEnergyEngine:
        return self._engine

    def record(self, event: EnergyEvent | Mapping[str, object]) -> EnergyEvent:
        return self._engine.record(event)

    def extend(self, events: Iterable[EnergyEvent | Mapping[str, object]]) -> None:
        self._engine.extend(events)

    def reset(self) -> None:
        self._engine.reset()

    def generate_insight(self, *, baseline: EnergyVector | None = None) -> AgentInsight:
        profile = self._engine.evaluate(baseline=baseline)
        metrics = {
            "overall_energy": float(profile.overall_energy),
            "stability": float(profile.stability),
            "momentum": float(profile.momentum),
            "pressure": float(profile.pressure),
            "dark_energy": float(profile.dark),
        }
        highlights = list(profile.signals)
        if profile.narrative:
            highlights.append(profile.narrative)
        details = {"profile": profile, "actions": profile.recommended_actions}
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title="Energy Systems Profile",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def detailed_insight(self, *, baseline: EnergyVector | None = None) -> EnergyAgentInsight:
        raw = self.generate_insight(baseline=baseline)
        profile = raw.details.get("profile") if raw.details else None
        if not isinstance(profile, EnergyProfile):
            profile = self._engine.evaluate(baseline=baseline)
        return EnergyAgentInsight(raw=raw, profile=profile)
