"""Regenerative intelligence engine modeling dynamic stem cell states."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "StemCellSignal",
    "StemCellContext",
    "StemCellProfile",
    "DynamicStemCell",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    normalised = value.strip()
    if not normalised:
        raise ValueError("text must not be empty")
    return normalised


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tuple(items: Sequence[str] | None, *, lower: bool = False) -> tuple[str, ...]:
    if not items:
        return ()
    seen: set[str] = set()
    cleaned_items: list[str] = []
    for item in items:
        cleaned = item.strip()
        if not cleaned:
            continue
        if lower:
            cleaned = cleaned.lower()
        if cleaned in seen:
            continue
        seen.add(cleaned)
        cleaned_items.append(cleaned)
    return tuple(cleaned_items)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


@dataclass(slots=True)
class StemCellSignal:
    """State observation from a stem cell culture."""

    niche: str
    lineage_hint: str
    potency: float = 0.5
    plasticity: float = 0.5
    stress_resilience: float = 0.5
    metabolic_reserve: float = 0.5
    activation: float = 0.5
    signal_strength: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.niche = _normalise_lower(self.niche)
        self.lineage_hint = _normalise_lower(self.lineage_hint or "undirected")
        self.potency = _clamp(float(self.potency))
        self.plasticity = _clamp(float(self.plasticity))
        self.stress_resilience = _clamp(float(self.stress_resilience))
        self.metabolic_reserve = _clamp(float(self.metabolic_reserve))
        self.activation = _clamp(float(self.activation))
        self.signal_strength = _clamp(float(self.signal_strength))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tuple(self.tags, lower=True)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class StemCellContext:
    """Environmental description for stem cell orchestration."""

    niche: str
    culture_phase: str
    oxygen_level: float
    nutrient_level: float
    shear_stress: float
    maintenance_bias: float
    target_lineages: tuple[str, ...] = field(default_factory=tuple)
    stimulatory_factors: tuple[str, ...] = field(default_factory=tuple)
    inhibitory_signals: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.niche = _normalise_lower(self.niche)
        self.culture_phase = _normalise_text(self.culture_phase)
        self.oxygen_level = _clamp(float(self.oxygen_level))
        self.nutrient_level = _clamp(float(self.nutrient_level))
        self.shear_stress = _clamp(float(self.shear_stress))
        self.maintenance_bias = _clamp(float(self.maintenance_bias))
        self.target_lineages = _normalise_tuple(self.target_lineages, lower=True)
        self.stimulatory_factors = _normalise_tuple(self.stimulatory_factors, lower=True)
        self.inhibitory_signals = _normalise_tuple(self.inhibitory_signals, lower=True)

    @property
    def is_hypoxic(self) -> bool:
        return self.oxygen_level <= 0.35

    @property
    def is_high_shear(self) -> bool:
        return self.shear_stress >= 0.65

    @property
    def is_differentiation_phase(self) -> bool:
        return self.maintenance_bias <= 0.4


@dataclass(slots=True)
class StemCellProfile:
    """Synthesised profile describing the stem cell collective state."""

    potency_score: float
    stability_index: float
    differentiation_readiness: float
    lineage_bias: tuple[str, ...]
    alert_flags: tuple[str, ...]
    recommended_interventions: tuple[str, ...]
    monitoring_focus: tuple[str, ...]
    metabolic_notes: str
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "potency_score": self.potency_score,
            "stability_index": self.stability_index,
            "differentiation_readiness": self.differentiation_readiness,
            "lineage_bias": list(self.lineage_bias),
            "alert_flags": list(self.alert_flags),
            "recommended_interventions": list(self.recommended_interventions),
            "monitoring_focus": list(self.monitoring_focus),
            "metabolic_notes": self.metabolic_notes,
            "narrative": self.narrative,
        }


class DynamicStemCell:
    """Aggregate signals to steer stem cell programs in real time."""

    _STAT_ATTRIBUTES = (
        "potency",
        "plasticity",
        "stress_resilience",
        "metabolic_reserve",
        "activation",
        "signal_strength",
    )

    def __init__(self, *, history: int = 72) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[StemCellSignal] = deque(maxlen=history)

    # ---------------------------------------------------------------- intake
    def capture(self, signal: StemCellSignal | Mapping[str, object]) -> StemCellSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[StemCellSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    def _coerce_signal(self, signal: StemCellSignal | Mapping[str, object]) -> StemCellSignal:
        if isinstance(signal, StemCellSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return StemCellSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be StemCellSignal or mapping")

    # ------------------------------------------------------------ computation
    def generate_profile(self, context: StemCellContext) -> StemCellProfile:
        if not self._signals:
            raise RuntimeError("no stem cell signals captured")

        averages, lineage_counter = self._signal_statistics()

        potency = averages["potency"]
        plasticity = averages["plasticity"]
        stress_resilience = averages["stress_resilience"]
        metabolic_reserve = averages["metabolic_reserve"]
        activation = averages["activation"]
        signal_strength = averages["signal_strength"]

        environment_alignment = self._environment_alignment(context, stress_resilience, metabolic_reserve)
        potency_score = _clamp(0.55 * potency + 0.35 * plasticity + 0.1 * environment_alignment)
        stability_index = _clamp(0.6 * stress_resilience + 0.3 * metabolic_reserve + 0.1 * environment_alignment)
        differentiation_readiness = self._differentiation_readiness(context, activation, signal_strength, plasticity)

        lineage_bias = self._dominant_lineages(lineage_counter)
        alerts = self._alert_flags(context, potency_score, stability_index, differentiation_readiness)
        interventions = self._recommended_interventions(context, potency_score, stability_index, differentiation_readiness)
        monitoring_focus = self._monitoring_focus(lineage_bias)
        metabolic_notes = self._metabolic_notes(metabolic_reserve, context)
        narrative = self._narrative(
            context,
            potency_score,
            stability_index,
            differentiation_readiness,
            lineage_bias,
            alerts,
        )

        return StemCellProfile(
            potency_score=potency_score,
            stability_index=stability_index,
            differentiation_readiness=differentiation_readiness,
            lineage_bias=lineage_bias,
            alert_flags=alerts,
            recommended_interventions=interventions,
            monitoring_focus=monitoring_focus,
            metabolic_notes=metabolic_notes,
            narrative=narrative,
        )

    def _signal_statistics(self) -> tuple[dict[str, float], Counter[str]]:
        totals = {attr: 0.0 for attr in self._STAT_ATTRIBUTES}
        total_weight = 0.0
        lineage_counter: Counter[str] = Counter()

        for signal in self._signals:
            weight = signal.weight
            total_weight += weight
            totals["potency"] += signal.potency * weight
            totals["plasticity"] += signal.plasticity * weight
            totals["stress_resilience"] += signal.stress_resilience * weight
            totals["metabolic_reserve"] += signal.metabolic_reserve * weight
            totals["activation"] += signal.activation * weight
            totals["signal_strength"] += signal.signal_strength * weight

            if signal.lineage_hint:
                lineage_counter[signal.lineage_hint] += 1

        if total_weight == 0.0:
            return {attr: 0.0 for attr in self._STAT_ATTRIBUTES}, lineage_counter

        scale = 1.0 / total_weight
        averages = {attr: totals[attr] * scale for attr in self._STAT_ATTRIBUTES}
        return averages, lineage_counter

    def _environment_alignment(
        self,
        context: StemCellContext,
        stress_resilience: float,
        metabolic_reserve: float,
    ) -> float:
        oxygen_alignment = 1.0 - abs(context.oxygen_level - 0.45) * 1.5
        shear_alignment = 1.0 - context.shear_stress
        nutrient_support = 0.5 + 0.5 * context.nutrient_level
        resilience_support = 0.5 + 0.5 * stress_resilience
        metabolic_support = 0.5 + 0.5 * metabolic_reserve
        raw = (oxygen_alignment + shear_alignment + nutrient_support + resilience_support + metabolic_support) / 5.0
        return _clamp(raw)

    def _differentiation_readiness(
        self,
        context: StemCellContext,
        activation: float,
        signal_strength: float,
        plasticity: float,
    ) -> float:
        readiness_core = 0.5 * activation + 0.3 * signal_strength + 0.2 * plasticity
        if context.is_differentiation_phase:
            readiness_core += 0.1
        if context.target_lineages:
            readiness_core += 0.05
        if context.is_hypoxic:
            readiness_core -= 0.05
        if context.is_high_shear:
            readiness_core -= 0.05
        return _clamp(readiness_core)

    def _dominant_lineages(self, counter: Counter[str] | None = None) -> tuple[str, ...]:
        lineage_counter = counter or Counter(
            signal.lineage_hint for signal in self._signals if signal.lineage_hint
        )
        return tuple(lineage for lineage, _ in lineage_counter.most_common(4))

    def _alert_flags(
        self,
        context: StemCellContext,
        potency_score: float,
        stability_index: float,
        differentiation_readiness: float,
    ) -> tuple[str, ...]:
        alerts: list[str] = []
        if potency_score <= 0.35:
            alerts.append("potency erosion")
        if stability_index <= 0.4:
            alerts.append("culture instability")
        if context.is_high_shear:
            alerts.append("high mechanical stress")
        if context.is_hypoxic and not context.is_differentiation_phase:
            alerts.append("oxygen undersupply")
        if differentiation_readiness >= 0.75 and context.maintenance_bias >= 0.6:
            alerts.append("unplanned differentiation drift")
        if context.inhibitory_signals and potency_score <= 0.55:
            alerts.append("inhibitory pressure detected")
        return tuple(alerts)

    def _recommended_interventions(
        self,
        context: StemCellContext,
        potency_score: float,
        stability_index: float,
        differentiation_readiness: float,
    ) -> tuple[str, ...]:
        recommendations: list[str] = []
        if potency_score < 0.6:
            recommendations.append("refresh pluripotency factors")
        if stability_index < 0.5:
            recommendations.append("increase microenvironment support")
        if context.is_high_shear:
            recommendations.append("reduce shear via medium exchange tuning")
        if context.is_hypoxic:
            recommendations.append("adjust oxygenation profile")
        if differentiation_readiness > 0.7 and context.target_lineages:
            lineage = context.target_lineages[0]
            recommendations.append(f"prepare lineage-specific induction for {lineage}")
        elif differentiation_readiness > 0.7:
            recommendations.append("define target lineage before induction")
        if context.inhibitory_signals:
            recommendations.append("neutralise inhibitory signals")
        if not recommendations:
            recommendations.append("maintain current regimen with close monitoring")
        return tuple(dict.fromkeys(recommendations))

    def _monitoring_focus(self, lineage_bias: Sequence[str]) -> tuple[str, ...]:
        focus: list[str] = list(lineage_bias[:3])
        if "undirected" not in focus:
            focus.append("undirected reserve")
        return tuple(dict.fromkeys(focus))

    def _metabolic_notes(self, metabolic_reserve: float, context: StemCellContext) -> str:
        if metabolic_reserve >= 0.7 and context.nutrient_level >= 0.6:
            return "Metabolic reserves robust with nutrient supply supporting expansion."
        if metabolic_reserve >= 0.6 and context.nutrient_level < 0.5:
            return "Cells compensating for limited nutrients; consider supplementation."
        if metabolic_reserve < 0.4 and context.nutrient_level >= 0.6:
            return "Energy reserves lag despite nutrient presence; review mitochondrial support."
        return "Metabolic state requires routine observation."

    def _narrative(
        self,
        context: StemCellContext,
        potency_score: float,
        stability_index: float,
        differentiation_readiness: float,
        lineage_bias: Sequence[str],
        alerts: Sequence[str],
    ) -> str:
        lineage_text = ", ".join(lineage_bias) if lineage_bias else "no dominant lineage"
        alert_text = "; ".join(alerts) if alerts else "no critical alerts"
        phase = "differentiation" if context.is_differentiation_phase else "maintenance"
        return (
            f"Stem cell collective in {phase} phase within the {context.niche} niche. "
            f"Potency at {potency_score:.2f}, stability at {stability_index:.2f}, "
            f"differentiation readiness {differentiation_readiness:.2f}. "
            f"Lineage signals point to {lineage_text}; {alert_text}."
        )
