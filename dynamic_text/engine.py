"""Dynamic text intelligence primitives for orchestrated messaging."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "TextFragment",
    "TextContext",
    "TextDigest",
    "DynamicTextEngine",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_language(value: str | None, *, fallback: str = "plaintext") -> str:
    text = (value or "").strip().lower()
    return text or fallback


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


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class TextFragment:
    """Single fragment of text awaiting orchestration."""

    channel: str
    content: str
    voice: str
    language: str = "plaintext"
    clarity: float = 0.5
    warmth: float = 0.5
    boldness: float = 0.5
    novelty: float = 0.5
    tempo: float = 0.5
    emphasis: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    intents: tuple[str, ...] = field(default_factory=tuple)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.channel = _normalise_lower(self.channel)
        self.content = _normalise_text(self.content)
        self.voice = _normalise_text(self.voice)
        self.language = _normalise_language(self.language)
        self.clarity = _clamp(float(self.clarity))
        self.warmth = _clamp(float(self.warmth))
        self.boldness = _clamp(float(self.boldness))
        self.novelty = _clamp(float(self.novelty))
        self.tempo = _clamp(float(self.tempo))
        self.emphasis = _clamp(float(self.emphasis))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.intents = _normalise_tags(self.intents)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def signal_strength(self) -> float:
        base = (
            self.clarity * 0.25
            + self.warmth * 0.2
            + self.boldness * 0.2
            + self.novelty * 0.2
            + self.emphasis * 0.15
        )
        weighted = base * max(self.weight, 0.1)
        return _clamp(weighted)

    @property
    def is_priority(self) -> bool:
        return self.signal_strength >= 0.65


@dataclass(slots=True)
class TextContext:
    """Context describing the text initiative."""

    initiative: str
    audience: str
    channel: str
    urgency: float
    personalization: float
    risk_appetite: float
    preferred_languages: tuple[str, ...] = ("plaintext",)
    emphasis_tags: tuple[str, ...] = field(default_factory=tuple)
    guardrail_tags: tuple[str, ...] = field(default_factory=tuple)
    highlight_limit: int = 3
    metadata: Mapping[str, object] | None = None
    language_weights: Mapping[str, float] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.initiative = _normalise_text(self.initiative)
        self.audience = _normalise_text(self.audience)
        self.channel = _normalise_lower(self.channel)
        self.urgency = _clamp(float(self.urgency))
        self.personalization = _clamp(float(self.personalization))
        self.risk_appetite = _clamp(float(self.risk_appetite))
        languages = _normalise_tags(self.preferred_languages) or ("plaintext",)
        self.preferred_languages = languages
        self.emphasis_tags = _normalise_tags(self.emphasis_tags)
        self.guardrail_tags = _normalise_tags(self.guardrail_tags)
        limit = int(self.highlight_limit)
        if limit <= 0:
            raise ValueError("highlight_limit must be positive")
        self.highlight_limit = limit
        self.metadata = _coerce_mapping(self.metadata)
        weights: dict[str, float] = {}
        for index, language in enumerate(self.preferred_languages):
            weight = max(0.2, 1.0 - index * 0.2)
            weights[language] = weight
        object.__setattr__(self, "language_weights", weights)

    @property
    def is_high_urgency(self) -> bool:
        return self.urgency >= 0.6

    @property
    def needs_personal_touch(self) -> bool:
        return self.personalization >= 0.55

    def language_priority(self, language: str) -> float:
        return self.language_weights.get(language, 0.0)


@dataclass(slots=True)
class TextDigest:
    """Digest of the most relevant text fragments for a context."""

    context: TextContext
    fragments: Deque[TextFragment] = field(default_factory=deque)
    metrics: MutableMapping[str, object] = field(default_factory=dict)

    def add_fragment(self, fragment: TextFragment) -> None:
        self.fragments.append(fragment)

    def extend(self, fragments: Iterable[TextFragment]) -> None:
        for fragment in fragments:
            self.add_fragment(fragment)

    def top_fragments(self) -> tuple[TextFragment, ...]:
        return tuple(self.fragments)

    def as_payload(self) -> Mapping[str, object]:
        return {
            "initiative": self.context.initiative,
            "audience": self.context.audience,
            "channel": self.context.channel,
            "fragments": [
                {
                    "content": fragment.content,
                    "voice": fragment.voice,
                    "language": fragment.language,
                    "signal_strength": fragment.signal_strength,
                    "intents": fragment.intents,
                    "tags": fragment.tags,
                    "timestamp": fragment.timestamp.isoformat(),
                }
                for fragment in self.fragments
            ],
            "metrics": dict(self.metrics),
        }


# ---------------------------------------------------------------------------
# engine


class DynamicTextEngine:
    """Engine that curates text fragments into actionable digests."""

    def __init__(self, *, history_limit: int = 200) -> None:
        if history_limit <= 0:
            raise ValueError("history_limit must be positive")
        self._history: Deque[TextFragment] = deque(maxlen=history_limit)
        self._metrics: MutableMapping[str, object] = {}
        self._totals = {
            "clarity": 0.0,
            "warmth": 0.0,
            "novelty": 0.0,
            "signal_strength": 0.0,
        }
        self._language_counts: Counter[str] = Counter()
        self._language_signal_totals: MutableMapping[str, float] = Counter()

    @property
    def history(self) -> tuple[TextFragment, ...]:
        return tuple(self._history)

    def prime(self, fragments: Iterable[TextFragment]) -> None:
        for fragment in fragments:
            self.ingest(fragment)

    def ingest(self, fragment: TextFragment) -> None:
        removed = None
        maxlen = self._history.maxlen
        if maxlen is not None and len(self._history) == maxlen:
            removed = self._history[0]
        self._history.append(fragment)
        self._reconcile_aggregates(added=fragment, removed=removed)
        self._update_metrics()

    def compose(self, context: TextContext, *, sample_size: int = 60) -> TextDigest:
        digest = TextDigest(context)
        if not self._history:
            digest.metrics.update({
                "history_size": 0.0,
                "available_fragments": 0.0,
                "mean_signal_strength": 0.0,
                "language_match_rate": 0.0,
                "history_language_coverage": 0.0,
                "python_fragment_ratio": 0.0,
                "python_signal_strength": 0.0,
                "language_focus_score": 0.0,
            })
            return digest

        candidates = list(self._history)[-sample_size:]
        scored = sorted(
            candidates,
            key=lambda fragment: self._score_fragment(fragment, context),
            reverse=True,
        )
        digest.extend(scored[: context.highlight_limit])
        digest.metrics.update(self._metrics)
        digest.metrics.update(
            {
                "history_size": float(len(self._history)),
                "available_fragments": float(len(candidates)),
                "mean_signal_strength": (
                    fmean(fragment.signal_strength for fragment in digest.fragments)
                    if digest.fragments
                    else 0.0
                ),
            }
        )
        preferred_set = set(context.preferred_languages)
        focus_score = 0.0
        if preferred_set:
            match_total = len(digest.fragments)
            matches = sum(
                1 for fragment in digest.fragments if fragment.language in preferred_set
            )
            history_matches = sum(
                1 for fragment in self._history if fragment.language in preferred_set
            )
            digest.metrics.update(
                {
                    "language_match_rate": _clamp(
                        matches / match_total if match_total else 0.0
                    ),
                    "history_language_coverage": _clamp(
                        history_matches / len(self._history)
                        if self._history
                        else 0.0
                    ),
                }
            )
            if digest.fragments:
                numerator = 0.0
                denominator = 0.0
                for fragment in digest.fragments:
                    priority = context.language_priority(fragment.language)
                    if fragment.language == "python":
                        priority += 0.15
                    if priority > 0.0:
                        numerator += priority
                for language in context.preferred_languages[: len(digest.fragments)]:
                    priority = context.language_priority(language)
                    if language == "python":
                        priority += 0.15
                    denominator += max(priority, 0.0)
                focus_score = _clamp(numerator / denominator) if denominator else 0.0
        else:
            digest.metrics.update(
                {
                    "language_match_rate": 0.0,
                    "history_language_coverage": 0.0,
                }
            )
        digest.metrics["language_focus_score"] = focus_score
        return digest

    def _reconcile_aggregates(
        self, *, added: TextFragment | None, removed: TextFragment | None
    ) -> None:
        if removed is not None:
            self._totals["clarity"] = max(self._totals["clarity"] - removed.clarity, 0.0)
            self._totals["warmth"] = max(self._totals["warmth"] - removed.warmth, 0.0)
            self._totals["novelty"] = max(self._totals["novelty"] - removed.novelty, 0.0)
            self._totals["signal_strength"] = max(
                self._totals["signal_strength"] - removed.signal_strength,
                0.0,
            )
            language = removed.language
            self._language_counts[language] -= 1
            if self._language_counts[language] <= 0:
                del self._language_counts[language]
            self._language_signal_totals[language] -= removed.signal_strength
            if self._language_signal_totals[language] <= 1e-9:
                del self._language_signal_totals[language]
        if added is not None:
            self._totals["clarity"] += added.clarity
            self._totals["warmth"] += added.warmth
            self._totals["novelty"] += added.novelty
            signal = added.signal_strength
            self._totals["signal_strength"] += signal
            language = added.language
            self._language_counts[language] += 1
            self._language_signal_totals[language] += signal

    def _update_metrics(self) -> None:
        history_size = len(self._history)
        if history_size:
            mean_novelty = self._totals["novelty"] / history_size
            mean_clarity = self._totals["clarity"] / history_size
            mean_warmth = self._totals["warmth"] / history_size
            top_language = ""
            top_language_share = 0.0
            if self._language_counts:
                top_language, top_count = self._language_counts.most_common(1)[0]
                top_language_share = top_count / history_size
            python_count = self._language_counts.get("python", 0)
            python_ratio = python_count / history_size
            python_signal_total = self._language_signal_totals.get("python", 0.0)
            python_signal_strength = (
                python_signal_total / python_count if python_count else 0.0
            )
            language_diversity = float(len(self._language_counts))
        else:
            mean_novelty = 0.0
            mean_clarity = 0.0
            mean_warmth = 0.0
            top_language = ""
            top_language_share = 0.0
            python_ratio = 0.0
            python_signal_strength = 0.0
            language_diversity = 0.0
        self._metrics.update(
            {
                "history_size": float(history_size),
                "mean_novelty": mean_novelty,
                "mean_clarity": mean_clarity,
                "mean_warmth": mean_warmth,
                "top_language": top_language,
                "top_language_share": top_language_share,
                "language_diversity": language_diversity,
                "python_fragment_ratio": python_ratio,
                "python_signal_strength": python_signal_strength,
            }
        )

    def _score_fragment(self, fragment: TextFragment, context: TextContext) -> float:
        score = fragment.signal_strength
        if fragment.channel == context.channel:
            score += 0.08
        if context.is_high_urgency:
            score += fragment.tempo * 0.05
        if context.needs_personal_touch:
            score += fragment.warmth * 0.05
        emphasis_matches = len(set(context.emphasis_tags) & set(fragment.tags))
        guardrail_conflicts = len(set(context.guardrail_tags) & set(fragment.tags))
        score += 0.04 * emphasis_matches
        score -= 0.06 * guardrail_conflicts
        risk_adjustment = (context.risk_appetite - 0.5) * fragment.boldness * 0.1
        score += risk_adjustment
        if context.preferred_languages:
            priority = context.language_priority(fragment.language)
            if fragment.language == "python":
                priority += 0.15
            if priority > 0.0:
                score += 0.1 + priority * 0.07
            else:
                score -= 0.05 + (0.02 if context.preferred_languages else 0.0)
        return _clamp(score)
