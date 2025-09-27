"""Directional momentum aggregation for Dynamic Capital signal flows."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
import math
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ArrowSignal",
    "ArrowSnapshot",
    "DynamicArrow",
]


# ---------------------------------------------------------------------------
# helper functions


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_identifier(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("identifier must not be empty")
    return cleaned


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _normalise_angle(angle: float) -> float:
    value = float(angle)
    remainder = math.fmod(value, 360.0)
    if remainder <= -180.0:
        remainder += 360.0
    elif remainder > 180.0:
        remainder -= 360.0
    return remainder


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _angular_distance_deg(source: float, target: float) -> float:
    """Return the shortest angular distance between two angles in degrees."""

    delta = _normalise_angle(target - source)
    return abs(delta)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class ArrowSignal:
    """Single directional input used to steer the Dynamic Arrow."""

    name: str
    angle_deg: float
    magnitude: float
    confidence: float = 1.0
    issued_at: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.angle_deg = _normalise_angle(self.angle_deg)
        self.magnitude = max(float(self.magnitude), 0.0)
        self.confidence = _clamp(float(self.confidence))
        if self.issued_at.tzinfo is None:
            self.issued_at = self.issued_at.replace(tzinfo=timezone.utc)
        else:
            self.issued_at = self.issued_at.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        if self.metadata is None:
            self.metadata = {}
        elif not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")
        else:
            self.metadata = dict(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "angle_deg": self.angle_deg,
            "magnitude": self.magnitude,
            "confidence": self.confidence,
            "issued_at": self.issued_at.isoformat(),
            "tags": list(self.tags),
            "metadata": dict(self.metadata),
        }


@dataclass(slots=True)
class ArrowSnapshot:
    """Aggregate state derived from the registered signals."""

    direction_deg: float
    resultant_magnitude: float
    confidence: float
    divergence: float
    freshness_seconds: float
    signal_count: int
    components: tuple[ArrowSignal, ...] = field(default_factory=tuple)

    @property
    def is_empty(self) -> bool:
        return self.signal_count == 0

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "direction_deg": self.direction_deg,
            "resultant_magnitude": self.resultant_magnitude,
            "confidence": self.confidence,
            "divergence": self.divergence,
            "freshness_seconds": self.freshness_seconds,
            "signal_count": self.signal_count,
            "components": [component.as_dict() for component in self.components],
        }


# ---------------------------------------------------------------------------
# core aggregator


class DynamicArrow:
    """Fuse directional signals into a coherent trajectory."""

    def __init__(
        self,
        *,
        half_life_minutes: float = 45.0,
        max_history: int | None = 240,
    ) -> None:
        if half_life_minutes <= 0:
            raise ValueError("half_life_minutes must be greater than zero")
        if max_history is not None and max_history <= 0:
            raise ValueError("max_history must be positive when provided")
        self._decay_lambda = math.log(2.0) / (half_life_minutes * 60.0)
        self._signals: Deque[ArrowSignal] = deque(maxlen=max_history)

    # public API ------------------------------------------------------------

    def register(self, signal: ArrowSignal | Mapping[str, object]) -> ArrowSignal:
        """Register a new directional signal."""

        if isinstance(signal, Mapping):
            signal = ArrowSignal(**signal)
        if not isinstance(signal, ArrowSignal):  # pragma: no cover - defensive
            raise TypeError("signal must be an ArrowSignal instance")
        self._signals.append(signal)
        return signal

    def extend(self, signals: Iterable[ArrowSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.register(signal)

    def clear(self) -> None:
        self._signals.clear()

    def snapshot(self, *, reference_time: datetime | None = None) -> ArrowSnapshot:
        reference = reference_time.astimezone(timezone.utc) if reference_time else _utcnow()
        if reference.tzinfo is None:  # pragma: no cover - defensive
            reference = reference.replace(tzinfo=timezone.utc)

        if not self._signals:
            return ArrowSnapshot(
                direction_deg=0.0,
                resultant_magnitude=0.0,
                confidence=0.0,
                divergence=0.0,
                freshness_seconds=float("inf"),
                signal_count=0,
                components=(),
            )

        sum_x = 0.0
        sum_y = 0.0
        total_base_weight = 0.0
        weighted_confidence = 0.0
        weighted_divergence = 0.0
        latest_timestamp = max(signal.issued_at for signal in self._signals)

        components: list[ArrowSignal] = list(self._signals)

        for signal in components:
            age_seconds = max((reference - signal.issued_at).total_seconds(), 0.0)
            decay = math.exp(-self._decay_lambda * age_seconds)
            base_weight = signal.magnitude * decay
            if base_weight <= 0.0:
                continue
            angle_rad = math.radians(signal.angle_deg)
            weight = base_weight * signal.confidence
            sum_x += math.cos(angle_rad) * weight
            sum_y += math.sin(angle_rad) * weight
            total_base_weight += base_weight
            weighted_confidence += signal.confidence * base_weight

        if total_base_weight == 0.0:
            direction = 0.0
            resultant = 0.0
            confidence = 0.0
        else:
            direction = math.degrees(math.atan2(sum_y, sum_x)) if sum_x or sum_y else 0.0
            direction = _normalise_angle(direction)
            resultant = math.hypot(sum_x, sum_y)
            confidence = weighted_confidence / total_base_weight

        if total_base_weight == 0.0:
            divergence = 0.0
        else:
            for signal in components:
                age_seconds = max((reference - signal.issued_at).total_seconds(), 0.0)
                decay = math.exp(-self._decay_lambda * age_seconds)
                base_weight = signal.magnitude * decay
                if base_weight <= 0.0:
                    continue
                divergence_component = _angular_distance_deg(direction, signal.angle_deg) / 180.0
                weighted_divergence += divergence_component * base_weight
            divergence = weighted_divergence / total_base_weight

        freshness_seconds = max((reference - latest_timestamp).total_seconds(), 0.0)

        return ArrowSnapshot(
            direction_deg=direction,
            resultant_magnitude=resultant,
            confidence=_clamp(confidence),
            divergence=_clamp(divergence),
            freshness_seconds=freshness_seconds,
            signal_count=len(components),
            components=tuple(components),
        )

    # convenience introspection --------------------------------------------

    @property
    def signals(self) -> tuple[ArrowSignal, ...]:
        return tuple(self._signals)

    def __len__(self) -> int:
        return len(self._signals)

