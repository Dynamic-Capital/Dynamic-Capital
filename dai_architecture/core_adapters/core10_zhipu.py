"""Zhipu adapter — compliance-aware China market specialist."""

from __future__ import annotations

from typing import Any, Mapping

from .base import BaseCoreAdapter, CoreDecision
from ..io_bus.schema import TaskEnvelope


class ZhipuAdapter(BaseCoreAdapter):
    """Handles regional governance and localised intelligence synthesis."""

    def __init__(self) -> None:
        super().__init__(name="core10_zhipu")

    def score_task(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> float:
        region = str(context.get("region", "global")).lower()
        compliance_risk = float(context.get("compliance_risk", 0.3))
        locality = 1.0 if region in {"cn", "china", "apac"} else 0.4
        return 0.6 * locality + 0.4 * (1.0 - compliance_risk)

    def run(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> CoreDecision:
        region = str(context.get("region", "global")).lower()
        compliance_risk = float(context.get("compliance_risk", 0.3))
        market = context.get("market", {})
        direction = str(market.get("direction", context.get("direction", "neutral"))).upper()
        action = "HOLD"
        if compliance_risk < 0.7:
            if direction == "BULLISH":
                action = "BUY"
            elif direction == "BEARISH":
                action = "SELL"
        if region not in {"cn", "china", "apac"} and compliance_risk >= 0.6:
            action = "HOLD"
        rationale = "Regional adapter fuses CN intelligence with compliance guardrails."
        base_confidence = 0.45 + 0.15 * (1.0 - compliance_risk)
        confidence = max(0.4, min(0.83, base_confidence))
        return CoreDecision(action=action, confidence=confidence, rationale=rationale)
