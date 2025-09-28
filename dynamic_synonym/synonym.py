"""Dynamic synonym intelligence with adaptive clustering."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "SynonymEntry",
    "SynonymSnapshot",
    "SynonymDigest",
    "DynamicSynonym",
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
    seen: set[str] = set()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip()
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


def _merge_sequences(*values: Sequence[str]) -> tuple[str, ...]:
    combined: list[str] = []
    seen: set[str] = set()
    for value in values:
        for item in value:
            if item not in seen:
                seen.add(item)
                combined.append(item)
    return tuple(combined)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class SynonymEntry:
    """Single synonym mapping with adaptive quality metrics."""

    term: str
    primary_synonyms: tuple[str, ...] = field(default_factory=tuple)
    secondary_synonyms: tuple[str, ...] = field(default_factory=tuple)
    contexts: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None
    strength: float = 0.6
    freshness: float = 0.5
    usage_count: int = 0
    last_updated: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.term = _normalise_text(self.term)
        self.primary_synonyms = _normalise_text_tuple(self.primary_synonyms)
        self.secondary_synonyms = _normalise_text_tuple(self.secondary_synonyms)
        self.contexts = _normalise_text_tuple(self.contexts)
        self.metadata = _coerce_mapping(self.metadata)
        self.strength = _clamp(float(self.strength))
        self.freshness = _clamp(float(self.freshness))
        usage = int(self.usage_count)
        self.usage_count = usage if usage >= 0 else 0
        if self.last_updated.tzinfo is None:
            self.last_updated = self.last_updated.replace(tzinfo=timezone.utc)
        else:
            self.last_updated = self.last_updated.astimezone(timezone.utc)

    @property
    def all_synonyms(self) -> tuple[str, ...]:
        return self.primary_synonyms + self.secondary_synonyms

    @property
    def lookup_tokens(self) -> tuple[str, ...]:
        tokens = {self.term.lower()}
        tokens.update(token.lower() for token in self.all_synonyms)
        tokens.update(context.lower() for context in self.contexts)
        return tuple(tokens)

    @property
    def influence(self) -> float:
        return round((self.strength + self.freshness) / 2, 6)

    def matches(self, query: str) -> bool:
        return _normalise_lower(query) in self.lookup_tokens

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "term": self.term,
            "primary_synonyms": self.primary_synonyms,
            "secondary_synonyms": self.secondary_synonyms,
            "contexts": self.contexts,
            "metadata": dict(self.metadata) if self.metadata else None,
            "strength": self.strength,
            "freshness": self.freshness,
            "usage_count": self.usage_count,
            "last_updated": self.last_updated,
        }
        return payload


@dataclass(slots=True)
class SynonymSnapshot:
    """Point-in-time view of the synonym memory."""

    created_at: datetime
    entries: tuple[SynonymEntry, ...]

    def __iter__(self):  # type: ignore[override]
        return iter(self.entries)

    def __len__(self) -> int:  # pragma: no cover - trivial wrapper
        return len(self.entries)


@dataclass(slots=True)
class SynonymDigest:
    """Aggregate metrics for synonym intelligence."""

    total_terms: int
    total_synonyms: int
    average_strength: float
    average_freshness: float
    most_connected_terms: tuple[str, ...]
    last_updated: datetime | None


# ---------------------------------------------------------------------------
# dynamic store


class DynamicSynonym:
    """Adaptive synonym manager with freshness tracking."""

    def __init__(self, entries: Iterable[SynonymEntry] | None = None):
        self._entries: dict[str, SynonymEntry] = {}
        if entries:
            for entry in entries:
                self.upsert(entry)

    # basic container protocol -------------------------------------------------
    def __contains__(self, term: object) -> bool:  # pragma: no cover - trivial
        if not isinstance(term, str):
            return False
        return self._key(term) in self._entries

    def __len__(self) -> int:  # pragma: no cover - trivial wrapper
        return len(self._entries)

    @staticmethod
    def _key(term: str) -> str:
        return _normalise_lower(term)

    # mutation helpers ---------------------------------------------------------
    def upsert(self, entry: SynonymEntry) -> SynonymEntry:
        key = self._key(entry.term)
        existing = self._entries.get(key)
        if existing is None:
            self._entries[key] = entry
            return entry

        merged_metadata: Mapping[str, object] | None
        if existing.metadata and entry.metadata:
            merged = dict(existing.metadata)
            merged.update(entry.metadata)
            merged_metadata = merged
        else:
            merged_metadata = entry.metadata or existing.metadata

        merged_entry = SynonymEntry(
            term=existing.term,
            primary_synonyms=_merge_sequences(
                existing.primary_synonyms, entry.primary_synonyms
            ),
            secondary_synonyms=_merge_sequences(
                existing.secondary_synonyms, entry.secondary_synonyms
            ),
            contexts=_merge_sequences(existing.contexts, entry.contexts),
            metadata=merged_metadata,
            strength=max(existing.strength, entry.strength),
            freshness=max(existing.freshness, entry.freshness),
            usage_count=max(existing.usage_count, entry.usage_count),
            last_updated=max(existing.last_updated, entry.last_updated),
        )
        self._entries[key] = merged_entry
        return merged_entry

    def link(
        self,
        term: str,
        synonyms: Iterable[str],
        *,
        secondary: bool = False,
    ) -> SynonymEntry:
        addition = _normalise_text_tuple(tuple(synonyms))
        if not addition:
            return self._ensure_entry(term)

        entry = self._ensure_entry(term)
        payload = entry.as_dict()
        if secondary:
            payload["secondary_synonyms"] = _merge_sequences(
                entry.secondary_synonyms, addition
            )
        else:
            payload["primary_synonyms"] = _merge_sequences(
                entry.primary_synonyms, addition
            )
        payload["freshness"] = _clamp(entry.freshness + 0.05 * len(addition))
        payload["strength"] = _clamp(entry.strength + 0.03 * len(addition))
        payload["last_updated"] = _utcnow()
        updated = SynonymEntry(**payload)
        key = self._key(updated.term)
        self._entries[key] = updated
        return updated

    def record_usage(self, term: str, *, weight: float = 1.0) -> SynonymEntry:
        entry = self._ensure_entry(term)
        boost = max(0.0, float(weight))
        payload = entry.as_dict()
        payload["usage_count"] = entry.usage_count + int(round(boost))
        payload["freshness"] = _clamp(entry.freshness + 0.02 * boost)
        payload["strength"] = _clamp(entry.strength + 0.01 * boost)
        payload["last_updated"] = _utcnow()
        updated = SynonymEntry(**payload)
        self._entries[self._key(updated.term)] = updated
        return updated

    def _ensure_entry(self, term: str) -> SynonymEntry:
        key = self._key(term)
        existing = self._entries.get(key)
        if existing is not None:
            return existing
        new_entry = SynonymEntry(term=_normalise_text(term))
        self._entries[key] = new_entry
        return new_entry

    # lookup utilities ---------------------------------------------------------
    def lookup(self, query: str) -> SynonymEntry | None:
        key = self._key(query)
        entry = self._entries.get(key)
        if entry is not None:
            return entry
        for candidate in self._entries.values():
            if candidate.matches(query):
                return candidate
        return None

    def synonyms_for(self, term: str, *, include_secondary: bool = True) -> tuple[str, ...]:
        entry = self.lookup(term)
        if entry is None:
            return ()
        if include_secondary:
            return entry.all_synonyms
        return entry.primary_synonyms

    def recommendations(self, term: str, *, limit: int = 5) -> tuple[str, ...]:
        if limit <= 0:
            return ()
        entry = self.lookup(term)
        if entry is None:
            return ()

        scored: list[tuple[float, str]] = []
        seen: set[str] = {entry.term.lower()}
        for synonym in entry.all_synonyms:
            lower = synonym.lower()
            if lower in seen:
                continue
            seen.add(lower)
            candidate = self.lookup(synonym)
            if candidate is None:
                score = entry.influence * 0.8
            else:
                score = candidate.influence + candidate.usage_count * 0.01
            scored.append((score, synonym))

        scored.sort(key=lambda item: (-item[0], item[1].lower()))
        return tuple(name for _, name in scored[:limit])

    # reporting ----------------------------------------------------------------
    def snapshot(self) -> SynonymSnapshot:
        entries = tuple(sorted(self._entries.values(), key=lambda e: e.term.lower()))
        return SynonymSnapshot(created_at=_utcnow(), entries=entries)

    def digest(self) -> SynonymDigest:
        entries = tuple(self._entries.values())
        if not entries:
            return SynonymDigest(
                total_terms=0,
                total_synonyms=0,
                average_strength=0.0,
                average_freshness=0.0,
                most_connected_terms=(),
                last_updated=None,
            )

        total_synonyms = sum(len(entry.all_synonyms) for entry in entries)
        avg_strength = sum(entry.strength for entry in entries) / len(entries)
        avg_freshness = sum(entry.freshness for entry in entries) / len(entries)
        top_entries = sorted(
            entries, key=lambda e: (len(e.all_synonyms), e.influence), reverse=True
        )[:3]
        most_connected = tuple(entry.term for entry in top_entries)
        last_updated = max(entry.last_updated for entry in entries)
        return SynonymDigest(
            total_terms=len(entries),
            total_synonyms=total_synonyms,
            average_strength=round(avg_strength, 6),
            average_freshness=round(avg_freshness, 6),
            most_connected_terms=most_connected,
            last_updated=last_updated,
        )
