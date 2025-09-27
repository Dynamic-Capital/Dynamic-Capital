"""Core models for Dynamic Capital indicator monitoring."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "IndicatorDefinition",
    "IndicatorReading",
    "IndicatorSnapshot",
    "IndicatorOverview",
    "DynamicIndicators",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_key(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("indicator key must not be empty")
    return cleaned


def _normalise_title(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("title must not be empty")
    return cleaned


def _normalise_category(value: str | None) -> str:
    if value is None:
        return "general"
    cleaned = value.strip().lower()
    return cleaned or "general"


def _normalise_unit(value: str | None) -> str:
    if value is None:
        return ""
    return value.strip()


def _normalise_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for item in items:
        cleaned = item.strip()
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


def _clamp(value: float, *, lower: float, upper: float) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


def _attainment(definition: "IndicatorDefinition", value: float) -> float:
    if definition.orientation == "higher":
        span = max(definition.target - definition.critical, 1e-9)
        return _clamp((value - definition.critical) / span, lower=0.0, upper=1.0)
    span = max(definition.critical - definition.target, 1e-9)
    return _clamp((definition.critical - value) / span, lower=0.0, upper=1.0)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class IndicatorDefinition:
    """Configuration describing an indicator's desired range."""

    key: str
    title: str
    description: str = ""
    category: str = "general"
    unit: str = ""
    target: float = 0.7
    warning: float = 0.5
    critical: float = 0.35
    weight: float = 1.0
    orientation: str = "higher"
    trend_window: int = 3
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.key = _normalise_key(self.key)
        self.title = _normalise_title(self.title)
        self.description = self.description.strip()
        self.category = _normalise_category(self.category)
        self.unit = _normalise_unit(self.unit)
        self.target = float(self.target)
        self.warning = float(self.warning)
        self.critical = float(self.critical)
        self.weight = max(float(self.weight), 0.0)
        orientation = self.orientation.strip().lower()
        if orientation in {"higher", "increase", "up"}:
            self.orientation = "higher"
        elif orientation in {"lower", "decrease", "down"}:
            self.orientation = "lower"
        else:
            raise ValueError("orientation must be 'higher' or 'lower'")
        self.trend_window = max(int(self.trend_window), 1)
        self.metadata = _coerce_mapping(self.metadata)
        if self.orientation == "higher":
            if not (self.critical <= self.warning <= self.target):
                raise ValueError(
                    "expected critical <= warning <= target for higher orientation"
                )
        else:
            if not (self.critical >= self.warning >= self.target):
                raise ValueError(
                    "expected critical >= warning >= target for lower orientation"
                )

    def status_for_value(self, value: float) -> str:
        if self.orientation == "higher":
            if value >= self.target:
                return "healthy"
            if value >= self.warning:
                return "watch"
            return "at-risk"
        if value <= self.target:
            return "healthy"
        if value <= self.warning:
            return "watch"
        return "at-risk"


@dataclass(slots=True)
class IndicatorReading:
    """Individual observation recorded for an indicator."""

    indicator: str
    value: float
    confidence: float = 0.5
    change: float = 0.0
    sample_size: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    notes: tuple[str, ...] = field(default_factory=tuple)
    sources: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.indicator = _normalise_key(self.indicator)
        self.value = float(self.value)
        self.confidence = _clamp(float(self.confidence), lower=0.0, upper=1.0)
        self.change = float(self.change)
        self.sample_size = max(float(self.sample_size), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.notes = _normalise_tuple(self.notes)
        self.sources = _normalise_tuple(self.sources)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def weight(self) -> float:
        base = self.sample_size if self.sample_size > 0 else 1.0
        return base * (0.5 + 0.5 * self.confidence)


@dataclass(slots=True)
class IndicatorSnapshot:
    """Aggregated view of an indicator's current position."""

    key: str
    title: str
    category: str
    value: float
    change: float
    trend: float
    confidence: float
    status: str
    readings: tuple[IndicatorReading, ...]
    notes: tuple[str, ...]
    summary: str
    metadata: Mapping[str, object]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "key": self.key,
            "title": self.title,
            "category": self.category,
            "value": self.value,
            "change": self.change,
            "trend": self.trend,
            "confidence": self.confidence,
            "status": self.status,
            "readings": [asdict(reading) for reading in self.readings],
            "notes": list(self.notes),
            "summary": self.summary,
            "metadata": dict(self.metadata),
        }


