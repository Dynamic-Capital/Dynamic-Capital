"""DeepSeek R1 adapter — deterministic planner and tool integrator."""

from __future__ import annotations

from typing import Any, Mapping

from .base import BaseCoreAdapter, CoreDecision
from ..io_bus.schema import TaskEnvelope


class DeepSeekR1Adapter(BaseCoreAdapter):
    """Runs structured planning loops with tool feedback."""

    def __init__(self) -> None:
        super().__init__(name="core7_deepseek_r1")

    def score_task(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> float:
        simulation_need = float(context.get("simulation_need", 0.35))
        tool_confidence = float(context.get("tool_confidence", 0.55))
        return 0.6 * simulation_need + 0.4 * tool_confidence

    def run(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> CoreDecision:
        market = context.get("market", {})
        direction = str(market.get("direction", context.get("direction", "neutral"))).upper()
        execution_ready = bool(context.get("execution_ready", False))
        action = "HOLD"
        if execution_ready:
            action = "BUY" if direction == "BULLISH" else "SELL" if direction == "BEARISH" else "HOLD"
        elif direction == "BEARISH":
            action = "SELL"
        rationale = "Deterministic planner integrates tool telemetry before approving execution paths."
        simulation_need = float(context.get("simulation_need", 0.35))
        base_confidence = 0.42 + 0.2 * simulation_need + 0.05 * float(context.get("tool_confidence", 0.55))
        confidence = max(0.36, min(0.8, base_confidence))
        return CoreDecision(action=action, confidence=confidence, rationale=rationale)
