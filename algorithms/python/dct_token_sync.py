"""DCT pricing, allocation, and synchronisation utilities."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Mapping, MutableSequence, Sequence

from .supabase_sync import SupabaseTableWriter

__all__ = [
    "DCTPriceInputs",
    "DCTPriceBreakdown",
    "DCTPriceCalculator",
    "DCTProductionInputs",
    "DCTProductionPlan",
    "DCTProductionPlanner",
    "DCTAllocationRule",
    "DCTAllocationResult",
    "DCTAllocationEngine",
    "DCTMarketSnapshot",
    "DCTSyncJob",
]


def _clamp(value: float, *, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _safe_divide(numerator: float, denominator: float) -> float:
    if denominator == 0:
        return 0.0
    return numerator / denominator


@dataclass(slots=True)
class DCTPriceInputs:
    """Raw market indicators used to derive the live DCT price."""

    ton_price_usd: float
    trailing_ton_price_usd: float
    demand_index: float
    performance_index: float
    volatility_index: float
    policy_adjustment: float = 0.0


@dataclass(slots=True)
class DCTPriceBreakdown:
    """Breakdown of the calculated DCT price."""

    base_price: float
    ton_component: float
    demand_component: float
    performance_component: float
    volatility_penalty: float
    policy_adjustment: float
    final_price: float

    def to_dict(self) -> Mapping[str, float]:
        return {
            "base_price": self.base_price,
            "ton_component": self.ton_component,
            "demand_component": self.demand_component,
            "performance_component": self.performance_component,
            "volatility_penalty": self.volatility_penalty,
            "policy_adjustment": self.policy_adjustment,
            "final_price": self.final_price,
        }


@dataclass(slots=True)
class DCTPriceCalculator:
    """Derives a stable DCT price anchored to treasury and usage metrics."""

    baseline_price: float = 1.0
    ton_weight: float = 0.35
    demand_weight: float = 0.25
    performance_weight: float = 0.25
    volatility_weight: float = 0.15
    policy_sensitivity: float = 0.05
    min_price: float = 0.75
    max_price: float = 2.5
    volatility_floor: float = 0.2

    def compute(self, inputs: DCTPriceInputs) -> DCTPriceBreakdown:
        trailing = max(inputs.trailing_ton_price_usd, 0.0)
        ton_delta = _safe_divide(inputs.ton_price_usd - trailing, trailing)
        ton_component = self.baseline_price * self.ton_weight * ton_delta

        demand_normalised = (inputs.demand_index - 0.5) * 2.0
        demand_component = self.baseline_price * self.demand_weight * demand_normalised

        performance_normalised = (inputs.performance_index - 0.5) * 2.0
        performance_component = self.baseline_price * self.performance_weight * performance_normalised

        volatility_excess = max(0.0, inputs.volatility_index - self.volatility_floor)
        volatility_penalty = self.baseline_price * self.volatility_weight * volatility_excess

        policy_adjustment = self.baseline_price * self.policy_sensitivity * inputs.policy_adjustment

        provisional = (
            self.baseline_price
            + ton_component
            + demand_component
            + performance_component
            - volatility_penalty
            + policy_adjustment
        )
        final_price = _clamp(provisional, lower=self.min_price, upper=self.max_price)
        return DCTPriceBreakdown(
            base_price=self.baseline_price,
            ton_component=ton_component,
            demand_component=demand_component,
            performance_component=performance_component,
            volatility_penalty=volatility_penalty,
            policy_adjustment=policy_adjustment,
            final_price=final_price,
        )


@dataclass(slots=True)
class DCTProductionInputs:
    """Inputs required to determine DCT emissions for an epoch."""

    usd_budget: float
    circulating_supply: float
    previous_epoch_mint: float
    buffer_ratio: float = 0.05
    max_emission: float | None = None


@dataclass(slots=True)
class DCTProductionPlan:
    """Detailed DCT production schedule for the next epoch."""

    target_mint: float
    buffered_mint: float
    smoothed_mint: float
    final_mint: float
    cap: float
    cap_applied: bool

    def to_dict(self) -> Mapping[str, float | bool]:
        return {
            "target_mint": self.target_mint,
            "buffered_mint": self.buffered_mint,
            "smoothed_mint": self.smoothed_mint,
            "final_mint": self.final_mint,
            "cap": self.cap,
            "cap_applied": self.cap_applied,
        }


@dataclass(slots=True)
class DCTProductionPlanner:
    """Plans emissions to keep DCT supply growth predictable."""

    emission_cap_ratio: float = 0.04
    smoothing_factor: float = 0.65

    def plan(self, inputs: DCTProductionInputs, final_price: float) -> DCTProductionPlan:
        final_price = max(final_price, 0.01)
        target_mint = max(0.0, inputs.usd_budget) / final_price
        buffered_mint = target_mint * (1.0 + max(0.0, inputs.buffer_ratio))

        previous = max(0.0, inputs.previous_epoch_mint)
        smoothed_mint = (buffered_mint * self.smoothing_factor) + (
            previous * (1.0 - self.smoothing_factor)
        )

        cap = inputs.max_emission
        if cap is None:
            cap = max(0.0, inputs.circulating_supply * self.emission_cap_ratio)
        else:
            cap = max(0.0, cap)

        final_mint = min(smoothed_mint, cap) if cap > 0 else smoothed_mint
        cap_applied = final_mint < smoothed_mint
        return DCTProductionPlan(
            target_mint=target_mint,
            buffered_mint=buffered_mint,
            smoothed_mint=smoothed_mint,
            final_mint=final_mint,
            cap=cap,
            cap_applied=cap_applied,
        )


@dataclass(slots=True)
class DCTAllocationRule:
    """Rule for distributing DCT across protocol initiatives."""

    label: str
    weight: float
    multiplier: float = 1.0
    member_count: int | None = None
    min_allocation: float = 0.0


@dataclass(slots=True)
class DCTAllocationResult:
    """Result of applying an allocation rule."""

    label: str
    weight: float
    base_allocation: float
    multiplier: float
    adjusted_allocation: float
    member_count: int | None
    per_member: float | None

    def to_dict(self) -> Mapping[str, float | int | None]:
        return {
            "label": self.label,
            "weight": self.weight,
            "base_allocation": self.base_allocation,
            "multiplier": self.multiplier,
            "adjusted_allocation": self.adjusted_allocation,
            "member_count": self.member_count,
            "per_member": self.per_member,
        }


@dataclass(slots=True)
class DCTAllocationEngine:
    """Applies allocation rules to a production plan."""

    rules: Sequence[DCTAllocationRule]

    def distribute(self, total_dct: float) -> List[DCTAllocationResult]:
        total_dct = max(0.0, total_dct)
        weight_total = sum(rule.weight for rule in self.rules if rule.weight > 0)
        results: MutableSequence[DCTAllocationResult] = []
        if weight_total <= 0:
            return list(results)

        for rule in self.rules:
            weight_share = rule.weight / weight_total
            base_allocation = max(rule.min_allocation, total_dct * weight_share)
            adjusted_allocation = base_allocation * max(rule.multiplier, 0.0)
            per_member = None
            if rule.member_count and rule.member_count > 0:
                per_member = adjusted_allocation / rule.member_count
            results.append(
                DCTAllocationResult(
                    label=rule.label,
                    weight=rule.weight,
                    base_allocation=base_allocation,
                    multiplier=rule.multiplier,
                    adjusted_allocation=adjusted_allocation,
                    member_count=rule.member_count,
                    per_member=per_member,
                )
            )
        return list(results)


@dataclass(slots=True)
class DCTMarketSnapshot:
    """Captured market state used by the synchronisation job."""

    as_of: datetime
    ton_price_usd: float
    trailing_ton_price_usd: float
    demand_index: float
    performance_index: float
    volatility_index: float
    policy_adjustment: float
    usd_reward_budget: float
    previous_epoch_mint: float
    circulating_supply: float
    buffer_ratio: float = 0.05
    max_emission: float | None = None

    def price_inputs(self) -> DCTPriceInputs:
        return DCTPriceInputs(
            ton_price_usd=self.ton_price_usd,
            trailing_ton_price_usd=self.trailing_ton_price_usd,
            demand_index=self.demand_index,
            performance_index=self.performance_index,
            volatility_index=self.volatility_index,
            policy_adjustment=self.policy_adjustment,
        )

    def production_inputs(self) -> DCTProductionInputs:
        return DCTProductionInputs(
            usd_budget=self.usd_reward_budget,
            circulating_supply=self.circulating_supply,
            previous_epoch_mint=self.previous_epoch_mint,
            buffer_ratio=self.buffer_ratio,
            max_emission=self.max_emission,
        )


@dataclass(slots=True)
class DCTSyncJob:
    """Computes DCT metrics and pushes them into Supabase."""

    price_calculator: DCTPriceCalculator
    production_planner: DCTProductionPlanner
    allocation_engine: DCTAllocationEngine
    writer: SupabaseTableWriter

    def run(self, snapshot: DCTMarketSnapshot) -> int:
        breakdown = self.price_calculator.compute(snapshot.price_inputs())
        plan = self.production_planner.plan(snapshot.production_inputs(), breakdown.final_price)
        allocations = self.allocation_engine.distribute(plan.final_mint)

        payload = {
            "timestamp": snapshot.as_of.replace(tzinfo=timezone.utc),
            "price": breakdown.final_price,
            "price_components": breakdown.to_dict(),
            "production_plan": plan.to_dict(),
            "allocations": [allocation.to_dict() for allocation in allocations],
        }
        return self.writer.upsert([payload])
