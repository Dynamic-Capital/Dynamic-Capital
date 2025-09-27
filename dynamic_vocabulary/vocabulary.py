"""Dynamic vocabulary intelligence with adaptive review cycles."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "VocabularyEntry",
    "VocabularySnapshot",
    "VocabularyDigest",
    "DynamicVocabulary",
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


def _normalise_text_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _normalise_lower_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for item in items:
        lowered = item.strip().lower()
        if lowered and lowered not in seen:
            seen.add(lowered)
            normalised.append(lowered)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _compute_review_age(entry: "VocabularyEntry", *, now: datetime) -> timedelta:
    return now - entry.last_reviewed


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class VocabularyEntry:
    """Single vocabulary term with adaptive proficiency tracking."""

    term: str
    definition: str
    part_of_speech: str = "unknown"
    contexts: tuple[str, ...] = field(default_factory=tuple)
    synonyms: tuple[str, ...] = field(default_factory=tuple)
    antonyms: tuple[str, ...] = field(default_factory=tuple)
    notes: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None
    proficiency: float = 0.4
    retention: float = 0.5
    momentum: float = 0.5
    exposures: int = 0
    last_reviewed: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.term = _normalise_text(self.term)
        self.definition = _normalise_text(self.definition)
        self.part_of_speech = _normalise_lower(self.part_of_speech)
        self.contexts = _normalise_text_tuple(self.contexts)
        self.synonyms = _normalise_lower_tuple(self.synonyms)
        self.antonyms = _normalise_lower_tuple(self.antonyms)
        self.notes = _normalise_text_tuple(self.notes)
        self.metadata = _coerce_mapping(self.metadata)
        self.proficiency = _clamp(float(self.proficiency))
        self.retention = _clamp(float(self.retention))
        self.momentum = _clamp(float(self.momentum))
        exposures = int(self.exposures)
        self.exposures = exposures if exposures >= 0 else 0
        if self.last_reviewed.tzinfo is None:
            self.last_reviewed = self.last_reviewed.replace(tzinfo=timezone.utc)
        else:
            self.last_reviewed = self.last_reviewed.astimezone(timezone.utc)

    @property
    def lookup_tokens(self) -> tuple[str, ...]:
        tokens = {self.term.lower(), self.part_of_speech}
        tokens.update(self.synonyms)
        tokens.update(self.antonyms)
        tokens.update(context.lower() for context in self.contexts)
        return tuple(sorted(tokens))

    @property
    def is_mastered(self) -> bool:
        return self.proficiency >= 0.85 and self.retention >= 0.75

    @property
    def needs_attention(self) -> bool:
        return self.proficiency < 0.5 or self.retention < 0.4

    @property
    def age(self) -> timedelta:
        return _utcnow() - self.last_reviewed

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "term": self.term,
            "definition": self.definition,
            "part_of_speech": self.part_of_speech,
            "contexts": self.contexts,
            "synonyms": self.synonyms,
            "antonyms": self.antonyms,
            "notes": self.notes,
            "proficiency": self.proficiency,
            "retention": self.retention,
            "momentum": self.momentum,
            "exposures": self.exposures,
            "last_reviewed": self.last_reviewed.isoformat(),
        }
        if self.metadata is not None:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class VocabularySnapshot:
    """Immutable view of the vocabulary landscape."""

    created_at: datetime
    total_entries: int
    mastered_terms: tuple[str, ...]
    attention_terms: tuple[str, ...]
    tokens: Mapping[str, tuple[str, ...]]


@dataclass(slots=True)
class VocabularyDigest:
    """Aggregated insights highlighting vocabulary momentum."""

    generated_at: datetime
    total_entries: int
    mastery_rate: float
    focus_terms: tuple[str, ...]
    stale_terms: tuple[str, ...]
    momentum_terms: tuple[str, ...]


# ---------------------------------------------------------------------------
# main engine


class DynamicVocabulary:
    """Stateful vocabulary manager orchestrating adaptive reviews."""

    _entries: MutableMapping[str, VocabularyEntry]
    _token_index: MutableMapping[str, set[str]]

    def __init__(self, entries: Iterable[VocabularyEntry] | None = None) -> None:
        self._entries = {}
        self._token_index = {}
        if entries is not None:
            for entry in entries:
                self.add_or_update(entry)

    # public API -------------------------------------------------------------

    def add_or_update(self, entry: VocabularyEntry) -> None:
        key = entry.term.lower()
        if key in self._entries:
            self._purge_tokens_for(key)
        self._entries[key] = entry
        self._register_tokens(entry)

    def remove(self, term: str) -> None:
        key = _normalise_lower(term)
        removed = self._entries.pop(key, None)
        if removed is None:
            raise KeyError(f"term '{term}' not present")
        self._purge_tokens_for(key)

    def find(self, query: str) -> VocabularyEntry | None:
        key = _normalise_lower(query)
        direct = self._entries.get(key)
        if direct is not None:
            return direct
        aliases = self._token_index.get(key)
        if not aliases:
            return None
        if len(aliases) == 1:
            return self._entries[next(iter(aliases))]
        candidates = [self._entries[name] for name in aliases if name in self._entries]
        if not candidates:
            return None
        candidates.sort(key=lambda item: (-item.proficiency, -item.retention))
        return candidates[0]

    def search(self, keyword: str) -> tuple[VocabularyEntry, ...]:
        key = _normalise_lower(keyword)
        if not key:
            return ()
        matches: list[VocabularyEntry] = []
        for entry in self._entries.values():
            haystack = " ".join(
                [
                    entry.term.lower(),
                    entry.definition.lower(),
                    " ".join(entry.lookup_tokens),
                    " ".join(note.lower() for note in entry.notes),
                ]
            )
            if key in haystack:
                matches.append(entry)
        matches.sort(key=lambda item: (-item.proficiency, -item.retention, item.term.lower()))
        return tuple(matches)

    def record_review(
        self,
        term: str,
        *,
        score: float,
        retention_delta: float = 0.0,
        exposures: int = 1,
        now: datetime | None = None,
    ) -> VocabularyEntry:
        entry = self.find(term)
        if entry is None:
            raise KeyError(f"term '{term}' not present")
        clamped_score = _clamp(float(score))
        entry.proficiency = _clamp(entry.proficiency * 0.7 + clamped_score * 0.3)
        if retention_delta:
            entry.retention = _clamp(entry.retention + retention_delta)
        else:
            entry.retention = _clamp(entry.retention * 0.85 + clamped_score * 0.15)
        entry.momentum = _clamp(entry.momentum * 0.6 + clamped_score * 0.4)
        entry.exposures = max(entry.exposures + max(int(exposures), 0), 0)
        entry.last_reviewed = (now or _utcnow()).astimezone(timezone.utc)
        return entry

    def decay_retention(self, *, factor: float = 0.95) -> None:
        if not (0.0 < factor <= 1.0):
            raise ValueError("factor must be within (0, 1]")
        for entry in self._entries.values():
            entry.retention = _clamp(entry.retention * factor)
            entry.momentum = _clamp(entry.momentum * factor)

    def suggest_focus(self, *, limit: int = 5) -> tuple[VocabularyEntry, ...]:
        if limit <= 0:
            raise ValueError("limit must be positive")
        candidates = [entry for entry in self._entries.values() if entry.needs_attention]
        candidates.sort(
            key=lambda item: (
                item.retention,
                item.proficiency,
                -item.exposures,
                item.term.lower(),
            )
        )
        return tuple(candidates[:limit])

    def snapshot(self) -> VocabularySnapshot:
        now = _utcnow()
        mastered: list[str] = []
        attention: list[str] = []
        tokens: dict[str, tuple[str, ...]] = {}
        for key, entry in self._entries.items():
            tokens[key] = entry.lookup_tokens
            if entry.is_mastered:
                mastered.append(entry.term)
            if entry.needs_attention:
                attention.append(entry.term)
        return VocabularySnapshot(
            created_at=now,
            total_entries=len(self._entries),
            mastered_terms=tuple(sorted(mastered)),
            attention_terms=tuple(sorted(attention)),
            tokens=tokens,
        )

    def generate_digest(self, *, stale_after: timedelta = timedelta(days=14)) -> VocabularyDigest:
        if stale_after <= timedelta(0):
            raise ValueError("stale_after must be positive")
        now = _utcnow()
        focus: list[str] = []
        stale: list[str] = []
        momentum: list[tuple[float, str]] = []
        for entry in self._entries.values():
            if entry.needs_attention:
                focus.append(entry.term)
            if _compute_review_age(entry, now=now) >= stale_after:
                stale.append(entry.term)
            momentum.append((entry.momentum, entry.term))
        total = len(self._entries)
        mastered_total = sum(1 for entry in self._entries.values() if entry.is_mastered)
        mastery_rate = mastered_total / total if total else 0.0
        momentum.sort(key=lambda item: (-item[0], item[1].lower()))
        return VocabularyDigest(
            generated_at=now,
            total_entries=total,
            mastery_rate=mastery_rate,
            focus_terms=tuple(sorted(set(focus))),
            stale_terms=tuple(sorted(set(stale))),
            momentum_terms=tuple(term for _, term in momentum[: min(5, len(momentum))]),
        )

    # internals --------------------------------------------------------------

    def _register_tokens(self, entry: VocabularyEntry) -> None:
        key = entry.term.lower()
        for token in entry.lookup_tokens:
            bucket = self._token_index.setdefault(token, set())
            bucket.add(key)

    def _purge_tokens_for(self, term_key: str) -> None:
        for bucket in self._token_index.values():
            bucket.discard(term_key)
        stale_tokens = [token for token, bucket in self._token_index.items() if not bucket]
        for token in stale_tokens:
            self._token_index.pop(token, None)

    # convenience ------------------------------------------------------------

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._entries)

    def __contains__(self, term: object) -> bool:  # pragma: no cover - trivial
        if not isinstance(term, str):
            return False
        return _normalise_lower(term) in self._entries

