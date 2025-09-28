"""Hematologic intelligence primitives for Dynamic Capital."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from itertools import islice
from statistics import fmean
from typing import Deque, Mapping, MutableMapping, Sequence

__all__ = [
    "BloodSample",
    "BloodContext",
    "BloodInsight",
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
