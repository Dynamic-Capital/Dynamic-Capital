"""Synthesis utilities for sculpting number streams."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from math import fsum, isfinite, sqrt
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "NumberPulse",
    "NumberWindowSummary",
    "NumberSignalReport",
    "DynamicNumberComposer",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_float(value: object, *, name: str) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise TypeError(f"{name} must be a real number") from exc
    if not isfinite(number):
        raise ValueError(f"{name} must be finite")
    return number


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


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


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class NumberPulse:
    """Single measurement within a number stream."""

    value: float
    weight: float = 1.0
    label: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.value = _coerce_float(self.value, name="value")
        self.weight = max(_coerce_float(self.weight, name="weight"), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.label = _normalise_optional_text(self.label)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)

    @property
    def magnitude(self) -> float:
        """Weighted absolute magnitude for ranking pulses."""

        return abs(self.value) * self.weight

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "value": self.value,
            "weight": self.weight,
            "label": self.label,
            "tags": list(self.tags),
            "metadata": dict(self.metadata) if self.metadata is not None else None,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass(slots=True)
class NumberWindowSummary:
    """Aggregate metrics describing a slice of pulses."""

    count: int
    total: float
    weighted_total: float
    mean: float
    weighted_mean: float
    minimum: float | None
    maximum: float | None
    momentum: float
    volatility: float
    latest: float | None
    latest_label: str | None
    tags: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "count": self.count,
            "total": self.total,
            "weighted_total": self.weighted_total,
            "mean": self.mean,
            "weighted_mean": self.weighted_mean,
            "minimum": self.minimum,
            "maximum": self.maximum,
            "momentum": self.momentum,
            "volatility": self.volatility,
            "latest": self.latest,
            "latest_label": self.latest_label,
            "tags": list(self.tags),
        }


@dataclass(slots=True)
class NumberSignalReport:
    """Holistic view of a number stream and its prevailing signal."""

    window: NumberWindowSummary
    lifetime: NumberWindowSummary
    classification: str
    notes: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "window": self.window.as_dict(),
            "lifetime": self.lifetime.as_dict(),
            "classification": self.classification,
            "notes": self.notes,
        }


class DynamicNumberComposer:
    """Manage, analyse, and classify evolving streams of numbers."""

    def __init__(self, *, default_window: int = 12, maxlen: int | None = None) -> None:
        if default_window <= 0:
            raise ValueError("default_window must be positive")
        self.default_window = int(default_window)
        self._pulses: Deque[NumberPulse] = deque(maxlen=maxlen)

    def __len__(self) -> int:
        return len(self._pulses)

    def add(self, pulse: NumberPulse | Mapping[str, object] | float) -> NumberPulse:
        """Add a single pulse to the stream."""

        coerced = self._coerce_pulse(pulse)
        self._pulses.append(coerced)
        return coerced

    def extend(self, pulses: Iterable[NumberPulse | Mapping[str, object] | float]) -> list[NumberPulse]:
        """Add multiple pulses, returning their normalised representations."""

        normalised: list[NumberPulse] = []
        for pulse in pulses:
            normalised.append(self.add(pulse))
        return normalised

    def reset(self) -> None:
        self._pulses.clear()

    def summarise(self, *, window: int | None = None) -> NumberSignalReport:
        if not self._pulses:
            empty = self._summarise_sequence(())
            return NumberSignalReport(
                window=empty,
                lifetime=empty,
                classification="empty",
                notes="No pulses recorded yet.",
            )

        window_size = int(window) if window is not None else self.default_window
        if window_size <= 0:
            raise ValueError("window must be positive")

        pulses = list(self._pulses)
        window_slice = pulses[-window_size:]
        window_summary = self._summarise_sequence(window_slice)
        lifetime_summary = self._summarise_sequence(pulses)
        classification, notes = self._classify(window_summary)
        return NumberSignalReport(
            window=window_summary,
            lifetime=lifetime_summary,
            classification=classification,
            notes=notes,
        )

    def _coerce_pulse(
        self, pulse: NumberPulse | Mapping[str, object] | float
    ) -> NumberPulse:
        if isinstance(pulse, NumberPulse):
            return pulse
        if isinstance(pulse, Mapping):
            if "value" not in pulse:
                raise KeyError("pulse mapping must include a 'value'")
            return NumberPulse(
                value=pulse["value"],
                weight=pulse.get("weight", 1.0),
                label=pulse.get("label"),
                tags=tuple(pulse.get("tags", ())),
                metadata=pulse.get("metadata"),
                timestamp=pulse.get("timestamp", _utcnow()),
            )
        return NumberPulse(value=pulse)

    def _summarise_sequence(self, pulses: Sequence[NumberPulse]) -> NumberWindowSummary:
        if not pulses:
            return NumberWindowSummary(
                count=0,
                total=0.0,
                weighted_total=0.0,
                mean=0.0,
                weighted_mean=0.0,
                minimum=None,
                maximum=None,
                momentum=0.0,
                volatility=0.0,
                latest=None,
                latest_label=None,
                tags=(),
            )

        values = [pulse.value for pulse in pulses]
        weights = [pulse.weight for pulse in pulses]
        count = len(pulses)
        total = fsum(values)
        weighted_total = fsum(value * weight for value, weight in zip(values, weights))
        mean = total / count
        weight_sum = fsum(weights)
        weighted_mean = weighted_total / weight_sum if weight_sum else 0.0
        minimum = min(values)
        maximum = max(values)
        momentum = pulses[-1].value - pulses[0].value if count > 1 else 0.0
        latest = pulses[-1].value
        latest_label = pulses[-1].label
        tags = self._merge_tags(pulses)

        if count == 1:
            volatility = 0.0
        else:
            variance = fsum((value - mean) ** 2 for value in values) / count
            volatility = sqrt(variance)

        return NumberWindowSummary(
            count=count,
            total=total,
            weighted_total=weighted_total,
            mean=mean,
            weighted_mean=weighted_mean,
            minimum=minimum,
            maximum=maximum,
            momentum=momentum,
            volatility=volatility,
            latest=latest,
            latest_label=latest_label,
            tags=tags,
        )

    def _merge_tags(self, pulses: Sequence[NumberPulse]) -> tuple[str, ...]:
        seen: set[str] = set()
        ordered: list[str] = []
        for pulse in pulses:
            for tag in pulse.tags:
                if tag not in seen:
                    seen.add(tag)
                    ordered.append(tag)
        return tuple(ordered)

    def _classify(self, summary: NumberWindowSummary) -> tuple[str, str]:
        if summary.count < 2:
            return (
                "insufficient-data",
                "Need at least two pulses to assess momentum.",
            )

        momentum = summary.momentum
        volatility = summary.volatility
        baseline = summary.weighted_mean or summary.mean

        if volatility < 1e-9:
            if abs(momentum) < 1e-9:
                return ("stable", "Series is stable with negligible movement.")
            return (
                "drifting",
                f"Series is drifting {'upward' if momentum > 0 else 'downward'} with minimal noise.",
            )

        momentum_ratio = momentum / (volatility or 1.0)
        if momentum_ratio > 1.5:
            trend = "uptrend"
            direction_note = "Momentum significantly exceeds volatility to the upside."
        elif momentum_ratio < -1.5:
            trend = "downtrend"
            direction_note = "Momentum significantly exceeds volatility to the downside."
        elif abs(momentum_ratio) < 0.5:
            trend = "oscillating"
            direction_note = "Momentum remains muted relative to volatility."
        else:
            trend = "consolidating"
            direction_note = "Momentum and volatility are balanced; watch for breakout signals."

        notes = (
            f"{direction_note} "
            f"Count={summary.count}, Mean={summary.mean:.4f}, "
            f"WeightedMean={summary.weighted_mean:.4f}, Baseline={baseline:.4f}."
        )
        return (trend, notes)


