"""ChatCPT2 adapter — focuses on deep rationale generation."""

from __future__ import annotations

from typing import Any, Mapping

from .base import BaseCoreAdapter, CoreDecision
from ..io_bus.schema import TaskEnvelope


class ChatCPT2Adapter(BaseCoreAdapter):
    """Heavier reasoning core that excels at contextual trades."""

    def __init__(self) -> None:
        super().__init__(name="core1_chatcpt2")

    def score_task(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> float:
        volatility = float(context.get("volatility", 0.0))
        return float(context.get("confidence_hint", 0.0)) + (0.2 if volatility < 0.4 else -0.1)

    def run(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> CoreDecision:
        intent = envelope.intent.upper()
        action = "BUY" if intent == "ACCUMULATE" else "SELL" if intent == "DISTRIBUTE" else "HOLD"
        rationale = (
            "Synthesised momentum, treasury posture, and macro rationale for a governed decision."
        )
        confidence = max(0.4, min(0.95, float(context.get("confidence_hint", 0.6)) + 0.1))
        return CoreDecision(action=action, confidence=confidence, rationale=rationale)
