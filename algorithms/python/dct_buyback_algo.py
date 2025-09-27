"""Treasury-aware buyback planner for the Dynamic Capital Token (DCT)."""

from __future__ import annotations

from dataclasses import dataclass, field
from math import ceil
from typing import Sequence, Tuple

__all__ = [
    "DCTBuybackInputs",
    "DCTBuybackTranche",
    "DCTBuybackPlan",
    "DynamicDCTBuybackAlgorithm",
]


def _clamp(value: float, *, lower: float, upper: float) -> float:
    """Return ``value`` constrained to the inclusive ``[lower, upper]`` range."""

    return max(lower, min(upper, value))


def _safe_mean(values: Sequence[float], *, default: float = 0.0) -> float:
    """Return the arithmetic mean of ``values`` with a fallback ``default``."""

    filtered = [float(value) for value in values if value is not None]
    if not filtered:
        return default
    return sum(filtered) / len(filtered)


def _safe_divide(numerator: float, denominator: float) -> float:
    """Return ``numerator / denominator`` while guarding against divide-by-zero."""

    if denominator == 0:
        return 0.0
    return numerator / denominator


def _filter_positive(values: Sequence[float]) -> Tuple[float, ...]:
    """Return positive floats extracted from ``values``."""

    return tuple(float(value) for value in values if float(value) > 0)


@dataclass(slots=True)
class DCTBuybackInputs:
    """Inputs describing the state of treasury, market, and performance data."""

    treasury_nav: float
    liquid_reserves: float
    monthly_profit: float
    penalty_fees: float
    circulating_supply: float
    spot_price: float
    price_history: Sequence[float] = field(default_factory=tuple)
    roi_history: Sequence[float] = field(default_factory=tuple)
    buyback_allocation_pct: float = 0.3
    penalty_burn_pct: float = 0.5
    max_buyback_pct_of_profit: float = 0.5
    accelerate_threshold: float = 0.95
    tranche_size_usd: float = 25_000.0
    max_tranches: int = 6
    minimum_tranche_usd: float = 7_500.0

    def validate(self) -> None:
        if self.treasury_nav < 0:
            raise ValueError("treasury_nav cannot be negative")
        if self.liquid_reserves < 0:
            raise ValueError("liquid_reserves cannot be negative")
        if self.circulating_supply <= 0:
            raise ValueError("circulating_supply must be positive")
        if self.spot_price <= 0:
            raise ValueError("spot_price must be positive")
        if not 0 <= self.buyback_allocation_pct <= 1:
            raise ValueError("buyback_allocation_pct must be between 0 and 1")
        if not 0 <= self.penalty_burn_pct <= 1:
            raise ValueError("penalty_burn_pct must be between 0 and 1")
        if not 0 <= self.max_buyback_pct_of_profit <= 1:
            raise ValueError("max_buyback_pct_of_profit must be between 0 and 1")
        if not 0 < self.accelerate_threshold <= 1:
            raise ValueError("accelerate_threshold must be between 0 and 1")
        if self.tranche_size_usd <= 0:
            raise ValueError("tranche_size_usd must be positive")
        if self.max_tranches <= 0:
            raise ValueError("max_tranches must be positive")
        if self.minimum_tranche_usd <= 0:
            raise ValueError("minimum_tranche_usd must be positive")


@dataclass(slots=True)
class DCTBuybackTranche:
    """Represents a scheduled buyback slice for TWAP-style execution."""

    amount_usd: float
    delay_minutes: int


@dataclass(slots=True)
class DCTBuybackPlan:
    """Result of a buyback planning run."""

    buyback_budget_usd: float
    accelerated_budget_usd: float
    total_buyback_usd: float
    penalty_contribution_usd: float
    expected_burn_dct: float
    floor_price: float
    performance_scalar: float
    should_accelerate: bool
    price_discount: float
    tranches: Tuple[DCTBuybackTranche, ...]
    reserves_after_execution: float
    notes: Tuple[str, ...] = field(default_factory=tuple)


