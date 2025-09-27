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
    max_leverage: float = 3.0


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


@dataclass
class LeverageGuidance:
    """Recommended leverage band together with explanatory notes."""

    leverage: float
    band: str
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
        leverage = min(self.params.max_leverage, 1.0 + confidence * 2 * volatility_penalty)

        notes = "Sizing adjusted for volatility and treasury health."
        return PositionSizing(notional=round(notional, 4), leverage=round(leverage, 2), notes=notes)

    def dynamic_leverage(
        self,
        context: RiskContext,
        *,
        confidence: float,
        regime_bias: float = 0.0,
    ) -> LeverageGuidance:
        """Suggest a leverage level that reacts to risk telemetry.

        The heuristic starts from a confidence-led baseline and then applies
        penalties or boosts for treasury utilisation, drawdowns, volatility and
        optional regime bias (e.g. macro overlay in the range [-1, 1]).
        """

        notes: list[str] = []

        # Baseline scales with confidence while favouring conservative gearing.
        baseline = 1.0 + max(0.0, confidence - 0.3) * 1.6
        notes.append(f"Baseline leverage derived from confidence ({confidence:.2f}).")

        leverage = baseline

        if context.daily_drawdown < 0:
            # Penalty grows as drawdown approaches the circuit breaker.
            circuit = max(self.params.circuit_breaker_drawdown, 1e-6)
            stress_ratio = min(1.0, abs(context.daily_drawdown) / circuit)
            drawdown_penalty = 0.8 * stress_ratio
            leverage -= drawdown_penalty
            notes.append(
                f"Drawdown pressure reduced leverage by {drawdown_penalty:.2f} "
                f"(drawdown {context.daily_drawdown:.2%})."
            )

        if context.treasury_utilisation > 0:
            utilisation_penalty = min(0.7, context.treasury_utilisation * 0.9)
            leverage -= utilisation_penalty
            notes.append(
                f"Treasury utilisation penalty applied ({context.treasury_utilisation:.2f})."
            )

        if context.treasury_health < 1.0:
            health_penalty = min(0.6, (1.0 - context.treasury_health) * 1.2)
            leverage -= health_penalty
            notes.append(f"Treasury health below par reduced leverage by {health_penalty:.2f}.")
        elif context.treasury_health > 1.2:
            health_boost = min(0.4, (context.treasury_health - 1.2) * 0.8)
            leverage += health_boost
            notes.append(f"Robust treasury health added a boost of {health_boost:.2f}.")

        volatility = context.volatility
        if volatility > 0:
            if volatility >= 0.7:
                vol_penalty = min(0.9, (volatility - 0.7) * 1.2 + 0.2)
                leverage -= vol_penalty
                notes.append(
                    f"Elevated volatility penalty applied reducing leverage by {vol_penalty:.2f}."
                )
            elif volatility <= 0.3:
                vol_boost = min(0.3, (0.3 - volatility) * 0.6)
                leverage += vol_boost
                notes.append(f"Low volatility environment boosted leverage by {vol_boost:.2f}.")

        if regime_bias:
            leverage += max(-0.5, min(0.5, regime_bias * 0.5))
            notes.append(f"Regime bias adjustment of {regime_bias:.2f} applied.")

        leverage = max(0.5, min(self.params.max_leverage, leverage))

        if leverage <= 1.1:
            band = "capital_preservation"
        elif leverage <= 1.6:
            band = "balanced"
        elif leverage <= 2.3:
            band = "growth"
        else:
            band = "aggressive"

        if leverage == self.params.max_leverage:
            notes.append("Leverage capped by risk parameters.")

        guidance_notes = " ".join(notes)
        return LeverageGuidance(leverage=round(leverage, 2), band=band, notes=guidance_notes)

    @staticmethod
    def _finalise(signal: Dict[str, Any], notes: list[str]) -> Dict[str, Any]:
        signal["risk_notes"] = notes
        return signal
