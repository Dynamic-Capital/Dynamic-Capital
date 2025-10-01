"""Executive alignment analytics for Dynamic Capital's leadership pods.

This module models a lightweight telemetry layer for the office of the CEO.
Teams can log weighted qualitative and quantitative pulses for strategic
initiatives, and the algorithm produces normalised snapshots that highlight the
most resilient focus areas, areas requiring attention, and the current
leadership momentum trend.  The API mirrors other ``dynamic_algo`` utilities so
services can plug executive telemetry into dashboards without requiring a
backend database.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Deque, Dict, Iterable, Mapping, MutableMapping, Tuple

__all__ = [
    "CEOPulse",
    "CEOInitiativeSummary",
    "CEOSnapshot",
    "DynamicCEOAlgo",
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


def _normalise_initiative(value: str) -> str:
    normalised = str(value).strip()
    if not normalised:
        raise ValueError("initiative is required")
    return normalised.lower()


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
class CEOPulse:
    """Weighted qualitative + quantitative signal for an initiative."""

    initiative: str
    growth_score: float
    innovation_score: float
    sentiment_score: float
    risk_score: float
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_now)
    note: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.initiative = _normalise_initiative(self.initiative)
        self.growth_score = _clamp(_coerce_float(self.growth_score))
        self.innovation_score = _clamp(_coerce_float(self.innovation_score))
        self.sentiment_score = _clamp(_coerce_float(self.sentiment_score), lower=0.0, upper=1.0)
        self.risk_score = _clamp(_coerce_float(self.risk_score), lower=0.0, upper=1.0)
        self.weight = _coerce_positive(self.weight)
        self.timestamp = _coerce_timestamp(self.timestamp)
        self.note = _normalise_text(self.note)
        self.metadata = _normalise_metadata(self.metadata)

    def combined_score(self) -> float:
        return (self.growth_score + self.innovation_score + self.sentiment_score) / 3.0 - self.risk_score


@dataclass(slots=True)
class CEOInitiativeSummary:
    """Aggregated executive telemetry for a single initiative."""

    initiative: str
    sample_count: int
    total_weight: float
    average_growth: float
    average_innovation: float
    average_sentiment: float
    average_risk: float
    momentum: float
    last_updated: datetime | None

    @property
    def health_score(self) -> float:
        return _clamp(
            (self.average_growth + self.average_innovation + self.average_sentiment) / 3.0 - self.average_risk,
            lower=0.0,
            upper=1.0,
        )

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "initiative": self.initiative,
            "sample_count": self.sample_count,
            "total_weight": self.total_weight,
            "average_growth": self.average_growth,
            "average_innovation": self.average_innovation,
            "average_sentiment": self.average_sentiment,
            "average_risk": self.average_risk,
            "momentum": self.momentum,
            "health_score": self.health_score,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
        }


@dataclass(slots=True)
class CEOSnapshot:
    """Holistic CEO intelligence snapshot."""

    total_initiatives: int
    total_pulses: int
    overall_growth: float
    overall_innovation: float
    overall_sentiment: float
    overall_risk: float
    strategic_health: float
    dominant_initiative: str | None
    momentum: float
    last_updated: datetime | None
    initiatives: Tuple[CEOInitiativeSummary, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "total_initiatives": self.total_initiatives,
            "total_pulses": self.total_pulses,
            "overall_growth": self.overall_growth,
            "overall_innovation": self.overall_innovation,
            "overall_sentiment": self.overall_sentiment,
            "overall_risk": self.overall_risk,
            "strategic_health": self.strategic_health,
            "dominant_initiative": self.dominant_initiative,
            "momentum": self.momentum,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
            "initiatives": [summary.as_dict() for summary in self.initiatives],
        }


class DynamicCEOAlgo:
    """Maintain rolling CEO telemetry and compute strategic insights."""

    def __init__(
        self,
        *,
        window_size: int | None = 160,
        window_duration: timedelta | None = timedelta(days=60),
    ) -> None:
        self.window_size = window_size if window_size and window_size > 0 else None
        self.window_duration = window_duration
        self._pulses: Dict[str, Deque[CEOPulse]] = {}

    # ---------------------------------------------------------------- recording
    def record_pulse(self, pulse: CEOPulse | Mapping[str, object]) -> CEOPulse:
        if not isinstance(pulse, CEOPulse):
            pulse = CEOPulse(**pulse)
        queue = self._pulses.setdefault(pulse.initiative, self._make_queue())
        queue.append(pulse)
        self._purge_old(queue)
        return pulse

    def ingest(self, pulses: Iterable[CEOPulse | Mapping[str, object]]) -> None:
        for pulse in pulses:
            self.record_pulse(pulse)

    # ---------------------------------------------------------------- snapshots
    def build_snapshot(self, *, now: datetime | None = None) -> CEOSnapshot:
        now_ts = _coerce_timestamp(now) if now is not None else _now()
        summaries: list[CEOInitiativeSummary] = []
        total_weight = 0.0
        total_growth = 0.0
        total_innovation = 0.0
        total_sentiment = 0.0
        total_risk = 0.0
        total_pulses = 0
        weighted_momentum = 0.0
        last_updated: datetime | None = None

        for initiative, queue in list(self._pulses.items()):
            self._purge_old(queue, reference=now_ts)
            if not queue:
                continue
            summary = self._summarise_initiative(initiative, queue)
            summaries.append(summary)
            total_pulses += summary.sample_count
            total_weight += summary.total_weight
            total_growth += summary.average_growth * summary.total_weight
            total_innovation += summary.average_innovation * summary.total_weight
            total_sentiment += summary.average_sentiment * summary.total_weight
            total_risk += summary.average_risk * summary.total_weight
            weighted_momentum += summary.momentum * summary.total_weight
            if summary.last_updated and (last_updated is None or summary.last_updated > last_updated):
                last_updated = summary.last_updated

        overall_growth = total_growth / total_weight if total_weight else 0.0
        overall_innovation = total_innovation / total_weight if total_weight else 0.0
        overall_sentiment = total_sentiment / total_weight if total_weight else 0.0
        overall_risk = total_risk / total_weight if total_weight else 0.0
        strategic_health = _clamp(
            (overall_growth + overall_innovation + overall_sentiment) / 3.0 - overall_risk,
            lower=0.0,
            upper=1.0,
        )
        average_momentum = weighted_momentum / total_weight if total_weight else 0.0

        dominant_initiative = None
        if summaries:
            dominant_initiative = max(summaries, key=lambda item: item.health_score).initiative

        summaries.sort(key=lambda summary: summary.health_score, reverse=True)

        return CEOSnapshot(
            total_initiatives=len(summaries),
            total_pulses=total_pulses,
            overall_growth=overall_growth,
            overall_innovation=overall_innovation,
            overall_sentiment=overall_sentiment,
            overall_risk=overall_risk,
            strategic_health=strategic_health,
            dominant_initiative=dominant_initiative,
            momentum=average_momentum,
            last_updated=last_updated,
            initiatives=tuple(summaries),
        )

    # ----------------------------------------------------------------- helpers
    def _make_queue(self) -> Deque[CEOPulse]:
        return deque(maxlen=self.window_size)

    def _purge_old(self, queue: Deque[CEOPulse], *, reference: datetime | None = None) -> None:
        if self.window_duration is None:
            return
        reference_ts = reference or _now()
        threshold = reference_ts - self.window_duration
        while queue and queue[0].timestamp < threshold:
            queue.popleft()

    def _summarise_initiative(self, initiative: str, queue: Deque[CEOPulse]) -> CEOInitiativeSummary:
        pulses = list(queue)
        sample_count = len(pulses)
        total_weight = sum(pulse.weight for pulse in pulses)
        if total_weight <= 0:
            total_weight = float(sample_count) or 1.0
        weighted_growth = sum(pulse.growth_score * pulse.weight for pulse in pulses)
        weighted_innovation = sum(pulse.innovation_score * pulse.weight for pulse in pulses)
        weighted_sentiment = sum(pulse.sentiment_score * pulse.weight for pulse in pulses)
        weighted_risk = sum(pulse.risk_score * pulse.weight for pulse in pulses)

        average_growth = weighted_growth / total_weight if total_weight else 0.0
        average_innovation = weighted_innovation / total_weight if total_weight else 0.0
        average_sentiment = weighted_sentiment / total_weight if total_weight else 0.0
        average_risk = weighted_risk / total_weight if total_weight else 0.0

        combined_scores = [pulse.combined_score() for pulse in pulses]
        if sample_count >= 3:
            split = max(1, sample_count // 3)
            early = combined_scores[:split]
            recent = combined_scores[-split:]
            momentum = (sum(recent) / len(recent)) - (sum(early) / len(early))
        elif sample_count == 2:
            momentum = combined_scores[-1] - combined_scores[0]
        else:
            momentum = 0.0

        last_updated = pulses[-1].timestamp if pulses else None

        return CEOInitiativeSummary(
            initiative=initiative,
            sample_count=sample_count,
            total_weight=total_weight,
            average_growth=average_growth,
            average_innovation=average_innovation,
            average_sentiment=average_sentiment,
            average_risk=average_risk,
            momentum=momentum,
            last_updated=last_updated,
        )
