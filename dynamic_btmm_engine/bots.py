"""Bot facades wrapping BTMM agents for automation workflows."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Tuple

from .agents import BTMMAgent
from .model import BTMMDecision, BTMMIndicatorSnapshot

__all__ = ["BTMMExecutionBot"]


@dataclass(slots=True)
class BTMMExecutionBot:
    """Thin bot wrapper for running BTMM decisions in automation flows."""

    agent: BTMMAgent

    def decide(self, snapshot: BTMMIndicatorSnapshot) -> BTMMDecision:
        """Return a trade decision for a single snapshot."""

        result = self.agent.ingest(snapshot)
        return result.decision

    def run(self, snapshots: Iterable[BTMMIndicatorSnapshot]) -> Tuple[BTMMDecision, ...]:
        """Evaluate a sequence of snapshots returning their decisions."""

        decisions: list[BTMMDecision] = []
        for snapshot in snapshots:
            decisions.append(self.decide(snapshot))
        return tuple(decisions)

    def latest_bias(self) -> str:
        """Expose the rolling bias computed by the underlying agent."""

        return self.agent.bias()
