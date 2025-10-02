"""MiniMax M1 adapter — ultra-low-latency tactical core."""

from __future__ import annotations

from typing import Any, Mapping

from .base import BaseCoreAdapter, CoreDecision
from ..io_bus.schema import TaskEnvelope


class MiniMaxM1Adapter(BaseCoreAdapter):
    """Prioritises recency and execution tightness for fast pivots."""

    def __init__(self) -> None:
        super().__init__(name="core9_minimax_m1")

    def score_task(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> float:
        recency = float(context.get("recency", 0.5))
        latency_budget = float(context.get("latency_budget", 0.5))
        volatility = float(context.get("volatility", 0.5))
        return 0.7 * recency + 0.2 * (1.0 - latency_budget) + 0.1 * (1.0 - volatility)

    def run(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> CoreDecision:
        recency = float(context.get("recency", 0.5))
        market = context.get("market", {})
        direction = str(market.get("direction", context.get("direction", "neutral"))).upper()
        action = "HOLD"
        if recency > 0.6:
            if direction == "BULLISH":
                action = "BUY"
            elif direction == "BEARISH":
                action = "SELL"
        rationale = "Tactical adapter reacts to freshest telemetry under latency pressure."
        momentum = float(context.get("momentum", 0.5))
        base_confidence = 0.38 + 0.25 * recency + 0.05 * momentum - 0.1 * float(context.get("latency_budget", 0.5))
        confidence = max(0.35, min(0.8, base_confidence))
        return CoreDecision(action=action, confidence=confidence, rationale=rationale)
