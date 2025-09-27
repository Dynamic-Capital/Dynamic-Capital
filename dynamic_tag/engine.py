"""Dynamic tagging intelligence orchestration."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from math import exp
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "TagSignal",
    "TagContext",
    "TagDigest",
    "DynamicTagEngine",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_tag(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("tag must not be empty")
    return cleaned


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


def _normalise_source(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("source must not be empty")
    return cleaned


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _ensure_timezone(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class TagSignal:
    """Single observation expressing demand for a tag."""

    tag: str
    source: str
    intensity: float = 0.5
    momentum: float = 0.5
    confidence: float = 0.5
    volume: float = 0.0
    timestamp: datetime = field(default_factory=_utcnow)
    related_tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.tag = _normalise_tag(self.tag)
        self.source = _normalise_source(self.source)
        self.intensity = _clamp(float(self.intensity))
        self.momentum = _clamp(float(self.momentum))
        self.confidence = _clamp(float(self.confidence))
        self.volume = max(float(self.volume), 0.0)
        self.timestamp = _ensure_timezone(self.timestamp)
        self.related_tags = _normalise_tags(self.related_tags)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def quality(self) -> float:
        """Average strength metric representing signal quality."""

        return (self.intensity + self.momentum + self.confidence) / 3.0


@dataclass(slots=True)
class TagContext:
    """Context describing how tag demand should be prioritised."""

    focus_tags: tuple[str, ...] = field(default_factory=tuple)
    avoid_tags: tuple[str, ...] = field(default_factory=tuple)
    preferred_sources: tuple[str, ...] = field(default_factory=tuple)
    blocked_sources: tuple[str, ...] = field(default_factory=tuple)
    highlight_limit: int = 5
    recency_bias: float = 0.6
    minimum_confidence: float = 0.3
    anchor_time: datetime | None = None

    def __post_init__(self) -> None:
        self.focus_tags = _normalise_tags(self.focus_tags)
        self.avoid_tags = _normalise_tags(self.avoid_tags)
        self.preferred_sources = _normalise_tags(self.preferred_sources)
        self.blocked_sources = _normalise_tags(self.blocked_sources)
        limit = int(self.highlight_limit)
        if limit <= 0:
            raise ValueError("highlight_limit must be positive")
        self.highlight_limit = limit
        self.recency_bias = _clamp(float(self.recency_bias))
        self.minimum_confidence = _clamp(float(self.minimum_confidence))
        if self.anchor_time is not None:
            self.anchor_time = _ensure_timezone(self.anchor_time)

    @property
    def has_focus(self) -> bool:
        return bool(self.focus_tags)


@dataclass(slots=True)
class TagDigest:
    """Digest of prioritised tags for the provided context."""

    context: TagContext
    tag_scores: MutableMapping[str, float] = field(default_factory=dict)
    supporting_signals: MutableMapping[str, tuple[TagSignal, ...]] = field(default_factory=dict)
    metrics: MutableMapping[str, float] = field(default_factory=dict)

    def add(self, tag: str, score: float, signals: Iterable[TagSignal]) -> None:
        self.tag_scores[tag] = score
        self.supporting_signals[tag] = tuple(signals)

    def ranked_tags(self) -> tuple[str, ...]:
        ordered = sorted(self.tag_scores.items(), key=lambda item: item[1], reverse=True)
        return tuple(tag for tag, _ in ordered)

    def top_tags(self) -> tuple[str, ...]:
        ordered = self.ranked_tags()
        return ordered[: self.context.highlight_limit]

    def as_payload(self) -> Mapping[str, object]:
        ordered = sorted(self.tag_scores.items(), key=lambda item: item[1], reverse=True)
        return {
            "highlights": [tag for tag, _ in ordered[: self.context.highlight_limit]],
            "scores": {tag: score for tag, score in ordered},
            "metrics": dict(self.metrics),
        }


# ---------------------------------------------------------------------------
# engine


class DynamicTagEngine:
    """Engine that curates tag signals into actionable recommendations."""

    def __init__(self, *, history_limit: int = 240, half_life_hours: float = 36.0) -> None:
        if history_limit <= 0:
            raise ValueError("history_limit must be positive")
        if half_life_hours <= 0:
            raise ValueError("half_life_hours must be positive")
        self._history: Deque[TagSignal] = deque(maxlen=history_limit)
        self._half_life_hours = float(half_life_hours)

    @property
    def history(self) -> tuple[TagSignal, ...]:
        return tuple(self._history)

    def prime(self, signals: Iterable[TagSignal]) -> None:
        for signal in signals:
            self.ingest(signal)

    def ingest(self, signal: TagSignal) -> None:
        self._history.append(signal)

    def generate(self, context: TagContext, *, sample_size: int = 120) -> TagDigest:
        digest = TagDigest(context)
        if not self._history:
            digest.metrics.update(
                {
                    "history_size": 0.0,
                    "available_signals": 0.0,
                    "focus_coverage": 0.0,
                    "mean_confidence": 0.0,
                }
            )
            return digest

        anchor = context.anchor_time or _utcnow()
        candidates = list(self._history)[-sample_size:]
        tag_signals: dict[str, list[TagSignal]] = defaultdict(list)
        tag_scores: dict[str, float] = {}
        effective_signals: list[TagSignal] = []

        for signal in candidates:
            if signal.source in context.blocked_sources:
                continue
            if signal.confidence < context.minimum_confidence:
                continue
            score = self._score_signal(signal, context, anchor)
            if score <= 0.0:
                continue
            effective_signals.append(signal)
            current = tag_scores.get(signal.tag, 0.0)
            if score > current:
                tag_scores[signal.tag] = score
            tag_signals[signal.tag].append(signal)

        ordered = sorted(tag_scores.items(), key=lambda item: item[1], reverse=True)
        for tag, score in ordered[: context.highlight_limit]:
            digest.add(tag, score, tag_signals[tag])

        focus_overlap = 0.0
        if context.focus_tags:
            focused = set(context.focus_tags)
            matches = focused & set(tag_scores)
            focus_overlap = len(matches) / len(focused)

        digest.metrics.update(
            {
                "history_size": float(len(self._history)),
                "available_signals": float(len(candidates)),
                "effective_signals": float(len(effective_signals)),
                "mean_confidence": (
                    fmean(signal.confidence for signal in effective_signals)
                    if effective_signals
                    else 0.0
                ),
                "focus_coverage": focus_overlap,
            }
        )
        return digest

    def _score_signal(self, signal: TagSignal, context: TagContext, anchor: datetime) -> float:
        base = (
            signal.intensity * 0.35
            + signal.momentum * 0.3
            + signal.confidence * 0.25
            + min(signal.volume / 50.0, 1.0) * 0.1
        )
        if signal.tag in context.avoid_tags:
            return 0.0
        if signal.tag in context.focus_tags:
            base += 0.08
        if signal.source in context.preferred_sources:
            base += 0.04

        age_hours = max((anchor - signal.timestamp).total_seconds() / 3600.0, 0.0)
        if age_hours == 0:
            recency_factor = 1.0
        else:
            decay = exp(-age_hours / self._half_life_hours)
            recency_factor = (1.0 - context.recency_bias) + context.recency_bias * decay

        score = base * recency_factor
        return _clamp(score)
