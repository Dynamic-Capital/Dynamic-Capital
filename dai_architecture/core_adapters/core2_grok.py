"""Grok adapter — prioritises speed for situational updates."""

from __future__ import annotations

from typing import Any, Mapping

from .base import BaseCoreAdapter, CoreDecision
from ..io_bus.schema import TaskEnvelope


class GrokAdapter(BaseCoreAdapter):
    """Low-latency core tuned for rapid bias updates."""

    def __init__(self) -> None:
        super().__init__(name="core2_grok")

    def score_task(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> float:
        recency = float(context.get("recency", 0.0))
        return 0.5 * recency + float(context.get("momentum", 0.0))

    def run(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> CoreDecision:
        direction = str(context.get("direction", "neutral")).upper()
        action = "BUY" if direction == "BULLISH" else "SELL" if direction == "BEARISH" else "HOLD"
        rationale = "Momentum and session recency favour a tactical update."
        confidence = max(0.35, min(0.8, float(context.get("momentum", 0.45)) + 0.05))
        return CoreDecision(action=action, confidence=confidence, rationale=rationale)
