"""Bot wrapper for interstellar insights."""

from __future__ import annotations

from dynamic_agents.interstellar import DynamicInterstellarAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.interstellar import DynamicInterstellarHelper
from dynamic_keepers.interstellar import DynamicInterstellarKeeper

__all__ = ["DynamicInterstellarBot"]


class DynamicInterstellarBot(InsightBot):
    """Expose interstellar network metrics via bot workflows."""

    def __init__(
        self,
        *,
        agent: DynamicInterstellarAgent | None = None,
        helper: DynamicInterstellarHelper | None = None,
        keeper: DynamicInterstellarKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicInterstellarAgent(),
            helper=helper or DynamicInterstellarHelper(),
            keeper=keeper or DynamicInterstellarKeeper(),
        )

    def report(self) -> str:
        return super().publish_update()
