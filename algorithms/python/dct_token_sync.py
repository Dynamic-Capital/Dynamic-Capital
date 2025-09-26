"""DCT pricing, allocation, and synchronisation utilities."""

from __future__ import annotations

import textwrap
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Mapping, MutableSequence, Optional, Sequence

from .multi_llm import LLMConfig, LLMRun, parse_json_response, serialise_runs
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
    "DCTLLMAdjustment",
    "DCTLLMOptimisationResult",
    "DCTMultiLLMOptimiser",
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

        final_mint = min(smoothed_mint, cap)
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

    def with_multipliers(self, overrides: Mapping[str, float]) -> "DCTAllocationEngine":
        """Return a new engine with updated rule multipliers."""

        if not overrides:
            return self

        updated_rules: List[DCTAllocationRule] = []
        for rule in self.rules:
            override = overrides.get(rule.label)
            if override is None:
                updated_rules.append(rule)
                continue
            updated_rules.append(
                replace(
                    rule,
                    multiplier=max(0.0, float(override)),
                )
            )
        return DCTAllocationEngine(tuple(updated_rules))

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
class DCTLLMAdjustment:
    """Dynamic adjustments recommended by the multi-LLM committee."""

    policy_adjustment_delta: float = 0.0
    demand_index_multiplier: float = 1.0
    performance_index_multiplier: float = 1.0
    volatility_index_multiplier: float = 1.0
    allocation_multipliers: Mapping[str, float] = field(default_factory=dict)
    index_lower_bound: float = 0.0
    index_upper_bound: float = 1.5
    policy_lower_bound: float = -1.0
    policy_upper_bound: float = 1.0

    def is_noop(self) -> bool:
        return (
            self.policy_adjustment_delta == 0.0
            and self.demand_index_multiplier == 1.0
            and self.performance_index_multiplier == 1.0
            and self.volatility_index_multiplier == 1.0
            and not self.allocation_multipliers
        )

    def apply_to_price_inputs(self, inputs: DCTPriceInputs) -> DCTPriceInputs:
        return DCTPriceInputs(
            ton_price_usd=inputs.ton_price_usd,
            trailing_ton_price_usd=inputs.trailing_ton_price_usd,
            demand_index=_clamp(
                inputs.demand_index * self.demand_index_multiplier,
                lower=self.index_lower_bound,
                upper=self.index_upper_bound,
            ),
            performance_index=_clamp(
                inputs.performance_index * self.performance_index_multiplier,
                lower=self.index_lower_bound,
                upper=self.index_upper_bound,
            ),
            volatility_index=_clamp(
                inputs.volatility_index * self.volatility_index_multiplier,
                lower=self.index_lower_bound,
                upper=self.index_upper_bound,
            ),
            policy_adjustment=_clamp(
                inputs.policy_adjustment + self.policy_adjustment_delta,
                lower=self.policy_lower_bound,
                upper=self.policy_upper_bound,
            ),
        )

    def to_dict(self) -> Mapping[str, object]:
        bounds = {
            "index": [self.index_lower_bound, self.index_upper_bound],
            "policy": [self.policy_lower_bound, self.policy_upper_bound],
        }
        allocations = {
            label: round(multiplier, 6)
            for label, multiplier in self.allocation_multipliers.items()
        }
        return {
            "policy_adjustment_delta": round(self.policy_adjustment_delta, 6),
            "demand_index_multiplier": round(self.demand_index_multiplier, 6),
            "performance_index_multiplier": round(self.performance_index_multiplier, 6),
            "volatility_index_multiplier": round(self.volatility_index_multiplier, 6),
            "allocation_multipliers": allocations,
            "bounds": bounds,
        }


