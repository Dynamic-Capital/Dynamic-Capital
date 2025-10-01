"""Operational excellence analytics for Dynamic Capital's COO office."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Deque, Dict, Iterable, Mapping, MutableMapping, Tuple

__all__ = [
    "OperationalSignal",
    "OperationalDomainSummary",
    "OperationsSnapshot",
    "DynamicCOOAlgo",
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


def _coerce_positive(value: object, *, default: float = 1.0) -> float:
    coerced = _coerce_float(value, default=default)
    if coerced <= 0:
        raise ValueError("weight must be positive")
    return coerced


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_domain(value: str) -> str:
    domain = str(value).strip()
    if not domain:
        raise ValueError("domain identifier is required")
    return domain.lower()


def _normalise_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalised = str(value).strip()
    return normalised or None


def _normalise_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guardrail
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class OperationalSignal:
    """Normalised operational telemetry from squads and runbooks."""

    domain: str
    throughput_per_day: float
    cycle_time_hours: float
    on_time_rate: float
    quality_score: float
    incident_count: int
    customer_impact: float
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_now)
    note: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.domain = _normalise_domain(self.domain)
        self.throughput_per_day = max(0.0, _coerce_float(self.throughput_per_day))
        self.cycle_time_hours = max(0.0, _coerce_float(self.cycle_time_hours, default=0.0))
        self.on_time_rate = _clamp(_coerce_float(self.on_time_rate))
        self.quality_score = _clamp(_coerce_float(self.quality_score))
        self.incident_count = int(max(0.0, _coerce_float(self.incident_count)))
        self.customer_impact = _clamp(_coerce_float(self.customer_impact))
        self.weight = _coerce_positive(self.weight)
        self.timestamp = _coerce_timestamp(self.timestamp)
        self.note = _normalise_text(self.note)
        self.metadata = _normalise_metadata(self.metadata)

    @property
    def efficiency_score(self) -> float:
        return _clamp((self.throughput_per_day / max(self.cycle_time_hours or 1.0, 1.0)) / 10.0)

    @property
    def stability_score(self) -> float:
        incident_penalty = _clamp(self.incident_count / 10.0)
        impact_penalty = self.customer_impact
        return _clamp((self.on_time_rate + self.quality_score) / 2.0 - (incident_penalty + impact_penalty) / 2.0)


@dataclass(slots=True)
class OperationalDomainSummary:
    """Aggregated metrics for an operational domain."""

    domain: str
    sample_count: int
    total_weight: float
    average_throughput: float
    average_cycle_time: float
    average_on_time_rate: float
    average_quality_score: float
    incident_rate: float
    average_customer_impact: float
    efficiency_index: float
    stability_index: float
    last_updated: datetime | None

    @property
    def health_index(self) -> float:
        return _clamp((self.efficiency_index + self.stability_index) / 2.0)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "domain": self.domain,
            "sample_count": self.sample_count,
            "total_weight": self.total_weight,
            "average_throughput": self.average_throughput,
            "average_cycle_time": self.average_cycle_time,
            "average_on_time_rate": self.average_on_time_rate,
            "average_quality_score": self.average_quality_score,
            "incident_rate": self.incident_rate,
            "average_customer_impact": self.average_customer_impact,
            "efficiency_index": self.efficiency_index,
            "stability_index": self.stability_index,
            "health_index": self.health_index,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
        }


@dataclass(slots=True)
class OperationsSnapshot:
    """Executive-ready snapshot of operational performance."""

    total_domains: int
    total_samples: int
    average_throughput: float
    average_cycle_time: float
    average_on_time_rate: float
    average_quality_score: float
    incident_rate: float
    average_customer_impact: float
    efficiency_index: float
    stability_index: float
    dominant_domain: str | None
    last_updated: datetime | None
    domains: Tuple[OperationalDomainSummary, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "total_domains": self.total_domains,
            "total_samples": self.total_samples,
            "average_throughput": self.average_throughput,
            "average_cycle_time": self.average_cycle_time,
            "average_on_time_rate": self.average_on_time_rate,
            "average_quality_score": self.average_quality_score,
            "incident_rate": self.incident_rate,
            "average_customer_impact": self.average_customer_impact,
            "efficiency_index": self.efficiency_index,
            "stability_index": self.stability_index,
            "dominant_domain": self.dominant_domain,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
            "domains": [summary.as_dict() for summary in self.domains],
        }


class DynamicCOOAlgo:
    """Maintain rolling operational telemetry and derive focus areas."""

    def __init__(
        self,
        *,
        window_size: int | None = 180,
        window_duration: timedelta | None = timedelta(days=120),
    ) -> None:
        self.window_size = window_size if window_size and window_size > 0 else None
        self.window_duration = window_duration
        self._signals: Dict[str, Deque[OperationalSignal]] = {}

    # ---------------------------------------------------------------- recording
    def record_signal(self, signal: OperationalSignal | Mapping[str, object]) -> OperationalSignal:
        if not isinstance(signal, OperationalSignal):
            signal = OperationalSignal(**signal)
        queue = self._signals.setdefault(signal.domain, self._make_queue())
        queue.append(signal)
        self._purge_old(queue)
        return signal

    def ingest(self, signals: Iterable[OperationalSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.record_signal(signal)

    # ---------------------------------------------------------------- snapshots
    def build_snapshot(self, *, now: datetime | None = None) -> OperationsSnapshot:
        now_ts = _coerce_timestamp(now) if now is not None else _now()
        summaries: list[OperationalDomainSummary] = []
        total_weight = 0.0
        total_throughput = 0.0
        total_cycle_time = 0.0
        total_on_time = 0.0
        total_quality = 0.0
        total_incidents = 0.0
        total_impact = 0.0
        total_samples = 0
        weighted_efficiency = 0.0
        weighted_stability = 0.0
        last_updated: datetime | None = None

        for domain, queue in list(self._signals.items()):
            self._purge_old(queue, reference=now_ts)
            if not queue:
                continue
            summary = self._summarise_domain(domain, queue)
            summaries.append(summary)
            total_samples += summary.sample_count
            total_weight += summary.total_weight
            total_throughput += summary.average_throughput * summary.total_weight
            total_cycle_time += summary.average_cycle_time * summary.total_weight
            total_on_time += summary.average_on_time_rate * summary.total_weight
            total_quality += summary.average_quality_score * summary.total_weight
            total_incidents += summary.incident_rate * summary.total_weight
            total_impact += summary.average_customer_impact * summary.total_weight
            weighted_efficiency += summary.efficiency_index * summary.total_weight
            weighted_stability += summary.stability_index * summary.total_weight
            if summary.last_updated and (last_updated is None or summary.last_updated > last_updated):
                last_updated = summary.last_updated

        average_throughput = total_throughput / total_weight if total_weight else 0.0
        average_cycle_time = total_cycle_time / total_weight if total_weight else 0.0
        average_on_time = total_on_time / total_weight if total_weight else 0.0
        average_quality = total_quality / total_weight if total_weight else 0.0
        incident_rate = total_incidents / total_weight if total_weight else 0.0
        average_impact = total_impact / total_weight if total_weight else 0.0
        efficiency_index = weighted_efficiency / total_weight if total_weight else 0.0
        stability_index = weighted_stability / total_weight if total_weight else 0.0

        dominant_domain = None
        if summaries:
            dominant_domain = max(summaries, key=lambda item: item.health_index).domain

        summaries.sort(key=lambda item: item.health_index, reverse=True)

        return OperationsSnapshot(
            total_domains=len(summaries),
            total_samples=total_samples,
            average_throughput=average_throughput,
            average_cycle_time=average_cycle_time,
            average_on_time_rate=average_on_time,
            average_quality_score=average_quality,
            incident_rate=incident_rate,
            average_customer_impact=average_impact,
            efficiency_index=efficiency_index,
            stability_index=stability_index,
            dominant_domain=dominant_domain,
            last_updated=last_updated,
            domains=tuple(summaries),
        )

    # ----------------------------------------------------------------- helpers
    def _make_queue(self) -> Deque[OperationalSignal]:
        return deque(maxlen=self.window_size)

    def _purge_old(self, queue: Deque[OperationalSignal], *, reference: datetime | None = None) -> None:
        if self.window_duration is None:
            return
        reference_ts = reference or _now()
        threshold = reference_ts - self.window_duration
        while queue and queue[0].timestamp < threshold:
            queue.popleft()

    def _summarise_domain(self, domain: str, queue: Deque[OperationalSignal]) -> OperationalDomainSummary:
        signals = list(queue)
        sample_count = len(signals)
        total_weight = sum(signal.weight for signal in signals)
        if total_weight <= 0:
            total_weight = float(sample_count) or 1.0

        weighted_throughput = sum(signal.throughput_per_day * signal.weight for signal in signals)
        weighted_cycle_time = sum(signal.cycle_time_hours * signal.weight for signal in signals)
        weighted_on_time = sum(signal.on_time_rate * signal.weight for signal in signals)
        weighted_quality = sum(signal.quality_score * signal.weight for signal in signals)
        weighted_incidents = sum(signal.incident_count * signal.weight for signal in signals)
        weighted_impact = sum(signal.customer_impact * signal.weight for signal in signals)
        weighted_efficiency = sum(signal.efficiency_score * signal.weight for signal in signals)
        weighted_stability = sum(signal.stability_score * signal.weight for signal in signals)

        average_throughput = weighted_throughput / total_weight if total_weight else 0.0
        average_cycle_time = weighted_cycle_time / total_weight if total_weight else 0.0
        average_on_time = weighted_on_time / total_weight if total_weight else 0.0
        average_quality = weighted_quality / total_weight if total_weight else 0.0
        incident_rate = weighted_incidents / total_weight if total_weight else 0.0
        average_impact = weighted_impact / total_weight if total_weight else 0.0
        efficiency_index = weighted_efficiency / total_weight if total_weight else 0.0
        stability_index = weighted_stability / total_weight if total_weight else 0.0

        last_updated = signals[-1].timestamp if signals else None

        return OperationalDomainSummary(
            domain=domain,
            sample_count=sample_count,
            total_weight=total_weight,
            average_throughput=average_throughput,
            average_cycle_time=average_cycle_time,
            average_on_time_rate=average_on_time,
            average_quality_score=average_quality,
            incident_rate=incident_rate,
            average_customer_impact=average_impact,
            efficiency_index=efficiency_index,
            stability_index=stability_index,
            last_updated=last_updated,
        )
