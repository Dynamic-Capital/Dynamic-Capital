"""Sense engine for interpreting multi-modal signals into actionable awareness."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "SenseSignal",
    "SenseContext",
    "SenseFrame",
    "DynamicSenseEngine",
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


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


@dataclass(slots=True)
class SenseSignal:
    """Observation captured by the sensing fabric."""

    modality: str
    message: str
    intensity: float = 0.5
    clarity: float = 0.5
    novelty: float = 0.5
    confidence: float = 0.5
    drift: float = 0.0
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.modality = _normalise_lower(self.modality)
        self.message = _normalise_text(self.message)
        self.intensity = _clamp(float(self.intensity))
        self.clarity = _clamp(float(self.clarity))
        self.novelty = _clamp(float(self.novelty))
        self.confidence = _clamp(float(self.confidence))
        self.drift = _clamp(float(self.drift), lower=-1.0, upper=1.0)
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class SenseContext:
    """Context describing how the organisation senses the environment."""

    environment: str
    focus: str
    perception_sensitivity: float
    noise_tolerance: float
    stability: float
    confidence_threshold: float
    response_window_minutes: int
    priority_modalities: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.environment = _normalise_text(self.environment)
        self.focus = _normalise_text(self.focus)
        self.perception_sensitivity = _clamp(float(self.perception_sensitivity))
        self.noise_tolerance = _clamp(float(self.noise_tolerance))
        self.stability = _clamp(float(self.stability))
        self.confidence_threshold = _clamp(float(self.confidence_threshold))
        self.response_window_minutes = max(int(self.response_window_minutes), 1)
        seen: set[str] = set()
        normalised_modalities: list[str] = []
        for modality in self.priority_modalities:
            cleaned = _normalise_lower(modality)
            if cleaned not in seen:
                seen.add(cleaned)
                normalised_modalities.append(cleaned)
        self.priority_modalities = tuple(normalised_modalities)

    @property
    def is_high_noise(self) -> bool:
        return self.noise_tolerance <= 0.3

    @property
    def is_sensitive(self) -> bool:
        return self.perception_sensitivity >= 0.7

    @property
    def expects_fast_response(self) -> bool:
        return self.response_window_minutes <= 30


@dataclass(slots=True)
class SenseFrame:
    """Synthesised snapshot describing the current sense posture."""

    situational_awareness: float
    signal_to_noise: float
    novelty_pressure: float
    confidence_index: float
    alert_level: str
    dominant_modalities: tuple[str, ...]
    emerging_modalities: tuple[str, ...]
    insights: tuple[str, ...]
    recommendations: tuple[str, ...]
    summary: str
    window: int
    observations: int

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "situational_awareness": self.situational_awareness,
            "signal_to_noise": self.signal_to_noise,
            "novelty_pressure": self.novelty_pressure,
            "confidence_index": self.confidence_index,
            "alert_level": self.alert_level,
            "dominant_modalities": self.dominant_modalities,
            "emerging_modalities": self.emerging_modalities,
            "insights": self.insights,
            "recommendations": self.recommendations,
            "summary": self.summary,
            "window": self.window,
            "observations": self.observations,
        }


class DynamicSenseEngine:
    """Aggregates sensory signals into a structured situational read."""

    def __init__(self, *, window: int = 144) -> None:
        if window <= 0:
            raise ValueError("window must be a positive integer")
        self._signals: Deque[SenseSignal] = deque(maxlen=window)

    @property
    def window(self) -> int:
        return self._signals.maxlen or len(self._signals)

    @property
    def observations(self) -> int:
        return len(self._signals)

    def clear(self) -> None:
        self._signals.clear()

    def observe(self, signal: SenseSignal) -> None:
        if not isinstance(signal, SenseSignal):  # pragma: no cover - defensive guard
            raise TypeError("signal must be a SenseSignal")
        self._signals.append(signal)

    def extend(self, signals: Iterable[SenseSignal]) -> None:
        for signal in signals:
            self.observe(signal)

    def analyse(self, context: SenseContext) -> SenseFrame:
        if not isinstance(context, SenseContext):  # pragma: no cover - defensive guard
            raise TypeError("context must be a SenseContext")

        if not self._signals:
            return SenseFrame(
                situational_awareness=0.0,
                signal_to_noise=0.0,
                novelty_pressure=0.0,
                confidence_index=0.0,
                alert_level="low",
                dominant_modalities=(),
                emerging_modalities=(),
                insights=("No observations available",),
                recommendations=("Collect fresh signals to initialise the sensing loop.",),
                summary="No signals captured within the sensing window.",
                window=self.window,
                observations=0,
            )

        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0.0:
            total_weight = float(len(self._signals))

        def weighted_average(attribute: str) -> float:
            return sum(
                getattr(signal, attribute) * signal.weight for signal in self._signals
            ) / total_weight

        avg_intensity = weighted_average("intensity")
        avg_clarity = weighted_average("clarity")
        avg_novelty = weighted_average("novelty")
        avg_confidence = weighted_average("confidence")
        avg_drift = weighted_average("drift")

        signal_strength = avg_intensity * (0.6 + 0.4 * avg_confidence)
        noise_level = 1.0 - avg_clarity
        signal_to_noise = _clamp(signal_strength * (1.0 - noise_level))

        situational_awareness = _clamp(
            0.45 * signal_to_noise
            + 0.25 * avg_confidence
            + 0.2 * context.perception_sensitivity
            + 0.1 * (1.0 - context.stability)
        )

        novelty_pressure = _clamp(
            avg_novelty * (0.5 + 0.5 * (1.0 - context.stability))
            + 0.1 * max(avg_drift, 0.0)
        )

        confidence_index = _clamp(
            0.6 * avg_confidence + 0.2 * (1.0 - abs(avg_drift)) + 0.2 * avg_clarity
        )

        modality_strength: Counter[str] = Counter()
        modality_novelty: Counter[str] = Counter()
        modality_clarity: Counter[str] = Counter()
        for signal in self._signals:
            modifier = signal.weight or 1.0
            modality_strength[signal.modality] += modifier * (
                0.7 * signal.intensity + 0.3 * signal.clarity
            )
            modality_novelty[signal.modality] += modifier * signal.novelty
            modality_clarity[signal.modality] += modifier * signal.clarity

        dominant_modalities = tuple(
            modality for modality, _ in modality_strength.most_common(3)
        )
        emerging_modalities = tuple(
            modality
            for modality, score in modality_novelty.items()
            if score / max(modality_clarity[modality], 1e-6) >= 0.8
        )

        alert_score = _clamp(
            0.5 * avg_intensity
            + 0.2 * (1.0 - context.noise_tolerance)
            + 0.2 * novelty_pressure
            + 0.1 * max(context.confidence_threshold - avg_confidence, 0.0)
        )
        if alert_score >= 0.75:
            alert_level = "high"
        elif alert_score >= 0.45:
            alert_level = "medium"
        else:
            alert_level = "low"

        insights = self._craft_insights(
            context=context,
            situational_awareness=situational_awareness,
            signal_to_noise=signal_to_noise,
            avg_confidence=avg_confidence,
            dominant_modalities=dominant_modalities,
            emerging_modalities=emerging_modalities,
            alert_level=alert_level,
        )
        recommendations = self._craft_recommendations(
            context=context,
            alert_level=alert_level,
            signal_to_noise=signal_to_noise,
            novelty_pressure=novelty_pressure,
            confidence_index=confidence_index,
            dominant_modalities=dominant_modalities,
        )

        summary = (
            "Awareness {:.0%} | S/N {:.0%} | Confidence {:.0%} | Alert {}".format(
                situational_awareness,
                signal_to_noise,
                confidence_index,
                alert_level.upper(),
            )
        )

        return SenseFrame(
            situational_awareness=situational_awareness,
            signal_to_noise=signal_to_noise,
            novelty_pressure=novelty_pressure,
            confidence_index=confidence_index,
            alert_level=alert_level,
            dominant_modalities=dominant_modalities,
            emerging_modalities=emerging_modalities,
            insights=insights,
            recommendations=recommendations,
            summary=summary,
            window=self.window,
            observations=self.observations,
        )

    def _craft_insights(
        self,
        *,
        context: SenseContext,
        situational_awareness: float,
        signal_to_noise: float,
        avg_confidence: float,
        dominant_modalities: tuple[str, ...],
        emerging_modalities: tuple[str, ...],
        alert_level: str,
    ) -> tuple[str, ...]:
        insights: list[str] = []
        insights.append(
            "Situational awareness at {:.0%} with {} alert posture.".format(
                situational_awareness, alert_level
            )
        )
        insights.append(
            "Signal-to-noise sits at {:.0%}, shaped by {} priority focus.".format(
                signal_to_noise,
                context.focus,
            )
        )
        if dominant_modalities:
            insights.append(
                "Dominant modalities: {}.".format(
                    ", ".join(dominant_modalities)
                )
            )
        if emerging_modalities:
            insights.append(
                "Emerging modalities accelerating: {}.".format(
                    ", ".join(emerging_modalities)
                )
            )
        if avg_confidence < context.confidence_threshold:
            insights.append(
                "Confidence ({:.0%}) trails the threshold ({:.0%}).".format(
                    avg_confidence, context.confidence_threshold
                )
            )
        return tuple(insights)

    def _craft_recommendations(
        self,
        *,
        context: SenseContext,
        alert_level: str,
        signal_to_noise: float,
        novelty_pressure: float,
        confidence_index: float,
        dominant_modalities: tuple[str, ...],
    ) -> tuple[str, ...]:
        recommendations: list[str] = []
        if alert_level == "high":
            recommendations.append(
                "Escalate to response team and shorten the sensing window." \
                " Deploy countermeasures aligned with {}.".format(context.focus)
            )
        elif alert_level == "medium":
            recommendations.append(
                "Intensify monitoring cadence and validate signals with trusted nodes."
            )
        else:
            recommendations.append(
                "Maintain baseline sensing rituals and refresh calibration artefacts."
            )

        if signal_to_noise < 0.4:
            recommendations.append(
                "Increase filtering on noisy channels; reinforce {} tolerance.".format(
                    context.noise_tolerance
                )
            )

        if novelty_pressure > 0.6:
            recommendations.append(
                "Spin up exploration pod to investigate emerging dynamics."
            )

        if confidence_index < context.confidence_threshold:
            recommendations.append(
                "Pair sensed data with qualitative validation before acting."
            )

        if context.priority_modalities and not set(dominant_modalities) & set(
            context.priority_modalities
        ):
            recommendations.append(
                "Realign collection toward priority modalities: {}.".format(
                    ", ".join(context.priority_modalities)
                )
            )

        return tuple(recommendations)