@dataclass(slots=True)
class IndicatorOverview:
    """Portfolio level summary across indicators."""

    indicator_count: int
    healthy: tuple[str, ...]
    watch: tuple[str, ...]
    at_risk: tuple[str, ...]
    insufficient: tuple[str, ...]
    overall_health: float
    average_confidence: float
    alerts: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "indicator_count": self.indicator_count,
            "healthy": list(self.healthy),
            "watch": list(self.watch),
            "at_risk": list(self.at_risk),
            "insufficient": list(self.insufficient),
            "overall_health": self.overall_health,
            "average_confidence": self.average_confidence,
            "alerts": list(self.alerts),
            "narrative": self.narrative,
        }


# ---------------------------------------------------------------------------
# engine


class DynamicIndicators:
    """Manage indicator telemetry and compute blended health metrics."""

    def __init__(
        self,
        *,
        history: int = 90,
        decay: float = 0.2,
        definitions: Iterable[IndicatorDefinition | Mapping[str, object]] | None = None,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._history = int(history)
        self._decay = _clamp(float(decay), lower=0.0, upper=0.8)
        self._definitions: dict[str, IndicatorDefinition] = {}
        self._readings: dict[str, Deque[IndicatorReading]] = {}
        if definitions:
            for definition in definitions:
                self.register(definition)

    @property
    def definitions(self) -> Mapping[str, IndicatorDefinition]:
        return dict(self._definitions)

    def register(self, definition: IndicatorDefinition | Mapping[str, object]) -> IndicatorDefinition:
        if isinstance(definition, Mapping):
            definition = IndicatorDefinition(**definition)
        if not isinstance(definition, IndicatorDefinition):  # pragma: no cover - defensive guard
            raise TypeError("definition must be an IndicatorDefinition")
        self._definitions[definition.key] = definition
        self._readings.setdefault(definition.key, deque(maxlen=self._history))
        return definition

    def ingest(
        self,
        readings: IndicatorReading | Mapping[str, object] | Iterable[IndicatorReading | Mapping[str, object]],
    ) -> tuple[IndicatorReading, ...]:
        if isinstance(readings, (IndicatorReading, Mapping)):
            stream: Iterable[IndicatorReading | Mapping[str, object]] = (readings,)
        else:
            stream = readings

        ingested: list[IndicatorReading] = []
        for entry in stream:
            if isinstance(entry, Mapping):
                reading = IndicatorReading(**entry)
            elif isinstance(entry, IndicatorReading):
                reading = entry
            else:  # pragma: no cover - defensive guard
                raise TypeError("readings must be IndicatorReading instances or mappings")
            if reading.indicator not in self._definitions:
                raise KeyError(f"unknown indicator: {reading.indicator}")
            buffer = self._readings.setdefault(reading.indicator, deque(maxlen=self._history))
            buffer.append(reading)
            ingested.append(reading)
        return tuple(ingested)

    def snapshot(self, indicator: str) -> IndicatorSnapshot:
        key = _normalise_key(indicator)
        if key not in self._definitions:
            raise KeyError(f"unknown indicator: {key}")
        definition = self._definitions[key]
        readings = tuple(self._readings.get(key, ()))
        if not readings:
            summary = (
                f"{definition.title} lacks telemetry; capture fresh readings to gauge momentum."
            )
            return IndicatorSnapshot(
                key=definition.key,
                title=definition.title,
                category=definition.category,
                value=0.0,
                change=0.0,
                trend=0.0,
                confidence=0.0,
                status="insufficient-data",
                readings=(),
                notes=(),
                summary=summary,
                metadata={
                    "unit": definition.unit,
                    "category": definition.category,
                    "target": definition.target,
                    "warning": definition.warning,
                    "critical": definition.critical,
                    "orientation": definition.orientation,
                    "reading_count": 0,
                },
            )

        weights = [reading.weight for reading in readings]
        total_weight = sum(weights)
        weighted_value = sum(reading.value * weight for reading, weight in zip(readings, weights))
        value = weighted_value / total_weight if total_weight else readings[-1].value
        confidence = sum(reading.confidence for reading in readings) / len(readings)

        if len(readings) >= 2:
            change = readings[-1].value - readings[-2].value
        else:
            change = 0.0

        window = definition.trend_window
        if window <= 1 or len(readings) < 2:
            trend = change
        else:
            recent = readings[-window:]
            trend = recent[-1].value - recent[0].value

        status = definition.status_for_value(value)

        notes: list[str] = []
        for reading in reversed(readings):
            notes.extend(reading.notes)
            if len(notes) >= 3:
                break
        notes = notes[:3]

        direction = "improving" if trend > 0 else "softening" if trend < 0 else "stable"
        summary = (
            f"{definition.title} is {status.replace('-', ' ')} at {value:.2f}{definition.unit}. "
            f"Trend is {direction} with confidence {confidence:.2f}."
        )

        metadata = {
            "unit": definition.unit,
            "category": definition.category,
            "target": definition.target,
            "warning": definition.warning,
            "critical": definition.critical,
            "orientation": definition.orientation,
            "reading_count": len(readings),
        }
        if definition.metadata:
            metadata.update(definition.metadata)

        return IndicatorSnapshot(
            key=definition.key,
            title=definition.title,
            category=definition.category,
            value=value,
            change=change,
            trend=trend,
            confidence=confidence,
            status=status,
            readings=readings,
            notes=tuple(notes),
            summary=summary,
            metadata=metadata,
        )

    def overview(self) -> IndicatorOverview:
        if not self._definitions:
            raise RuntimeError("no indicators registered")
        snapshots = [self.snapshot(key) for key in self._definitions]
        healthy: list[str] = []
        watch: list[str] = []
        at_risk: list[str] = []
        insufficient: list[str] = []
        attainment_total = 0.0
        weight_total = 0.0
        confidence_total = 0.0
        for snapshot in snapshots:
            definition = self._definitions[snapshot.key]
            weight = definition.weight if definition.weight > 0 else 1.0
            attainment_total += weight * _attainment(definition, snapshot.value)
            weight_total += weight
            confidence_total += snapshot.confidence
            bucket = snapshot.status
            if bucket == "healthy":
                healthy.append(definition.title)
            elif bucket == "watch":
                watch.append(definition.title)
            elif bucket == "at-risk":
                at_risk.append(definition.title)
            else:
                insufficient.append(definition.title)

        indicator_count = len(snapshots)
        overall_health = (
            attainment_total / weight_total if weight_total else 0.0
        )
        average_confidence = (
            confidence_total / indicator_count if indicator_count else 0.0
        )

        alerts: list[str] = []
        if at_risk:
            alerts.append("Indicators at risk: " + ", ".join(at_risk))
        if watch:
            alerts.append("Indicators to monitor: " + ", ".join(watch))

        narrative = (
            f"Tracking {indicator_count} indicators. "
            f"Healthy: {len(healthy)}, Watch: {len(watch)}, At risk: {len(at_risk)}."
        )

        return IndicatorOverview(
            indicator_count=indicator_count,
            healthy=tuple(healthy),
            watch=tuple(watch),
            at_risk=tuple(at_risk),
            insufficient=tuple(insufficient),
            overall_health=_clamp(overall_health, lower=0.0, upper=1.0),
            average_confidence=_clamp(average_confidence, lower=0.0, upper=1.0),
            alerts=tuple(alerts),
            narrative=narrative,
        )

    def reset(self) -> None:
        for buffer in self._readings.values():
            buffer.clear()

    def history(self, indicator: str) -> tuple[IndicatorReading, ...]:
        key = _normalise_key(indicator)
        if key not in self._readings:
            raise KeyError(f"unknown indicator: {key}")
        return tuple(self._readings[key])
