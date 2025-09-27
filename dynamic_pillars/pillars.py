"""Stewardship utilities for Dynamic Capital pillars."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "PillarSignal",
    "PillarDefinition",
    "PillarSnapshot",
    "PillarOverview",
    "DynamicPillarFramework",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_key(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("pillar key must not be empty")
    return cleaned


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text must not be empty")
    return cleaned


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _normalise_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class PillarSignal:
    """Observation that influences a pillar's health."""

    pillar: str
    score: float
    confidence: float = 0.5
    momentum: float = 0.0
    weight: float = 1.0
    origin: str | None = None
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    narrative: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.pillar = _normalise_key(self.pillar)
        self.score = _clamp(float(self.score))
        self.confidence = _clamp(float(self.confidence))
        self.momentum = _clamp(float(self.momentum), lower=-1.0, upper=1.0)
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.origin = _normalise_optional_text(self.origin)
        self.tags = _normalise_tags(self.tags)
        self.narrative = _normalise_optional_text(self.narrative)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class PillarDefinition:
    """Guardrails that frame a pillar's contribution."""

    key: str
    title: str
    description: str = ""
    weight: float = 1.0
    minimum_health: float = 0.45
    target_health: float = 0.7
    guardrails: tuple[str, ...] = field(default_factory=tuple)
    lead_indicators: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.key = _normalise_key(self.key)
        self.title = _normalise_text(self.title)
        self.description = self.description.strip()
        self.weight = max(float(self.weight), 0.0)
        self.minimum_health = _clamp(float(self.minimum_health))
        self.target_health = _clamp(float(self.target_health))
        if self.minimum_health > self.target_health:
            raise ValueError("minimum_health must not exceed target_health")
        self.guardrails = _normalise_tuple(self.guardrails)
        self.lead_indicators = _normalise_tuple(self.lead_indicators)


@dataclass(slots=True)
class PillarSnapshot:
    """Aggregated view of a pillar's present posture."""

    key: str
    title: str
    score: float
    confidence: float
    momentum: float
    trend: float
    status: str
    summary: str
    definition: PillarDefinition
    signals: tuple[PillarSignal, ...]
    tags: tuple[str, ...]
    alerts: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "key": self.key,
            "title": self.title,
            "score": self.score,
            "confidence": self.confidence,
            "momentum": self.momentum,
            "trend": self.trend,
            "status": self.status,
            "summary": self.summary,
            "signals": [signal.__dict__ for signal in self.signals],
            "tags": list(self.tags),
            "alerts": list(self.alerts),
        }


@dataclass(slots=True)
class PillarOverview:
    """System level narrative that orchestrates all pillars."""

    overall_health: float
    stability: float
    priorities: tuple[str, ...]
    alerts: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "overall_health": self.overall_health,
            "stability": self.stability,
            "priorities": list(self.priorities),
            "alerts": list(self.alerts),
            "narrative": self.narrative,
        }


