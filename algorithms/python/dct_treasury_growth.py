"""DCT treasury growth planning heuristics.

This module implements the high level guard-rails published in the
``Dynamic Capital Treasury Sustainability Whitepaper`` and the ``2024 DCT
Governance Addendum``.  Maintainers can use the :class:`TreasuryGrowthPlanner`
to classify the current treasury posture and to derive a consistent capital
deployment plan for weekly council reviews.

Typical usage::

    from algorithms.python.dct_treasury_growth import (
        TreasuryGrowthPlanner,
        TreasurySnapshot,
    )

    snapshot = TreasurySnapshot(
        operations_balance=2_000_000,
        liquidity_reserve=1_500_000,
        monthly_burn=120_000,
        protocol_fees=90_000,
        penalty_fees=15_000,
        dct_price=0.92,
        dct_90d_ma=1.05,
        volatility=0.38,
        liquidity_depth=1_200_000,
        in_range_ratio=0.72,
    )

    planner = TreasuryGrowthPlanner()
    plan = planner.build_plan(snapshot)

The returned :class:`TreasuryGrowthPlan` enumerates recommended allocations
and governance flags, along with justification notes that can be surfaced in
operational tooling.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


@dataclass(slots=True)
class TreasurySnapshot:
    """State of the treasury at a point in time.

    Attributes provide enough signal for the planner to derive runway
    coverage, liquidity sufficiency, and policy-triggered levers.
    """

    operations_balance: float
    liquidity_reserve: float
    monthly_burn: float
    protocol_fees: float
    penalty_fees: float
    dct_price: float
    dct_90d_ma: float
    volatility: float
    liquidity_depth: float
    in_range_ratio: float

    @property
    def coverage_months(self) -> float:
        """Return the operations coverage in months."""

        if self.monthly_burn <= 0:
            return float("inf")
        return self.operations_balance / self.monthly_burn

    @property
    def net_fees(self) -> float:
        """Return combined protocol and penalty fees."""

        return self.protocol_fees + self.penalty_fees

    @property
    def price_discount(self) -> float:
        """Return the percentage discount to the 90-day moving average."""

        if self.dct_90d_ma <= 0:
            return 0.0
        return 1 - (self.dct_price / self.dct_90d_ma)

    @property
    def liquidity_depth_shortfall(self) -> float:
        """Difference between required and realised liquidity depth."""

        return max(0.0, TreasuryGrowthPlanner.LIQUIDITY_DEPTH_MIN - self.liquidity_depth)

    @property
    def in_range_shortfall(self) -> float:
        """Difference between required and realised in-range liquidity ratio."""

        return max(0.0, TreasuryGrowthPlanner.IN_RANGE_MIN - self.in_range_ratio)


@dataclass(slots=True)
class TreasuryGrowthLevers:
    """Monetary allocations recommended by the planner."""

    operations_top_up: float = 0.0
    liquidity_reinforcement: float = 0.0
    buybacks: float = 0.0
    burns: float = 0.0
    yield_deployments: float = 0.0


@dataclass(slots=True)
class TreasuryGrowthPlan:
    """Planner output that describes capital deployment for the period."""

    posture: str
    levers: TreasuryGrowthLevers
    throttle_emissions: bool = False
    emission_throttle_ratio: float = 0.0
    governance_review_required: bool = False
    notes: List[str] = field(default_factory=list)


class TreasuryGrowthPlanner:
    """Encapsulates whitepaper policies for treasury growth planning."""

    LIQUIDITY_DEPTH_MIN: float = 1_000_000.0
    IN_RANGE_MIN: float = 0.65
    BUYBACK_FEE_RATIO: float = 0.20
    PENALTY_BURN_RATIO: float = 0.50
    EMISSION_THROTTLE_MAX: float = 0.25
    COVERAGE_DEFENSIVE: float = 18.0
    COVERAGE_STRONG: float = 24.0
    COVERAGE_EXPANSION: float = 36.0
    VOLATILITY_ALERT: float = 0.55

    def classify_posture(self, snapshot: TreasurySnapshot) -> str:
        """Return the treasury posture for the supplied snapshot."""

        coverage = snapshot.coverage_months
        if coverage < self.COVERAGE_DEFENSIVE:
            return "defensive"
        if coverage < self.COVERAGE_EXPANSION:
            return "balanced"
        return "expansion"

    def build_plan(self, snapshot: TreasurySnapshot) -> TreasuryGrowthPlan:
        """Construct a growth plan for the provided snapshot."""

        posture = self.classify_posture(snapshot)
        levers = TreasuryGrowthLevers()
        notes: List[str] = []

        required_runway = self.COVERAGE_STRONG if snapshot.coverage_months >= self.COVERAGE_DEFENSIVE else self.COVERAGE_DEFENSIVE
        target_balance = snapshot.monthly_burn * required_runway
        operations_gap = max(0.0, target_balance - snapshot.operations_balance)
        if operations_gap > 0:
            levers.operations_top_up = operations_gap
            notes.append(
                f"Operations runway below {required_runway:.0f} months target; allocating {operations_gap:,.0f} for top-up."
            )

        liquidity_gap_value = max(
            snapshot.liquidity_depth_shortfall,
            snapshot.liquidity_depth * snapshot.in_range_shortfall,
        )
        throttle_ratio = 0.0
        if snapshot.liquidity_depth_shortfall > 0:
            notes.append(
                "Liquidity depth below policy minimum; directing reinforcement capital."
            )
            throttle_ratio = max(
                throttle_ratio,
                snapshot.liquidity_depth_shortfall / self.LIQUIDITY_DEPTH_MIN,
            )
        if snapshot.in_range_shortfall > 0:
            notes.append(
                "In-range liquidity coverage insufficient; reallocating to restore bands."
            )
            throttle_ratio = max(
                throttle_ratio,
                snapshot.in_range_shortfall / self.IN_RANGE_MIN,
            )
        if liquidity_gap_value > 0:
            levers.liquidity_reinforcement = liquidity_gap_value

        net_fees = snapshot.net_fees
        if snapshot.coverage_months >= self.COVERAGE_STRONG and snapshot.dct_price < snapshot.dct_90d_ma:
            buyback_budget = max(0.0, net_fees) * self.BUYBACK_FEE_RATIO
            if buyback_budget > 0:
                levers.buybacks = buyback_budget
                notes.append(
                    "DCT trades at a discount with healthy reserves; executing capped buybacks."
                )
        else:
            if posture == "defensive":
                notes.append("Buybacks suppressed until runway recovers.")

        if snapshot.coverage_months >= self.COVERAGE_STRONG and snapshot.penalty_fees > 0:
            burn_budget = snapshot.penalty_fees * self.PENALTY_BURN_RATIO
            levers.burns = burn_budget
            notes.append("Redirecting 50% of penalty fees to supply burns per policy.")

        yield_budget = max(0.0, net_fees - levers.buybacks - levers.burns)
        if yield_budget > 0:
            levers.yield_deployments = yield_budget
            notes.append("Allocating remaining net fees to strategic yield strategies.")

        throttle_notes = []
        if snapshot.volatility >= self.VOLATILITY_ALERT:
            throttle_ratio = max(throttle_ratio, snapshot.volatility - self.VOLATILITY_ALERT)
            throttle_notes.append("Elevated volatility observed.")

        throttle_ratio = min(self.EMISSION_THROTTLE_MAX, max(0.0, throttle_ratio))
        throttle_emissions = throttle_ratio > 0

        if throttle_emissions:
            notes.append(
                f"Authorising emission throttles up to {throttle_ratio:.0%} to stabilise market conditions."
            )

        governance_review_required = posture == "defensive" or throttle_emissions
        if governance_review_required:
            notes.append("Flagging to governance council for situational awareness.")

        plan = TreasuryGrowthPlan(
            posture=posture,
            levers=levers,
            throttle_emissions=throttle_emissions,
            emission_throttle_ratio=throttle_ratio,
            governance_review_required=governance_review_required,
            notes=notes,
        )
        return plan
