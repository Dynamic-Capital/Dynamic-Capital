"""Effect orchestration engine for Dynamic Capital's adaptive rituals."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableSequence, Sequence

__all__ = [
    "EffectImpulse",
    "EffectContext",
    "EffectFrame",
    "DynamicEffectEngine",
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


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


@dataclass(slots=True)
class EffectImpulse:
    """Signal representing a single causal impulse and its implied impact."""

    driver: str
    narrative: str
    amplitude: float = 0.5
    confidence: float = 0.5
    resonance: float = 0.5
    resilience: float = 0.5
    decay: float = 0.5
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.driver = _normalise_lower(self.driver)
        self.narrative = _normalise_text(self.narrative)
        self.amplitude = _clamp(float(self.amplitude))
        self.confidence = _clamp(float(self.confidence))
        self.resonance = _clamp(float(self.resonance))
        self.resilience = _clamp(float(self.resilience))
        self.decay = _clamp(float(self.decay))
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tuple(self.tags)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def weighted_amplitude(self) -> float:
        return self.amplitude * self.confidence


@dataclass(slots=True)
class EffectContext:
    """Context describing the environmental posture for effect synthesis."""

    horizon: str
    volatility: float
    exposure: float
    optionality: float
    governance: float
    cadence: float
    strategic_promises: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.horizon = _normalise_text(self.horizon)
        self.volatility = _clamp(float(self.volatility))
        self.exposure = _clamp(float(self.exposure))
        self.optionality = _clamp(float(self.optionality))
        self.governance = _clamp(float(self.governance))
        self.cadence = _clamp(float(self.cadence))
        self.strategic_promises = _normalise_tuple(self.strategic_promises)

    @property
    def is_high_volatility(self) -> bool:
        return self.volatility >= 0.6

    @property
    def is_overextended(self) -> bool:
        return self.exposure >= 0.65

    @property
    def is_optionality_sparse(self) -> bool:
        return self.optionality <= 0.35

    @property
    def is_governance_fragile(self) -> bool:
        return self.governance <= 0.45

    @property
    def is_cadence_rushed(self) -> bool:
        return self.cadence >= 0.65


@dataclass(slots=True)
class EffectFrame:
    """Synthesised view of how causal effects are propagating."""

    impact_velocity: float
    resilience_outlook: float
    alignment_integrity: float
    momentum_decay: float
    dominant_drivers: tuple[str, ...]
    thematic_tags: tuple[str, ...]
    alerts: tuple[str, ...]
    recommended_adjustments: tuple[str, ...]


class DynamicEffectEngine:
    """Aggregates effect impulses to surface actionable posture shifts."""

    def __init__(self, *, window: int = 120) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._window = window
        self._impulses: Deque[EffectImpulse] = deque(maxlen=window)

    @property
    def window(self) -> int:
        return self._window

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._impulses)

    def register(self, impulse: EffectImpulse) -> None:
        """Register a new impulse in the rolling window."""

        self._impulses.append(impulse)

    def extend(self, impulses: Iterable[EffectImpulse]) -> None:
        """Register multiple impulses preserving chronological order."""

        for impulse in impulses:
            self.register(impulse)

    def clear(self) -> None:
        """Reset the rolling window."""

        self._impulses.clear()

    def synthesise(self, context: EffectContext) -> EffectFrame:
        """Collapse the rolling window into a strategic effect frame."""

        weighted: MutableSequence[tuple[EffectImpulse, float]] = []
        for impulse in self._impulses:
            weight = max(impulse.weighted_amplitude, 0.0)
            weighted.append((impulse, weight))

        total_weight = sum(weight for _, weight in weighted)

        def _weighted_average(extractor: Callable[[EffectImpulse], float], *, default: float) -> float:
            if total_weight == 0:
                return default
            numerator = sum(extractor(impulse) * weight for impulse, weight in weighted)
            return _clamp(numerator / total_weight)

        impact_velocity = _weighted_average(lambda impulse: impulse.amplitude, default=0.0)
        resilience_outlook = _weighted_average(lambda impulse: impulse.resilience, default=0.5)
        alignment_integrity = _weighted_average(lambda impulse: impulse.resonance, default=0.5)
        momentum_decay = _weighted_average(lambda impulse: impulse.decay, default=0.5)

        driver_counter: Counter[str] = Counter()
        tag_counter: Counter[str] = Counter()
        for impulse, weight in weighted:
            if weight <= 0.0:
                continue
            driver_counter[impulse.driver] += weight
            for tag in impulse.tags:
                tag_counter[tag] += weight

        dominant_drivers = tuple(driver for driver, _ in driver_counter.most_common(3))
        thematic_tags = tuple(tag for tag, _ in tag_counter.most_common(5))

        alerts: list[str] = []
        if context.is_high_volatility and impact_velocity >= 0.55:
            alerts.append(
                "Escalate scenario planning: high impact velocity is colliding with volatile conditions."
            )
        if context.is_overextended and alignment_integrity <= 0.45:
            alerts.append(
                "Trim exposure: the portfolio is overextended while alignment integrity is eroding."
            )
        if context.is_governance_fragile and resilience_outlook <= 0.5:
            alerts.append(
                "Fortify governance rituals: resilience signals are fragile and require stewardship."
            )
        if context.is_cadence_rushed and momentum_decay >= 0.6:
            alerts.append(
                "Slow the execution cadence: momentum decay is accelerating under rushed operating tempos."
            )

        recommendations: list[str] = []
        if context.is_optionality_sparse:
            recommendations.append("Introduce optionality buffers to absorb emerging second-order effects.")
        if resilience_outlook < 0.4:
            recommendations.append("Run recovery drills to rebuild resilience around critical drivers.")
        if alignment_integrity < 0.5:
            recommendations.append(
                "Re-anchor narratives with stakeholders, emphasising the dominant drivers for coherence."
            )
        if momentum_decay > 0.55:
            recommendations.append("Throttle change programmes to let absorption catch up with momentum decay.")
        if not recommendations:
            recommendations.append("Maintain steady observation; dynamics remain within tolerance bands.")

        return EffectFrame(
            impact_velocity=impact_velocity,
            resilience_outlook=resilience_outlook,
            alignment_integrity=alignment_integrity,
            momentum_decay=momentum_decay,
            dominant_drivers=dominant_drivers,
            thematic_tags=thematic_tags,
            alerts=tuple(alerts),
            recommended_adjustments=tuple(dict.fromkeys(recommendations)),
        )
