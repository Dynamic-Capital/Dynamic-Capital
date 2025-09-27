"""Adaptive glossary primitives for Dynamic Capital."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "GlossaryEntry",
    "GlossaryDigest",
    "GlossarySnapshot",
    "DynamicGlossary",
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


def _normalise_term(value: str) -> str:
    return _normalise_text(value)


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tuple(items: Sequence[str] | None) -> tuple[str, ...]:
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
    seen: set[str] = set()
    normalised: list[str] = []
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


def _as_lookup_tokens(entry: "GlossaryEntry") -> tuple[str, ...]:
    tokens = {entry.term.lower()}
    tokens.update(entry.lookup_synonyms)
    for category in entry.categories:
        tokens.add(category.lower())
    for example in entry.usage_examples:
        tokens.add(example.lower())
    for source in entry.sources:
        tokens.add(source.lower())
    return tuple(tokens)


def _compute_review_age(entry: "GlossaryEntry", *, now: datetime) -> timedelta:
    return now - entry.last_reviewed


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class GlossaryEntry:
    """Single glossary term with adaptive metadata."""

    term: str
    definition: str
    categories: tuple[str, ...] = field(default_factory=tuple)
    synonyms: tuple[str, ...] = field(default_factory=tuple)
    related_terms: tuple[str, ...] = field(default_factory=tuple)
    sources: tuple[str, ...] = field(default_factory=tuple)
    usage_examples: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None
    confidence: float = 0.6
    stability: float = 0.6
    usage_frequency: float = 0.5
    last_reviewed: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.term = _normalise_term(self.term)
        self.definition = _normalise_text(self.definition)
        self.categories = _normalise_tuple(self.categories)
        self.synonyms = _normalise_tuple(self.synonyms)
        self.related_terms = _normalise_tuple(self.related_terms)
        self.sources = _normalise_tuple(self.sources)
        self.usage_examples = _normalise_tuple(self.usage_examples)
        self.metadata = _coerce_mapping(self.metadata)
        self.confidence = _clamp(float(self.confidence))
        self.stability = _clamp(float(self.stability))
        self.usage_frequency = _clamp(float(self.usage_frequency))
        if self.last_reviewed.tzinfo is None:
            self.last_reviewed = self.last_reviewed.replace(tzinfo=timezone.utc)
        else:
            self.last_reviewed = self.last_reviewed.astimezone(timezone.utc)

    @property
    def lookup_synonyms(self) -> tuple[str, ...]:
        return _normalise_lower_tuple(self.synonyms + self.related_terms)

    @property
    def is_low_confidence(self) -> bool:
        return self.confidence < 0.5

    @property
    def is_stable(self) -> bool:
        return self.stability >= 0.5

    @property
    def is_underused(self) -> bool:
        return self.usage_frequency < 0.3

    def matches(self, query: str) -> bool:
        key = _normalise_lower(query)
        if key == self.term.lower():
            return True
        return key in self.lookup_synonyms

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "term": self.term,
            "definition": self.definition,
            "categories": self.categories,
            "synonyms": self.synonyms,
            "related_terms": self.related_terms,
            "sources": self.sources,
            "usage_examples": self.usage_examples,
            "confidence": self.confidence,
            "stability": self.stability,
            "usage_frequency": self.usage_frequency,
            "last_reviewed": self.last_reviewed.isoformat(),
        }
        if self.metadata is not None:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class GlossarySnapshot:
    """Immutable view of the glossary state."""

    created_at: datetime
    total_entries: int
    tokens: Mapping[str, tuple[str, ...]]
    low_confidence_terms: tuple[str, ...]
    underused_terms: tuple[str, ...]
    missing_sources: tuple[str, ...]


@dataclass(slots=True)
class GlossaryDigest:
    """Aggregated insight for glossary health checks."""

    generated_at: datetime
    total_entries: int
    low_confidence_terms: tuple[str, ...]
    stale_terms: tuple[str, ...]
    missing_sources: tuple[str, ...]
    candidate_retire: tuple[str, ...]
    spotlight_terms: tuple[str, ...]


# ---------------------------------------------------------------------------
# main engine


class DynamicGlossary:
    """Stateful glossary with adaptive scoring and insights."""

    _entries: MutableMapping[str, GlossaryEntry]
    _synonym_index: MutableMapping[str, str]

    def __init__(self, entries: Iterable[GlossaryEntry] | None = None) -> None:
        self._entries = {}
        self._synonym_index = {}
        if entries is not None:
            for entry in entries:
                self.add_or_update(entry)

    # public API -------------------------------------------------------------

    def add_or_update(self, entry: GlossaryEntry) -> None:
        """Insert a new term or update an existing definition."""

        key = entry.term.lower()
        if key in self._entries:
            self._purge_synonyms_for(key)
        self._entries[key] = entry
        for token in _as_lookup_tokens(entry):
            self._synonym_index[token] = key

    def remove(self, term: str) -> None:
        """Remove an entry from the glossary."""

        key = _normalise_lower(term)
        removed = self._entries.pop(key, None)
        if removed is None:
            raise KeyError(f"term '{term}' not present")
        self._purge_synonyms_for(key)

    def find(self, query: str) -> GlossaryEntry | None:
        key = _normalise_lower(query)
        if key in self._entries:
            return self._entries[key]
        alias = self._synonym_index.get(key)
        if alias is not None:
            return self._entries.get(alias)
        return None

    def search(self, keyword: str) -> tuple[GlossaryEntry, ...]:
        key = _normalise_lower(keyword)
        if not key:
            return ()
        matches: list[GlossaryEntry] = []
        for entry in self._entries.values():
            haystack = " ".join(
                [
                    entry.term.lower(),
                    entry.definition.lower(),
                    " ".join(token for token in entry.lookup_synonyms),
                    " ".join(cat.lower() for cat in entry.categories),
                    " ".join(src.lower() for src in entry.sources),
                ]
            )
            if key in haystack:
                matches.append(entry)
        matches.sort(key=lambda item: (-item.usage_frequency, item.term.lower()))
        return tuple(matches)

    def record_feedback(
        self,
        term: str,
        *,
        confidence_delta: float = 0.0,
        stability_delta: float = 0.0,
        usage_event: bool = False,
        now: datetime | None = None,
    ) -> GlossaryEntry:
        entry = self.find(term)
        if entry is None:
            raise KeyError(f"term '{term}' not present")
        if confidence_delta:
            entry.confidence = _clamp(entry.confidence + confidence_delta)
        if stability_delta:
            entry.stability = _clamp(entry.stability + stability_delta)
        if usage_event:
            entry.usage_frequency = _clamp(entry.usage_frequency + 0.05)
        entry.last_reviewed = (now or _utcnow()).astimezone(timezone.utc)
        return entry

    def decay_usage(self, *, factor: float = 0.92) -> None:
        if factor <= 0.0 or factor > 1.0:
            raise ValueError("factor must be within (0, 1]")
        for entry in self._entries.values():
            entry.usage_frequency = _clamp(entry.usage_frequency * factor)

    def snapshot(self) -> GlossarySnapshot:
        now = _utcnow()
        low_confidence: list[str] = []
        underused: list[str] = []
        missing_sources: list[str] = []
        tokens: dict[str, tuple[str, ...]] = {}
        for key, entry in self._entries.items():
            tokens[key] = _as_lookup_tokens(entry)
            if entry.is_low_confidence:
                low_confidence.append(entry.term)
            if entry.is_underused:
                underused.append(entry.term)
            if not entry.sources:
                missing_sources.append(entry.term)
        return GlossarySnapshot(
            created_at=now,
            total_entries=len(self._entries),
            tokens=tokens,
            low_confidence_terms=tuple(sorted(low_confidence)),
            underused_terms=tuple(sorted(underused)),
            missing_sources=tuple(sorted(missing_sources)),
        )

    def generate_digest(self) -> GlossaryDigest:
        now = _utcnow()
        low_confidence: list[str] = []
        stale_terms: list[str] = []
        missing_sources: list[str] = []
        retire_candidates: list[tuple[float, str]] = []
        spotlight: list[tuple[float, str]] = []
        for entry in self._entries.values():
            if entry.is_low_confidence:
                low_confidence.append(entry.term)
            age = _compute_review_age(entry, now=now)
            if age > timedelta(days=60) or entry.stability < 0.35:
                stale_terms.append(entry.term)
            if not entry.sources:
                missing_sources.append(entry.term)
            if entry.is_underused and entry.stability < 0.4:
                retire_candidates.append((entry.usage_frequency, entry.term))
            spotlight.append((entry.usage_frequency, entry.term))
        retire_candidates.sort()
        spotlight.sort(reverse=True)
        return GlossaryDigest(
            generated_at=now,
            total_entries=len(self._entries),
            low_confidence_terms=tuple(sorted(low_confidence)),
            stale_terms=tuple(sorted(set(stale_terms))),
            missing_sources=tuple(sorted(missing_sources)),
            candidate_retire=tuple(term for _, term in retire_candidates[:5]),
            spotlight_terms=tuple(term for _, term in spotlight[:5]),
        )

    # internal helpers ------------------------------------------------------

    def _purge_synonyms_for(self, key: str) -> None:
        to_remove = [alias for alias, root in self._synonym_index.items() if root == key]
        for alias in to_remove:
            self._synonym_index.pop(alias, None)

    # representation helpers ------------------------------------------------

    def __len__(self) -> int:  # pragma: no cover - passthrough helper
        return len(self._entries)

    def __iter__(self):  # pragma: no cover - passthrough helper
        return iter(self._entries.values())

    def __contains__(self, term: str) -> bool:  # pragma: no cover - passthrough helper
        return self.find(term) is not None

