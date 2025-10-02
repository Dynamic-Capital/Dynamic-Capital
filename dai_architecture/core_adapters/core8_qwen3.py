"""Qwen3 adapter — persona-aware summarisation specialist."""

from __future__ import annotations

from typing import Any, Mapping

from .base import BaseCoreAdapter, CoreDecision
from ..io_bus.schema import TaskEnvelope


class Qwen3Adapter(BaseCoreAdapter):
    """Balances multilingual sentiment with persona cues."""

    def __init__(self) -> None:
        super().__init__(name="core8_qwen3")

    def score_task(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> float:
        sentiment = float(context.get("sentiment", 0.5))
        momentum = float(context.get("momentum", 0.5))
        persona_alignment = float(context.get("persona_alignment", 0.5))
        return 0.6 * sentiment + 0.25 * momentum + 0.15 * persona_alignment

    def run(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> CoreDecision:
        sentiment = float(context.get("sentiment", 0.5))
        market = context.get("market", {})
        direction = str(market.get("direction", context.get("direction", "neutral"))).upper()
        action = "HOLD"
        if sentiment > 0.6:
            action = "BUY"
        elif sentiment < 0.4:
            action = "SELL"
        elif direction == "BULLISH":
            action = "BUY"
        rationale = "Persona summariser blends sentiment telemetry into guardrailed trade cues."
        momentum = float(context.get("momentum", 0.5))
        base_confidence = 0.42 + 0.2 * abs(sentiment - 0.5) + 0.05 * momentum
        confidence = max(0.35, min(0.78, base_confidence))
        return CoreDecision(action=action, confidence=confidence, rationale=rationale)
