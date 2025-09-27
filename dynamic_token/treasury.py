"""Token treasury logic reacting to trading performance."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


SUCCESS_RETCODE = 10009


@dataclass
class TreasuryEvent:
    """Structured record of treasury actions following a trade."""

    burned: float
    rewards_distributed: float
    profit_retained: float


class DynamicTreasuryAlgo:
    """Adjust token flows based on trade outcomes."""

    def __init__(self, starting_balance: float = 100_000.0) -> None:
        self.treasury_balance = starting_balance

    def update_from_trade(self, trade_result: Optional[object]) -> Optional[TreasuryEvent]:
        if not trade_result or getattr(trade_result, "retcode", None) != SUCCESS_RETCODE:
            return None

        raw_profit = getattr(trade_result, "profit", 0.0)
        if raw_profit in (None, ""):
            return None

        try:
            profit = float(raw_profit)
        except (TypeError, ValueError):
            return None

        if profit <= 0:
            return None

        burn_amount = round(profit * 0.2, 2)
        rewards_amount = round(profit * 0.3, 2)
        retained = round(profit - burn_amount - rewards_amount, 2)

        self.treasury_balance += retained

        self.buy_and_burn(burn_amount)
        self.distribute_rewards(rewards_amount)

        return TreasuryEvent(
            burned=burn_amount,
            rewards_distributed=rewards_amount,
            profit_retained=retained,
        )

    def buy_and_burn(self, amount: float) -> None:
        print(f"🔥 Burning DCT worth {amount} from treasury")

    def distribute_rewards(self, amount: float) -> None:
        print(f"💰 Distributing {amount} DCT as rewards to stakers")
