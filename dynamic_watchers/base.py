"""Monitoring utilities for Watcher personas.

The watcher role focuses on analysing telemetry streams, surfacing anomalies
early, and summarising the health of a system.  The classes in this module
provide a lightweight in-memory implementation that can be embedded into
automations or invoked ad-hoc from notebooks.  They are intentionally
stateless and avoid external dependencies so they remain easy to unit test.
"""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import mean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "WatcherSignal",
    "WatcherRule",
    "WatcherAlert",
    "MetricSummary",
    "WatcherReport",
    "DynamicWatcher",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_metric(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("metric must not be empty")
    return cleaned.lower()


def _normalise_tags(tags: Sequence[str] | str | None) -> tuple[str, ...]:
    if tags is None:
        return ()
    if isinstance(tags, str):
        tags = (tags,)
    seen: set[str] = set()
    resolved: list[str] = []
    for tag in tags:
        cleaned = tag.strip()
        if not cleaned:
            continue
        lowered = cleaned.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        resolved.append(lowered)
    return tuple(resolved)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class WatcherSignal:
    """Single observation captured by a watcher."""

    metric: str
    value: float
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.metric = _normalise_metric(self.metric)
        self.value = float(self.value)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class WatcherRule:
    """Threshold rule evaluated against watcher signals."""

    metric: str
    lower: float | None = None
    upper: float | None = None
    tolerance: float = 0.0
    severity: str = "warning"
    description: str | None = None

    def __post_init__(self) -> None:
        self.metric = _normalise_metric(self.metric)
        if self.lower is not None:
            self.lower = float(self.lower)
        if self.upper is not None:
            self.upper = float(self.upper)
        if self.lower is None and self.upper is None:
            raise ValueError("rule must define a lower and/or upper bound")
        self.tolerance = max(float(self.tolerance), 0.0)
        self.severity = self.severity.strip().lower() or "warning"
        if self.description is not None:
            self.description = self.description.strip()


@dataclass(slots=True)
class WatcherAlert:
    """Alert raised when a rule is violated."""

    metric: str
    severity: str
    message: str
    value: float
    threshold: tuple[float | None, float | None]
    timestamp: datetime


@dataclass(slots=True)
class MetricSummary:
    """Aggregated statistics for a metric within a window."""

    metric: str
    samples: int
    minimum: float
    maximum: float
    average: float
    last: float
    trend: float


@dataclass(slots=True)
class WatcherReport:
    """Summary of metrics and alerts generated from observed signals."""

    metrics: tuple[MetricSummary, ...]
    alerts: tuple[WatcherAlert, ...]
    window: int
    generated_at: datetime


class DynamicWatcher:
    """Accumulate telemetry and surface anomalies for a Watcher role."""

    def __init__(self, *, history: int = 288, rules: Sequence[WatcherRule] | None = None) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[WatcherSignal] = deque(maxlen=history)
        self._rules: MutableMapping[str, WatcherRule] = {}
        if rules:
            for rule in rules:
                self.register_rule(rule)

    # ----------------------------------------------------------------- ingest
    def observe(self, signal: WatcherSignal | Mapping[str, object]) -> WatcherSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[WatcherSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.observe(signal)

    def reset(self) -> None:
        self._signals.clear()

    def _coerce_signal(self, signal: WatcherSignal | Mapping[str, object]) -> WatcherSignal:
        if isinstance(signal, WatcherSignal):
            return signal
        if isinstance(signal, Mapping):
            payload = dict(signal)
            if "timestamp" not in payload or payload.get("timestamp") is None:
                payload["timestamp"] = _utcnow()
            return WatcherSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be WatcherSignal or mapping")

    # -------------------------------------------------------------- rule utils
    @property
    def rules(self) -> tuple[WatcherRule, ...]:
        return tuple(self._rules.values())

    def register_rule(self, rule: WatcherRule | Mapping[str, object]) -> WatcherRule:
        resolved = rule if isinstance(rule, WatcherRule) else WatcherRule(**dict(rule))  # type: ignore[arg-type]
        self._rules[resolved.metric] = resolved
        return resolved

    def remove_rule(self, metric: str) -> None:
        self._rules.pop(_normalise_metric(metric), None)

    def clear_rules(self) -> None:
        self._rules.clear()

    # ----------------------------------------------------------------- summary
    def report(self, *, window: int | None = None) -> WatcherReport:
        signals = self._window_signals(window)
        if not signals:
            raise RuntimeError("no watcher signals observed")

        summaries = self._summaries_for(signals)
        alerts = self._evaluate_rules(signals)
        return WatcherReport(
            metrics=tuple(summaries),
            alerts=tuple(alerts),
            window=len(signals),
            generated_at=_utcnow(),
        )

    def _window_signals(self, window: int | None) -> list[WatcherSignal]:
        if window is None:
            return list(self._signals)
        if window <= 0:
            raise ValueError("window must be positive when provided")
        buffer = list(self._signals)
        if window >= len(buffer):
            return buffer
        return buffer[-window:]

    def _summaries_for(self, signals: Sequence[WatcherSignal]) -> list[MetricSummary]:
        grouped: MutableMapping[str, list[WatcherSignal]] = defaultdict(list)
        for signal in signals:
            grouped[signal.metric].append(signal)

        summaries: list[MetricSummary] = []
        for metric in sorted(grouped):
            items = grouped[metric]
            values = [item.value for item in items]
            summaries.append(
                MetricSummary(
                    metric=metric,
                    samples=len(items),
                    minimum=min(values),
                    maximum=max(values),
                    average=mean(values),
                    last=values[-1],
                    trend=values[-1] - values[0],
                )
            )
        return summaries

    def _evaluate_rules(self, signals: Sequence[WatcherSignal]) -> list[WatcherAlert]:
        if not self._rules:
            return []

        alerts: list[WatcherAlert] = []
        for signal in signals:
            rule = self._rules.get(signal.metric)
            if rule is None:
                continue

            lower_threshold = None
            if rule.lower is not None:
                lower_threshold = rule.lower - rule.tolerance
                if signal.value < lower_threshold:
                    message = rule.description or (
                        f"{signal.metric} below lower bound {rule.lower:.4f}"
                    )
                    alerts.append(
                        WatcherAlert(
                            metric=signal.metric,
                            severity=rule.severity,
                            message=message,
                            value=signal.value,
                            threshold=(rule.lower, rule.upper),
                            timestamp=signal.timestamp,
                        )
                    )
                    continue

            if rule.upper is not None:
                upper_threshold = rule.upper + rule.tolerance
                if signal.value > upper_threshold:
                    message = rule.description or (
                        f"{signal.metric} above upper bound {rule.upper:.4f}"
                    )
                    alerts.append(
                        WatcherAlert(
                            metric=signal.metric,
                            severity=rule.severity,
                            message=message,
                            value=signal.value,
                            threshold=(rule.lower, rule.upper),
                            timestamp=signal.timestamp,
                        )
                    )

        return alerts

    # ----------------------------------------------------------------- expose
    @property
    def signals(self) -> tuple[WatcherSignal, ...]:
        return tuple(self._signals)