@dataclass(slots=True)
class DCTLLMOptimisationResult:
    """Result of orchestrating multiple LLM recommendations."""

    adjustment: DCTLLMAdjustment
    runs: Sequence[LLMRun] = field(default_factory=tuple)
    recommendations: Sequence[Mapping[str, Any]] = field(default_factory=tuple)
    notes: Sequence[str] = field(default_factory=tuple)

    def serialised_runs(self, *, include_prompt: bool = False) -> Optional[str]:
        return serialise_runs(self.runs, include_prompt=include_prompt)

    def to_dict(self) -> Mapping[str, object]:
        payload: Dict[str, object] = {"adjustment": self.adjustment.to_dict()}
        if self.notes:
            payload["notes"] = list(self.notes)
        if self.recommendations:
            payload["recommendations"] = [dict(rec) for rec in self.recommendations]
        runs = self.serialised_runs()
        if runs:
            payload["runs"] = runs
        return payload


@dataclass(slots=True)
class DCTMultiLLMOptimiser:
    """Coordinates multiple LLMs to tune DCT parameters."""

    models: Sequence[LLMConfig]
    index_lower_bound: float = 0.0
    index_upper_bound: float = 1.5
    policy_lower_bound: float = -1.0
    policy_upper_bound: float = 1.0
    multiplier_lower_bound: float = 0.5
    multiplier_upper_bound: float = 1.5
    extra_instructions: str = ""

    def optimise(
        self,
        snapshot: "DCTMarketSnapshot",
        rules: Sequence[DCTAllocationRule],
    ) -> DCTLLMOptimisationResult:
        if not self.models:
            return self._empty_result()

        prompt = self._build_prompt(snapshot, rules)
        runs: list[LLMRun] = []
        adjustments: list[DCTLLMAdjustment] = []
        recommendations: list[Mapping[str, Any]] = []
        notes: list[str] = []

        for config in self.models:
            run = config.run(prompt)
            runs.append(run)
            parsed = parse_json_response(run.response)
            if not parsed:
                continue
            recommendations.append(parsed)
            adjustment = self._parse_adjustment(parsed, rules)
            if adjustment:
                adjustments.append(adjustment)
            notes.extend(self._extract_notes(parsed))

        aggregate = self._aggregate_adjustments(adjustments)
        return DCTLLMOptimisationResult(
            adjustment=aggregate,
            runs=runs,
            recommendations=recommendations,
            notes=tuple(notes),
        )

    def _empty_result(self) -> DCTLLMOptimisationResult:
        adjustment = DCTLLMAdjustment(
            index_lower_bound=self.index_lower_bound,
            index_upper_bound=self.index_upper_bound,
            policy_lower_bound=self.policy_lower_bound,
            policy_upper_bound=self.policy_upper_bound,
        )
        return DCTLLMOptimisationResult(adjustment=adjustment)

    def _build_prompt(self, snapshot: "DCTMarketSnapshot", rules: Sequence[DCTAllocationRule]) -> str:
        rule_lines = [
            f"- {rule.label}: weight={rule.weight}, multiplier={rule.multiplier}, members={rule.member_count or 'n/a'}, min_allocation={rule.min_allocation}"
            for rule in rules
        ]
        if not rule_lines:
            rule_lines.append("- No allocation rules supplied")
        rule_block = '\n'.join(rule_lines)

        snapshot_block = textwrap.dedent(
            f"""
            - as_of: {snapshot.as_of.isoformat()}
            - ton_price_usd: {snapshot.ton_price_usd:.6f}
            - trailing_ton_price_usd: {snapshot.trailing_ton_price_usd:.6f}
            - demand_index: {snapshot.demand_index:.6f}
            - performance_index: {snapshot.performance_index:.6f}
            - volatility_index: {snapshot.volatility_index:.6f}
            - policy_adjustment: {snapshot.policy_adjustment:.6f}
            - usd_reward_budget: {snapshot.usd_reward_budget:.2f}
            - previous_epoch_mint: {snapshot.previous_epoch_mint:.2f}
            - circulating_supply: {snapshot.circulating_supply:.2f}
            - buffer_ratio: {snapshot.buffer_ratio:.4f}
            - max_emission: {snapshot.max_emission if snapshot.max_emission is not None else 'None'}
            """
        ).strip()

        prompt = textwrap.dedent(
            f"""
            You are part of the Dynamic Capital Token multi-model oversight committee.
            Analyse the market snapshot and recommend safe adjustments. Keep outputs within:
              - Policy delta between {self.policy_lower_bound} and {self.policy_upper_bound}.
              - Multipliers between {self.multiplier_lower_bound} and {self.multiplier_upper_bound}.
              - Resulting indices constrained to {self.index_lower_bound}-{self.index_upper_bound}.

            Respond with JSON containing:
              - "policy_adjustment_delta": float
              - "demand_multiplier": float
              - "performance_multiplier": float
              - "volatility_multiplier": float
              - "allocation_overrides": object mapping labels to multipliers
              - "notes": optional list of reasoning bullet points

            Market snapshot:
            {snapshot_block}

            Allocation rules:
            {rule_block}
            """
        ).strip()

        if self.extra_instructions:
            prompt += '\n\nAdditional context:\n' + self.extra_instructions.strip()

        return prompt

    def _parse_adjustment(
        self,
        payload: Mapping[str, Any],
        rules: Sequence[DCTAllocationRule],
    ) -> Optional[DCTLLMAdjustment]:
        if not isinstance(payload, Mapping):
            return None

        policy_delta = self._coerce_float(
            payload.get("policy_adjustment_delta"),
            default=0.0,
            lower=self.policy_lower_bound,
            upper=self.policy_upper_bound,
        )
        demand_multiplier = self._coerce_float(
            payload.get("demand_multiplier") or payload.get("demand_index_multiplier"),
            default=1.0,
            lower=self.multiplier_lower_bound,
            upper=self.multiplier_upper_bound,
        )
        performance_multiplier = self._coerce_float(
            payload.get("performance_multiplier"),
            default=1.0,
            lower=self.multiplier_lower_bound,
            upper=self.multiplier_upper_bound,
        )
        volatility_multiplier = self._coerce_float(
            payload.get("volatility_multiplier"),
            default=1.0,
            lower=self.multiplier_lower_bound,
            upper=self.multiplier_upper_bound,
        )

        allocation_source = payload.get("allocation_overrides") or payload.get("allocation_multipliers")
        allocation_multipliers = self._parse_allocation_overrides(allocation_source, rules)

        return DCTLLMAdjustment(
            policy_adjustment_delta=policy_delta,
            demand_index_multiplier=demand_multiplier,
            performance_index_multiplier=performance_multiplier,
            volatility_index_multiplier=volatility_multiplier,
            allocation_multipliers=allocation_multipliers,
            index_lower_bound=self.index_lower_bound,
            index_upper_bound=self.index_upper_bound,
            policy_lower_bound=self.policy_lower_bound,
            policy_upper_bound=self.policy_upper_bound,
        )

    def _parse_allocation_overrides(
        self,
        source: Any,
        rules: Sequence[DCTAllocationRule],
    ) -> Mapping[str, float]:
        if source is None:
            return {}

        if isinstance(source, Mapping):
            items = source.items()
        elif isinstance(source, Iterable):
            extracted: list[tuple[str, Any]] = []
            for item in source:
                if isinstance(item, Mapping):
                    label = item.get("label")
                    multiplier = item.get("multiplier")
                    if label is not None and multiplier is not None:
                        extracted.append((label, multiplier))
            if not extracted:
                return {}
            items = extracted
        else:
            return {}

        valid_labels = {rule.label for rule in rules}
        overrides: Dict[str, float] = {}
        for raw_label, raw_multiplier in items:
            label = str(raw_label).strip()
            if label not in valid_labels:
                continue
            multiplier = self._coerce_float(
                raw_multiplier,
                default=1.0,
                lower=0.0,
                upper=self.multiplier_upper_bound,
            )
            overrides[label] = multiplier
        return overrides

    def _aggregate_adjustments(self, adjustments: Sequence[DCTLLMAdjustment]) -> DCTLLMAdjustment:
        if not adjustments:
            return DCTLLMAdjustment(
                index_lower_bound=self.index_lower_bound,
                index_upper_bound=self.index_upper_bound,
                policy_lower_bound=self.policy_lower_bound,
                policy_upper_bound=self.policy_upper_bound,
            )

        count = len(adjustments)
        policy_delta = sum(adj.policy_adjustment_delta for adj in adjustments) / count
        demand_multiplier = sum(adj.demand_index_multiplier for adj in adjustments) / count
        performance_multiplier = sum(adj.performance_index_multiplier for adj in adjustments) / count
        volatility_multiplier = sum(adj.volatility_index_multiplier for adj in adjustments) / count

        aggregated: Dict[str, float] = {}
        counts: Dict[str, int] = {}
        for adj in adjustments:
            for label, multiplier in adj.allocation_multipliers.items():
                aggregated[label] = aggregated.get(label, 0.0) + multiplier
                counts[label] = counts.get(label, 0) + 1

        averaged = {
            label: _clamp(aggregated[label] / counts[label], lower=0.0, upper=self.multiplier_upper_bound)
            for label in aggregated
        }

        return DCTLLMAdjustment(
            policy_adjustment_delta=_clamp(
                policy_delta,
                lower=self.policy_lower_bound,
                upper=self.policy_upper_bound,
            ),
            demand_index_multiplier=_clamp(
                demand_multiplier,
                lower=self.multiplier_lower_bound,
                upper=self.multiplier_upper_bound,
            ),
            performance_index_multiplier=_clamp(
                performance_multiplier,
                lower=self.multiplier_lower_bound,
                upper=self.multiplier_upper_bound,
            ),
            volatility_index_multiplier=_clamp(
                volatility_multiplier,
                lower=self.multiplier_lower_bound,
                upper=self.multiplier_upper_bound,
            ),
            allocation_multipliers=averaged,
            index_lower_bound=self.index_lower_bound,
            index_upper_bound=self.index_upper_bound,
            policy_lower_bound=self.policy_lower_bound,
            policy_upper_bound=self.policy_upper_bound,
        )

    def _coerce_float(
        self,
        value: Any,
        *,
        default: float,
        lower: Optional[float] = None,
        upper: Optional[float] = None,
    ) -> float:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return default
        if lower is not None:
            numeric = max(lower, numeric)
        if upper is not None:
            numeric = min(upper, numeric)
        return numeric

    def _extract_notes(self, payload: Mapping[str, Any]) -> list[str]:
        notes: list[str] = []
        for key in ("notes", "rationale", "justification"):
            candidate = payload.get(key)
            if candidate is None:
                continue
            if isinstance(candidate, Mapping):
                continue
            if isinstance(candidate, str):
                candidate_iter = [candidate]
            elif isinstance(candidate, Iterable):
                candidate_iter = candidate
            else:
                continue
            for item in candidate_iter:
                text = str(item).strip()
                if text:
                    notes.append(text)
        return notes


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
    optimizer: DCTMultiLLMOptimiser | None = None

    def run(self, snapshot: DCTMarketSnapshot) -> int:
        price_inputs = snapshot.price_inputs()
        allocation_engine = self.allocation_engine
        optimisation: DCTLLMOptimisationResult | None = None

        if self.optimizer is not None:
            optimisation = self.optimizer.optimise(snapshot, allocation_engine.rules)
            price_inputs = optimisation.adjustment.apply_to_price_inputs(price_inputs)
            allocation_engine = allocation_engine.with_multipliers(
                optimisation.adjustment.allocation_multipliers
            )

        breakdown = self.price_calculator.compute(price_inputs)
        plan = self.production_planner.plan(snapshot.production_inputs(), breakdown.final_price)
        allocations = allocation_engine.distribute(plan.final_mint)

        payload: Dict[str, object] = {
            "timestamp": snapshot.as_of.replace(tzinfo=timezone.utc),
            "price": breakdown.final_price,
            "price_components": breakdown.to_dict(),
            "production_plan": plan.to_dict(),
            "allocations": [allocation.to_dict() for allocation in allocations],
        }

        if optimisation is not None:
            payload["llm_adjustment"] = optimisation.adjustment.to_dict()
            runs_serialised = optimisation.serialised_runs()
            if runs_serialised:
                payload["llm_runs"] = runs_serialised
            if optimisation.notes:
                payload["llm_notes"] = list(optimisation.notes)
            if optimisation.recommendations:
                payload["llm_recommendations"] = [
                    dict(rec) for rec in optimisation.recommendations
                ]

        return self.writer.upsert([payload])
