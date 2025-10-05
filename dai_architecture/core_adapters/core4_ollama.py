"""Ollama adapter — resilient self-hosted fallback core."""

from __future__ import annotations

from typing import Any, Mapping

from .base import BaseCoreAdapter, CoreDecision
from ..io_bus.schema import TaskEnvelope


class OllamaAdapter(BaseCoreAdapter):
    """Cost-aware adapter that prefers stable regimes."""

    def __init__(self) -> None:
        super().__init__(name="core4_ollama")

    def score_task(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> float:
        volatility = float(context.get("volatility", 0.5))
        latency_budget = float(context.get("latency_budget", 0.5))
        cost_sensitivity = float(context.get("cost_sensitivity", 0.5))
        stability_bias = 1.0 - volatility
        return 0.4 * stability_bias + 0.3 * latency_budget + 0.3 * (1.0 - cost_sensitivity)

    def run(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> CoreDecision:
        volatility = float(context.get("volatility", 0.5))
        market = context.get("market", {})
        direction = str(market.get("direction", context.get("direction", "neutral"))).upper()
        action = "HOLD"
        if volatility < 0.6:
            if direction == "BULLISH":
                action = "BUY"
            elif direction == "BEARISH":
                action = "SELL"
        rationale = "Self-hosted persona favours stable, low-volatility execution with budget awareness."
        base_confidence = 0.45 + 0.1 * (1.0 - volatility) + 0.05 * float(context.get("latency_budget", 0.5))
        confidence = max(0.35, min(0.7, base_confidence))
        return CoreDecision(action=action, confidence=confidence, rationale=rationale)
