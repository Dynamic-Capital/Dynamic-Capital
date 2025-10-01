"""Token treasury logic reacting to trading performance."""

from __future__ import annotations

from dataclasses import dataclass, field
from math import isfinite
from typing import Optional, Tuple


SUCCESS_RETCODE = 10009


@dataclass(slots=True)
class TreasuryEvent:
    """Structured record of treasury actions following a trade."""

    burned: float
    rewards_distributed: float
    profit_retained: float
    loss_covered: float = 0.0
    notes: Tuple[str, ...] = field(default_factory=tuple)


class DynamicTreasuryAlgo:
    """Adjust token flows based on trade outcomes."""

    def __init__(
        self,
        starting_balance: float = 100_000.0,
        *,
        burn_share: float = 0.2,
        reward_share: float = 0.3,
    ) -> None:
        self.treasury_balance = self._round_currency(starting_balance)
        self.configure_distribution(burn_share=burn_share, reward_share=reward_share)

    @staticmethod
    def _round_currency(value: float) -> float:
        return round(float(value) + 1e-9, 2)

    @staticmethod
    def _coerce_share(value: float, name: str) -> float:
        share = float(value)
        if not isfinite(share) or share < 0 or share > 1:
            raise ValueError(f"{name} must be between 0 and 1")
        return share

    def configure_distribution(self, *, burn_share: float, reward_share: float) -> None:
        """Update burn/reward distribution shares."""

        burn = self._coerce_share(burn_share, "burn_share")
        reward = self._coerce_share(reward_share, "reward_share")
        if burn + reward >= 1:
            raise ValueError("burn_share + reward_share must be less than 1")
        self._burn_share = burn
        self._reward_share = reward
        self._retain_share = 1 - burn - reward

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

        if not isfinite(profit) or profit == 0:
            return None

        notes: list[str] = []

        if profit > 0:
            burn_amount = self._round_currency(profit * self._burn_share)
            rewards_amount = self._round_currency(profit * self._reward_share)
            retained = self._round_currency(profit * self._retain_share)

            distributed_total = burn_amount + rewards_amount + retained
            discrepancy = self._round_currency(profit - distributed_total)
            if abs(discrepancy) >= 0.01:
                retained = self._round_currency(retained + discrepancy)
                if retained < 0:
                    retained = 0.0
                notes.append(
                    f"Rounding adjustment applied ({discrepancy:+.2f} DCT) to retained amount."
                )

            if burn_amount > 0:
                self.buy_and_burn(burn_amount)
            if rewards_amount > 0:
                self.distribute_rewards(rewards_amount)

            if retained > 0:
                self.treasury_balance = self._round_currency(
                    self.treasury_balance + retained
                )

            return TreasuryEvent(
                burned=burn_amount,
                rewards_distributed=rewards_amount,
                profit_retained=retained,
                notes=tuple(notes),
            )

        loss = abs(profit)
        loss = self._round_currency(loss)
        coverage = min(loss, self.treasury_balance)
        coverage = self._round_currency(coverage)

        if coverage > 0:
            self.treasury_balance = self._round_currency(self.treasury_balance - coverage)
            self.absorb_loss(coverage)

        if coverage < loss:
            shortfall = self._round_currency(loss - coverage)
            notes.append(
                f"Loss exceeded treasury reserves by {shortfall:.2f} DCT"
            )

        return TreasuryEvent(
            burned=0.0,
            rewards_distributed=0.0,
            profit_retained=0.0,
            loss_covered=coverage,
            notes=tuple(notes),
        )

    def buy_and_burn(self, amount: float) -> None:
        if amount <= 0:
            return
        print(f"🔥 Burning DCT worth {amount} from treasury")

    def distribute_rewards(self, amount: float) -> None:
        if amount <= 0:
            return
        print(f"💰 Distributing {amount} DCT as rewards to stakers")

    def absorb_loss(self, amount: float) -> None:
        if amount <= 0:
            return
        print(f"🛡️ Absorbing {amount} DCT loss from treasury reserves")
