"""Hunyuan adapter — cultural and sentiment synthesiser for APAC desks."""

from __future__ import annotations

from typing import Any, Mapping

from .base import BaseCoreAdapter, CoreDecision
from ..io_bus.schema import TaskEnvelope


class HunyuanAdapter(BaseCoreAdapter):
    """Blends cultural nuance with market sentiment when routing actions."""

    def __init__(self) -> None:
        super().__init__(name="core11_hunyuan")

    def score_task(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> float:
        cultural = float(context.get("cultural_signal", 0.5))
        sentiment = float(context.get("sentiment", 0.5))
        treasury = float(context.get("treasury_health", 0.6))
        return 0.5 * cultural + 0.3 * sentiment + 0.2 * treasury

    def run(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> CoreDecision:
        cultural = float(context.get("cultural_signal", 0.5))
        sentiment = float(context.get("sentiment", 0.5))
        market = context.get("market", {})
        direction = str(market.get("direction", context.get("direction", "neutral"))).upper()
        action = "HOLD"
        if cultural > 0.55 or sentiment > 0.6:
            action = "BUY"
        elif cultural < 0.45 and sentiment < 0.45:
            action = "SELL"
        elif direction == "BULLISH":
            action = "BUY"
        rationale = "APAC cultural adapter fuses nuance and treasury posture into final stance."
        volatility = float(context.get("volatility", 0.4))
        base_confidence = 0.4 + 0.2 * max(cultural, sentiment) - 0.1 * volatility
        confidence = max(0.36, min(0.81, base_confidence))
        return CoreDecision(action=action, confidence=confidence, rationale=rationale)
