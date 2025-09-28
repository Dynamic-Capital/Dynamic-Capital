"""Insight keeper for the Dynamic Skeleton layer."""

from __future__ import annotations

from statistics import fmean
from typing import ClassVar

from dynamic_agents.skull import DynamicSkullAgent, SkullAgentInsight
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicVertebraeKeeper"]


class DynamicVertebraeKeeper(InsightKeeper):
    """Persist skull agent insights and expose aggregate helpers."""

    role: ClassVar[str] = "Vertebrae archivist reinforcing structural insight memory."
    _tasks: ClassVar[tuple[str, ...]] = (
        "Capture skull agent telemetry for longitudinal analysis.",
        "Stabilise quorum and compliance metrics across history.",
        "Surface averages that support governance posture alignment.",
    )

    def __init__(self, *, limit: int = 120) -> None:
        super().__init__(limit=limit)

    @property
    def tasks(self) -> tuple[str, ...]:
        """Tasks carried out by the vertebrae keeper."""

        return self._tasks

    def capture(self, agent: DynamicSkullAgent) -> SkullAgentInsight:
        """Record a detailed skeleton insight from ``agent``."""

        insight = agent.detailed_insight()
        self.record(insight.raw)
        return insight

    def average_quorum_success(self) -> float:
        """Return the mean quorum success rate across stored insights."""

        return self.average_metric("quorum_success_rate")

    def compliance_failure_rate(self) -> float:
        """Compute the average fraction of failing compliance checks."""

        ratios: list[float] = []
        for insight in self.history:
            totals = {
                key: float(value)
                for key, value in insight.metrics.items()
                if key.startswith("compliance_") and key.endswith("_count")
            }
            if not totals:
                continue
            total_checks = sum(totals.values())
            if total_checks <= 0:
                continue
            failure_count = totals.get("compliance_fail_count", 0.0)
            ratios.append(failure_count / total_checks)
        return fmean(ratios) if ratios else 0.0
