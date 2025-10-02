"""Bot interface for Dhivehi language operations."""

from __future__ import annotations

from dynamic_agents.dhivehi_language import DynamicDhivehiLanguageAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.dhivehi_language import DynamicDhivehiLanguageHelper
from dynamic_keepers.dhivehi_language import DynamicDhivehiLanguageKeeper

__all__ = ["DynamicDhivehiLanguageBot"]


class DynamicDhivehiLanguageBot(InsightBot):
    """High-level orchestrator for Dhivehi language readiness updates."""

    def __init__(
        self,
        *,
        agent: DynamicDhivehiLanguageAgent | None = None,
        helper: DynamicDhivehiLanguageHelper | None = None,
        keeper: DynamicDhivehiLanguageKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicDhivehiLanguageAgent(),
            helper=helper or DynamicDhivehiLanguageHelper(),
            keeper=keeper or DynamicDhivehiLanguageKeeper(),
        )

    def publish(self) -> str:
        """Generate a Dhivehi language digest using the configured components."""

        return super().publish_update()
