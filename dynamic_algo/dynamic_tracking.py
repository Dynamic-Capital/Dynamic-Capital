"""Dynamic funnel tracking and anomaly detection utilities."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from math import sqrt
from typing import Dict, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "TrackingEvent",
    "StageSummary",
    "TrackingSnapshot",
    "DynamicTrackingAlgo",
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_timestamp(value: datetime | str | None) -> datetime:
    if value is None:
        return _now()
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, str):
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    raise TypeError("timestamp must be datetime, ISO-8601 string, or None")


def _coerce_float(value: object, *, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coerce_positive_int(value: object, *, default: int = 1) -> int:
    try:
        coerced = int(value)
    except (TypeError, ValueError):
        coerced = default
    if coerced <= 0:
        raise ValueError("value must be a positive integer")
    return coerced


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_identifier(value: str, *, upper: bool = True) -> str:
    normalised = str(value).strip()
    if not normalised:
        raise ValueError("identifier is required")
    return normalised.upper() if upper else normalised


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalised = str(value).strip()
    return normalised or None


def _normalise_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class TrackingEvent:
    """Represents a funnel signal emitted from product or growth telemetry."""

    user_id: str
    stage: str
    action: str | None = None
    value: float = 1.0
    channel: str | None = None
    timestamp: datetime = field(default_factory=_now)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.user_id = _normalise_identifier(self.user_id, upper=False)
        self.stage = _normalise_identifier(self.stage)
        self.action = (_normalise_optional_text(self.action) or None)
        self.value = _coerce_float(self.value, default=0.0)
        self.channel = (_normalise_optional_text(self.channel) or None)
        self.timestamp = _coerce_timestamp(self.timestamp)
        self.metadata = _normalise_metadata(self.metadata)


@dataclass(slots=True)
class StageSummary:
    """Aggregated statistics for a funnel stage across the lookback window."""

    stage: str
    event_count: int
    unique_users: int
    total_value: float
    average_value: float
    conversion_rate: float
    drop_off_rate: float

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "stage": self.stage,
            "event_count": self.event_count,
            "unique_users": self.unique_users,
            "total_value": self.total_value,
            "average_value": self.average_value,
            "conversion_rate": self.conversion_rate,
            "drop_off_rate": self.drop_off_rate,
        }


@dataclass(slots=True)
class TrackingSnapshot:
    """Executive snapshot of the funnel health for the active window."""

    generated_at: datetime
    lookback_window: timedelta
    total_events: int
    total_users: int
    stage_summaries: Sequence[StageSummary]
    velocity_per_day: float
    anomaly_score: float
    metadata: Mapping[str, object] | None = None

    @property
    def overall_conversion(self) -> float:
        if not self.stage_summaries:
            return 0.0
        first_unique = self.stage_summaries[0].unique_users
        last_unique = self.stage_summaries[-1].unique_users
        if first_unique <= 0:
            return 0.0
        return _clamp(last_unique / first_unique)

    @property
    def average_drop_off(self) -> float:
        if not self.stage_summaries:
            return 0.0
        if len(self.stage_summaries) == 1:
            return 0.0
        drop_offs = [summary.drop_off_rate for summary in self.stage_summaries[1:]]
        return sum(drop_offs) / len(drop_offs)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "generated_at": self.generated_at.isoformat(),
            "lookback_window_hours": self.lookback_window.total_seconds() / 3600.0,
            "total_events": self.total_events,
            "total_users": self.total_users,
            "velocity_per_day": self.velocity_per_day,
            "anomaly_score": self.anomaly_score,
            "overall_conversion": self.overall_conversion,
            "average_drop_off": self.average_drop_off,
            "stage_summaries": [summary.as_dict() for summary in self.stage_summaries],
            "metadata": dict(self.metadata) if self.metadata else None,
        }


class DynamicTrackingAlgo:
    """Tracks user movement through growth funnels with lightweight analytics."""

    def __init__(
        self,
        stage_order: Iterable[str],
        *,
        lookback_window: timedelta | None = None,
        max_events: int = 5000,
    ) -> None:
        stages = tuple(_normalise_identifier(stage) for stage in stage_order)
        if not stages:
            raise ValueError("at least one stage must be provided")
        self._stage_order: tuple[str, ...] = stages
        self._stage_index: Dict[str, int] = {stage: index for index, stage in enumerate(stages)}
        self.lookback_window = lookback_window or timedelta(days=14)
        if self.lookback_window <= timedelta(0):
            raise ValueError("lookback_window must be positive")
        self.max_events = _coerce_positive_int(max_events)
        self._events: list[TrackingEvent] = []

    @property
    def stage_order(self) -> Sequence[str]:
        return self._stage_order

    def _trim(self, reference_time: datetime | None = None) -> None:
        if reference_time is None:
            reference_time = _now()
        cutoff = reference_time - self.lookback_window
        events = self._events
        start_index = 0
        for event in events:
            if event.timestamp >= cutoff:
                break
            start_index += 1

        if start_index:
            del events[:start_index]

        excess = len(events) - self.max_events
        if excess > 0:
            del events[:excess]

    def _ensure_stage(self, stage: str) -> str:
        normalised = _normalise_identifier(stage)
        if normalised not in self._stage_index:
            raise ValueError(f"stage '{normalised}' is not part of the configured funnel")
        return normalised

    def track(
        self,
        user_id: str,
        stage: str,
        *,
        action: str | None = None,
        value: float = 1.0,
        channel: str | None = None,
        timestamp: datetime | str | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> TrackingEvent:
        event = TrackingEvent(
            user_id=user_id,
            stage=self._ensure_stage(stage),
            action=action,
            value=value,
            channel=channel,
            timestamp=timestamp,
            metadata=metadata,
        )
        return self._register(event)

    def ingest(self, payload: Mapping[str, object]) -> bool:
        try:
            user_id = payload.get("user_id") or payload.get("user") or payload.get("uid")
            stage = payload.get("stage") or payload.get("funnel_stage") or payload.get("step")
            if not user_id or not stage:
                return False
            action = payload.get("action") or payload.get("event")
            value = payload.get("value") or payload.get("amount") or payload.get("score") or 1.0
            channel = payload.get("channel") or payload.get("source")
            timestamp = payload.get("timestamp")
            metadata = payload.get("metadata")
            self.track(
                user_id=user_id,
                stage=stage,
                action=action if action is not None else None,
                value=value,
                channel=channel if channel is not None else None,
                timestamp=timestamp,
                metadata=metadata if isinstance(metadata, Mapping) else None,
            )
            return True
        except (TypeError, ValueError):
            return False

    def _register(self, event: TrackingEvent) -> TrackingEvent:
        # Ensure canonical stage validation
        event.stage = self._ensure_stage(event.stage)
        self._insert_sorted(event)
        self._trim(event.timestamp)
        return event

    def _insert_sorted(self, event: TrackingEvent) -> None:
        """Insert ``event`` into ``self._events`` maintaining chronological order."""

        events = self._events
        lo, hi = 0, len(events)
        target_timestamp = event.timestamp

        while lo < hi:
            mid = (lo + hi) // 2
            if events[mid].timestamp <= target_timestamp:
                lo = mid + 1
            else:
                hi = mid

        events.insert(lo, event)

    def snapshot(
        self,
        *,
        metadata: Mapping[str, object] | None = None,
        current_time: datetime | str | None = None,
    ) -> TrackingSnapshot:
        reference_time = _coerce_timestamp(current_time)
        self._trim(reference_time)
        events = list(self._events)
        total_events = len(events)
        if total_events == 0:
            return TrackingSnapshot(
                generated_at=reference_time,
                lookback_window=self.lookback_window,
                total_events=0,
                total_users=0,
                stage_summaries=tuple(
                    StageSummary(
                        stage=stage,
                        event_count=0,
                        unique_users=0,
                        total_value=0.0,
                        average_value=0.0,
                        conversion_rate=1.0 if index == 0 else 0.0,
                        drop_off_rate=0.0,
                    )
                    for index, stage in enumerate(self._stage_order)
                ),
                velocity_per_day=0.0,
                anomaly_score=0.0,
                metadata=_normalise_metadata(metadata),
            )

        events_by_stage: Dict[str, int] = {stage: 0 for stage in self._stage_order}
        value_by_stage: Dict[str, float] = {stage: 0.0 for stage in self._stage_order}
        users_by_stage: Dict[str, set[str]] = {stage: set() for stage in self._stage_order}
        all_users: set[str] = set()

        for event in events:
            events_by_stage[event.stage] += 1
            value_by_stage[event.stage] += event.value
            users_by_stage[event.stage].add(event.user_id)
            all_users.add(event.user_id)

        stage_summaries: list[StageSummary] = []
        previous_unique = 0
        for index, stage in enumerate(self._stage_order):
            count = events_by_stage[stage]
            unique = len(users_by_stage[stage])
            total_value = value_by_stage[stage]
            average_value = total_value / count if count else 0.0
            if index == 0:
                conversion_rate = 1.0 if unique > 0 else 0.0
            else:
                conversion_rate = 0.0 if previous_unique == 0 else _clamp(unique / previous_unique)
            drop_off_rate = 0.0 if index == 0 else _clamp(1.0 - conversion_rate)
            stage_summaries.append(
                StageSummary(
                    stage=stage,
                    event_count=count,
                    unique_users=unique,
                    total_value=total_value,
                    average_value=average_value,
                    conversion_rate=conversion_rate,
                    drop_off_rate=drop_off_rate,
                )
            )
            previous_unique = unique if unique > 0 else previous_unique

        first_timestamp = events[0].timestamp
        last_timestamp = events[-1].timestamp
        elapsed_days = max((last_timestamp - first_timestamp).total_seconds() / 86400.0, 1.0)
        velocity = total_events / elapsed_days

        anomaly_score = self._calculate_anomaly_score(events, reference_time)

        return TrackingSnapshot(
            generated_at=reference_time,
            lookback_window=self.lookback_window,
            total_events=total_events,
            total_users=len(all_users),
            stage_summaries=tuple(stage_summaries),
            velocity_per_day=velocity,
            anomaly_score=anomaly_score,
            metadata=_normalise_metadata(metadata),
        )

    def _calculate_anomaly_score(
        self,
        events: Sequence[TrackingEvent],
        reference_time: datetime,
    ) -> float:
        window_start = reference_time - timedelta(days=7)
        daily_counts: Dict[datetime, int] = defaultdict(int)
        for event in events:
            if event.timestamp < window_start:
                continue
            day_bucket = datetime(
                event.timestamp.year,
                event.timestamp.month,
                event.timestamp.day,
                tzinfo=timezone.utc,
            )
            daily_counts[day_bucket] += 1

        if not daily_counts:
            return 0.0

        counts = [daily_counts[day] for day in sorted(daily_counts)]
        if len(counts) == 1:
            return 0.0

        mean = sum(counts) / len(counts)
        variance = sum((count - mean) ** 2 for count in counts) / (len(counts) - 1)
        std_dev = sqrt(variance) if variance > 0 else 0.0
        if std_dev == 0:
            return 0.0

        today_bucket = datetime(
            reference_time.year,
            reference_time.month,
            reference_time.day,
            tzinfo=timezone.utc,
        )
        today_count = daily_counts.get(today_bucket, 0)
        return (today_count - mean) / std_dev