class DynamicDCTBuybackAlgorithm:
    """Generate structured buyback plans from treasury and market data."""

    def generate_plan(self, inputs: DCTBuybackInputs) -> DCTBuybackPlan:
        """Return a :class:`DCTBuybackPlan` for the provided ``inputs``."""

        inputs.validate()

        positive_profit = max(inputs.monthly_profit, 0.0)
        positive_penalties = max(inputs.penalty_fees, 0.0)

        floor_price = _safe_divide(inputs.treasury_nav, inputs.circulating_supply)

        history = _filter_positive(inputs.price_history)
        average_price = history[-30:]  # enforce a rolling window if long sequences
        average_price = _safe_mean(average_price, default=inputs.spot_price)

        price_discount = 0.0
        if average_price > 0:
            price_discount = max(0.0, (average_price - inputs.spot_price) / average_price)

        floor_gap = 0.0
        if floor_price > 0:
            floor_gap = max(0.0, (floor_price - inputs.spot_price) / floor_price)

        should_accelerate = (
            inputs.spot_price <= floor_price * inputs.accelerate_threshold
            or price_discount >= 0.1
        )

        avg_roi = _safe_mean(inputs.roi_history, default=0.0)
        performance_scalar = _clamp(1.0 + avg_roi, lower=0.5, upper=1.5)

        base_budget = positive_profit * inputs.buyback_allocation_pct * performance_scalar
        max_budget_cap = positive_profit * inputs.max_buyback_pct_of_profit
        if max_budget_cap:
            base_budget = min(base_budget, max_budget_cap)
        base_budget = min(base_budget, inputs.liquid_reserves)
        base_budget = max(base_budget, 0.0)

        penalty_contribution = positive_penalties * inputs.penalty_burn_pct

        accelerated_budget = 0.0
        if should_accelerate and inputs.liquid_reserves > 0:
            available_buffer = max(inputs.liquid_reserves - base_budget, 0.0)
            if available_buffer > 0:
                intensity = _clamp(max(price_discount, floor_gap), lower=0.05, upper=0.5)
                accelerated_budget = min(
                    available_buffer,
                    base_budget * intensity + available_buffer * (intensity * 0.35),
                )

        total_buyback = min(base_budget + accelerated_budget, inputs.liquid_reserves)
        if total_buyback < base_budget:
            base_budget = total_buyback
            accelerated_budget = 0.0
        else:
            accelerated_budget = max(0.0, total_buyback - base_budget)

        tranches = self._build_tranches(
            total_buyback,
            inputs,
            should_accelerate=should_accelerate,
            intensity=max(price_discount, floor_gap),
        )

        expected_burn_dct = _safe_divide(total_buyback + penalty_contribution, inputs.spot_price)
        reserves_after_execution = max(inputs.liquid_reserves - total_buyback, 0.0)

        notes: list[str] = []
        if total_buyback <= 0:
            notes.append("No buyback allocation generated; carry profits forward.")
        else:
            notes.append(
                f"Deploy ${total_buyback:,.0f} across {len(tranches)} tranche(s) with TWAP execution."
            )
        if accelerated_budget > 0:
            notes.append("Accelerated programme activated due to market discount below floor.")
        if performance_scalar > 1.05:
            notes.append("Above-trend performance boosted the allocation envelope.")
        elif performance_scalar < 0.95:
            notes.append("Subdued performance reduced the allocation envelope.")
        if penalty_contribution > 0:
            notes.append("Penalty fees diverted to burn wallet alongside buybacks.")

        return DCTBuybackPlan(
            buyback_budget_usd=base_budget,
            accelerated_budget_usd=accelerated_budget,
            total_buyback_usd=total_buyback,
            penalty_contribution_usd=penalty_contribution,
            expected_burn_dct=expected_burn_dct,
            floor_price=floor_price,
            performance_scalar=performance_scalar,
            should_accelerate=should_accelerate,
            price_discount=price_discount,
            tranches=tranches,
            reserves_after_execution=reserves_after_execution,
            notes=tuple(notes),
        )

    def _build_tranches(
        self,
        total_buyback: float,
        inputs: DCTBuybackInputs,
        *,
        should_accelerate: bool,
        intensity: float,
    ) -> Tuple[DCTBuybackTranche, ...]:
        if total_buyback <= 0:
            return tuple()

        min_tranche = max(inputs.minimum_tranche_usd, 0.0)
        tranche_size = max(inputs.tranche_size_usd, min_tranche)

        if total_buyback <= min_tranche:
            return (DCTBuybackTranche(amount_usd=total_buyback, delay_minutes=0),)

        tranche_count = max(1, ceil(total_buyback / tranche_size))
        tranche_count = min(tranche_count, int(inputs.max_tranches))

        if tranche_count == 1:
            return (DCTBuybackTranche(amount_usd=total_buyback, delay_minutes=0),)

        weights: list[float] = []
        for index in range(tranche_count):
            if should_accelerate and tranche_count > 1:
                # Front-load allocation when trading at a discount to the floor.
                scale = 1.0 + intensity * (tranche_count - index - 1) / (tranche_count - 1)
            else:
                scale = 1.0
            weights.append(scale)

        weight_sum = sum(weights)
        if weight_sum == 0:
            weights = [1.0] * tranche_count
            weight_sum = float(tranche_count)

        schedule: list[DCTBuybackTranche] = []
        remaining = total_buyback
        cadence = 30 if should_accelerate else 45

        for index, weight in enumerate(weights):
            if index == tranche_count - 1:
                amount = remaining
            else:
                amount = total_buyback * (weight / weight_sum)
                amount = min(amount, remaining)
                remaining -= amount

            delay = cadence * index
            schedule.append(DCTBuybackTranche(amount_usd=amount, delay_minutes=delay))

        return tuple(schedule)
