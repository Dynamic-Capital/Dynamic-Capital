"""Dynamic physics orchestration agent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_physics.physics import (
    DynamicPhysicsEngine,
    ForceEvent,
    PhysicsBody,
    PhysicsSnapshot,
    Vector3,
)

__all__ = ["PhysicsAgentInsight", "DynamicPhysicsAgent"]


@dataclass(slots=True)
class PhysicsAgentInsight:
    raw: AgentInsight
    snapshot: PhysicsSnapshot


class DynamicPhysicsAgent:
    """Coordinate :class:`DynamicPhysicsEngine` simulations."""

    domain = "Dynamic Physics"

    def __init__(self, *, engine: DynamicPhysicsEngine | None = None) -> None:
        self._engine = engine or DynamicPhysicsEngine()

    @property
    def engine(self) -> DynamicPhysicsEngine:
        return self._engine

    # ------------------------------------------------------------------
    # configuration

    def add_body(self, body: PhysicsBody) -> None:
        self._engine.add_body(body)

    def remove_body(self, identifier: str) -> None:
        self._engine.remove_body(identifier)

    def queue_force(self, event: ForceEvent) -> None:
        self._engine.queue_force(event)

    def apply_impulse(self, identifier: str, impulse: Vector3) -> None:
        self._engine.apply_impulse(identifier, impulse)

    # ------------------------------------------------------------------
    # simulation helpers

    def step(self, dt: float, *, substeps: int = 1) -> PhysicsSnapshot:
        return self._engine.step(dt, substeps=substeps)

    def run_forces(self, events: Iterable[ForceEvent], *, dt: float) -> PhysicsSnapshot:
        return self._engine.run_forces(events, dt=dt)

    def snapshot(self) -> PhysicsSnapshot:
        return self._engine.snapshot()

    # ------------------------------------------------------------------
    # insight synthesis

    def generate_insight(self, *, dt: float | None = None, substeps: int = 1) -> AgentInsight:
        snapshot = self._engine.step(dt, substeps=substeps) if dt is not None else self._engine.snapshot()
        metrics = {
            "time": float(snapshot.time),
            "bodies": float(len(snapshot.bodies)),
            "kinetic_energy": float(snapshot.total_kinetic_energy),
            "potential_energy": float(snapshot.total_potential_energy),
        }
        highlights = [
            f"Energy balance K={snapshot.total_kinetic_energy:.2f} | P={snapshot.total_potential_energy:.2f}",
        ]
        details = {"snapshot": snapshot}
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title="Physics Simulation Snapshot",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def detailed_insight(self, **kwargs: object) -> PhysicsAgentInsight:
        raw = self.generate_insight(**kwargs)
        snapshot = raw.details.get("snapshot") if raw.details else None
        if not isinstance(snapshot, PhysicsSnapshot):
            snapshot = self._engine.snapshot()
        return PhysicsAgentInsight(raw=raw, snapshot=snapshot)
