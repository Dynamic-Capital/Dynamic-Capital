"""Hematologic intelligence primitives for Dynamic Capital."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from itertools import islice
from statistics import fmean
from typing import TYPE_CHECKING, Deque, Mapping, MutableMapping, Sequence
from dynamic_deep_learning.engine import (
    DynamicAgent,
    DynamicBot,
    DynamicKeeper,
    DynamicModel,
    LayerBlueprint,
    build_dynamic_ags_input_layers,
    build_dynamic_agi_input_layers,
    build_dynamic_ai_input_layers,
)

if TYPE_CHECKING:  # pragma: no cover - import cycle guard
    from dynamic.platform.token.engine import DCTEngineReport
    from dynamic_developer.agents import DeveloperAgentResultEnvelope

__all__ = [
    "BloodSample",
    "BloodContext",
    "BloodInsight",
    "BloodCapitalSynthesis",
    "CapitalOperationsPersona",
    "CapitalAutomationBot",
    "CapitalOperationsSuite",
    "DynamicBlood",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tuple(items: Sequence[str] | None, *, lower: bool = False) -> tuple[str, ...]:
    if not items:
        return ()
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        cleaned = item.strip()
        if not cleaned:
            continue
        if lower:
            cleaned = cleaned.lower()
        if cleaned in seen:
            continue
        seen.add(cleaned)
        result.append(cleaned)
    return tuple(result)


def _coerce_mapping(mapping: Mapping[str, float | int] | None) -> Mapping[str, float]:
    if mapping is None:
        return {}
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("mapping must be a mapping")
    coerced: dict[str, float] = {}
    for key, value in mapping.items():
        if not isinstance(key, str):  # pragma: no cover - defensive guard
            raise TypeError("mapping keys must be strings")
        cleaned_key = key.strip()
        if not cleaned_key:
            continue
        try:
            coerced[cleaned_key] = float(value)
        except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
            raise TypeError("mapping values must be numeric") from exc
    return coerced


def _normalise_metric(value: float, *, lower: float, upper: float) -> float:
    if upper <= lower:
        raise ValueError("upper bound must be greater than lower bound")
    return _clamp((value - lower) / (upper - lower))


def _oxygen_signal(sample: "BloodSample") -> float:
    """Compute the composite oxygen transport signal for a blood sample."""

    return (
        _normalise_metric(sample.rbc_count, lower=3.8, upper=6.0)
        + _normalise_metric(sample.hemoglobin, lower=11.5, upper=17.5)
        + _normalise_metric(sample.hematocrit, lower=0.34, upper=0.52)
    )


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class BloodSample:
    """Observation describing a single blood analytics capture."""

    rbc_count: float
    wbc_count: float
    platelet_count: float
    hemoglobin: float
    hematocrit: float
    plasma_volume: float
    lactate: float = 1.2
    ferritin: float | None = None
    inflammatory_markers: Mapping[str, float | int] | None = None
    micronutrients: Mapping[str, float | int] | None = None
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.rbc_count = max(float(self.rbc_count), 0.0)
        self.wbc_count = max(float(self.wbc_count), 0.0)
        self.platelet_count = max(float(self.platelet_count), 0.0)
        self.hemoglobin = max(float(self.hemoglobin), 0.0)
        self.hematocrit = _clamp(float(self.hematocrit), lower=0.0, upper=1.0)
        self.plasma_volume = max(float(self.plasma_volume), 0.0)
        self.lactate = max(float(self.lactate), 0.0)
        self.ferritin = None if self.ferritin is None else max(float(self.ferritin), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tuple(self.tags, lower=True)
        self.inflammatory_markers = _coerce_mapping(self.inflammatory_markers)
        self.micronutrients = _coerce_mapping(self.micronutrients)
        self.metadata = dict(self.metadata) if self.metadata is not None else None

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "rbc_count": self.rbc_count,
            "wbc_count": self.wbc_count,
            "platelet_count": self.platelet_count,
            "hemoglobin": self.hemoglobin,
            "hematocrit": self.hematocrit,
            "plasma_volume": self.plasma_volume,
            "lactate": self.lactate,
            "ferritin": self.ferritin,
            "inflammatory_markers": dict(self.inflammatory_markers),
            "micronutrients": dict(self.micronutrients),
            "timestamp": self.timestamp,
            "tags": list(self.tags),
            "metadata": dict(self.metadata) if self.metadata is not None else None,
        }


@dataclass(slots=True)
class BloodContext:
    """Contextual factors informing blood state interpretation."""

    hydration_level: float
    stress_index: float
    altitude_meters: float
    recent_activity: float
    sleep_quality: float = 0.6
    temperature_exposure: float = 0.5
    medications: tuple[str, ...] = field(default_factory=tuple)
    conditions: tuple[str, ...] = field(default_factory=tuple)
    notes: str | None = None

    def __post_init__(self) -> None:
        self.hydration_level = _clamp(float(self.hydration_level))
        self.stress_index = _clamp(float(self.stress_index))
        self.altitude_meters = max(float(self.altitude_meters), 0.0)
        self.recent_activity = _clamp(float(self.recent_activity))
        self.sleep_quality = _clamp(float(self.sleep_quality))
        self.temperature_exposure = _clamp(float(self.temperature_exposure))
        self.medications = _normalise_tuple(self.medications, lower=True)
        self.conditions = _normalise_tuple(self.conditions, lower=True)
        self.notes = _normalise_optional_text(self.notes)

    @property
    def is_dehydrated(self) -> bool:
        return self.hydration_level <= 0.35

    @property
    def is_high_stress(self) -> bool:
        return self.stress_index >= 0.65

    @property
    def is_altitude_load(self) -> bool:
        return self.altitude_meters >= 1500


@dataclass(slots=True)
class BloodInsight:
    """Synthesised assessment describing the current blood state."""

    oxygen_delivery_score: float
    immune_vigilance_score: float
    clotting_poise_score: float
    metabolic_recovery_score: float
    hydration_index: float
    stability_index: float
    trend_velocity: float
    flags: tuple[str, ...]
    recommendations: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "oxygen_delivery_score": self.oxygen_delivery_score,
            "immune_vigilance_score": self.immune_vigilance_score,
            "clotting_poise_score": self.clotting_poise_score,
            "metabolic_recovery_score": self.metabolic_recovery_score,
            "hydration_index": self.hydration_index,
            "stability_index": self.stability_index,
            "trend_velocity": self.trend_velocity,
            "flags": list(self.flags),
            "recommendations": list(self.recommendations),
            "narrative": self.narrative,
        }


def _layer_to_dict(layer: LayerBlueprint) -> MutableMapping[str, object]:
    return {
        "name": layer.name,
        "units": layer.units,
        "activation": layer.activation,
        "dropout": layer.dropout,
    }


def _normalise_layers(
    layers: Sequence[LayerBlueprint],
) -> tuple[LayerBlueprint, ...]:
    return tuple(layers)


def _summarise_token_report(
    token_report: "DCTEngineReport" | Mapping[str, object]
) -> tuple[MutableMapping[str, object], float, float, float, float]:
    if isinstance(token_report, Mapping):
        summary: MutableMapping[str, object] = dict(token_report)
        price: float | None = None
        minted: float | None = None
        allocation_total: float | None = None
        residual: float | None = None
    else:
        summary = token_report.to_dict()
        price = None
        minted = None
        allocation_total = None
        residual = None

        if hasattr(token_report, "price_breakdown"):
            price = getattr(token_report.price_breakdown, "final_price", None)
        if hasattr(token_report, "effective_plan"):
            minted = getattr(token_report.effective_plan, "final_mint", None)
        if hasattr(token_report, "allocation_total"):
            try:
                allocation_total = float(token_report.allocation_total)
            except TypeError:
                allocation_total = None
        if hasattr(token_report, "allocation_residual"):
            try:
                residual = float(token_report.allocation_residual)
            except TypeError:
                residual = None

    if "price" in summary:
        price = float(summary["price"])
    else:
        price = None

    price_breakdown = summary.get("price_breakdown")
    if price is None and isinstance(price_breakdown, Mapping):
        extracted = price_breakdown.get("final_price")
        price = float(extracted) if extracted is not None else None

    if price is None:
        price = 0.0
    else:
        price = float(price)

    effective_plan = summary.get("effective_plan")
    if minted is None and isinstance(effective_plan, Mapping):
        minted_value = effective_plan.get("final_mint")
        if minted_value is not None:
            minted = float(minted_value)
    if minted is None:
        minted = 0.0

    allocation_total_summary = summary.get("allocation_total")
    if allocation_total_summary is not None:
        allocation_total = float(allocation_total_summary)
    if allocation_total is None:
        allocation_total = 0.0

    residual_summary = summary.get("allocation_residual")
    if residual_summary is not None:
        residual = float(residual_summary)
    if residual is None:
        residual = minted - allocation_total

    summary["price"] = price
    if not isinstance(summary.get("effective_plan"), Mapping):
        summary["effective_plan"] = {"final_mint": minted}
    else:
        effective_plan_mapping = dict(summary["effective_plan"])
        effective_plan_mapping.setdefault("final_mint", minted)
        summary["effective_plan"] = effective_plan_mapping
    summary["allocation_total"] = allocation_total
    summary["allocation_residual"] = residual

    return summary, price, minted, allocation_total, residual


@dataclass(slots=True)
class BloodCapitalSynthesis:
    """Combined view aligning blood insights with Dynamic Capital Token outputs."""

    insight: BloodInsight
    token_summary: Mapping[str, object]
    ai_layers: tuple[LayerBlueprint, ...]
    agi_layers: tuple[LayerBlueprint, ...]
    ags_layers: tuple[LayerBlueprint, ...]
    token_price: float
    minted_supply: float
    allocation_total: float
    residual_supply: float
    narrative: str
    operations: "CapitalOperationsSuite"

    def __post_init__(self) -> None:
        self.token_summary = dict(self.token_summary)
        self.ai_layers = _normalise_layers(self.ai_layers)
        self.agi_layers = _normalise_layers(self.agi_layers)
        self.ags_layers = _normalise_layers(self.ags_layers)
        self.token_price = float(self.token_price)
        self.minted_supply = float(self.minted_supply)
        self.allocation_total = float(self.allocation_total)
        self.residual_supply = float(self.residual_supply)
        self.narrative = _normalise_optional_text(self.narrative) or ""
        if not isinstance(self.operations, CapitalOperationsSuite):  # pragma: no cover - defensive
            raise TypeError("operations must be a CapitalOperationsSuite")

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "insight": self.insight.as_dict(),
            "token": dict(self.token_summary),
            "token_price": self.token_price,
            "minted_supply": self.minted_supply,
            "allocation_total": self.allocation_total,
            "residual_supply": self.residual_supply,
            "models": {
                "dynamic_ai": [_layer_to_dict(layer) for layer in self.ai_layers],
                "dynamic_agi": [_layer_to_dict(layer) for layer in self.agi_layers],
                "dynamic_ags": [_layer_to_dict(layer) for layer in self.ags_layers],
            },
            "narrative": self.narrative,
            "operations": self.operations.as_dict(),
        }


@dataclass(slots=True)
class CapitalOperationsPersona:
    """Role descriptor for capital operations managers and workers."""

    name: str
    focus: tuple[str, ...]
    responsibilities: tuple[str, ...]
    cadence: str = "daily"

    def __post_init__(self) -> None:
        self.name = _normalise_optional_text(self.name) or "operations"
        self.focus = _normalise_tuple(self.focus)
        self.responsibilities = _normalise_tuple(self.responsibilities)
        self.cadence = _normalise_optional_text(self.cadence) or "daily"

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "focus": list(self.focus),
            "responsibilities": list(self.responsibilities),
            "cadence": self.cadence,
        }


@dataclass(slots=True)
class CapitalAutomationBot:
    """Automation bot wrapper exposing cadence and purpose."""

    name: str
    bot: DynamicBot
    purpose: str
    cadence: str = "hourly"

    def __post_init__(self) -> None:
        self.name = _normalise_optional_text(self.name) or "automation"
        self.purpose = _normalise_optional_text(self.purpose) or ""
        self.cadence = _normalise_optional_text(self.cadence) or "hourly"

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "purpose": self.purpose,
            "cadence": self.cadence,
            "agent_summary": self.bot.agent.summary(),
        }


@dataclass(slots=True)
class _DeveloperFallbackEnvelope:
    """Minimal stand-in when developer agents are unavailable."""

    iteration: str
    objectives: tuple[str, ...]
    horizon_days: int
    blockers: tuple[str, ...] = ()
    notes: MutableMapping[str, object] = field(default_factory=dict)

    def summary(self) -> str:
        objectives = ", ".join(self.objectives) if self.objectives else "no objectives"
        return f"{self.iteration} – {objectives}"

    def to_dict(self) -> MutableMapping[str, object]:
        return {
            "model": {
                "iteration": self.iteration,
                "objectives": list(self.objectives),
                "horizon_days": self.horizon_days,
                "roles": {},
                "summary": self.summary(),
                "blueprint": {
                    "scheduled_tasks": [],
                    "deferred_tasks": [],
                    "blockers": list(self.blockers),
                },
            },
            "playbooks": {},
            "blockers": list(self.blockers),
            "notes": dict(self.notes),
            "summary": self.summary(),
        }


def _build_developer_fallback(
    iteration: str,
    objectives: Sequence[str],
    *,
    horizon_days: int,
    blockers: Sequence[str],
    notes: Mapping[str, object],
) -> _DeveloperFallbackEnvelope:
    return _DeveloperFallbackEnvelope(
        iteration=_normalise_optional_text(iteration) or "blood-capital-iteration",
        objectives=_normalise_tuple(objectives),
        horizon_days=int(horizon_days),
        blockers=_normalise_tuple(blockers),
        notes=dict(notes),
    )


@dataclass(slots=True)
class CapitalOperationsSuite:
    """Container bundling model, keeper, developers, and automation personas."""

    model: DynamicModel
    agent: DynamicAgent
    keeper: DynamicKeeper
    developer: "DeveloperAgentResultEnvelope | _DeveloperFallbackEnvelope"
    managers: tuple[CapitalOperationsPersona, ...]
    workers: tuple[CapitalOperationsPersona, ...]
    bots: tuple[CapitalAutomationBot, ...]
    keeper_domain: str = "dynamic_blood_capital"

    def __post_init__(self) -> None:
        self.managers = tuple(self.managers)
        self.workers = tuple(self.workers)
        self.bots = tuple(self.bots)
        self.keeper_domain = _normalise_optional_text(self.keeper_domain) or "dynamic_blood_capital"
        if not hasattr(self.developer, "to_dict"):
            raise TypeError("developer must expose to_dict()")

    def _keeper_profile(self) -> list[MutableMapping[str, object]]:
        try:
            profile = self.keeper.get_profile(self.keeper_domain)
        except ValueError:
            return []
        payload: list[MutableMapping[str, object]] = []
        for layer in profile:
            payload.append(
                {
                    "name": layer.name,
                    "expansion": layer.expansion,
                    "activation": layer.activation,
                    "dropout": layer.dropout,
                    "max_units": layer.max_units,
                }
            )
        return payload

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "model": {
                "summary": self.model.summary(),
                "input_dim": self.model.spec.input_dim,
                "output_dim": self.model.spec.output_dim,
                "layer_count": len(self.model.spec.layers),
                "layers": [
                    {
                        "name": layer.name,
                        "input_dim": layer.input_dim,
                        "output_dim": layer.output_dim,
                        "activation": layer.activation,
                        "dropout": layer.dropout,
                    }
                    for layer in self.model.spec.layers
                ],
            },
            "agent": {"summary": self.agent.summary()},
            "keeper": {
                "domain": self.keeper_domain,
                "profile": self._keeper_profile(),
            },
            "developer": self.developer.to_dict(),
            "managers": [persona.as_dict() for persona in self.managers],
            "workers": [persona.as_dict() for persona in self.workers],
            "bots": [bot.as_dict() for bot in self.bots],
        }

# ---------------------------------------------------------------------------
# engine


@dataclass(slots=True)
class _SampleSignals:
    """Pre-computed metrics derived from an ingested blood sample."""

    oxygen_signal: float
    wbc_score: float
    inflammation_penalty: float
    platelet_score: float
    plasma_score: float
    lactate_score: float
    ferritin_bonus: float
    hydration_index: float

    @classmethod
    def from_sample(cls, sample: "BloodSample") -> "_SampleSignals":
        inflammatory_penalty = 0.0
        if sample.inflammatory_markers:
            normalised_values = [
                _clamp(value / 10.0) for value in sample.inflammatory_markers.values()
            ]
            if normalised_values:
                inflammatory_penalty = fmean(normalised_values) * 0.4

        ferritin_bonus = 0.0
        if sample.ferritin is not None:
            ferritin_bonus = _normalise_metric(sample.ferritin, lower=30.0, upper=200.0) * 0.05

        return cls(
            oxygen_signal=_oxygen_signal(sample),
            wbc_score=_normalise_metric(sample.wbc_count, lower=4.0, upper=11.0),
            inflammation_penalty=inflammatory_penalty,
            platelet_score=_normalise_metric(sample.platelet_count, lower=150.0, upper=400.0),
            plasma_score=_normalise_metric(sample.plasma_volume or 1.0, lower=2.5, upper=4.5),
            lactate_score=1.0 - _clamp(sample.lactate / 6.0),
            ferritin_bonus=ferritin_bonus,
            hydration_index=_normalise_metric(sample.plasma_volume or 1.0, lower=2.7, upper=4.2),
        )


class DynamicBlood:
    """Hematologic reasoning engine for monitoring dynamic blood states."""

    def __init__(self, *, window: int = 16) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._history: Deque[BloodSample] = deque(maxlen=window)
        self._oxygen_history: Deque[float] = deque(maxlen=window)
        self._signals_history: Deque[_SampleSignals] = deque(maxlen=window)

    @property
    def history(self) -> tuple[BloodSample, ...]:
        return tuple(self._history)

    def ingest(self, sample: BloodSample) -> None:
        """Record a blood sample for downstream analysis."""

        if not isinstance(sample, BloodSample):  # pragma: no cover - defensive guard
            raise TypeError("sample must be a BloodSample")
        self._history.append(sample)
        signals = _SampleSignals.from_sample(sample)
        self._signals_history.append(signals)
        self._oxygen_history.append(signals.oxygen_signal)

    def assess(self, *, context: BloodContext | None = None) -> BloodInsight:
        """Generate a blood insight from the latest sample and optional context."""

        if not self._history:
            raise ValueError("no blood samples available for assessment")
        sample = self._history[-1]
        if len(self._signals_history) < len(self._history):
            signals = _SampleSignals.from_sample(sample)
            self._signals_history.append(signals)
        else:
            signals = self._signals_history[-1]
        oxygen_baseline = signals.oxygen_signal / 3.0
        altitude_boost = 0.0
        hydration_penalty = 0.0
        sleep_boost = 0.0
        stress_penalty = 0.0
        if context is not None:
            altitude_boost = _clamp(context.altitude_meters / 3000.0) * 0.08
            hydration_penalty = (1.0 - context.hydration_level) * 0.12
            sleep_boost = (context.sleep_quality - 0.5) * 0.06
            stress_penalty = context.stress_index * 0.05
        oxygen_delivery = _clamp(
            oxygen_baseline + altitude_boost + sleep_boost - hydration_penalty - stress_penalty
        )

        inflammation_penalty = signals.inflammation_penalty
        wbc_score = signals.wbc_score
        immune_context_penalty = 0.0
        if context is not None:
            immune_context_penalty = context.stress_index * 0.08
        immune_vigilance = _clamp(wbc_score - inflammation_penalty - immune_context_penalty + 0.02)

        platelet_score = signals.platelet_score
        plasma_score = signals.plasma_score
        clotting_penalty = 0.0
        if context is not None and context.is_dehydrated:
            clotting_penalty += 0.08
        clotting_poise = _clamp(
            fmean((platelet_score, plasma_score)) - clotting_penalty
        )

        lactate_score = signals.lactate_score
        ferritin_bonus = signals.ferritin_bonus
        activity_penalty = 0.0
        if context is not None:
            activity_penalty = context.recent_activity * 0.07
        metabolic_recovery = _clamp(lactate_score + ferritin_bonus - activity_penalty)

        hydration_index = signals.hydration_index
        if context is not None:
            hydration_index = _clamp((hydration_index * 0.6) + (context.hydration_level * 0.4))

        stability_index = fmean(
            (
                oxygen_delivery,
                immune_vigilance,
                clotting_poise,
                metabolic_recovery,
                hydration_index,
            )
        )

        trend_velocity = 0.0
        oxygen_history_size = len(self._oxygen_history)
        if oxygen_history_size >= 2:
            start_index = max(oxygen_history_size - 3, 0)
            recent = tuple(islice(self._oxygen_history, start_index, oxygen_history_size))
            if len(recent) >= 2:
                steps = len(recent) - 1
                baseline_delta = recent[-1] - recent[0]
                trend_velocity = _clamp(baseline_delta / steps, lower=-1.0, upper=1.0)

        flags: list[str] = []
        if oxygen_delivery < 0.45:
            flags.append("oxygen_delivery_low")
        if immune_vigilance < 0.4:
            flags.append("immune_vigilance_low")
        if clotting_poise < 0.4:
            flags.append("clotting_poise_low")
        if metabolic_recovery < 0.4:
            flags.append("metabolic_recovery_low")
        if hydration_index < 0.4:
            flags.append("hydration_low")
        if context is not None and context.is_high_stress:
            flags.append("high_stress_context")

        recommendations: list[str] = []
        if context is not None and context.is_dehydrated:
            recommendations.append("increase_fluid_intake")
        if metabolic_recovery < 0.45:
            recommendations.append("prioritise_recovery_protocols")
        if immune_vigilance < 0.5:
            recommendations.append("support_immune_system")
        if sample.ferritin is not None and sample.ferritin < 40:
            recommendations.append("evaluate_iron_status")
        if oxygen_delivery < 0.5:
            recommendations.append("optimize_erythropoiesis")

        narrative_parts: list[str] = [
            f"Oxygen delivery sits at {oxygen_delivery:.0%}",
            f"immune vigilance at {immune_vigilance:.0%}",
            f"and clotting poise at {clotting_poise:.0%}.",
        ]
        narrative_parts.append(
            f"Metabolic recovery registers {metabolic_recovery:.0%} with hydration at {hydration_index:.0%}."
        )
        if flags:
            narrative_parts.append(f"Flags: {', '.join(flags)}.")
        elif recommendations:
            narrative_parts.append("Subclinical adjustments recommended.")
        else:
            narrative_parts.append("Profile remains stable without critical alerts.")
        narrative = " ".join(narrative_parts)

        return BloodInsight(
            oxygen_delivery_score=oxygen_delivery,
            immune_vigilance_score=immune_vigilance,
            clotting_poise_score=clotting_poise,
            metabolic_recovery_score=metabolic_recovery,
            hydration_index=hydration_index,
            stability_index=stability_index,
            trend_velocity=trend_velocity,
            flags=tuple(flags),
            recommendations=tuple(recommendations),
            narrative=narrative,
        )

    def rolling_window(self) -> int:
        return self._history.maxlen or 0

    def clear(self) -> None:
        self._history.clear()
        self._oxygen_history.clear()
        self._signals_history.clear()

    def synthesise_capital_alignment(
        self,
        token_report: "DCTEngineReport" | Mapping[str, object],
        *,
        context: BloodContext | None = None,
        ai_base_dim: int | None = None,
    ) -> BloodCapitalSynthesis:
        """Fuse blood insights with Dynamic Capital Token outputs and model scaffolds."""

        insight = self.assess(context=context)

        if ai_base_dim is None:
            ai_base_dim = max(4, int(round(insight.stability_index * 10)) + len(insight.flags))
        else:
            ai_base_dim = max(1, int(ai_base_dim))

        summary, price, minted, allocation_total, residual = _summarise_token_report(
            token_report
        )

        ai_layers = build_dynamic_ai_input_layers(ai_base_dim)
        agi_layers = build_dynamic_agi_input_layers(ai_base_dim + 2)
        ags_layers = build_dynamic_ags_input_layers(ai_base_dim + 4)

        ai_tail = ai_layers[-1].units if ai_layers else ai_base_dim
        agi_tail = agi_layers[-1].units if agi_layers else ai_base_dim + 2
        ags_tail = ags_layers[-1].units if ags_layers else ai_base_dim + 4

        notes = summary.get("notes")
        if isinstance(notes, Sequence) and not isinstance(notes, (str, bytes)):
            joined_notes = ", ".join(str(item) for item in notes if item)
        else:
            joined_notes = str(notes) if notes else ""

        narrative_parts = [
            f"DCT priced at {price:.2f} with {minted:.2f} tokens minted and {residual:.2f} residual supply.",
            f"Blood stability holds at {insight.stability_index:.0%} with oxygen {insight.oxygen_delivery_score:.0%}.",
            (
                "Dynamic AI/AGI/AGS layers configured for treasury alignment "
                f"({ai_tail}/{agi_tail}/{ags_tail} units)."
            ),
        ]
        if joined_notes:
            narrative_parts.append(f"Token notes: {joined_notes}.")

        narrative = " ".join(narrative_parts)

        output_units = max(1, int(round(max(insight.stability_index, 0.1) * 12)))
        output_layers = ags_layers + (
            LayerBlueprint(
                name="dbc_alignment_head",
                units=output_units,
                activation="softmax",
                dropout=0.0,
            ),
        )

        learning_rate = 0.01 + (1.0 - insight.stability_index) * 0.05
        model = DynamicModel.from_layer_groups(
            input_dim=ai_base_dim,
            input_layers=ai_layers,
            hidden_layers=agi_layers,
            output_layers=output_layers,
            learning_rate=learning_rate,
            momentum=0.1,
            l2_regularisation=0.0005,
        )
        agent = DynamicAgent(model)

        keeper = DynamicKeeper()
        keeper_domain = "dynamic_blood_capital"
        keeper.register_domain(
            keeper_domain,
            (
                {
                    "name": "dbc_oxygen_alignment",
                    "expansion": 1.0 + insight.oxygen_delivery_score * 0.5,
                    "activation": "relu",
                    "dropout": 0.05,
                    "max_units": 640,
                },
                {
                    "name": "dbc_liquidity_bridge",
                    "expansion": 1.0 + insight.stability_index * 0.3,
                    "activation": "tanh",
                    "dropout": 0.05,
                    "max_units": 512,
                },
                {
                    "name": "dbc_governance_head",
                    "expansion": 0.9,
                    "activation": "sigmoid",
                    "dropout": 0.0,
                    "max_units": 256,
                },
            ),
        )

        risk_bias = 1.0 - insight.stability_index
        dev_tasks = [
            {
                "identifier": "treasury-alignment-bridge",
                "description": (
                    "Sync Dynamic Capital Token treasury automation with blood stability metrics"
                    " and residual supply buffers."
                ),
                "effort_hours": 6.0 + len(insight.flags) * 1.5,
                "impact": float(_clamp(0.8 + risk_bias * 0.2)),
                "tags": ("blockchain", "treasury", "manager"),
                "domain": "blockchain",
            },
            {
                "identifier": "biomarker-telemetry-harness",
                "description": (
                    "Extend biomarker ingestion surfaces for frontline workers to monitor oxygen"
                    " and hydration variance."
                ),
                "effort_hours": 4.0 + len(insight.recommendations) * 0.5,
                "impact": float(_clamp(0.65 + risk_bias * 0.1)),
                "tags": ("frontend", "worker", "analytics"),
                "domain": "frontend",
            },
            {
                "identifier": "operations-playbook-updates",
                "description": (
                    "Refresh capital operations playbooks with escalation paths for managers and"
                    " worker rotations informed by blood insights."
                ),
                "effort_hours": 3.5,
                "impact": float(_clamp(0.55 + risk_bias * 0.3)),
                "tags": ("manager", "operations", "documentation"),
                "domain": "general",
            },
        ]

        developer_objectives = (
            "Align DCT treasury controls with blood resilience metrics",
            "Operationalise telemetry for hydration and immune drift",
        )
        developer_context: MutableMapping[str, object] = {
            "token_price": price,
            "minted_supply": minted,
            "residual_supply": residual,
            "allocation_total": allocation_total,
            "flags": list(insight.flags),
            "recommendations": list(insight.recommendations),
            "stability_index": insight.stability_index,
            "hydration_index": insight.hydration_index,
        }
        try:
            from dynamic_developer.agents import DeveloperAgent
        except Exception:  # pragma: no cover - optional dependency
            developer_agent = None
        else:
            try:
                developer_agent = DeveloperAgent()
            except Exception:  # pragma: no cover - engine bootstrap fallback
                developer_agent = None

        if developer_agent is not None:
            try:
                developer_envelope = developer_agent.run(
                    dev_tasks,
                    iteration="blood-capital-alignment",
                    objectives=developer_objectives,
                    context=developer_context,
                    horizon_days=7,
                )
            except Exception:  # pragma: no cover - runtime fallback
                developer_envelope = _build_developer_fallback(
                    "blood-capital-alignment",
                    developer_objectives,
                    horizon_days=7,
                    blockers=insight.flags,
                    notes={
                        "context": dict(developer_context),
                        "fallback": True,
                    },
                )
        else:
            developer_envelope = _build_developer_fallback(
                "blood-capital-alignment",
                developer_objectives,
                horizon_days=7,
                blockers=insight.flags,
                notes={
                    "context": dict(developer_context),
                    "fallback": True,
                },
            )

        manager_personas = (
            CapitalOperationsPersona(
                name="treasury_manager",
                focus=("liquidity", "allocation_governance"),
                responsibilities=(
                    f"Track minted supply {minted:.2f} and residual {residual:.2f}",
                    "Coordinate blockchain developer releases for treasury automation",
                ),
                cadence="daily",
            ),
            CapitalOperationsPersona(
                name="health_operations_manager",
                focus=("blood_stability", "preventive_actions"),
                responsibilities=(
                    "Translate blood recommendations into capital control updates",
                    "Escalate hydration or immune flags to frontline workers",
                ),
                cadence="per-shift",
            ),
        )

        worker_personas = (
            CapitalOperationsPersona(
                name="biomarker_worker",
                focus=("blood_analytics", "sampling"),
                responsibilities=(
                    "Capture new blood samples and maintain telemetry ingestion",
                    "Report lactate and hydration variance to managers",
                ),
                cadence="per-shift",
            ),
            CapitalOperationsPersona(
                name="treasury_worker",
                focus=("treasury_ops", "liquidity_execution"),
                responsibilities=(
                    "Execute mint and burn operations following developer playbooks",
                    f"Monitor DCT price guardrails near {price:.2f}",
                ),
                cadence="hourly",
            ),
        )

        bots = (
            CapitalAutomationBot(
                name="treasury_alignment_bot",
                bot=DynamicBot(agent),
                purpose="Run scheduled training for treasury alignment datasets",
                cadence="hourly",
            ),
            CapitalAutomationBot(
                name="biomarker_alert_bot",
                bot=DynamicBot(agent),
                purpose="Scan blood telemetry for anomalies and alert managers",
                cadence="15-minute",
            ),
        )

        operations = CapitalOperationsSuite(
            model=model,
            agent=agent,
            keeper=keeper,
            developer=developer_envelope,
            managers=manager_personas,
            workers=worker_personas,
            bots=bots,
            keeper_domain=keeper_domain,
        )

        return BloodCapitalSynthesis(
            insight=insight,
            token_summary=summary,
            ai_layers=ai_layers,
            agi_layers=agi_layers,
            ags_layers=ags_layers,
            token_price=price,
            minted_supply=minted,
            allocation_total=allocation_total,
            residual_supply=residual,
            narrative=narrative,
            operations=operations,
        )
