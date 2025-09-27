"""Adaptive letter index construction and diagnostics."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from math import log2
from typing import Deque, Iterable, Mapping, MutableMapping

__all__ = [
    "LetterEntry",
    "LetterSample",
    "LetterRank",
    "LetterIndexSnapshot",
    "DynamicLetterIndex",
]

_CONTEXT_LIMIT = 5


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_letter(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("letter must not be empty")
    letter = cleaned[0]
    if not letter.isalpha():
        raise ValueError("letter must be alphabetical")
    return letter.upper()


def _normalise_context(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.strip().split())
    return cleaned or None


def _normalise_int(value: int, *, name: str) -> int:
    if value <= 0:
        raise ValueError(f"{name} must be positive")
    return int(value)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _merge_context(existing: tuple[str, ...], context: str) -> tuple[str, ...]:
    if context in existing:
        return existing
    merged = list(existing)
    merged.append(context)
    if len(merged) > _CONTEXT_LIMIT:
        merged = merged[-_CONTEXT_LIMIT:]
    return tuple(merged)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class LetterEntry:
    """Aggregated statistics for a single letter."""

    letter: str
    total_occurrences: int = 0
    weighted_occurrences: float = 0.0
    last_seen: datetime | None = None
    contexts: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.letter = _normalise_letter(self.letter)
        self.total_occurrences = max(int(self.total_occurrences), 0)
        self.weighted_occurrences = max(float(self.weighted_occurrences), 0.0)
        if self.last_seen is not None:
            if self.last_seen.tzinfo is None:
                self.last_seen = self.last_seen.replace(tzinfo=timezone.utc)
            else:
                self.last_seen = self.last_seen.astimezone(timezone.utc)
        cleaned_contexts: list[str] = []
        for value in self.contexts:
            normalised = _normalise_context(value)
            if normalised:
                cleaned_contexts.append(normalised)
        self.contexts = tuple(cleaned_contexts[-_CONTEXT_LIMIT:])

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "letter": self.letter,
            "total_occurrences": self.total_occurrences,
            "weighted_occurrences": self.weighted_occurrences,
            "last_seen": self.last_seen.isoformat() if self.last_seen is not None else None,
            "contexts": list(self.contexts),
        }


@dataclass(slots=True)
class LetterSample:
    """Single observation contributing to the letter index."""

    letter: str
    occurrences: int = 1
    weight: float = 1.0
    context: str | None = None
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.letter = _normalise_letter(self.letter)
        self.occurrences = _normalise_int(int(self.occurrences), name="occurrences")
        self.weight = max(float(self.weight), 0.0)
        self.context = _normalise_context(self.context)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)

    @property
    def weighted_occurrences(self) -> float:
        return self.occurrences * self.weight

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "letter": self.letter,
            "occurrences": self.occurrences,
            "weight": self.weight,
            "context": self.context,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass(slots=True)
class LetterRank:
    """Ranked view of a letter within the snapshot."""

    letter: str
    share: float
    momentum: float

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "letter": self.letter,
            "share": self.share,
            "momentum": self.momentum,
        }


@dataclass(slots=True)
class LetterIndexSnapshot:
    """Aggregated view of the current letter distribution."""

    timestamp: datetime
    unique_letters: int
    total_occurrences: int
    weighted_total: float
    coverage: float
    entropy: float
    top_letters: tuple[LetterRank, ...]
    notes: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "unique_letters": self.unique_letters,
            "total_occurrences": self.total_occurrences,
            "weighted_total": self.weighted_total,
            "coverage": self.coverage,
            "entropy": self.entropy,
            "top_letters": [rank.as_dict() for rank in self.top_letters],
            "notes": list(self.notes),
        }


# ---------------------------------------------------------------------------
# engine


class DynamicLetterIndex:
    """Maintain a weighted index of letters with recency diagnostics."""

    def __init__(self, *, history: int = 24) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._history = int(history)
        self._entries: dict[str, LetterEntry] = {}
        self._samples: Deque[LetterSample] = deque(maxlen=history)
        self._recent_weights: dict[str, Deque[float]] = {}

    def observe(self, sample: LetterSample | Mapping[str, object]) -> LetterSample:
        normalised = self._coerce_sample(sample)
        entry = self._entries.get(normalised.letter)
        if entry is None:
            entry = LetterEntry(letter=normalised.letter)
            self._entries[entry.letter] = entry
        entry.total_occurrences += normalised.occurrences
        entry.weighted_occurrences += normalised.weighted_occurrences
        entry.last_seen = normalised.timestamp
        if normalised.context is not None:
            entry.contexts = _merge_context(entry.contexts, normalised.context)
        recent = self._recent_weights.setdefault(
            normalised.letter, deque(maxlen=self._history)
        )
        recent.append(normalised.weighted_occurrences)
        self._samples.append(normalised)
        return normalised

    def extend(self, samples: Iterable[LetterSample | Mapping[str, object]]) -> list[LetterSample]:
        normalised: list[LetterSample] = []
        for sample in samples:
            normalised.append(self.observe(sample))
        return normalised

    def ingest_text(
        self,
        text: str,
        *,
        weight: float = 1.0,
        context: str | None = None,
    ) -> list[LetterSample]:
        cleaned = text.strip()
        if not cleaned:
            return []
        counts: Counter[str] = Counter()
        for char in cleaned:
            if char.isalpha():
                counts[_normalise_letter(char)] += 1
        samples: list[LetterSample] = []
        for letter, occurrences in sorted(counts.items()):
            samples.append(
                self.observe(
                    LetterSample(
                        letter=letter,
                        occurrences=occurrences,
                        weight=weight,
                        context=context,
                    )
                )
            )
        return samples

    def entries(self) -> tuple[LetterEntry, ...]:
        return tuple(self._entries[letter] for letter in sorted(self._entries))

    def samples(self) -> tuple[LetterSample, ...]:
        return tuple(self._samples)

    def snapshot(self, *, top: int = 5) -> LetterIndexSnapshot:
        if not self._entries:
            return LetterIndexSnapshot(
                timestamp=_utcnow(),
                unique_letters=0,
                total_occurrences=0,
                weighted_total=0.0,
                coverage=0.0,
                entropy=0.0,
                top_letters=(),
                notes=("index is empty",),
            )

        entries = list(self._entries.values())
        total_occurrences = sum(entry.total_occurrences for entry in entries)
        weighted_total = sum(entry.weighted_occurrences for entry in entries)
        coverage = len(entries) / 26.0

        ranks: list[LetterRank] = []
        notes: list[str] = []

        if weighted_total > 0:
            for entry in entries:
                share = entry.weighted_occurrences / weighted_total
                recent = self._recent_weights.get(entry.letter)
                momentum = 0.0
                if recent and entry.weighted_occurrences > 0:
                    momentum = sum(recent) / entry.weighted_occurrences
                ranks.append(
                    LetterRank(
                        letter=entry.letter,
                        share=share,
                        momentum=_clamp(momentum, lower=0.0, upper=1.0),
                    )
                )
        else:
            for entry in entries:
                ranks.append(LetterRank(letter=entry.letter, share=0.0, momentum=0.0))

        ranks.sort(key=lambda rank: rank.share, reverse=True)
        top_letters = tuple(ranks[:top])

        entropy = 0.0
        for rank in ranks:
            if rank.share > 0:
                entropy -= rank.share * log2(rank.share)

        if coverage < 0.3:
            notes.append(f"narrow coverage {coverage:.0%}")
        if ranks and ranks[0].share > 0.4:
            notes.append(f"dominant letter {ranks[0].letter}:{ranks[0].share:.0%}")
        if entropy < 2.0 and weighted_total > 0:
            notes.append(f"low diversity {entropy:.2f}")
        average_momentum = sum(rank.momentum for rank in ranks) / len(ranks) if ranks else 0.0
        if average_momentum > 0.6:
            notes.append("letters surging recently")
        if not notes:
            notes.append("distribution balanced")

        return LetterIndexSnapshot(
            timestamp=_utcnow(),
            unique_letters=len(entries),
            total_occurrences=total_occurrences,
            weighted_total=weighted_total,
            coverage=coverage,
            entropy=entropy,
            top_letters=top_letters,
            notes=tuple(notes),
        )

    def reset(self) -> None:
        self._entries.clear()
        self._samples.clear()
        self._recent_weights.clear()

    def _coerce_sample(self, sample: LetterSample | Mapping[str, object]) -> LetterSample:
        if isinstance(sample, LetterSample):
            return sample
        if isinstance(sample, Mapping):
            payload: MutableMapping[str, object] = dict(sample)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return LetterSample(**payload)  # type: ignore[arg-type]
        raise TypeError("sample must be LetterSample or mapping")


__all__ = [
    "LetterEntry",
    "LetterSample",
    "LetterRank",
    "LetterIndexSnapshot",
    "DynamicLetterIndex",
]
