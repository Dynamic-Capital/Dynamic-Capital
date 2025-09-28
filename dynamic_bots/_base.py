"""Foundational bot orchestration utilities."""

from __future__ import annotations

from dynamic_agents._insight import InsightAgent
from dynamic_helpers._base import InsightHelper
from dynamic_keepers._base import InsightKeeper

__all__ = ["InsightBot"]


class InsightBot:
    """High-level wrapper that pairs agents, helpers, and keepers."""

    def __init__(
        self,
        *,
        agent: InsightAgent,
        helper: InsightHelper | None = None,
        keeper: InsightKeeper | None = None,
    ) -> None:
        self._agent = agent
        self._helper = helper or InsightHelper()
        self._keeper = keeper or InsightKeeper()

    @property
    def agent(self) -> InsightAgent:
        return self._agent

    @property
    def helper(self) -> InsightHelper:
        return self._helper

    @property
    def keeper(self) -> InsightKeeper:
        return self._keeper

    def publish_update(self, **kwargs: object) -> str:
        """Generate, persist, and format an update from the underlying agent."""

        insight = self._agent.generate_insight(**kwargs)
        self._keeper.record(insight)
        return self._helper.compose_digest(insight)
