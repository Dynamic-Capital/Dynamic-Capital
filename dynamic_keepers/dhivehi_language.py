"""History tracking for Dhivehi language insights."""

from __future__ import annotations

from dynamic_agents.dhivehi_language import (
    DhivehiLanguageAgentInsight,
    DynamicDhivehiLanguageAgent,
)
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicDhivehiLanguageKeeper"]


class DynamicDhivehiLanguageKeeper(InsightKeeper):
    """Persist Dhivehi language insights and expose aggregates."""

    def capture(
        self, agent: DynamicDhivehiLanguageAgent
    ) -> DhivehiLanguageAgentInsight:
        insight = agent.detailed_insight()
        self.record(insight.raw)
        return insight

    def average_coverage(self) -> float:
        return self.average_metric("average_coverage")

    def average_quality(self) -> float:
        return self.average_metric("average_quality")

    def backlog_size(self) -> float:
        return self.average_metric("pending_actions")
