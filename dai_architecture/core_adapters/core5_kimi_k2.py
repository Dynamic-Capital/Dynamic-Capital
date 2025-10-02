"""Kimi K2 adapter — multilingual narrative specialist."""

from __future__ import annotations

from typing import Any, Mapping

from .base import BaseCoreAdapter, CoreDecision
from ..io_bus.schema import TaskEnvelope


class KimiK2Adapter(BaseCoreAdapter):
    """Balances multilingual reporting needs with execution posture."""

    def __init__(self) -> None:
        super().__init__(name="core5_kimi_k2")

    def score_task(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> float:
        momentum = float(context.get("momentum", 0.5))
        confidence_hint = float(context.get("confidence_hint", momentum))
        locale = str(context.get("locale", "en")).lower()
        cross_border = 1.0 if locale not in {"en", "us"} else 0.0
        return 0.5 * confidence_hint + 0.3 * momentum + 0.2 * cross_border

    def run(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> CoreDecision:
        market = context.get("market", {})
        direction = str(market.get("direction", context.get("direction", "neutral"))).upper()
        locale = str(context.get("locale", "en")).lower()
        action = "HOLD"
        if direction == "BULLISH":
            action = "BUY"
        elif direction == "BEARISH":
            action = "SELL"
        if locale not in {"en", "us"} and action == "HOLD":
            action = "BUY"
        rationale = "Multilingual reporting core harmonises cross-border signals into actionable guidance."
        momentum = float(context.get("momentum", 0.5))
        adjustment = 0.05 if locale not in {"en", "us"} else 0.0
        confidence = 0.4 + 0.2 * momentum + adjustment
        confidence = max(0.35, min(0.82, confidence))
        return CoreDecision(action=action, confidence=confidence, rationale=rationale)
