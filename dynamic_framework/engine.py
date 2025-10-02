"""Dynamic Framework engine for orchestrating execution maturity."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from types import MappingProxyType
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

from .settings import FrameworkSettings

__all__ = [
    "FrameworkNode",
    "FrameworkPulse",
    "FrameworkSnapshot",
    "FrameworkReport",
    "FrameworkSettings",
    "DynamicFrameworkEngine",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


def _normalise_key(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("node key must not be empty")
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


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class FrameworkNode:
    """Blueprint describing a capability node inside the framework."""

    key: str
    title: str
    description: str = ""
    weight: float = 1.0
    minimum_maturity: float = 0.45
    target_maturity: float = 0.75
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    practices: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.key = _normalise_key(self.key)
        self.title = _normalise_text(self.title)
        self.description = self.description.strip()
        self.weight = max(float(self.weight), 0.0)
        self.minimum_maturity = _clamp(float(self.minimum_maturity))
        self.target_maturity = _clamp(float(self.target_maturity))
        if self.target_maturity < self.minimum_maturity:
            self.target_maturity = self.minimum_maturity
        self.dependencies = tuple(
            _normalise_key(dependency)
            for dependency in self.dependencies
            if dependency.strip()
        )
        self.practices = _normalise_tuple(self.practices)


@dataclass(slots=True)
class FrameworkPulse:
    """Telemetry describing the current health of a framework node."""

    node: str
    maturity: float
    confidence: float = 0.5
    enablement: float = 0.5
    resilience: float = 0.5
    momentum: float = 0.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    narrative: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.node = _normalise_key(self.node)
        self.maturity = _clamp(float(self.maturity))
        self.confidence = _clamp(float(self.confidence))
        self.enablement = _clamp(float(self.enablement))
        self.resilience = _clamp(float(self.resilience))
        self.momentum = _clamp(float(self.momentum), lower=-1.0, upper=1.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.narrative = _normalise_optional_text(self.narrative)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class FrameworkSnapshot:
    """Aggregated perspective for a single framework node."""

    key: str
    title: str
    maturity: float
    confidence: float
    enablement: float
    resilience: float
    momentum: float
    status: str
    summary: str
    tags: tuple[str, ...]
    recommendations: tuple[str, ...]
    alerts: tuple[str, ...]


@dataclass(slots=True)
class FrameworkReport:
    """Portfolio view across all framework nodes."""

    overall_maturity: float
    execution_health: float
    momentum: float
    focus_areas: tuple[str, ...]
    alerts: tuple[str, ...]
    summary: str
    snapshots: tuple[FrameworkSnapshot, ...] = ()


class DynamicFrameworkEngine:
    """Aggregates framework telemetry into actionable posture signals."""

    def __init__(
        self,
        nodes: Iterable[FrameworkNode | Mapping[str, object]] | None = None,
        *,
        history: int = 64,
        decay: float = 0.08,
        settings: FrameworkSettings | Mapping[str, object] | None = None,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        if not 0.0 <= decay < 1.0:
            raise ValueError("decay must be between 0 and 1")
        self._history = history
        self._decay = float(decay)
        self._nodes: MutableMapping[str, FrameworkNode] = {}
        self._pulses: MutableMapping[str, Deque[FrameworkPulse]] = {}
        if settings is None:
            self._settings = FrameworkSettings()
        elif isinstance(settings, FrameworkSettings):
            self._settings = settings
        elif isinstance(settings, Mapping):
            self._settings = FrameworkSettings(**dict(settings))
        else:  # pragma: no cover - defensive guard
            raise TypeError("settings must be a FrameworkSettings or mapping")
        if nodes:
            self.register_many(nodes)

    @property
    def history(self) -> int:
        return self._history

    @property
    def decay(self) -> float:
        return self._decay

    @property
    def nodes(self) -> Mapping[str, FrameworkNode]:
        return MappingProxyType(self._nodes)

    @property
    def settings(self) -> FrameworkSettings:
        return self._settings

    def register(self, node: FrameworkNode | Mapping[str, object]) -> FrameworkNode:
        if isinstance(node, Mapping):
            node = FrameworkNode(**node)
        elif not isinstance(node, FrameworkNode):  # pragma: no cover - defensive guard
            raise TypeError("node must be a FrameworkNode or mapping")
        self._nodes[node.key] = node
        self._pulses.setdefault(node.key, deque(maxlen=self._history))
        return node

    def register_many(
        self, nodes: Iterable[FrameworkNode | Mapping[str, object]]
    ) -> None:
        for node in nodes:
            self.register(node)

    def record(self, pulse: FrameworkPulse) -> None:
        if pulse.node not in self._nodes:
            raise KeyError(f"unknown framework node: {pulse.node}")
        self._pulses.setdefault(pulse.node, deque(maxlen=self._history)).append(pulse)

    def ingest(self, pulses: Iterable[FrameworkPulse]) -> None:
        for pulse in pulses:
            self.record(pulse)

    def clear(self, key: str | None = None) -> None:
        if key is None:
            for pulses in self._pulses.values():
                pulses.clear()
        else:
            normalised = _normalise_key(key)
            if normalised in self._pulses:
                self._pulses[normalised].clear()

    def snapshot(self, key: str) -> FrameworkSnapshot:
        node_key = _normalise_key(key)
        if node_key not in self._nodes:
            raise KeyError(f"unknown framework node: {node_key}")
        node = self._nodes[node_key]
        pulses = tuple(self._pulses.get(node_key, ()))
        if not pulses:
            summary = (
                f"{node.title} lacks current telemetry; schedule an enablement review to "
                "collect fresh signals."
            )
            return FrameworkSnapshot(
                key=node.key,
                title=node.title,
                maturity=0.0,
                confidence=0.0,
                enablement=0.0,
                resilience=0.0,
                momentum=0.0,
                status="insufficient-data",
                summary=summary,
                tags=node.practices,
                recommendations=("Establish discovery rituals to produce baseline telemetry.",),
                alerts=(f"{node.title}: insufficient telemetry",),
            )

        tags: set[str] = set()
        decay_base = 1.0 - self._decay
        attenuation = 1.0
        total_weight = 0.0
        maturity_total = 0.0
        confidence_total = 0.0
        enablement_total = 0.0
        resilience_total = 0.0
        momentum_total = 0.0
        for pulse in reversed(pulses):
            weight = max(pulse.confidence * attenuation, 0.0)
            total_weight += weight
            maturity_total += pulse.maturity * weight
            confidence_total += pulse.confidence * weight
            enablement_total += pulse.enablement * weight
            resilience_total += pulse.resilience * weight
            momentum_total += pulse.momentum * weight
            tags.update(pulse.tags)
            attenuation *= decay_base

        if total_weight <= 0.0:
            total_weight = 1.0
        maturity = maturity_total / total_weight
        confidence = confidence_total / total_weight
        enablement = enablement_total / total_weight
        resilience = resilience_total / total_weight
        momentum = momentum_total / total_weight
        momentum = _clamp(momentum, lower=-1.0, upper=1.0)
        trend = pulses[-1].maturity - pulses[0].maturity if len(pulses) > 1 else 0.0

        status: str
        alerts: list[str] = []
        recommendations: list[str] = []
        settings = self._settings

        if (
            maturity >= node.target_maturity
            and enablement >= settings.enablement_integrated_threshold
            and resilience >= settings.resilience_integrated_threshold
        ):
            status = "integrated"
        elif maturity >= node.minimum_maturity:
            status = "calibrating"
            alerts.append(
                f"{node.title} is stabilising below target maturity; reinforce operating rhythms."
            )
        else:
            status = "fragile"
            alerts.append(
                f"{node.title} maturity is below guardrails; deploy a recovery sprint."
            )
        if enablement < settings.enablement_guardrail:
            recommendations.append(f"Invest in enablement rituals for {node.title}.")
            alerts.append(
                f"{node.title} enablement is lagging ({enablement:.2f} < {settings.enablement_guardrail:.2f})."
            )
        if resilience < settings.resilience_guardrail:
            recommendations.append(f"Build resilience buffers within {node.title} workflows.")
            alerts.append(
                f"{node.title} resilience is fragile ({resilience:.2f} < {settings.resilience_guardrail:.2f})."
            )
        if momentum < settings.momentum_negative_threshold:
            recommendations.append(f"Counter negative momentum for {node.title} with fast wins.")
            alerts.append(
                f"{node.title} momentum is deteriorating ({momentum:.2f} < {settings.momentum_negative_threshold:.2f})."
            )
        if trend < settings.trend_decline_threshold:
            alerts.append(
                f"{node.title} trend is declining ({trend:.2f} < {settings.trend_decline_threshold:.2f})."
            )
        missing_dependencies = [
            dependency
            for dependency in node.dependencies
            if not self._pulses.get(dependency)
        ]
        if missing_dependencies:
            alerts.append(
                "Dependencies lack telemetry: "
                + ", ".join(sorted(missing_dependencies))
                + "."
            )
        if not recommendations:
            recommendations.append(f"Maintain the current execution loop for {node.title}.")

        summary = (
            f"{node.title} is {status} with maturity {maturity:.2f} and confidence {confidence:.2f}. "
            f"Enablement {enablement:.2f}; resilience {resilience:.2f}; momentum {momentum:.2f}."
        )
        aggregated_tags = tuple(sorted(dict.fromkeys((*node.practices, *tags))))
        return FrameworkSnapshot(
            key=node.key,
            title=node.title,
            maturity=maturity,
            confidence=confidence,
            enablement=enablement,
            resilience=resilience,
            momentum=momentum,
            status=status,
            summary=summary,
            tags=aggregated_tags,
            recommendations=tuple(dict.fromkeys(recommendations)),
            alerts=tuple(dict.fromkeys(alerts)),
        )

    def report(self) -> FrameworkReport:
        if not self._nodes:
            raise RuntimeError("no framework nodes registered")
        snapshot_list: list[FrameworkSnapshot] = []
        weights: dict[str, float] = {}
        for key, node in self._nodes.items():
            snapshot = self.snapshot(key)
            snapshot_list.append(snapshot)
            weights[snapshot.key] = node.weight

        snapshots = tuple(snapshot_list)

        total_weight = sum(weights.values()) or 1.0
        overall_maturity = (
            sum(snapshot.maturity * weights[snapshot.key] for snapshot in snapshots)
            / total_weight
        )
        execution_health = (
            sum(snapshot.enablement * weights[snapshot.key] for snapshot in snapshots)
            / total_weight
        )
        momentum = (
            sum(snapshot.momentum * weights[snapshot.key] for snapshot in snapshots)
            / total_weight
        )
        focus_areas = tuple(
            snapshot.title
            for snapshot in sorted(
                snapshots,
                key=lambda snap: (
                    snap.status == "integrated",
                    snap.maturity,
                    -snap.confidence,
                ),
            )
            if snapshot.status != "integrated"
        )
        alerts: list[str] = []
        for snapshot in snapshots:
            alerts.extend(snapshot.alerts)
        if focus_areas:
            summary = (
                f"Overall maturity {overall_maturity:.2f}; execution health {execution_health:.2f}. "
                "Focus on "
                + ", ".join(focus_areas)
                + " to accelerate integration."
            )
        else:
            summary = (
                f"Overall maturity {overall_maturity:.2f}; execution health {execution_health:.2f}. "
                "Framework is integrated; compound momentum."
            )
        return FrameworkReport(
            overall_maturity=overall_maturity,
            execution_health=execution_health,
            momentum=momentum,
            focus_areas=focus_areas,
            alerts=tuple(dict.fromkeys(alerts)),
            summary=summary,
            snapshots=snapshots,
        )
