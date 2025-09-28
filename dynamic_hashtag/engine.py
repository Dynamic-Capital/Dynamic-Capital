"""Dynamic hashtag intelligence orchestration."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from itertools import islice
from math import exp
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "HashtagSignal",
    "HashtagContext",
    "HashtagHighlight",
    "HashtagDigest",
    "DynamicHashtagEngine",
]


# ---------------------------------------------------------------------------
# helper utilities


_DEFAULT_VOLUME_NORMALISER = 5_000.0
_DEFAULT_CONVERSION_NORMALISER = 250.0


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_hashtag(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("hashtag must not be empty")
    cleaned = cleaned.lstrip("#")
    if not cleaned:
        raise ValueError("hashtag must contain characters")
    return f"#{cleaned.lower()}"


def _normalise_hashtags(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = value.strip()
        if not cleaned:
            continue
        cleaned = cleaned.lstrip("#")
        if not cleaned:
            continue
        hashtag = f"#{cleaned.lower()}"
        if hashtag not in seen:
            seen.add(hashtag)
            normalised.append(hashtag)
    return tuple(normalised)


def _normalise_platform(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("platform must not be empty")
    return cleaned


def _normalise_platforms(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = value.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


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
class HashtagSignal:
    """Single observation expressing demand for a hashtag."""

    hashtag: str
    platform: str
    volume: float = 0.0
    velocity: float = 0.5
    resonance: float = 0.5
    conversions: float = 0.0
    sentiment: float = 0.5
    timestamp: datetime = field(default_factory=_utcnow)
    related_hashtags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.hashtag = _normalise_hashtag(self.hashtag)
        self.platform = _normalise_platform(self.platform)
        self.volume = max(float(self.volume), 0.0)
        self.velocity = _clamp(float(self.velocity))
        self.resonance = _clamp(float(self.resonance))
        self.conversions = max(float(self.conversions), 0.0)
        self.sentiment = _clamp(float(self.sentiment))
        self.timestamp = _ensure_timezone(self.timestamp)
        self.related_hashtags = _normalise_hashtags(self.related_hashtags)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def quality(self) -> float:
        """Composite strength metric representing signal quality."""

        volume_component = min(self.volume / _DEFAULT_VOLUME_NORMALISER, 1.0)
        conversion_component = min(
            self.conversions / _DEFAULT_CONVERSION_NORMALISER, 1.0
        )
        return _clamp(
            volume_component * 0.32
            + self.velocity * 0.24
            + self.resonance * 0.2
            + conversion_component * 0.12
            + self.sentiment * 0.12
        )


@dataclass(slots=True)
class HashtagContext:
    """Context describing how hashtag demand should be prioritised."""

    target_topics: tuple[str, ...] = field(default_factory=tuple)
    avoid_hashtags: tuple[str, ...] = field(default_factory=tuple)
    preferred_platforms: tuple[str, ...] = field(default_factory=tuple)
    blocked_platforms: tuple[str, ...] = field(default_factory=tuple)
    highlight_limit: int = 5
    recency_bias: float = 0.65
    conversion_weight: float = 0.18
    sentiment_weight: float = 0.12
    topic_emphasis: float = 0.12
    anchor_time: datetime | None = None
    target_topic_set: frozenset[str] = field(init=False, repr=False)
    avoid_hashtag_set: frozenset[str] = field(init=False, repr=False)
    preferred_platform_set: frozenset[str] = field(init=False, repr=False)
    blocked_platform_set: frozenset[str] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.target_topics = _normalise_hashtags(self.target_topics)
        self.avoid_hashtags = _normalise_hashtags(self.avoid_hashtags)
        self.preferred_platforms = _normalise_platforms(self.preferred_platforms)
        self.blocked_platforms = _normalise_platforms(self.blocked_platforms)
        limit = int(self.highlight_limit)
        if limit <= 0:
            raise ValueError("highlight_limit must be positive")
        self.highlight_limit = limit
        self.recency_bias = _clamp(float(self.recency_bias))
        self.conversion_weight = _clamp(float(self.conversion_weight))
        self.sentiment_weight = _clamp(float(self.sentiment_weight))
        self.topic_emphasis = _clamp(float(self.topic_emphasis))
        if self.anchor_time is not None:
            self.anchor_time = _ensure_timezone(self.anchor_time)
        object.__setattr__(self, "target_topic_set", frozenset(self.target_topics))
        object.__setattr__(self, "avoid_hashtag_set", frozenset(self.avoid_hashtags))
        object.__setattr__(self, "preferred_platform_set", frozenset(self.preferred_platforms))
        object.__setattr__(self, "blocked_platform_set", frozenset(self.blocked_platforms))

    @property
    def has_targets(self) -> bool:
        return bool(self.target_topic_set)


@dataclass(slots=True)
class HashtagHighlight:
    """Aggregated view of signals supporting a recommended hashtag."""

    hashtag: str
    score: float
    volume: float
    velocity: float
    resonance: float
    sentiment: float
    conversions: float
    platforms: tuple[str, ...]
    related_hashtags: tuple[str, ...]

    @classmethod
    def from_signals(
        cls, hashtag: str, score: float, signals: Sequence[HashtagSignal]
    ) -> "HashtagHighlight":
        if not signals:
            return cls(
                hashtag=hashtag,
                score=score,
                volume=0.0,
                velocity=0.0,
                resonance=0.0,
                sentiment=0.0,
                conversions=0.0,
                platforms=(),
                related_hashtags=(),
            )

        total_volume = sum(signal.volume for signal in signals)
        total_conversions = sum(signal.conversions for signal in signals)
        avg_velocity = fmean(signal.velocity for signal in signals)
        avg_resonance = fmean(signal.resonance for signal in signals)
        avg_sentiment = fmean(signal.sentiment for signal in signals)
        platforms = tuple(sorted({signal.platform for signal in signals}))
        related = tuple(
            sorted({tag for signal in signals for tag in signal.related_hashtags})
        )

        return cls(
            hashtag=hashtag,
            score=score,
            volume=total_volume,
            velocity=avg_velocity,
            resonance=avg_resonance,
            sentiment=avg_sentiment,
            conversions=total_conversions,
            platforms=platforms,
            related_hashtags=related,
        )

    def to_dict(self) -> Mapping[str, object]:
        return {
            "hashtag": self.hashtag,
            "score": self.score,
            "volume": self.volume,
            "velocity": self.velocity,
            "resonance": self.resonance,
            "sentiment": self.sentiment,
            "conversions": self.conversions,
            "platforms": list(self.platforms),
            "related_hashtags": list(self.related_hashtags),
        }


@dataclass(slots=True)
class HashtagDigest:
    """Digest of prioritised hashtags for the provided context."""

    context: HashtagContext
    hashtag_scores: MutableMapping[str, float] = field(default_factory=dict)
    supporting_signals: MutableMapping[str, tuple[HashtagSignal, ...]] = field(
        default_factory=dict
    )
    highlights: list[HashtagHighlight] = field(default_factory=list)
    metrics: MutableMapping[str, float] = field(default_factory=dict)
    _highlight_index: MutableMapping[str, HashtagHighlight] = field(
        init=False, repr=False
    )

    def __post_init__(self) -> None:
        object.__setattr__(self, "_highlight_index", {})

    def add(
        self, hashtag: str, score: float, signals: Iterable[HashtagSignal]
    ) -> None:
        bundled = tuple(signals)
        self.hashtag_scores[hashtag] = score
        self.supporting_signals[hashtag] = bundled
        highlight = HashtagHighlight.from_signals(hashtag, score, bundled)
        self.highlights.append(highlight)
        self._highlight_index[hashtag] = highlight

    def ranked_hashtags(self) -> tuple[str, ...]:
        ordered = sorted(
            self.hashtag_scores.items(), key=lambda item: item[1], reverse=True
        )
        return tuple(hashtag for hashtag, _ in ordered)

    def top_hashtags(self) -> tuple[str, ...]:
        ordered = self.ranked_hashtags()
        return ordered[: self.context.highlight_limit]

    def highlight_for(self, hashtag: str) -> HashtagHighlight | None:
        return self._highlight_index.get(hashtag)

    def as_payload(self) -> Mapping[str, object]:
        ordered = sorted(
            self.hashtag_scores.items(), key=lambda item: item[1], reverse=True
        )
        highlight_map = self._highlight_index
        highlights = [
            highlight_map[tag].to_dict()
            for tag, _ in ordered[: self.context.highlight_limit]
            if tag in highlight_map
        ]
        return {
            "highlights": highlights,
            "scores": {tag: score for tag, score in ordered},
            "metrics": dict(self.metrics),
        }


# ---------------------------------------------------------------------------
# engine


class DynamicHashtagEngine:
    """Engine that curates hashtag signals into actionable recommendations."""

    def __init__(
        self,
        *,
        history_limit: int = 288,
        half_life_hours: float = 24.0,
        volume_normaliser: float = _DEFAULT_VOLUME_NORMALISER,
        conversion_normaliser: float = _DEFAULT_CONVERSION_NORMALISER,
    ) -> None:
        if history_limit <= 0:
            raise ValueError("history_limit must be positive")
        if half_life_hours <= 0:
            raise ValueError("half_life_hours must be positive")
        if volume_normaliser <= 0:
            raise ValueError("volume_normaliser must be positive")
        if conversion_normaliser <= 0:
            raise ValueError("conversion_normaliser must be positive")
        self._history: Deque[HashtagSignal] = deque(maxlen=history_limit)
        self._half_life_hours = float(half_life_hours)
        self._volume_normaliser = float(volume_normaliser)
        self._conversion_normaliser = float(conversion_normaliser)

    @property
    def history(self) -> tuple[HashtagSignal, ...]:
        return tuple(self._history)

    def prime(self, signals: Iterable[HashtagSignal]) -> None:
        for signal in signals:
            self.ingest(signal)

    def ingest(self, signal: HashtagSignal) -> None:
        self._history.append(signal)

    def generate(
        self, context: HashtagContext, *, sample_size: int = 180
    ) -> HashtagDigest:
        if sample_size <= 0:
            raise ValueError("sample_size must be positive")
        digest = HashtagDigest(context)
        if not self._history:
            digest.metrics.update(
                {
                    "history_size": 0.0,
                    "available_signals": 0.0,
                    "effective_signals": 0.0,
                    "mean_velocity": 0.0,
                    "mean_sentiment": 0.0,
                    "platform_diversity": 0.0,
                    "target_alignment": 0.0,
                }
            )
            return digest

        anchor = context.anchor_time or _utcnow()
        candidates = self._recent_signals(sample_size)
        hashtag_signals: dict[str, list[HashtagSignal]] = defaultdict(list)
        hashtag_scores: dict[str, float] = {}
        effective_signals: list[HashtagSignal] = []
        blocked_platforms = context.blocked_platform_set

        for signal in candidates:
            if signal.platform in blocked_platforms:
                continue
            score = self._score_signal(signal, context, anchor)
            if score <= 0.0:
                continue
            effective_signals.append(signal)
            current = hashtag_scores.get(signal.hashtag, 0.0)
            if score > current:
                hashtag_scores[signal.hashtag] = score
            hashtag_signals[signal.hashtag].append(signal)

        ordered = sorted(
            hashtag_scores.items(), key=lambda item: item[1], reverse=True
        )
        top_hashtags: list[str] = []
        for hashtag, score in ordered[: context.highlight_limit]:
            digest.add(hashtag, score, hashtag_signals[hashtag])
            top_hashtags.append(hashtag)

        unique_platforms = {signal.platform for signal in effective_signals}

        if effective_signals:
            mean_quality = fmean(signal.quality for signal in effective_signals)
        else:
            mean_quality = 0.0

        digest.metrics.update(
            {
                "history_size": float(len(self._history)),
                "available_signals": float(len(candidates)),
                "effective_signals": float(len(effective_signals)),
                "mean_velocity": (
                    fmean(signal.velocity for signal in effective_signals)
                    if effective_signals
                    else 0.0
                ),
                "mean_sentiment": (
                    fmean(signal.sentiment for signal in effective_signals)
                    if effective_signals
                    else 0.0
                ),
                "mean_quality": mean_quality,
                "platform_diversity": (
                    len(unique_platforms) / max(len(top_hashtags), 1)
                    if unique_platforms
                    else 0.0
                ),
                "target_alignment": self._calculate_alignment(
                    top_hashtags, hashtag_signals, context
                ),
            }
        )
        return digest

    def _recent_signals(self, sample_size: int) -> tuple[HashtagSignal, ...]:
        size = len(self._history)
        if not size:
            return ()
        if sample_size >= size:
            return tuple(self._history)
        start = size - sample_size
        return tuple(islice(self._history, start, size))

    def _score_signal(
        self, signal: HashtagSignal, context: HashtagContext, anchor: datetime
    ) -> float:
        if signal.hashtag in context.avoid_hashtag_set:
            return 0.0

        volume_component = min(signal.volume / self._volume_normaliser, 1.0) * 0.34
        velocity_component = signal.velocity * 0.24
        resonance_component = signal.resonance * 0.18
        conversion_component = (
            min(signal.conversions / self._conversion_normaliser, 1.0)
            * context.conversion_weight
        )
        sentiment_component = signal.sentiment * context.sentiment_weight

        base = (
            volume_component
            + velocity_component
            + resonance_component
            + conversion_component
            + sentiment_component
        )

        if signal.platform in context.preferred_platform_set:
            base += 0.04

        if context.has_targets:
            target_set = context.target_topic_set
            if signal.hashtag in target_set or any(
                tag in target_set for tag in signal.related_hashtags
            ):
                base += context.topic_emphasis

        age_hours = max((anchor - signal.timestamp).total_seconds() / 3600.0, 0.0)
        if age_hours == 0:
            recency_factor = 1.0
        else:
            decay = exp(-age_hours / self._half_life_hours)
            recency_factor = (1.0 - context.recency_bias) + context.recency_bias * decay

        score = base * recency_factor
        return _clamp(score)

    def _calculate_alignment(
        self,
        highlights: Sequence[str],
        signals: Mapping[str, Sequence[HashtagSignal]],
        context: HashtagContext,
    ) -> float:
        if not highlights or not context.has_targets:
            return 0.0
        target_set = context.target_topic_set
        aligned = 0
        for hashtag in highlights:
            if hashtag in target_set:
                aligned += 1
                continue

            related_sequences = signals.get(hashtag, ())
            if any(
                any(tag in target_set for tag in signal.related_hashtags)
                for signal in related_sequences
            ):
                aligned += 1

        return aligned / len(highlights)
