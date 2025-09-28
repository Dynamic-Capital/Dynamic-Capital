"""Bot wrapper for dynamic physics simulations."""

from __future__ import annotations

from dynamic_agents.physics_agent import DynamicPhysicsAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.physics import DynamicPhysicsHelper
from dynamic_keepers.physics import DynamicPhysicsKeeper

__all__ = ["DynamicPhysicsBot"]


class DynamicPhysicsBot(InsightBot):
    """Expose simulation snapshots through a bot interface."""

    def __init__(
        self,
        *,
        agent: DynamicPhysicsAgent | None = None,
        helper: DynamicPhysicsHelper | None = None,
        keeper: DynamicPhysicsKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicPhysicsAgent(),
            helper=helper or DynamicPhysicsHelper(),
            keeper=keeper or DynamicPhysicsKeeper(),
        )

    def step(self, *, dt: float | None = None, substeps: int = 1) -> str:
        return super().publish_update(dt=dt, substeps=substeps)