class DynamicPillarFramework:
    """Capture pillar signals and synthesise governance insights."""

    def __init__(
        self,
        *,
        history: int = 40,
        decay: float = 0.2,
        definitions: Iterable[PillarDefinition | Mapping[str, object]] | None = None,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._history = int(history)
        self._decay = _clamp(float(decay), lower=0.0, upper=0.5)
        self._definitions: dict[str, PillarDefinition] = {}
        self._signals: dict[str, Deque[PillarSignal]] = {}
        if definitions:
            for definition in definitions:
                self.register(definition)

    @property
    def definitions(self) -> Mapping[str, PillarDefinition]:
        return dict(self._definitions)

    def register(self, definition: PillarDefinition | Mapping[str, object]) -> PillarDefinition:
        if isinstance(definition, Mapping):
            definition = PillarDefinition(**definition)
        if not isinstance(definition, PillarDefinition):  # pragma: no cover - defensive guard
            raise TypeError("definition must be a PillarDefinition")
        self._definitions[definition.key] = definition
        self._signals.setdefault(definition.key, deque(maxlen=self._history))
        return definition

    def ingest(self, signals: PillarSignal | Iterable[PillarSignal]) -> None:
        if isinstance(signals, PillarSignal):
            stream = (signals,)
        else:
            stream = tuple(signals)
        for signal in stream:
            if not isinstance(signal, PillarSignal):
                raise TypeError("signals must be PillarSignal instances")
            if signal.pillar not in self._definitions:
                raise KeyError(f"unknown pillar: {signal.pillar}")
            self._signals[signal.pillar].append(signal)

    def snapshot(self, pillar: str) -> PillarSnapshot:
        key = _normalise_key(pillar)
        if key not in self._definitions:
            raise KeyError(f"unknown pillar: {key}")
        definition = self._definitions[key]
        signals = tuple(self._signals.get(key, ()))
        if not signals:
            summary = (
                f"{definition.title} lacks recent telemetry; schedule a ritual to "
                "collect fresh signals."
            )
            alerts = (f"{definition.title}: insufficient data",)
            return PillarSnapshot(
                key=definition.key,
                title=definition.title,
                score=0.0,
                confidence=0.0,
                momentum=0.0,
                trend=0.0,
                status="insufficient-data",
                summary=summary,
                definition=definition,
                signals=(),
                tags=definition.guardrails,
                alerts=alerts,
            )

        weights: list[float] = []
        scores: list[float] = []
        confidences: list[float] = []
        momenta: list[float] = []
        tags: set[str] = set()
        decay_base = 1.0 - self._decay
        for index, signal in enumerate(reversed(signals)):
            attenuation = decay_base**index
            weight = max(signal.weight * attenuation, 0.0)
            weights.append(weight)
            scores.append(signal.score)
            confidences.append(signal.confidence)
            momenta.append(signal.momentum)
            tags.update(signal.tags)
        total_weight = sum(weights) or 1.0
        score = sum(value * weight for value, weight in zip(scores, weights)) / total_weight
        confidence = (
            sum(value * weight for value, weight in zip(confidences, weights)) / total_weight
        )
        momentum = sum(value * weight for value, weight in zip(momenta, weights)) / total_weight
        trend = signals[-1].score - signals[0].score if len(signals) > 1 else 0.0
        status: str
        alerts: list[str] = []
        if score >= definition.target_health and confidence >= 0.55:
            status = "healthy"
        elif score >= definition.minimum_health:
            status = "watch"
            alerts.append(
                f"{definition.title} is trending neutral; reinforce guardrails before drift occurs."
            )
        else:
            status = "critical"
            alerts.append(
                f"{definition.title} breached the health threshold; deploy a recovery sprint."
            )
        if trend < -0.1:
            alerts.append(f"{definition.title} trend is deteriorating ({trend:.2f}).")
        if momentum < -0.15:
            alerts.append(f"{definition.title} has negative momentum ({momentum:.2f}).")
        summary = (
            f"{definition.title} is {status} with a score of {score:.2f} and "
            f"confidence {confidence:.2f}. Momentum {momentum:.2f}; trend {trend:.2f}."
        )
        return PillarSnapshot(
            key=definition.key,
            title=definition.title,
            score=score,
            confidence=confidence,
            momentum=momentum,
            trend=trend,
            status=status,
            summary=summary,
            definition=definition,
            signals=signals,
            tags=tuple(sorted(tags)),
            alerts=tuple(alerts),
        )

    def overview(self) -> PillarOverview:
        if not self._definitions:
            raise RuntimeError("no pillar definitions registered")
        snapshots = [self.snapshot(key) for key in self._definitions]
        total_weight = sum(snapshot.definition.weight for snapshot in snapshots) or 1.0
        weighted_health = sum(
            snapshot.score * snapshot.definition.weight for snapshot in snapshots
        ) / total_weight
        stability = sum(snapshot.confidence for snapshot in snapshots) / len(snapshots)
        priorities = tuple(
            snapshot.title
            for snapshot in sorted(
                snapshots,
                key=lambda snap: (snap.status != "healthy", snap.score, -snap.confidence),
            )
            if snapshot.status != "healthy"
        )
        alerts: list[str] = []
        for snapshot in snapshots:
            alerts.extend(snapshot.alerts)
        if priorities:
            narrative = (
                "Stabilise pillars "
                + ", ".join(priorities)
                + " while protecting healthy lanes."
            )
        else:
            narrative = (
                "All pillars are operating within guardrails; focus on compounding breakthroughs."
            )
        return PillarOverview(
            overall_health=weighted_health,
            stability=stability,
            priorities=priorities,
            alerts=tuple(alerts),
            narrative=narrative,
        )
