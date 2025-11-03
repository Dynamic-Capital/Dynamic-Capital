"""DCT pricing, allocation, and synchronisation utilities."""

from __future__ import annotations

import math
import textwrap
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Iterable, List, Mapping, MutableSequence, Optional, Sequence

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


def _coerce_float(value: Any, default: float = 0.0) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return default
    if not math.isfinite(numeric):
        return default
    return numeric


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

    def scale(self, factor: float) -> "DCTProductionPlan":
        """Return a copy of the plan with mint amounts scaled by ``factor``."""

        factor = max(0.0, float(factor))
        if factor == 1.0:
            return self

        target = self.target_mint * factor
        buffered = self.buffered_mint * factor
        smoothed = self.smoothed_mint * factor

        cap = max(0.0, self.cap)
        final = min(smoothed, cap)
        cap_applied = final < smoothed

        return DCTProductionPlan(
            target_mint=target,
            buffered_mint=buffered,
            smoothed_mint=smoothed,
            final_mint=final,
            cap=cap,
            cap_applied=cap_applied,
        )


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
        if not self.rules:
            return []

        min_allocations = [max(0.0, rule.min_allocation) for rule in self.rules]
        total_minimum = sum(min_allocations)
        results: MutableSequence[DCTAllocationResult] = []

        if total_dct == 0.0:
            base_allocations = [0.0 for _ in self.rules]
        elif total_minimum > 0.0 and total_minimum >= total_dct:
            scale = total_dct / total_minimum
            base_allocations = [min_alloc * scale for min_alloc in min_allocations]
        else:
            remaining = max(0.0, total_dct - total_minimum)
            weight_total = sum(rule.weight for rule in self.rules if rule.weight > 0)
            if weight_total > 0:
                base_allocations = []
                for rule, min_alloc in zip(self.rules, min_allocations):
                    share = rule.weight / weight_total if rule.weight > 0 else 0.0
                    base_allocations.append(min_alloc + remaining * share)
            elif total_minimum > 0.0:
                scale = total_dct / total_minimum
                base_allocations = [min_alloc * scale for min_alloc in min_allocations]
            else:
                equal_share = total_dct / len(self.rules)
                base_allocations = [equal_share for _ in self.rules]

        if base_allocations:
            discrepancy = total_dct - sum(base_allocations)
            if abs(discrepancy) > 1e-9:
                base_allocations[-1] += discrepancy

        for rule, base_allocation in zip(self.rules, base_allocations):
            base_allocation = max(0.0, base_allocation)
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
    agent_cycle: Mapping[str, Any] | None = None
    agent_summary: Mapping[str, Any] | None = None
    agent_production_scale: float = 1.0

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
        if self.agent_cycle:
            payload["agent_cycle"] = dict(self.agent_cycle)
        if self.agent_summary:
            payload["agent_summary"] = dict(self.agent_summary)
        if self.agent_production_scale != 1.0:
            payload["agent_production_scale"] = round(self.agent_production_scale, 6)
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
    agent_runner: Callable[[Mapping[str, Any]], Mapping[str, Any]] | None = None
    enable_agents: bool = True

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
        agent_cycle: Mapping[str, Any] | None = None
        agent_summary: Mapping[str, Any] | None = None
        agent_scale = 1.0

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

        if self.enable_agents:
            agent_runner = self.agent_runner
            if agent_runner is None:
                try:
                    from .dynamic_ai_sync import run_dynamic_agent_cycle as default_runner
                except Exception:
                    agent_runner = None
                else:
                    object.__setattr__(self, "agent_runner", default_runner)
                    agent_runner = default_runner
            if agent_runner is not None:
                adjusted, cycle, agent_note = self._apply_agent_guidance(
                    snapshot, aggregate, agent_runner
                )
                if adjusted is not None:
                    aggregate = adjusted
                if cycle:
                    agent_cycle = cycle
                    agent_summary, agent_scale = self._summarise_agent_cycle(
                        aggregate, cycle
                    )
                if agent_note:
                    notes.append(agent_note)

        return DCTLLMOptimisationResult(
            adjustment=aggregate,
            runs=runs,
            recommendations=recommendations,
            notes=tuple(notes),
            agent_cycle=agent_cycle,
            agent_summary=agent_summary,
            agent_production_scale=agent_scale,
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

    def _apply_agent_guidance(
        self,
        snapshot: "DCTMarketSnapshot",
        adjustment: DCTLLMAdjustment,
        runner: Callable[[Mapping[str, Any]], Mapping[str, Any]],
    ) -> tuple[DCTLLMAdjustment | None, Mapping[str, Any] | None, str | None]:
        try:
            context = self._build_agent_context(snapshot, adjustment)
        except Exception:
            return adjustment, None, None

        try:
            cycle = runner(context)
        except Exception:
            return adjustment, None, None
        if not isinstance(cycle, Mapping):
            return adjustment, None, None

        refined = self._modulate_adjustment(adjustment, cycle)

        decision = cycle.get("decision") if isinstance(cycle, Mapping) else None
        note = None
        if isinstance(decision, Mapping):
            action = decision.get("action")
            confidence_value = decision.get("confidence")
            if action:
                confidence_note = None
                if confidence_value is not None:
                    confidence_note = _coerce_float(confidence_value, default=math.nan)
                    if math.isnan(confidence_note):
                        confidence_note = None
                if confidence_note is not None:
                    note = f"Agent decision {action} (confidence {confidence_note:.2f})"
                else:
                    note = f"Agent decision {action}"

        return refined, dict(cycle), note

    def _summarise_agent_cycle(
        self, adjustment: DCTLLMAdjustment, agent_cycle: Mapping[str, Any]
    ) -> tuple[Mapping[str, Any] | None, float]:
        if not isinstance(agent_cycle, Mapping):
            return None, 1.0

        decision_payload = agent_cycle.get("decision")
        action = "HOLD"
        confidence = 0.0
        rationale: str | None = None
        decision_notes: tuple[str, ...] = ()
        if isinstance(decision_payload, Mapping):
            action = str(decision_payload.get("action", "HOLD")).upper() or "HOLD"
            confidence = _coerce_float(decision_payload.get("confidence"), default=0.0)
            rationale_candidate = decision_payload.get("rationale") or decision_payload.get("reasoning")
            if rationale_candidate:
                rationale = str(rationale_candidate)
            decision_notes = self._collect_strings(decision_payload.get("notes"))

        agents_section = agent_cycle.get("agents") if isinstance(agent_cycle, Mapping) else None
        risk_section = agents_section.get("risk") if isinstance(agents_section, Mapping) else None

        risk_confidence: float | None = None
        escalations: tuple[str, ...] = ()
        hedge_count = 0
        hedge_symbols: tuple[str, ...] = ()
        adjusted_action: str | None = None
        adjusted_confidence: float | None = None
        risk_notes: tuple[str, ...] = ()
        sizing_map: Mapping[str, Any] = {}
        risk_rationale: str | None = None

        if isinstance(risk_section, Mapping):
            risk_rationale_candidate = risk_section.get("rationale")
            if risk_rationale_candidate:
                risk_rationale = str(risk_rationale_candidate)
            risk_conf_value = self._coerce_float(risk_section.get("confidence"), default=math.nan)
            if not math.isnan(risk_conf_value):
                risk_confidence = max(0.0, min(1.0, risk_conf_value))
            escalations = self._normalise_escalations(risk_section.get("escalations"))
            sizing_map = self._normalise_sizing(risk_section.get("sizing"))
            hedge_count, hedge_symbols = self._summarise_hedges(risk_section.get("hedge_decisions"))

            adjusted_payload = risk_section.get("adjusted_signal")
            if isinstance(adjusted_payload, Mapping):
                adjusted_action_candidate = adjusted_payload.get("action")
                if adjusted_action_candidate:
                    adjusted_action = str(adjusted_action_candidate).upper()
                adjusted_conf_value = self._coerce_float(
                    adjusted_payload.get("confidence"), default=math.nan
                )
                if not math.isnan(adjusted_conf_value):
                    adjusted_confidence = max(0.0, min(1.0, adjusted_conf_value))
                risk_notes = self._collect_strings(adjusted_payload.get("risk_notes"))

        summary: Dict[str, Any] = {
            "decision": {
                "action": action,
                "confidence": round(confidence, 4),
            },
            "confidence_scale": round(self._confidence_scale(confidence), 4),
        }
        if rationale:
            summary["decision"]["rationale"] = rationale
        if decision_notes:
            summary["decision"]["notes"] = decision_notes

        risk_summary: Dict[str, Any] = {}
        if risk_rationale:
            risk_summary["rationale"] = risk_rationale
        if risk_confidence is not None:
            risk_summary["confidence"] = round(risk_confidence, 4)
        if escalations:
            risk_summary["escalations"] = escalations
        if hedge_count:
            risk_summary["hedges_recommended"] = hedge_count
        if hedge_symbols:
            risk_summary["hedge_symbols"] = hedge_symbols
        if sizing_map:
            risk_summary["sizing"] = sizing_map
        if adjusted_action:
            risk_summary["adjusted_action"] = adjusted_action
        if adjusted_confidence is not None:
            risk_summary["adjusted_confidence"] = round(adjusted_confidence, 4)
        if risk_notes:
            risk_summary["notes"] = risk_notes
        if risk_summary:
            summary["risk"] = risk_summary

        allocation_bias = {
            label: round(multiplier, 4)
            for label, multiplier in adjustment.allocation_multipliers.items()
            if abs(multiplier - 1.0) > 1e-6
        }
        if allocation_bias:
            summary["allocation_bias"] = allocation_bias
        if adjustment.policy_adjustment_delta:
            summary["policy_delta"] = round(adjustment.policy_adjustment_delta, 4)

        production_scale = self._compute_production_scale(
            action,
            confidence,
            risk_confidence=risk_confidence,
            escalations=escalations,
            hedge_count=hedge_count,
            adjusted_action=adjusted_action,
            sizing=sizing_map,
            sizing_notes=risk_section.get("sizing") if isinstance(risk_section, Mapping) else None,
        )

        summary["production_scale"] = round(production_scale, 4)

        return summary, production_scale

    def _normalise_escalations(self, payload: Any) -> tuple[str, ...]:
        if payload is None:
            return ()
        if isinstance(payload, Mapping):
            items = payload.keys()
        elif isinstance(payload, Iterable) and not isinstance(payload, (str, bytes)):
            items = payload
        else:
            items = (payload,)
        normalised = []
        for item in items:
            text = str(item).strip()
            if text:
                normalised.append(text)
        seen: Dict[str, None] = {}
        for item in normalised:
            seen.setdefault(item, None)
        return tuple(seen.keys())

    def _summarise_hedges(self, payload: Any) -> tuple[int, tuple[str, ...]]:
        if payload is None:
            return 0, ()
        if isinstance(payload, Mapping):
            items = payload.values()
        elif isinstance(payload, Iterable) and not isinstance(payload, (str, bytes)):
            items = payload
        else:
            items = ()
        count = 0
        symbols: list[str] = []
        for entry in items:
            count += 1
            symbol = None
            if isinstance(entry, Mapping):
                symbol = entry.get("symbol") or entry.get("hedge_symbol")
            else:
                symbol = getattr(entry, "symbol", None) or getattr(entry, "hedge_symbol", None)
            if symbol:
                text = str(symbol).strip()
                if text:
                    symbols.append(text)
        seen: Dict[str, None] = {}
        for text in symbols:
            seen.setdefault(text, None)
        return count, tuple(seen.keys())

    def _normalise_sizing(self, payload: Any) -> Mapping[str, Any]:
        if payload is None:
            return {}
        if isinstance(payload, Mapping):
            candidate = dict(payload)
            notional = self._coerce_float(candidate.get("notional"), default=math.nan)
            leverage = self._coerce_float(candidate.get("leverage"), default=math.nan)
            notes = candidate.get("notes")
        else:
            notional = self._coerce_float(getattr(payload, "notional", None), default=math.nan)
            leverage = self._coerce_float(getattr(payload, "leverage", None), default=math.nan)
            notes = getattr(payload, "notes", None)

        result: Dict[str, Any] = {}
        if not math.isnan(notional):
            result["notional"] = round(notional, 4)
        if not math.isnan(leverage):
            result["leverage"] = round(leverage, 4)
        if notes:
            text = str(notes).strip()
            if text:
                result["notes"] = text
        return result

    def _collect_strings(self, payload: Any) -> tuple[str, ...]:
        if payload is None:
            return ()
        if isinstance(payload, str):
            text = payload.strip()
            return (text,) if text else ()
        if isinstance(payload, Mapping):
            results: list[str] = []
            for value in payload.values():
                results.extend(self._collect_strings(value))
            return tuple(results)
        if isinstance(payload, Iterable) and not isinstance(payload, (str, bytes)):
            results: list[str] = []
            for item in payload:
                results.extend(self._collect_strings(item))
            return tuple(results)
        text = str(payload).strip()
        return (text,) if text else ()

    def _compute_production_scale(
        self,
        action: str,
        confidence: float,
        *,
        risk_confidence: float | None,
        escalations: Sequence[str],
        hedge_count: int,
        adjusted_action: str | None,
        sizing: Mapping[str, Any],
        sizing_notes: Any,
    ) -> float:
        bounded_conf = max(0.0, min(1.0, confidence))
        shift = 0.0

        action_upper = action.upper()
        if action_upper == "BUY":
            shift += 0.1 + 0.25 * bounded_conf
        elif action_upper == "SELL":
            shift -= 0.25 + 0.35 * bounded_conf
        elif action_upper == "HOLD":
            shift -= 0.1 * bounded_conf
        else:
            shift -= 0.08 * bounded_conf

        if risk_confidence is not None:
            bounded_risk = max(0.0, min(1.0, risk_confidence))
            if bounded_risk < bounded_conf:
                shift -= (bounded_conf - bounded_risk) * 0.25
            else:
                shift += (bounded_risk - bounded_conf) * 0.1

        escalation_set = {item.lower() for item in escalations}
        if escalation_set:
            shift -= min(0.35, 0.12 * len(escalation_set))
            if "treasury_utilisation" in escalation_set:
                shift -= 0.1
            if "daily_drawdown" in escalation_set:
                shift -= 0.1

        if hedge_count:
            shift -= min(0.2, hedge_count * 0.05)

        if adjusted_action:
            adjusted_upper = adjusted_action.upper()
            if adjusted_upper == "NEUTRAL":
                shift -= 0.15
            elif adjusted_upper == "SELL":
                shift -= 0.1
            elif adjusted_upper == "BUY":
                shift += 0.04

        notional = self._coerce_float(sizing.get("notional") if sizing else None, default=math.nan)
        if not math.isnan(notional):
            if notional < 0.2:
                shift -= 0.08
            elif notional > 1.0:
                shift += 0.06
            elif notional > 0.5:
                shift += 0.03

        leverage = self._coerce_float(sizing.get("leverage") if sizing else None, default=math.nan)
        if not math.isnan(leverage):
            if leverage < 1.0:
                shift -= 0.05
            elif leverage > 2.0:
                shift += 0.04

        if sizing_notes:
            notes = self._collect_strings(sizing_notes)
            for note in notes:
                lowered = note.lower()
                if "reduce" in lowered or "conservative" in lowered or "trim" in lowered:
                    shift -= 0.04
                elif "increase" in lowered or "aggressive" in lowered or "expand" in lowered:
                    shift += 0.03

        return _clamp(1.0 + shift, lower=0.4, upper=1.15)

    def _build_agent_context(
        self, snapshot: "DCTMarketSnapshot", adjustment: DCTLLMAdjustment
    ) -> Dict[str, Any]:
        base_inputs = snapshot.price_inputs()
        adjusted_inputs = adjustment.apply_to_price_inputs(base_inputs)

        ton_price = adjusted_inputs.ton_price_usd
        trailing = max(adjusted_inputs.trailing_ton_price_usd, 1e-6)
        price_delta = _safe_divide(ton_price - trailing, trailing)

        demand = _clamp(adjusted_inputs.demand_index, lower=self.index_lower_bound, upper=self.index_upper_bound)
        performance = _clamp(
            adjusted_inputs.performance_index,
            lower=self.index_lower_bound,
            upper=self.index_upper_bound,
        )
        volatility = max(0.0, adjusted_inputs.volatility_index)
        policy = _clamp(
            adjusted_inputs.policy_adjustment,
            lower=self.policy_lower_bound,
            upper=self.policy_upper_bound,
        )

        demand_bias = demand - 0.5
        performance_bias = performance - 0.5
        buffer_ratio = max(0.0, snapshot.buffer_ratio)
        reward_budget_ratio = _safe_divide(
            snapshot.usd_reward_budget,
            max(snapshot.circulating_supply, 1.0),
        )

        trend = "neutral"
        if demand_bias >= 0.05 or performance_bias >= 0.05:
            trend = "bullish"
        elif demand_bias <= -0.05 or performance_bias <= -0.05:
            trend = "bearish"

        momentum = _clamp(performance_bias * 2.0, lower=-1.0, upper=1.0)
        support_strength = _clamp((buffer_ratio - 0.05) * 6.0, lower=-1.0, upper=1.0)
        resistance_pressure = _clamp((0.05 - buffer_ratio) * 6.0, lower=-1.0, upper=1.0)

        growth_score = _clamp(demand_bias * 2.0, lower=-1.0, upper=1.0)
        profitability = _clamp(performance_bias * 2.0, lower=-1.0, upper=1.0)
        valuation_score = _clamp(abs(policy) * 0.5, lower=0.0, upper=1.0)
        debt_ratio = _clamp(1.0 - buffer_ratio * 4.0, lower=0.0, upper=1.5)
        cash_flow_trend = _clamp(reward_budget_ratio * 10.0, lower=-1.0, upper=1.0)
        sample_size = max(100.0, snapshot.circulating_supply / 100.0)

        social_score = _clamp(demand_bias * 1.5, lower=-1.0, upper=1.0)
        news_bias = _clamp(-policy, lower=-1.0, upper=1.0)

        if demand_bias > 0 and volatility < 0.4:
            macro_regime = "risk-on"
        elif demand_bias < 0 and volatility >= 0.45:
            macro_regime = "risk-off"
        else:
            macro_regime = "neutral"
        inflation_trend = _clamp(volatility - 0.3, lower=-1.0, upper=1.0)
        growth_outlook = _clamp(performance_bias * 2.0, lower=-1.0, upper=1.0)
        policy_support = _clamp(-policy, lower=-1.0, upper=1.0)
        liquidity = _clamp(buffer_ratio * 4.0 + reward_budget_ratio * 8.0, lower=-1.0, upper=1.0)

        treasury_utilisation = _clamp(0.5 + policy, lower=0.0, upper=1.0)
        stress_index = _clamp(volatility, lower=0.0, upper=1.0)
        drawdown = -_clamp(volatility - 0.25, lower=-1.0, upper=1.0)
        halt = policy > 0.9

        risk_context = {
            "daily_drawdown": drawdown * 0.5,
            "treasury_utilisation": treasury_utilisation,
            "treasury_health": _clamp(1.0 - max(0.0, policy), lower=0.0, upper=1.5),
            "volatility": volatility,
        }

        market_state = {
            "volatility": {
                "DCT": max(0.0, volatility),
                "TON": abs(price_delta),
            },
            "correlations": (
                {
                    "symbol": "TON",
                    "coefficient": _clamp(0.2 + demand_bias, lower=-1.0, upper=1.0),
                },
            ),
            "news": (
                {
                    "headline": "DCT demand momentum",
                    "severity": "high"
                    if abs(demand_bias) > 0.15
                    else "medium"
                    if abs(demand_bias) > 0.05
                    else "low",
                    "impact": _clamp(demand_bias, lower=-1.0, upper=1.0),
                },
            ),
        }

        account_state = {
            "mode": "hedging",
            "exposures": (
                {
                    "symbol": "DCT",
                    "side": "LONG",
                    "quantity": max(1.0, snapshot.circulating_supply * 0.001),
                    "beta": 1.0,
                },
            ),
            "hedges": (
                {
                    "id": "TON_HEDGE",
                    "symbol": "DCT",
                    "hedge_symbol": "TON",
                    "side": "SHORT_HEDGE",
                    "qty": max(0.1, snapshot.circulating_supply * 0.0005),
                    "reason": "volatility",
                },
            ),
            "drawdown_r": drawdown,
            "risk_capital": max(0.0, snapshot.usd_reward_budget),
            "max_basket_risk": 1.5,
        }

        research_payload = {
            "technical": {
                "trend": trend,
                "momentum": momentum,
                "volatility": 1.0 + volatility,
                "support_strength": support_strength,
                "resistance_pressure": resistance_pressure,
                "moving_average_alignment": ["bullish" if price_delta >= 0 else "bearish"],
            },
            "fundamental": {
                "growth_score": growth_score,
                "valuation_score": valuation_score,
                "profitability": profitability,
                "debt_ratio": debt_ratio,
                "cash_flow_trend": cash_flow_trend,
                "sample_size": sample_size,
            },
            "sentiment": {
                "feeds": [
                    {
                        "score": growth_score,
                        "confidence": 0.6 + max(0.0, demand_bias) * 0.3,
                        "summary": "demand momentum strengthening"
                        if demand_bias >= 0
                        else "demand momentum cooling",
                    },
                    {
                        "score": profitability,
                        "confidence": 0.55 + max(0.0, performance_bias) * 0.25,
                        "summary": "performance uptick"
                        if performance_bias >= 0
                        else "performance pressure",
                    },
                ],
                "social_score": social_score,
                "news_bias": news_bias,
            },
            "macro": {
                "regime": macro_regime,
                "inflation_trend": inflation_trend,
                "growth_outlook": growth_outlook,
                "policy_support": policy_support,
                "liquidity": liquidity,
            },
            "risk": {
                "drawdown": drawdown,
                "treasury_utilisation": treasury_utilisation,
                "stress_index": stress_index,
                "halt": halt,
            },
        }

        market_payload = {
            "price": ton_price,
            "reference_price": trailing,
            "dispersion": abs(ton_price - trailing),
            "trend": trend,
            "momentum": momentum,
            "volatility": max(0.05, volatility),
            "session": "global",
            "sentiment": {"bias": growth_score},
            "treasury": {
                "balance": snapshot.usd_reward_budget,
                "liabilities": max(snapshot.circulating_supply, 1.0),
                "utilisation": treasury_utilisation,
            },
            "composite_scores": [
                growth_score,
                profitability,
                1.0 - stress_index,
            ],
        }

        risk_parameters = {
            "max_daily_drawdown": 0.08,
            "treasury_utilisation_cap": 0.65,
            "circuit_breaker_drawdown": 0.12,
        }

        return {
            "symbol": "DCT/TON",
            "market_symbol": "DCT/TON",
            "research_payload": research_payload,
            "market_payload": market_payload,
            "risk_payload": {
                "risk_context": risk_context,
                "market_state": market_state,
                "account_state": account_state,
                "risk_parameters": risk_parameters,
            },
            "risk_context": risk_context,
            "market_state": market_state,
            "account_state": account_state,
            "risk_parameters": risk_parameters,
            "order_size": max(0.0, snapshot.previous_epoch_mint),
        }

    def _modulate_adjustment(
        self, adjustment: DCTLLMAdjustment, agent_cycle: Mapping[str, Any]
    ) -> DCTLLMAdjustment:
        decision = agent_cycle.get("decision")
        action = "HOLD"
        confidence = 0.0
        if isinstance(decision, Mapping):
            action = str(decision.get("action", "HOLD")).upper() or "HOLD"
            confidence = _coerce_float(decision.get("confidence"), default=0.0)

        scale = self._confidence_scale(confidence)
        if action == "HOLD":
            scale *= 0.75
        elif action == "SELL":
            scale *= 0.65
        elif action == "BUY":
            scale *= 1.05

        agents_section = agent_cycle.get("agents") if isinstance(agent_cycle, Mapping) else None
        risk_section = agents_section.get("risk") if isinstance(agents_section, Mapping) else None
        if isinstance(risk_section, Mapping):
            risk_confidence = _coerce_float(risk_section.get("confidence"), default=confidence)
            scale = min(scale, self._confidence_scale(risk_confidence))

            escalations = risk_section.get("escalations")
            escalation_set: set[str] = set()
            if isinstance(escalations, Mapping):
                escalation_set = {str(key) for key in escalations.keys()}
            elif isinstance(escalations, Iterable) and not isinstance(escalations, (str, bytes)):
                escalation_set = {str(item) for item in escalations}
            elif escalations:
                escalation_set = {str(escalations)}
            if "treasury_utilisation" in escalation_set:
                scale *= 0.7
                action = "SELL"
            if "daily_drawdown" in escalation_set:
                scale *= 0.7

            adjusted_signal = risk_section.get("adjusted_signal")
            if isinstance(adjusted_signal, Mapping):
                risk_action = str(adjusted_signal.get("action", "")).upper()
                if risk_action == "HOLD":
                    scale = min(scale, 0.75)
                risk_confidence = _coerce_float(
                    adjusted_signal.get("confidence"), default=risk_confidence
                )
                scale = min(scale, self._confidence_scale(risk_confidence))

        scale = _clamp(scale, lower=0.2, upper=1.2)

        policy_delta = adjustment.policy_adjustment_delta * scale
        if action == "SELL":
            policy_delta = min(policy_delta, 0.0)
        elif action == "HOLD":
            policy_delta *= 0.5
        elif action == "BUY":
            policy_delta = max(policy_delta, adjustment.policy_adjustment_delta)
        policy_delta = _clamp(
            policy_delta,
            lower=adjustment.policy_lower_bound,
            upper=adjustment.policy_upper_bound,
        )

        demand_multiplier = self._scale_multiplier_value(
            adjustment.demand_index_multiplier, scale, action, lower=self.multiplier_lower_bound
        )
        performance_multiplier = self._scale_multiplier_value(
            adjustment.performance_index_multiplier,
            scale,
            action,
            lower=self.multiplier_lower_bound,
        )
        volatility_multiplier = self._scale_multiplier_value(
            adjustment.volatility_index_multiplier,
            scale,
            action,
            lower=self.multiplier_lower_bound,
        )

        allocation_multipliers = {
            label: self._scale_multiplier_value(value, scale, action, lower=0.0)
            for label, value in adjustment.allocation_multipliers.items()
        }

        return replace(
            adjustment,
            policy_adjustment_delta=policy_delta,
            demand_index_multiplier=demand_multiplier,
            performance_index_multiplier=performance_multiplier,
            volatility_index_multiplier=volatility_multiplier,
            allocation_multipliers=allocation_multipliers,
        )

    def _confidence_scale(self, confidence: float) -> float:
        bounded = max(0.0, min(1.0, confidence))
        return 0.4 + bounded * 0.6

    def _scale_multiplier_value(
        self, value: float, scale: float, action: str, *, lower: float
    ) -> float:
        scaled = 1.0 + (value - 1.0) * scale
        if action == "SELL":
            scaled = min(scaled, 1.0)
        elif action == "HOLD":
            scaled = 1.0 + (scaled - 1.0) * 0.5
        return _clamp(scaled, lower=lower, upper=self.multiplier_upper_bound)


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

        if optimisation is not None and optimisation.agent_production_scale != 1.0:
            plan = plan.scale(optimisation.agent_production_scale)

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
            if optimisation.agent_cycle:
                payload["llm_agent_cycle"] = dict(optimisation.agent_cycle)
            if optimisation.agent_summary:
                payload["llm_agent_summary"] = dict(optimisation.agent_summary)
            if optimisation.agent_production_scale != 1.0:
                payload["llm_agent_production_scale"] = round(
                    optimisation.agent_production_scale, 6
                )

        return self.writer.upsert([payload])
