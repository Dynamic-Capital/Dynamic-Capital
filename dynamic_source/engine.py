"""Dynamic source orchestration primitives for ingest pipelines."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "SourceDescriptor",
    "SourceSignal",
    "SourceSnapshot",
    "SignalInsight",
    "DynamicSourceEngine",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_key(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
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


def _coerce_descriptor(value: SourceDescriptor | Mapping[str, object]) -> SourceDescriptor:
    if isinstance(value, SourceDescriptor):
        return value
    if isinstance(value, Mapping):
        return SourceDescriptor(**value)
    raise TypeError("source must be a SourceDescriptor or mapping")


def _coerce_signal(value: SourceSignal | Mapping[str, object]) -> SourceSignal:
    if isinstance(value, SourceSignal):
        return value
    if isinstance(value, Mapping):
        return SourceSignal(**value)
    raise TypeError("signal must be a SourceSignal or mapping")


def _evaluate_signal(
    signal: "SourceSignal", *, reference_time: datetime | None = None
) -> tuple[float, float]:
    """Return the signal score and freshness in minutes for the given signal.

    The evaluation reuses a shared ``reference_time`` so that multiple signals can
    be analysed against the same moment in time. This avoids redundant calls to
    :func:`_utcnow` when the engine aggregates large batches of signals.
    """

    reference = reference_time or _utcnow()
    freshness = reference - signal.timestamp
    freshness_minutes = freshness.total_seconds() / 60.0
    latency_penalty = (
        1.0 if signal.latency_ms <= 0 else min(1.0, 200.0 / (signal.latency_ms + 1.0))
    )
    freshness_penalty = (
        1.0 if freshness_minutes <= 1.0 else max(0.0, 1.0 - freshness_minutes / 180.0)
    )
    score = _clamp(
        signal.confidence * 0.5
        + signal.impact * 0.35
        + latency_penalty * 0.1
        + freshness_penalty * 0.05
    )
    return score, freshness_minutes


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class SourceDescriptor:
    """Metadata describing a dynamic source of intelligence."""

    name: str
    domain: str
    tier: str = "external"
    reliability: float = 0.5
    criticality: float = 0.5
    freshness_sla_minutes: int = 30
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.domain = _normalise_key(self.domain)
        self.tier = _normalise_key(self.tier)
        self.reliability = _clamp(float(self.reliability))
        self.criticality = _clamp(float(self.criticality))
        if self.freshness_sla_minutes <= 0:
            raise ValueError("freshness_sla_minutes must be positive")
        self.freshness_sla_minutes = int(self.freshness_sla_minutes)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def posture_score(self) -> float:
        """Combined indicator for the strategic relevance of the source."""

        return _clamp(self.reliability * 0.6 + self.criticality * 0.4)


@dataclass(slots=True)
class SourceSignal:
    """Discrete signal captured from a registered source."""

    source: str
    channel: str
    payload: str
    confidence: float
    impact: float
    latency_ms: float
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.source = _normalise_text(self.source)
        self.channel = _normalise_key(self.channel)
        self.payload = _normalise_text(self.payload)
        self.confidence = _clamp(float(self.confidence))
        self.impact = _clamp(float(self.impact))
        self.latency_ms = max(float(self.latency_ms), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def freshness(self) -> timedelta:
        return _utcnow() - self.timestamp

    @property
    def freshness_minutes(self) -> float:
        return self.freshness.total_seconds() / 60.0

    @property
    def signal_score(self) -> float:
        score, _ = _evaluate_signal(self)
        return score


@dataclass(slots=True)
class SignalInsight:
    """Computed metrics for a signal within a snapshot horizon."""

    signal: SourceSignal
    score: float
    freshness_minutes: float


@dataclass(slots=True)
class SourceSnapshot:
    """Summary view of the current health of a source."""

    descriptor: SourceDescriptor
    signals: tuple[SourceSignal, ...]
    evaluations: tuple[SignalInsight, ...]
    reliability_score: float
    freshness_score: float
    readiness_score: float
    metrics: Mapping[str, float]

    def as_payload(self) -> Mapping[str, object]:
        return {
            "name": self.descriptor.name,
            "domain": self.descriptor.domain,
            "tier": self.descriptor.tier,
            "reliability_score": self.reliability_score,
            "freshness_score": self.freshness_score,
            "readiness_score": self.readiness_score,
            "signals": [
                {
                    "channel": insight.signal.channel,
                    "confidence": insight.signal.confidence,
                    "impact": insight.signal.impact,
                    "signal_score": insight.score,
                    "timestamp": insight.signal.timestamp.isoformat(),
                }
                for insight in self.evaluations
            ],
            "metrics": dict(self.metrics),
        }


# ---------------------------------------------------------------------------
# engine


class DynamicSourceEngine:
    """Co-ordinate the dynamic sources powering downstream pipelines."""

    def __init__(
        self,
        sources: Sequence[SourceDescriptor | Mapping[str, object]] | None = None,
        *,
        max_signals_per_source: int = 256,
        stale_after_minutes: int = 240,
    ) -> None:
        self._sources: MutableMapping[str, SourceDescriptor] = {}
        self._signals: MutableMapping[str, Deque[SourceSignal]] = {}
        self._max_signals_per_source = max(1, int(max_signals_per_source))
        self._stale_after = timedelta(minutes=max(1, int(stale_after_minutes)))
        for source in sources or ():
            self.register_source(source)

    # ------------------------------------------------------------------ sources
    @property
    def sources(self) -> tuple[SourceDescriptor, ...]:
        return tuple(self._sources.values())

    def register_source(self, source: SourceDescriptor | Mapping[str, object]) -> SourceDescriptor:
        descriptor = _coerce_descriptor(source)
        key = descriptor.name.lower()
        self._sources[key] = descriptor
        if key not in self._signals:
            self._signals[key] = deque(maxlen=self._max_signals_per_source)
        return descriptor

    def remove_source(self, name: str) -> None:
        key = _normalise_key(name)
        self._sources.pop(key, None)
        self._signals.pop(key, None)

    def get_source(self, name: str) -> SourceDescriptor | None:
        return self._sources.get(_normalise_key(name))

    # ------------------------------------------------------------------ signals
    def record_signal(self, signal: SourceSignal | Mapping[str, object]) -> SourceSignal:
        resolved = _coerce_signal(signal)
        key = resolved.source.lower()
        if key not in self._sources:
            raise KeyError(f"source '{resolved.source}' is not registered")
        bucket = self._signals.setdefault(key, deque(maxlen=self._max_signals_per_source))
        bucket.append(resolved)
        cutoff = _utcnow() - self._stale_after
        while bucket and bucket[0].timestamp < cutoff:
            bucket.popleft()
        return resolved

    def ingest_signals(self, signals: Iterable[SourceSignal | Mapping[str, object]]) -> list[SourceSignal]:
        ingested: list[SourceSignal] = []
        for signal in signals:
            ingested.append(self.record_signal(signal))
        return ingested

    def clear_signals(self, name: str) -> None:
        key = _normalise_key(name)
        if key in self._signals:
            self._signals[key].clear()

    # ---------------------------------------------------------------- snapshots
    def snapshot(self, name: str, *, horizon_minutes: int = 120) -> SourceSnapshot:
        key = _normalise_key(name)
        descriptor = self._sources.get(key)
        if descriptor is None:
            raise KeyError(f"source '{name}' is not registered")
        bucket = self._signals.get(key, deque())
        if horizon_minutes <= 0:
            relevant_signals = tuple(bucket)
        else:
            cutoff = _utcnow() - timedelta(minutes=horizon_minutes)
            relevant_signals = tuple(signal for signal in bucket if signal.timestamp >= cutoff)

        evaluations: list[SignalInsight] = []
        if relevant_signals:
            reference_time = _utcnow()
            reliability_total = 0.0
            freshness_penalty = float("inf")
            confidence_total = 0.0
            impact_total = 0.0
            latency_total = 0.0
            for signal in relevant_signals:
                score, freshness_minutes = _evaluate_signal(signal, reference_time=reference_time)
                evaluations.append(
                    SignalInsight(signal=signal, score=score, freshness_minutes=freshness_minutes)
                )
                reliability_total += score
                freshness_penalty = min(freshness_penalty, freshness_minutes)
                confidence_total += signal.confidence
                impact_total += signal.impact
                latency_total += signal.latency_ms
            count = float(len(relevant_signals))
            reliability_score = reliability_total / count
            freshness_score = _clamp(
                1.0 - freshness_penalty / max(descriptor.freshness_sla_minutes, 1)
            )
            metrics: MutableMapping[str, float] = {
                "total_signals": count,
                "avg_confidence": confidence_total / count,
                "avg_impact": impact_total / count,
                "avg_latency_ms": latency_total / count,
            }
        else:
            reliability_score = 0.0
            freshness_score = 0.0
            metrics = {
                "total_signals": 0.0,
                "avg_confidence": 0.0,
                "avg_impact": 0.0,
                "avg_latency_ms": 0.0,
            }
            relevant_signals = ()
            evaluations = []
        readiness_score = _clamp(
            descriptor.posture_score * 0.5 + reliability_score * 0.35 + freshness_score * 0.15
        )
        return SourceSnapshot(
            descriptor=descriptor,
            signals=relevant_signals,
            evaluations=tuple(evaluations),
            reliability_score=reliability_score,
            freshness_score=freshness_score,
            readiness_score=readiness_score,
            metrics=metrics,
        )

    def network_overview(self, *, horizon_minutes: int = 120) -> Mapping[str, SourceSnapshot]:
        return {
            descriptor.name: self.snapshot(descriptor.name, horizon_minutes=horizon_minutes)
            for descriptor in self._sources.values()
        }

    def export_state(self, *, horizon_minutes: int = 120) -> dict[str, object]:
        overview = self.network_overview(horizon_minutes=horizon_minutes)
        readiness = [snapshot.readiness_score for snapshot in overview.values()]
        aggregated = {
            "sources": {name: snapshot.as_payload() for name, snapshot in overview.items()},
            "average_readiness": fmean(readiness) if readiness else 0.0,
            "max_readiness": max(readiness) if readiness else 0.0,
            "min_readiness": min(readiness) if readiness else 0.0,
            "generated_at": _utcnow().isoformat(),
        }
        return aggregated

