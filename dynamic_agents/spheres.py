"""Dynamic spheres orchestration agent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_spheres.engine import (
    DynamicSpheresEngine,
    SphereCollaborator,
    SphereProfile,
    SpherePulse,
    SphereSnapshot,
)

__all__ = ["SpheresAgentInsight", "DynamicSpheresAgent"]


@dataclass(slots=True)
class SpheresAgentInsight:
    raw: AgentInsight
    snapshot: SphereSnapshot


class DynamicSpheresAgent:
    """Coordinate :class:`DynamicSpheresEngine` resonance analytics."""

    domain = "Dynamic Spheres"

    def __init__(self, *, engine: DynamicSpheresEngine | None = None) -> None:
        self._engine = engine or DynamicSpheresEngine()
        self._default_sphere: str | None = None

    @property
    def engine(self) -> DynamicSpheresEngine:
        return self._engine

    def upsert_profile(self, profile: SphereProfile | Mapping[str, object]) -> SphereProfile:
        record = self._engine.upsert_profile(profile)
        self._default_sphere = self._default_sphere or record.name
        return record

    def capture(self, pulse: SpherePulse | Mapping[str, object]) -> SpherePulse:
        return self._engine.capture(pulse)

    def upsert_collaborator(self, collaborator: SphereCollaborator | Mapping[str, object]) -> SphereCollaborator:
        return self._engine.upsert_collaborator(collaborator)

    def _resolve_target(self, sphere: str | None) -> str:
        name = sphere or self._default_sphere
        if not name:
            raise ValueError("no sphere registered; call upsert_profile first")
        return name

    def generate_insight(self, *, sphere: str | None = None) -> AgentInsight:
        name = self._resolve_target(sphere)
        snapshot = self._engine.snapshot(name)
        metrics = {
            "resonance_index": float(snapshot.resonance_index),
            "resonance_trend": float(snapshot.resonance_trend),
            "energy_output_twh": float(snapshot.total_energy_output_twh),
            "energy_delta_twh": float(snapshot.cumulative_energy_delta_twh),
            "density_shift": float(snapshot.cumulative_density_shift),
        }
        highlights = [f"Sphere {snapshot.sphere.name} resonance {snapshot.resonance_index:.2f}"]
        details = {"snapshot": snapshot}
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title=f"Sphere {snapshot.sphere.name} Resonance",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def detailed_insight(self, *, sphere: str | None = None) -> SpheresAgentInsight:
        raw = self.generate_insight(sphere=sphere)
        snapshot = raw.details.get("snapshot") if raw.details else None
        if not isinstance(snapshot, SphereSnapshot):
            snapshot = self._engine.snapshot(self._resolve_target(sphere))
        return SpheresAgentInsight(raw=raw, snapshot=snapshot)
