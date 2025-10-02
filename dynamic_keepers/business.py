"""Keeper implementation for the dynamic business engine."""

from __future__ import annotations

from dynamic_agents.business import BusinessEngineInsight, DynamicBusinessAgent
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicBusinessKeeper"]


class DynamicBusinessKeeper(InsightKeeper):
    """Persist business engine snapshots and expose aggregate metrics."""

    def __init__(self, *, limit: int = 48) -> None:
        super().__init__(limit=limit)

    def capture(
        self, agent: DynamicBusinessAgent, *, limit: int | None = None
    ) -> BusinessEngineInsight:
        """Collect a detailed insight bundle and record the raw payload."""

        insight = agent.detailed_insight()
        self.record(insight.raw)
        if limit is not None and limit > 0:
            self._trim(limit)
        return insight

    def average_health_index(self) -> float:
        """Return the average overall health score across history."""

        return self.average_metric("overall_health_index")

    def average_quarterly_revenue(self) -> float:
        return self.average_metric("sales_quarterly_revenue")

    def average_profit_margin(self) -> float:
        return self.average_metric("accounting_profit_margin")

    def _trim(self, limit: int) -> None:
        """Restrict the keeper history to ``limit`` entries."""

        history = list(self.history)
        if len(history) <= limit:
            return
        self._history.clear()
        for item in history[-limit:]:
            self._history.append(item)
