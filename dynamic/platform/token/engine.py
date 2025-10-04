"""Orchestration engine for the Dynamic Capital Token (DCT)."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field, replace
from datetime import datetime, timezone
from typing import Mapping, MutableMapping, Sequence, Tuple

from algorithms.python.dct_token_sync import (
    DCTAllocationEngine,
    DCTAllocationResult,
    DCTAllocationRule,
    DCTLLMAdjustment,
    DCTLLMOptimisationResult,
    DCTMarketSnapshot,
    DCTPriceBreakdown,
    DCTPriceCalculator,
    DCTPriceInputs,
    DCTProductionInputs,
    DCTProductionPlan,
    DCTProductionPlanner,
)

from .treasury import DynamicTreasuryAlgo, TreasuryEvent

__all__ = [
    "DCTCommitteeSignals",
    "DCTEngineReport",
    "DCTResidualPolicy",
    "DynamicCapitalTokenEngine",
    "committee_signals_from_optimisation",
]


def _ensure_timezone(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@dataclass(slots=True)
class DCTCommitteeSignals:
    """Recommendations from governance/LLM committees."""

    adjustment: DCTLLMAdjustment | None = None
    production_scale: float = 1.0
    notes: Tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        scale = max(0.0, float(self.production_scale))
        object.__setattr__(self, "production_scale", scale)

        unique_notes: list[str] = []
        for note in self.notes:
            text = str(note).strip()
            if text and text not in unique_notes:
                unique_notes.append(text)
        object.__setattr__(self, "notes", tuple(unique_notes))

        object.__setattr__(self, "metadata", dict(self.metadata))

    def apply_to_price_inputs(self, inputs: DCTPriceInputs) -> DCTPriceInputs:
        if not self.adjustment:
            return inputs
        return self.adjustment.apply_to_price_inputs(inputs)

    def apply_to_allocation_engine(
        self, engine: DCTAllocationEngine
    ) -> DCTAllocationEngine:
        if not self.adjustment or not self.adjustment.allocation_multipliers:
            return engine
        return engine.with_multipliers(self.adjustment.allocation_multipliers)

    def scale_plan(self, plan: DCTProductionPlan) -> DCTProductionPlan:
        scale = self.production_scale
        if scale == 1.0:
            return plan
        return plan.scale(scale)


@dataclass(slots=True)
class DCTEngineReport:
    """Structured results produced by :class:`DynamicCapitalTokenEngine`."""

    snapshot: DCTMarketSnapshot
    price_inputs: DCTPriceInputs
    price_breakdown: DCTPriceBreakdown
    production_plan: DCTProductionPlan
    effective_plan: DCTProductionPlan
    allocations: Tuple[DCTAllocationResult, ...]
    treasury_event: TreasuryEvent | None
    treasury_balance_before: float
    treasury_balance_after: float
    signals: DCTCommitteeSignals
    notes: Tuple[str, ...] = field(default_factory=tuple)

    @property
    def allocation_total(self) -> float:
        return sum(result.adjusted_allocation for result in self.allocations)

    @property
    def allocation_residual(self) -> float:
        return self.effective_plan.final_mint - self.allocation_total

    def to_dict(self) -> MutableMapping[str, object]:
        allocation_total = self.allocation_total
        allocation_residual = self.effective_plan.final_mint - allocation_total
        payload: MutableMapping[str, object] = {
            "timestamp": _ensure_timezone(self.snapshot.as_of).isoformat(),
            "price_inputs": asdict(self.price_inputs),
            "price": self.price_breakdown.final_price,
            "price_breakdown": self.price_breakdown.to_dict(),
            "production_plan": self.production_plan.to_dict(),
            "effective_plan": self.effective_plan.to_dict(),
            "allocations": [allocation.to_dict() for allocation in self.allocations],
            "allocation_total": round(allocation_total, 6),
            "allocation_residual": round(allocation_residual, 6),
            "treasury_balance_before": round(self.treasury_balance_before, 2),
            "treasury_balance_after": round(self.treasury_balance_after, 2),
        }

        if self.treasury_event:
            payload["treasury_event"] = asdict(self.treasury_event)

        if self.signals.adjustment:
            payload["llm_adjustment"] = self.signals.adjustment.to_dict()
        if self.signals.production_scale != 1.0:
            payload["production_scale"] = round(self.signals.production_scale, 6)
        if self.signals.metadata:
            payload["signals_metadata"] = dict(self.signals.metadata)
        if self.notes:
            payload["notes"] = list(self.notes)

        return payload


@dataclass(frozen=True, slots=True)
class DCTResidualPolicy:
    """Strategy for reconciling allocation totals with planned emissions."""

    tolerance: float = 1e-6
    redistribute_positive: bool = True
    redistribute_negative: bool = True
    buffer_label: str = "Treasury Buffer"


class DynamicCapitalTokenEngine:
    """High-level orchestrator for DCT pricing, emissions, and allocations."""

    def __init__(
        self,
        *,
        price_calculator: DCTPriceCalculator | None = None,
        production_planner: DCTProductionPlanner | None = None,
        allocation_rules: Sequence[DCTAllocationRule] | None = None,
        treasury_algo: DynamicTreasuryAlgo | None = None,
        treasury_starting_balance: float | None = None,
        residual_policy: DCTResidualPolicy | None = None,
    ) -> None:
        self._price_calculator = price_calculator or DCTPriceCalculator()
        self._production_planner = production_planner or DCTProductionPlanner()
        rules_tuple: Tuple[DCTAllocationRule, ...] = tuple(allocation_rules or ())
        self._allocation_rules = rules_tuple
        self._base_allocation_engine = DCTAllocationEngine(rules_tuple)
        self._residual_policy = residual_policy or DCTResidualPolicy()
        if treasury_algo is not None and treasury_starting_balance is not None:
            raise ValueError(
                "Provide either `treasury_algo` or `treasury_starting_balance`, not both"
            )
        if treasury_algo is not None:
            self._treasury = treasury_algo
        else:
            starting_balance = 100_000.0
            if treasury_starting_balance is not None:
                starting_balance = float(treasury_starting_balance)
            self._treasury = DynamicTreasuryAlgo(starting_balance=starting_balance)

    @property
    def allocation_rules(self) -> Tuple[DCTAllocationRule, ...]:
        return self._allocation_rules

    def set_allocation_rules(
        self, rules: Sequence[DCTAllocationRule]
    ) -> None:
        rules_tuple = tuple(rules)
        self._allocation_rules = rules_tuple
        self._base_allocation_engine = DCTAllocationEngine(rules_tuple)

    def orchestrate(
        self,
        snapshot: DCTMarketSnapshot,
        *,
        signals: DCTCommitteeSignals | None = None,
        trade_result: object | None = None,
        allocation_rules: Sequence[DCTAllocationRule] | None = None,
    ) -> DCTEngineReport:
        signals = signals or DCTCommitteeSignals()

        price_inputs = signals.apply_to_price_inputs(snapshot.price_inputs())

        breakdown = self._price_calculator.compute(price_inputs)

        production_inputs = snapshot.production_inputs()
        plan = self._production_planner.plan(production_inputs, breakdown.final_price)
        effective_plan = signals.scale_plan(plan)

        if allocation_rules is None:
            allocation_engine = self._base_allocation_engine
        else:
            rules_tuple = tuple(allocation_rules)
            if rules_tuple == self._allocation_rules:
                allocation_engine = self._base_allocation_engine
            else:
                allocation_engine = DCTAllocationEngine(rules_tuple)

        allocation_engine = signals.apply_to_allocation_engine(allocation_engine)
        allocations = tuple(allocation_engine.distribute(effective_plan.final_mint))
        allocations, reconciliation_notes = self._reconcile_allocations(
            allocations, effective_plan.final_mint
        )

        balance_before = float(self._treasury.treasury_balance)
        treasury_event: TreasuryEvent | None = None
        if trade_result is not None:
            treasury_event = self._treasury.update_from_trade(trade_result)
        balance_after = float(self._treasury.treasury_balance)

        notes: list[str] = []
        if signals.notes:
            notes.extend(signals.notes)
        if treasury_event and getattr(treasury_event, "notes", None):
            notes.extend(treasury_event.notes)

        allocation_total = sum(
            allocation.adjusted_allocation for allocation in allocations
        )
        notes.extend(reconciliation_notes)

        return DCTEngineReport(
            snapshot=snapshot,
            price_inputs=price_inputs,
            price_breakdown=breakdown,
            production_plan=plan,
            effective_plan=effective_plan,
            allocations=allocations,
            treasury_event=treasury_event,
            treasury_balance_before=balance_before,
            treasury_balance_after=balance_after,
            signals=signals,
            notes=tuple(notes),
        )

    def _reconcile_allocations(
        self,
        allocations: Tuple[DCTAllocationResult, ...],
        target_total: float,
    ) -> Tuple[Tuple[DCTAllocationResult, ...], Tuple[str, ...]]:
        policy = self._residual_policy
        tolerance = max(0.0, policy.tolerance)
        target_total = max(0.0, float(target_total))

        total = sum(result.adjusted_allocation for result in allocations)
        residual = target_total - total
        if abs(residual) <= tolerance:
            return allocations, ()

        if residual > 0 and policy.redistribute_positive:
            updated = self._redistribute_residual(allocations, residual, target_total)
            note = f"Redistributed {residual:.2f} DCT residual across allocations"
            return updated, (note,)

        if residual < 0 and policy.redistribute_negative:
            overshoot = abs(residual)
            updated = self._trim_overshoot(allocations, overshoot, target_total)
            note = f"Scaled allocations down by {overshoot:.2f} DCT to respect supply"
            return updated, (note,)

        if residual > 0:
            buffer = DCTAllocationResult(
                label=policy.buffer_label,
                weight=0.0,
                base_allocation=residual,
                multiplier=1.0,
                adjusted_allocation=residual,
                member_count=None,
                per_member=None,
            )
            note = f"Directed {residual:.2f} DCT residual to {policy.buffer_label}"
            return allocations + (buffer,), (note,)

        overshoot = abs(residual)
        note = f"Allocations exceed supply by {overshoot:.2f} DCT"
        return allocations, (note,)

    def _redistribute_residual(
        self,
        allocations: Tuple[DCTAllocationResult, ...],
        residual: float,
        target_total: float,
    ) -> Tuple[DCTAllocationResult, ...]:
        weights = [max(result.weight, 0.0) for result in allocations]
        weight_total = sum(weights)
        if weight_total <= 0:
            return allocations

        updated = []
        for result, weight in zip(allocations, weights):
            if weight <= 0:
                updated.append(result)
                continue
            share = weight / weight_total
            delta = residual * share
            new_base = result.base_allocation + delta
            new_adjusted = result.adjusted_allocation + delta
            per_member = (
                new_adjusted / result.member_count
                if result.member_count and result.member_count > 0
                else None
            )
            updated.append(
                replace(
                    result,
                    base_allocation=new_base,
                    adjusted_allocation=new_adjusted,
                    per_member=per_member,
                )
            )

        return self._apply_terminal_correction(tuple(updated), target_total)

    def _trim_overshoot(
        self,
        allocations: Tuple[DCTAllocationResult, ...],
        overshoot: float,
        target_total: float,
    ) -> Tuple[DCTAllocationResult, ...]:
        positive_allocations = [
            result for result in allocations if result.adjusted_allocation > 0
        ]
        total_positive = sum(result.adjusted_allocation for result in positive_allocations)
        if total_positive <= 0:
            return allocations

        updated = []
        for result in allocations:
            if result.adjusted_allocation <= 0:
                updated.append(result)
                continue
            share = result.adjusted_allocation / total_positive
            delta = overshoot * share
            new_adjusted = max(0.0, result.adjusted_allocation - delta)
            new_base = max(0.0, result.base_allocation - delta)
            per_member = (
                new_adjusted / result.member_count
                if result.member_count and result.member_count > 0 and new_adjusted > 0
                else None
            )
            updated.append(
                replace(
                    result,
                    base_allocation=new_base,
                    adjusted_allocation=new_adjusted,
                    per_member=per_member,
                )
            )

        return self._apply_terminal_correction(tuple(updated), target_total)

    def _apply_terminal_correction(
        self,
        allocations: Tuple[DCTAllocationResult, ...],
        target_total: float,
    ) -> Tuple[DCTAllocationResult, ...]:
        tolerance = self._residual_policy.tolerance
        total = sum(result.adjusted_allocation for result in allocations)
        correction = target_total - total
        if abs(correction) <= tolerance:
            return allocations

        for index in range(len(allocations) - 1, -1, -1):
            result = allocations[index]
            new_adjusted = max(0.0, result.adjusted_allocation + correction)
            new_base = max(0.0, result.base_allocation + correction)
            if new_adjusted < 0:
                continue
            per_member = (
                new_adjusted / result.member_count
                if result.member_count and result.member_count > 0 and new_adjusted > 0
                else None
            )
            updated = list(allocations)
            updated[index] = replace(
                result,
                base_allocation=new_base,
                adjusted_allocation=new_adjusted,
                per_member=per_member,
            )
            return tuple(updated)

        return allocations


def committee_signals_from_optimisation(
    optimisation: DCTLLMOptimisationResult | None,
) -> DCTCommitteeSignals:
    """Convert an optimisation output into :class:`DCTCommitteeSignals`."""

    if optimisation is None:
        return DCTCommitteeSignals()

    metadata: dict[str, object] = {}
    runs_serialised = optimisation.serialised_runs()
    if runs_serialised:
        metadata["runs"] = runs_serialised
    if optimisation.recommendations:
        metadata["recommendations"] = [
            dict(rec) for rec in optimisation.recommendations
        ]
    if optimisation.agent_cycle:
        metadata["agent_cycle"] = dict(optimisation.agent_cycle)
    if optimisation.agent_summary:
        metadata["agent_summary"] = dict(optimisation.agent_summary)

    return DCTCommitteeSignals(
        adjustment=optimisation.adjustment,
        production_scale=float(optimisation.agent_production_scale),
        notes=tuple(optimisation.notes),
        metadata=metadata,
    )
