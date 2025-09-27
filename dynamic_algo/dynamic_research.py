"""Research aggregation helpers for Dynamic Capital's intelligence teams."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Deque, Dict, Iterable, MutableMapping, Sequence, Tuple

__all__ = [
    "ResearchSignal",
    "ResearchIdeaSummary",
    "ResearchSnapshot",
    "DynamicResearchAlgo",
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


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


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


def _normalise_identifier(value: str, *, upper: bool = True) -> str:
    normalised = str(value).strip()
    if not normalised:
        raise ValueError("identifier is required")
    return normalised.upper() if upper else normalised.lower()


def _normalise_sequence(values: Sequence[str] | None) -> Tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    result: list[str] = []
    for item in values:
        key = str(item).strip()
        if key and key.lower() not in seen:
            seen.add(key.lower())
            result.append(key)
    return tuple(result)


def _normalise_text(value: str | None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


@dataclass(slots=True)
class ResearchSignal:
    """Canonical representation of a research update or thesis."""

    idea_id: str
    theme: str
    conviction: float
    expected_alpha: float
    risk_score: float
    data_quality: float
    catalysts: Tuple[str, ...] = field(default_factory=tuple)
    analyst: str | None = None
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_now)
    notes: str | None = None

    def __post_init__(self) -> None:
        self.idea_id = _normalise_identifier(self.idea_id)
        self.theme = _normalise_identifier(self.theme, upper=False)
        self.conviction = _clamp(_coerce_float(self.conviction))
        self.expected_alpha = _coerce_float(self.expected_alpha)
        self.risk_score = _clamp(_coerce_float(self.risk_score))
        self.data_quality = _clamp(_coerce_float(self.data_quality))
        self.catalysts = _normalise_sequence(self.catalysts)
        self.analyst = _normalise_text(self.analyst)
        self.weight = _coerce_positive(self.weight)
        self.timestamp = _coerce_timestamp(self.timestamp)
        self.notes = _normalise_text(self.notes)

    @property
    def signal_strength(self) -> float:
        return _clamp((self.conviction * 0.6 + self.data_quality * 0.4) - self.risk_score * 0.5)

    @property
    def risk_adjusted_alpha(self) -> float:
        return max(0.0, self.expected_alpha * (1.0 - self.risk_score))


@dataclass(slots=True)
class ResearchIdeaSummary:
    """Aggregated metrics for a tracked research idea."""

    idea_id: str
    theme: str
    sample_count: int
    total_weight: float
    conviction_score: float
    expected_alpha: float
    risk_index: float
    data_quality: float
    signal_strength: float
    catalysts: Tuple[str, ...]
    analysts: Tuple[str, ...]
    last_updated: datetime | None

    @property
    def risk_adjusted_alpha(self) -> float:
        return max(0.0, self.expected_alpha * (1.0 - self.risk_index))

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "idea_id": self.idea_id,
            "theme": self.theme,
            "sample_count": self.sample_count,
            "total_weight": self.total_weight,
            "conviction_score": self.conviction_score,
            "expected_alpha": self.expected_alpha,
            "risk_index": self.risk_index,
            "data_quality": self.data_quality,
            "signal_strength": self.signal_strength,
            "risk_adjusted_alpha": self.risk_adjusted_alpha,
            "catalysts": self.catalysts,
            "analysts": self.analysts,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
        }


@dataclass(slots=True)
class ResearchSnapshot:
    """Portfolio-level view of research coverage."""

    total_ideas: int
    average_conviction: float
    average_expected_alpha: float
    average_risk: float
    pipeline_health: float
    top_ideas: Tuple[ResearchIdeaSummary, ...]
    themes: Tuple[str, ...]
    last_updated: datetime | None

    @property
    def coverage_score(self) -> float:
        return _clamp(self.total_ideas / 12.0)


class DynamicResearchAlgo:
    """Maintain rolling research updates and surface prioritised insights."""

    def __init__(
        self,
        *,
        window_size: int | None = 250,
        window_duration: timedelta | None = timedelta(days=90),
    ) -> None:
        self.window_size = window_size
        self.window_duration = window_duration
        self._entries: Dict[str, Deque[ResearchSignal]] = {}

    # ---------------------------------------------------------------- utilities
    def record(
        self,
        idea_id: str,
        *,
        theme: str,
        conviction: float,
        expected_alpha: float,
        risk_score: float,
        data_quality: float,
        catalysts: Sequence[str] | None = None,
        analyst: str | None = None,
        weight: float = 1.0,
        timestamp: datetime | str | None = None,
        notes: str | None = None,
    ) -> ResearchSignal:
        entry = ResearchSignal(
            idea_id=idea_id,
            theme=theme,
            conviction=conviction,
            expected_alpha=expected_alpha,
            risk_score=risk_score,
            data_quality=data_quality,
            catalysts=tuple(catalysts) if catalysts is not None else (),
            analyst=analyst,
            weight=weight,
            timestamp=timestamp or _now(),
            notes=notes,
        )

        history = self._history_for(entry.idea_id)
        history.append(entry)
        self._prune(history, reference=entry.timestamp)
        return entry

    # ----------------------------------------------------------------- snapshots
    def snapshot(
        self,
        *,
        theme: str | None = None,
        top_n: int = 5,
    ) -> ResearchSnapshot:
        summaries = list(self._summaries(theme=theme))
        if not summaries:
            return ResearchSnapshot(
                total_ideas=0,
                average_conviction=0.0,
                average_expected_alpha=0.0,
                average_risk=0.0,
                pipeline_health=0.0,
                top_ideas=(),
                themes=(),
                last_updated=None,
            )

        total_weight = sum(summary.total_weight for summary in summaries)
        weighted_conviction = sum(summary.conviction_score * summary.total_weight for summary in summaries)
        weighted_alpha = sum(summary.expected_alpha * summary.total_weight for summary in summaries)
        weighted_risk = sum(summary.risk_index * summary.total_weight for summary in summaries)
        weighted_quality = sum(summary.data_quality * summary.total_weight for summary in summaries)

        average_conviction = weighted_conviction / total_weight if total_weight else 0.0
        average_expected_alpha = weighted_alpha / total_weight if total_weight else 0.0
        average_risk = weighted_risk / total_weight if total_weight else 0.0
        average_quality = weighted_quality / total_weight if total_weight else 0.0

        pipeline_health = _clamp(
            average_conviction * 0.45
            + average_quality * 0.35
            + _clamp(average_expected_alpha / 100.0) * 0.2
            - average_risk * 0.3
        )

        ordered = tuple(sorted(summaries, key=lambda item: item.signal_strength, reverse=True)[: max(top_n, 0)])
        last_updated = max((summary.last_updated for summary in summaries if summary.last_updated), default=None)

        return ResearchSnapshot(
            total_ideas=len(summaries),
            average_conviction=round(average_conviction, 4),
            average_expected_alpha=round(average_expected_alpha, 4),
            average_risk=round(average_risk, 4),
            pipeline_health=round(pipeline_health, 4),
            top_ideas=ordered,
            themes=tuple(sorted({summary.theme for summary in summaries})),
            last_updated=last_updated,
        )

    # ---------------------------------------------------------- internal helpers
    def _summaries(self, *, theme: str | None = None) -> Iterable[ResearchIdeaSummary]:
        for idea_id, history in self._entries.items():
            if not history:
                continue
            filtered = [entry for entry in history if theme is None or entry.theme == theme.lower()]
            if not filtered:
                continue
            summary = self._summarise(idea_id, filtered)
            if summary.sample_count:
                yield summary

    def _summarise(self, idea_id: str, entries: Sequence[ResearchSignal]) -> ResearchIdeaSummary:
        total_weight = sum(entry.weight for entry in entries)
        if total_weight <= 0:
            return ResearchIdeaSummary(
                idea_id=idea_id,
                theme=entries[0].theme,
                sample_count=0,
                total_weight=0.0,
                conviction_score=0.0,
                expected_alpha=0.0,
                risk_index=0.0,
                data_quality=0.0,
                signal_strength=0.0,
                catalysts=(),
                analysts=(),
                last_updated=None,
            )

        conviction = sum(entry.conviction * entry.weight for entry in entries) / total_weight
        expected_alpha = sum(entry.expected_alpha * entry.weight for entry in entries) / total_weight
        risk_index = sum(entry.risk_score * entry.weight for entry in entries) / total_weight
        data_quality = sum(entry.data_quality * entry.weight for entry in entries) / total_weight
        signal_strength = sum(entry.signal_strength * entry.weight for entry in entries) / total_weight

        catalysts: set[str] = set()
        analysts: set[str] = set()
        last_updated = max((entry.timestamp for entry in entries), default=None)

        for entry in entries:
            catalysts.update(entry.catalysts)
            if entry.analyst:
                analysts.add(entry.analyst)

        return ResearchIdeaSummary(
            idea_id=idea_id,
            theme=entries[0].theme,
            sample_count=len(entries),
            total_weight=round(total_weight, 4),
            conviction_score=round(conviction, 4),
            expected_alpha=round(expected_alpha, 4),
            risk_index=round(risk_index, 4),
            data_quality=round(data_quality, 4),
            signal_strength=round(signal_strength, 4),
            catalysts=tuple(sorted(catalysts)),
            analysts=tuple(sorted(analysts)),
            last_updated=last_updated,
        )

    def _history_for(self, idea_id: str) -> Deque[ResearchSignal]:
        key = idea_id.upper()
        if key not in self._entries:
            self._entries[key] = deque(maxlen=self.window_size)
        return self._entries[key]

    def _prune(self, history: Deque[ResearchSignal], *, reference: datetime | None = None) -> None:
        if self.window_duration is None:
            return
        cutoff = (reference or _now()) - self.window_duration
        while history and history[0].timestamp < cutoff:
            history.popleft()


