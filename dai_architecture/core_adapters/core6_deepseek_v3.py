"""DeepSeek-V3 adapter — extended-context macro researcher."""

from __future__ import annotations

from typing import Any, Mapping

from .base import BaseCoreAdapter, CoreDecision
from ..io_bus.schema import TaskEnvelope


class DeepSeekV3Adapter(BaseCoreAdapter):
    """Explores macro hypotheses before recommending shifts."""

    def __init__(self) -> None:
        super().__init__(name="core6_deepseek_v3")

    def score_task(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> float:
        hypothesis = float(context.get("analysis_depth", 0.6))
        macro = float(context.get("macro_signal", 0.4))
        treasury = float(context.get("treasury_health", 0.6))
        return 0.6 * hypothesis + 0.25 * macro + 0.15 * treasury

    def run(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> CoreDecision:
        momentum = float(context.get("momentum", 0.5))
        macro = float(context.get("macro_signal", 0.4))
        action = "HOLD"
        if momentum > 0.6 or macro > 0.55:
            action = "BUY"
        elif momentum < 0.4 and macro < 0.45:
            action = "SELL"
        rationale = "Macro researcher evaluates extended context to reinforce or counter prevailing bias."
        hypothesis = float(context.get("analysis_depth", 0.6))
        base_confidence = 0.5 + 0.1 * (hypothesis - 0.5) + 0.05 * (momentum - 0.5)
        confidence = max(0.38, min(0.88, base_confidence))
        return CoreDecision(action=action, confidence=confidence, rationale=rationale)
