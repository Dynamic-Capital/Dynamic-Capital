"""Risk management utilities for Dynamic AI."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class RiskParameters:
    """Configuration controlling the risk guardrails."""

    max_daily_drawdown: float = 0.08
    treasury_utilisation_cap: float = 0.6
    circuit_breaker_drawdown: float = 0.12


@dataclass
class RiskContext:
    """Current risk state derived from telemetry."""

    daily_drawdown: float = 0.0
    treasury_utilisation: float = 0.0
    treasury_health: float = 1.0
    volatility: float = 0.0


@dataclass
class PositionSizing:
    """Output of the sizing heuristic."""

    notional: float
    leverage: float
    notes: str


class RiskManager:
    """Apply guardrails to signals and produce sizing guidance."""

    def __init__(self, params: RiskParameters | None = None) -> None:
        self.params = params or RiskParameters()

    def enforce(self, signal: Dict[str, Any], context: RiskContext) -> Dict[str, Any]:
        """Adjust the fused signal if guardrails are violated."""

        adjusted = dict(signal)
        notes: list[str] = []

        if context.daily_drawdown <= -abs(self.params.circuit_breaker_drawdown):
            adjusted["action"] = "NEUTRAL"
            adjusted["confidence"] = min(adjusted.get("confidence", 0.0), 0.2)
            adjusted["circuit_breaker"] = True
            notes.append("Circuit breaker triggered due to drawdown.")
            return self._finalise(adjusted, notes)

        if context.daily_drawdown <= -abs(self.params.max_daily_drawdown):
            adjusted["confidence"] = min(adjusted.get("confidence", 0.0), 0.4)
            notes.append("Confidence clipped by daily drawdown guardrail.")

        if context.treasury_utilisation >= self.params.treasury_utilisation_cap:
            adjusted["action"] = "NEUTRAL"
            notes.append("Treasury utilisation above cap; pausing new risk.")

        adjusted["risk_notes"] = notes
        return adjusted

    def sizing(self, context: RiskContext, *, confidence: float, volatility: float) -> PositionSizing:
        """Derive position sizing based on confidence and volatility."""

        base_notional = max(0.0, confidence - 0.2) * context.treasury_health
        volatility_penalty = max(0.2, min(1.0, 1.0 - volatility))
        treasury_modifier = max(0.1, min(1.0, 1.0 - context.treasury_utilisation))

        notional = base_notional * volatility_penalty * treasury_modifier
        leverage = min(3.0, 1.0 + confidence * 2 * volatility_penalty)

        notes = "Sizing adjusted for volatility and treasury health."
        return PositionSizing(notional=round(notional, 4), leverage=round(leverage, 2), notes=notes)

    @staticmethod
    def _finalise(signal: Dict[str, Any], notes: list[str]) -> Dict[str, Any]:
        signal["risk_notes"] = notes
        return signal
