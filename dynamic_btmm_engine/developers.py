"""Developer utilities for extending the Dynamic BTMM engine."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple

from .model import BTMMAction, BTMMDecision

__all__ = ["BTMMDeveloperToolkit"]


@dataclass(slots=True)
class BTMMDeveloperToolkit:
    """Translate engine output into actionable development todos."""

    def backlog_from_decision(self, decision: BTMMDecision) -> Tuple[Dict[str, object], ...]:
        """Create backlog suggestions tailored to the engine decision."""

        tasks: list[Dict[str, object]] = []
        base_reason = ", ".join(decision.reasons[:3]) if decision.reasons else ""

        if decision.action == BTMMAction.BUY:
            tasks.append(
                {
                    "identifier": "btmm-buy-signal-validation",
                    "description": "Validate bullish BTMM conditions in backtests",
                    "status": "pending",
                    "tags": ("btmm", "analysis", "validation"),
                    "notes": base_reason,
                }
            )
        elif decision.action == BTMMAction.SELL:
            tasks.append(
                {
                    "identifier": "btmm-sell-signal-validation",
                    "description": "Validate bearish BTMM conditions in backtests",
                    "status": "pending",
                    "tags": ("btmm", "analysis", "validation"),
                    "notes": base_reason,
                }
            )
        else:
            tasks.append(
                {
                    "identifier": "btmm-neutral-review",
                    "description": "Review neutral BTMM snapshots for missed context",
                    "status": "pending",
                    "tags": ("btmm", "research"),
                    "notes": base_reason,
                }
            )

        tasks.append(
            {
                "identifier": "btmm-engine-telemetry",
                "description": "Extend telemetry coverage for BTMM decision traces",
                "status": "pending",
                "tags": ("btmm", "tooling"),
                "notes": base_reason,
            }
        )
        return tuple(tasks)
