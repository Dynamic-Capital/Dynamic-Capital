"""State keeper for dynamic physics simulations."""

from __future__ import annotations

from dynamic_agents.physics_agent import DynamicPhysicsAgent, PhysicsAgentInsight
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicPhysicsKeeper"]


class DynamicPhysicsKeeper(InsightKeeper):
    """Track simulation insights for longitudinal physics analysis."""

    def __init__(self, *, limit: int = 120) -> None:
        super().__init__(limit=limit)

    def capture(self, agent: DynamicPhysicsAgent, *, dt: float | None = None, substeps: int = 1) -> PhysicsAgentInsight:
        insight = agent.detailed_insight(dt=dt, substeps=substeps)
        self.record(insight.raw)
        return insight

    def average_kinetic_energy(self) -> float:
        return self.average_metric("kinetic_energy")

    def average_potential_energy(self) -> float:
        return self.average_metric("potential_energy")
