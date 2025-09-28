"""Reusable insight keeper utilities."""

from __future__ import annotations

from collections import deque
from statistics import fmean
from typing import Deque

from dynamic_agents._insight import AgentInsight, InsightAgent

__all__ = ["InsightKeeper"]


class InsightKeeper:
    """Maintain a rolling history of :class:`AgentInsight` objects."""

    def __init__(self, *, limit: int = 120) -> None:
        if limit <= 0:
            raise ValueError("limit must be positive")
        self._history: Deque[AgentInsight] = deque(maxlen=limit)

    def record(self, insight: AgentInsight) -> None:
        """Persist an insight in the rolling history."""

        self._history.append(insight)

    def observe(self, agent: InsightAgent, /, **kwargs: object) -> AgentInsight:
        """Capture and store an insight from ``agent`` using ``kwargs`` overrides."""

        insight = agent.generate_insight(**kwargs)
        self.record(insight)
        return insight

    @property
    def history(self) -> tuple[AgentInsight, ...]:
        """Return the recorded insights as an immutable tuple."""

        return tuple(self._history)

    def average_metric(self, name: str) -> float:
        """Compute the mean for a metric over the recorded insights."""

        values = [float(insight.metrics.get(name, 0.0)) for insight in self._history]
        return fmean(values) if values else 0.0

    @property
    def latest(self) -> AgentInsight | None:
        """Return the most recent insight if one has been recorded."""

        return self._history[-1] if self._history else None
