"""Dynamic logging engine orchestrating observability signals across systems."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "LogSeverity",
    "LogEvent",
    "LoggingSnapshot",
    "DynamicLoggingEngine",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for value in values:
        cleaned = value.strip()
        if not cleaned:
            continue
        lowered = cleaned.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        normalised.append(lowered)
    return tuple(normalised)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


class LogSeverity(str, Enum):
    """Enumeration of supported log severity levels."""

    TRACE = "trace"
    DEBUG = "debug"
    INFO = "info"
    NOTICE = "notice"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

    def __str__(self) -> str:  # pragma: no cover - trivial representation
        return self.value


_SEVERITY_WEIGHTS: Mapping[LogSeverity, float] = {
    LogSeverity.TRACE: 0.05,
    LogSeverity.DEBUG: 0.1,
    LogSeverity.INFO: 0.2,
    LogSeverity.NOTICE: 0.35,
    LogSeverity.WARNING: 0.55,
    LogSeverity.ERROR: 0.8,
    LogSeverity.CRITICAL: 1.0,
}

_SEVERITY_ORDER: Mapping[LogSeverity, int] = {
    LogSeverity.TRACE: 0,
    LogSeverity.DEBUG: 1,
    LogSeverity.INFO: 2,
    LogSeverity.NOTICE: 3,
    LogSeverity.WARNING: 4,
    LogSeverity.ERROR: 5,
    LogSeverity.CRITICAL: 6,
}


def _coerce_severity(value: LogSeverity | str) -> LogSeverity:
    if isinstance(value, LogSeverity):
        return value
    try:
        return LogSeverity(_normalise_lower(value))
    except ValueError as exc:  # pragma: no cover - defensive guard
        raise ValueError(f"unknown severity: {value!r}") from exc


@dataclass(slots=True)
class LogEvent:
    """Structured representation of a single log event."""

    source: str
    message: str
    severity: LogSeverity | str
    category: str = "general"
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.source = _normalise_lower(self.source)
        self.message = _normalise_text(self.message)
        self.category = _normalise_lower(self.category)
        self.severity = _coerce_severity(self.severity)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tuple(self.tags)
        self.metadata = _coerce_metadata(self.metadata)

    @property
    def severity_rank(self) -> int:
        return _SEVERITY_ORDER[self.severity]

    @property
    def severity_weight(self) -> float:
        return _SEVERITY_WEIGHTS[self.severity]

    @property
    def is_error(self) -> bool:
        return self.severity_rank >= _SEVERITY_ORDER[LogSeverity.ERROR]

    def describe(self) -> str:
        tags = f" [{', '.join(self.tags)}]" if self.tags else ""
        return f"{self.timestamp.isoformat()} | {self.source}:{self.category} | {self.severity.value.upper()} | {self.message}{tags}"


@dataclass(slots=True)
class LoggingSnapshot:
    """Aggregated view of the logging posture at a point in time."""

    total_events: int
    severity_counts: Mapping[LogSeverity, int]
    severity_heatmap: Mapping[LogSeverity, float]
    top_sources: tuple[str, ...]
    top_categories: tuple[str, ...]
    active_tags: tuple[str, ...]
    error_rate: float
    stability_index: float
    recent_events: tuple[LogEvent, ...]
    recent_errors: tuple[LogEvent, ...]
    last_event: LogEvent | None

    def requires_intervention(self, threshold: float = 0.6) -> bool:
        return self.stability_index <= max(min(threshold, 1.0), 0.0)

    def summary(self) -> str:
        last_event = self.last_event.describe() if self.last_event else "<no events>"
        return (
            " | ".join(
                [
                    f"total={self.total_events}",
                    f"error_rate={self.error_rate:.2%}",
                    f"stability={self.stability_index:.2f}",
                    f"last={last_event}",
                ]
            )
        )


def _top_keys(counter: Counter[str], *, limit: int = 3) -> tuple[str, ...]:
    if not counter:
        return ()
    return tuple(item for item, _ in counter.most_common(limit))


def _dedupe_tags(events: Iterable[LogEvent]) -> tuple[str, ...]:
    seen: set[str] = set()
    ordered: list[str] = []
    for event in events:
        for tag in event.tags:
            if tag not in seen:
                seen.add(tag)
                ordered.append(tag)
    return tuple(ordered)


def _decrement(counter: Counter, key: object) -> None:
    if key not in counter:
        return
    counter[key] -= 1
    if counter[key] <= 0:
        del counter[key]


class DynamicLoggingEngine:
    """Engine that orchestrates log ingestion, enrichment, and observability."""

    def __init__(self, *, history_limit: int = 512) -> None:
        if history_limit <= 0:
            raise ValueError("history_limit must be positive")
        self._history_limit = history_limit
        self._events: Deque[LogEvent] = deque(maxlen=history_limit)
        self._severity_counter: Counter[LogSeverity] = Counter()
        self._source_counter: Counter[str] = Counter()
        self._category_counter: Counter[str] = Counter()
        self._sinks: MutableMapping[str, Callable[[LogEvent, LoggingSnapshot], None]] = {}

    @property
    def history_limit(self) -> int:
        return self._history_limit

    @property
    def events(self) -> tuple[LogEvent, ...]:
        return tuple(self._events)

    @property
    def sinks(self) -> tuple[str, ...]:
        return tuple(self._sinks.keys())

    def register_sink(
        self, name: str, sink: Callable[[LogEvent, LoggingSnapshot], None]
    ) -> None:
        name = _normalise_lower(name)
        if not callable(sink):
            raise TypeError("sink must be callable")
        self._sinks[name] = sink

    def unregister_sink(self, name: str) -> None:
        name = _normalise_lower(name)
        self._sinks.pop(name, None)

    def log(
        self,
        *,
        source: str,
        message: str,
        severity: LogSeverity | str = LogSeverity.INFO,
        category: str = "general",
        timestamp: datetime | None = None,
        tags: Sequence[str] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> LoggingSnapshot:
        event = LogEvent(
            source=source,
            message=message,
            severity=severity,
            category=category,
            timestamp=timestamp or _utcnow(),
            tags=tuple(tags) if tags else (),
            metadata=metadata,
        )
        return self.process(event)

    def process(self, event: LogEvent) -> LoggingSnapshot:
        dropped: LogEvent | None = None
        if len(self._events) == self._history_limit:
            dropped = self._events[0]
        self._events.append(event)
        self._severity_counter[event.severity] += 1
        self._source_counter[event.source] += 1
        self._category_counter[event.category] += 1
        if dropped is not None:
            _decrement(self._severity_counter, dropped.severity)
            _decrement(self._source_counter, dropped.source)
            _decrement(self._category_counter, dropped.category)
        snapshot = self.build_snapshot()
        for sink in self._sinks.values():
            sink(event, snapshot)
        return snapshot

    def build_snapshot(self) -> LoggingSnapshot:
        events = tuple(self._events)
        total = len(events)
        severity_counts = {severity: self._severity_counter.get(severity, 0) for severity in LogSeverity}
        severity_heatmap = {
            severity: (severity_counts[severity] / total * weight) if total else 0.0
            for severity, weight in _SEVERITY_WEIGHTS.items()
        }
        error_count = sum(
            severity_counts[severity]
            for severity in (LogSeverity.WARNING, LogSeverity.ERROR, LogSeverity.CRITICAL)
        )
        error_rate = error_count / total if total else 0.0
        stability_penalty = min(error_rate * 1.5, 1.0)
        recent_events = events[-5:]
        recent_errors = tuple(
            event
            for event in reversed(events)
            if event.severity_rank >= _SEVERITY_ORDER[LogSeverity.ERROR]
        )[:5]
        return LoggingSnapshot(
            total_events=total,
            severity_counts=severity_counts,
            severity_heatmap=severity_heatmap,
            top_sources=_top_keys(self._source_counter),
            top_categories=_top_keys(self._category_counter),
            active_tags=_dedupe_tags(recent_events),
            error_rate=error_rate,
            stability_index=max(0.0, 1.0 - stability_penalty),
            recent_events=recent_events,
            recent_errors=recent_errors,
            last_event=events[-1] if events else None,
        )

    def ingest_many(self, events: Iterable[LogEvent]) -> LoggingSnapshot | None:
        snapshot: LoggingSnapshot | None = None
        for event in events:
            snapshot = self.process(event)
        return snapshot

