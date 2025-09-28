"""Bot wrapper for dynamic spheres."""

from __future__ import annotations

from dynamic_agents.spheres import DynamicSpheresAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.spheres import DynamicSpheresHelper
from dynamic_keepers.spheres import DynamicSpheresKeeper

__all__ = ["DynamicSpheresBot"]


class DynamicSpheresBot(InsightBot):
    """Expose sphere resonance snapshots through bot workflows."""

    def __init__(
        self,
        *,
        agent: DynamicSpheresAgent | None = None,
        helper: DynamicSpheresHelper | None = None,
        keeper: DynamicSpheresKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicSpheresAgent(),
            helper=helper or DynamicSpheresHelper(),
            keeper=keeper or DynamicSpheresKeeper(),
        )

    def resonate(self, *, sphere: str | None = None) -> str:
        return super().publish_update(sphere=sphere)
