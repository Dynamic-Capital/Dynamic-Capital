"""Policy engine coordinating treasury actions based on Lorentzian regimes."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass(slots=True)
class PolicyDecision:
    """Structured decision describing treasury actions for the current regime."""

    regime: str
    buyback: float = 0.0
    burn: float = 0.0
    spread_target_bps: Optional[float] = None
    notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, object]:
        payload: Dict[str, object] = {
            "regime": self.regime,
            "buyback": round(self.buyback, 2),
            "burn": round(self.burn, 2),
            "spread_target_bps": self.spread_target_bps,
        }
        if self.notes:
            payload["notes"] = list(self.notes)
        return payload


class PolicyEngine:
    """Decide when to trigger buybacks, burns, or spread adjustments."""

    def __init__(
        self,
        *,
        buyback_budget: float = 10_000.0,
        max_burn_share: float = 0.02,
        quiet_vol_threshold: float = 0.015,
        stress_threshold: float = 3.0,
        calm_threshold: float = 1.0,
        base_spread_bps: float = 12.0,
        tight_spread_bps: float = 6.0,
    ) -> None:
        self.buyback_budget = float(buyback_budget)
        self.max_burn_share = float(max_burn_share)
        self.quiet_vol_threshold = float(quiet_vol_threshold)
        self.stress_threshold = float(stress_threshold)
        self.calm_threshold = float(calm_threshold)
        self.base_spread_bps = float(base_spread_bps)
        self.tight_spread_bps = float(tight_spread_bps)

    def evaluate(
        self,
        *,
        score: float,
        volatility: float,
        treasury_balance: float,
        twap_deviation: float = 0.0,
    ) -> PolicyDecision:
        magnitude = abs(score)
        regime = "calm"
        if magnitude >= self.stress_threshold:
            regime = "stressed"
        elif magnitude > self.calm_threshold:
            regime = "transition"

        decision = PolicyDecision(regime=regime)

        if regime == "stressed" and twap_deviation < 0:
            deviation_ratio = min(1.0, abs(twap_deviation))
            decision.buyback = round(min(self.buyback_budget, deviation_ratio * self.buyback_budget), 2)
            decision.notes.append("TWAP deviation negative – scheduling buybacks")

        if regime in {"calm", "transition"} and treasury_balance > 0:
            burn_amount = treasury_balance * self.max_burn_share
            decision.burn = round(burn_amount, 2)
            if burn_amount > 0:
                decision.notes.append("Treasury surplus earmarked for burns")

        if regime == "calm" and volatility <= self.quiet_vol_threshold:
            decision.spread_target_bps = self.tight_spread_bps
            decision.notes.append("Quiet regime – tightening spreads")
        else:
            decision.spread_target_bps = self.base_spread_bps

        return decision


__all__ = ["PolicyDecision", "PolicyEngine"]
