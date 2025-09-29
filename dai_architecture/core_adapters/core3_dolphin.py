"""Dolphin adapter — deterministic numeric lens for guardrails."""

from __future__ import annotations

from typing import Any, Mapping

from .base import BaseCoreAdapter, CoreDecision
from ..io_bus.schema import TaskEnvelope


class DolphinAdapter(BaseCoreAdapter):
    """Deterministic adapter favouring treasury-aware actions."""

    def __init__(self) -> None:
        super().__init__(name="core3_dolphin")

    def score_task(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> float:
        treasury = float(context.get("treasury_health", 0.5))
        drawdown = float(context.get("drawdown", 0.0))
        return treasury - drawdown

    def run(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> CoreDecision:
        buffer = float(context.get("treasury_health", 0.5))
        drawdown = float(context.get("drawdown", 0.0))
        action = "HOLD"
        if buffer > 0.6 and drawdown < 0.1:
            action = "BUY"
        elif drawdown > 0.2:
            action = "SELL"
        rationale = "Treasury and drawdown telemetry constrain the decision envelope."
        confidence = max(0.3, min(0.75, buffer - 0.5 * drawdown + 0.2))
        return CoreDecision(action=action, confidence=confidence, rationale=rationale)
