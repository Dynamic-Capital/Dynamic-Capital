"""Bot interface for dynamic cislunar space."""

from __future__ import annotations

from dynamic_agents.cislunar import DynamicCislunarAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.cislunar import DynamicCislunarHelper
from dynamic_keepers.cislunar import DynamicCislunarKeeper

__all__ = ["DynamicCislunarBot"]


class DynamicCislunarBot(InsightBot):
    """Expose cislunar traffic insights via bot workflows."""

    def __init__(
        self,
        *,
        agent: DynamicCislunarAgent | None = None,
        helper: DynamicCislunarHelper | None = None,
        keeper: DynamicCislunarKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicCislunarAgent(),
            helper=helper or DynamicCislunarHelper(),
            keeper=keeper or DynamicCislunarKeeper(),
        )

    def survey(self) -> str:
        return super().publish_update()
