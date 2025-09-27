"""Token treasury logic reacting to trading performance."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


SUCCESS_RETCODE = 10009


@dataclass
class TreasuryEvent:
    """Structured record of treasury actions following a trade."""

    burned: float
    rewards_distributed: float
    profit_retained: float
    policy_buyback: float
    policy_burn: float
    policy_spread_target_bps: Optional[float]
    policy_regime: str
    policy_notes: List[str] = field(default_factory=list)


class DynamicTreasuryAlgo:
    """Adjust token flows based on trade outcomes."""

    def __init__(
        self,
        starting_balance: float = 100_000.0,
        *,
        policy_engine: Optional["PolicyEngine"] = None,
    ) -> None:
        self.treasury_balance = starting_balance
        from dynamic_token.policy_engine import PolicyEngine  # Local import avoids cycle

        self.policy_engine = policy_engine or PolicyEngine()

    def update_from_trade(
        self, trade_result: Optional[object], market_context: Optional[Dict[str, Any]] = None
    ) -> Optional[TreasuryEvent]:
        if not trade_result or getattr(trade_result, "retcode", None) != SUCCESS_RETCODE:
            decision = self._evaluate_policy(market_context)
            return TreasuryEvent(
                burned=0.0,
                rewards_distributed=0.0,
                profit_retained=0.0,
                policy_buyback=decision.buyback,
                policy_burn=decision.burn,
                policy_spread_target_bps=decision.spread_target_bps,
                policy_regime=decision.regime,
                policy_notes=list(decision.notes),
            )

        profit = float(getattr(trade_result, "profit", 0.0))
        burn_amount = 0.0
        rewards_amount = 0.0
        retained = 0.0
        if profit > 0:
            burn_amount = round(profit * 0.2, 2)
            rewards_amount = round(profit * 0.3, 2)
            retained = round(profit - burn_amount - rewards_amount, 2)

        prospective_balance = self.treasury_balance + retained
        decision = self._evaluate_policy(market_context, balance_override=prospective_balance)

        self.treasury_balance = prospective_balance

        total_burn = burn_amount + decision.burn
        if total_burn > 0:
            self.buy_and_burn(total_burn)
        if rewards_amount > 0:
            self.distribute_rewards(rewards_amount)
        if decision.buyback > 0:
            self.schedule_buyback(decision.buyback)
        if decision.spread_target_bps is not None:
            self.adjust_market_making_spread(decision.spread_target_bps)

        return TreasuryEvent(
            burned=total_burn,
            rewards_distributed=rewards_amount,
            profit_retained=retained,
            policy_buyback=decision.buyback,
            policy_burn=decision.burn,
            policy_spread_target_bps=decision.spread_target_bps,
            policy_regime=decision.regime,
            policy_notes=list(decision.notes),
        )

    def buy_and_burn(self, amount: float) -> None:
        print(f"🔥 Burning DCT worth {amount} from treasury")

    def distribute_rewards(self, amount: float) -> None:
        print(f"💰 Distributing {amount} DCT as rewards to stakers")

    def schedule_buyback(self, amount: float) -> None:
        print(f"🛒 Scheduling buyback programme for {amount} DCT")

    def adjust_market_making_spread(self, target_bps: float) -> None:
        print(f"⚙️ Adjusting DMM spread target to {target_bps} bps")

    def _evaluate_policy(
        self, market_context: Optional[Dict[str, Any]], *, balance_override: Optional[float] = None
    ) -> "PolicyDecision":
        from dynamic_token.policy_engine import PolicyDecision

        context = market_context or {}
        lorentzian = context.get("lorentzian") or {}
        score = float(lorentzian.get("score", 0.0))
        volatility = float(context.get("volatility", 0.0))
        twap_deviation = float(context.get("twap_deviation", 0.0))

        balance = balance_override if balance_override is not None else self.treasury_balance
        return self.policy_engine.evaluate(
            score=score,
            volatility=volatility,
            treasury_balance=balance,
            twap_deviation=twap_deviation,
        )
