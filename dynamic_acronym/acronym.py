"""Dynamic acronym intelligence with adaptive context awareness."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "AcronymEntry",
    "AcronymSnapshot",
    "AcronymDigest",
    "DynamicAcronym",
    "DEFAULT_ACRONYMS",
    "create_default_acronym_registry",
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


def _normalise_upper(value: str) -> str:
    return _normalise_text(value).upper()


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
class AcronymEntry:
    """Single acronym record with adaptive familiarity scoring."""

    acronym: str
    expansions: tuple[str, ...] = field(default_factory=tuple)
    description: str | None = None
    categories: tuple[str, ...] = field(default_factory=tuple)
    usage_notes: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None
    confidence: float = 0.7
    familiarity: float = 0.5
    usage_count: int = 0
    last_reviewed: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.acronym = _normalise_upper(self.acronym)
        self.expansions = _normalise_text_tuple(self.expansions)
        self.description = _normalise_text(self.description) if self.description else None
        self.categories = _normalise_text_tuple(self.categories)
        self.usage_notes = _normalise_text_tuple(self.usage_notes)
        self.metadata = _coerce_mapping(self.metadata)
        self.confidence = _clamp(float(self.confidence))
        self.familiarity = _clamp(float(self.familiarity))
        usage = int(self.usage_count)
        self.usage_count = usage if usage >= 0 else 0
        if self.last_reviewed.tzinfo is None:
            self.last_reviewed = self.last_reviewed.replace(tzinfo=timezone.utc)
        else:
            self.last_reviewed = self.last_reviewed.astimezone(timezone.utc)

    @property
    def primary_expansion(self) -> str | None:
        return self.expansions[0] if self.expansions else None

    @property
    def lookup_tokens(self) -> tuple[str, ...]:
        tokens = {self.acronym.lower()}
        tokens.update(expansion.lower() for expansion in self.expansions)
        tokens.update(note.lower() for note in self.usage_notes)
        tokens.update(category.lower() for category in self.categories)
        return tuple(tokens)

    @property
    def ambiguity(self) -> float:
        if len(self.expansions) <= 1:
            return 0.0
        return round(min(1.0, 0.2 * (len(self.expansions) - 1)), 6)

    def matches(self, query: str) -> bool:
        needle = query.strip()
        if not needle:
            return False
        lowered = needle.lower()
        return lowered in self.lookup_tokens

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "acronym": self.acronym,
            "expansions": self.expansions,
            "description": self.description,
            "categories": self.categories,
            "usage_notes": self.usage_notes,
            "metadata": dict(self.metadata) if self.metadata else None,
            "confidence": self.confidence,
            "familiarity": self.familiarity,
            "usage_count": self.usage_count,
            "last_reviewed": self.last_reviewed,
        }
        return payload


@dataclass(slots=True)
class AcronymSnapshot:
    """Point-in-time view of the acronym registry."""

    created_at: datetime
    entries: tuple[AcronymEntry, ...]

    def __iter__(self):  # type: ignore[override]
        return iter(self.entries)

    def __len__(self) -> int:  # pragma: no cover - trivial wrapper
        return len(self.entries)


@dataclass(slots=True)
class AcronymDigest:
    """Aggregate metrics for the acronym registry."""

    total_acronyms: int
    total_expansions: int
    average_confidence: float
    average_familiarity: float
    ambiguous_acronyms: tuple[str, ...]
    last_reviewed: datetime | None


# ---------------------------------------------------------------------------
# dynamic store


class DynamicAcronym:
    """Adaptive acronym manager with confidence tracking."""

    def __init__(self, entries: Iterable[AcronymEntry] | None = None):
        self._entries: dict[str, AcronymEntry] = {}
        if entries:
            for entry in entries:
                self.upsert(entry)

    @staticmethod
    def _key(acronym: str) -> str:
        return _normalise_upper(acronym)

    # mutation helpers ---------------------------------------------------------
    def upsert(self, entry: AcronymEntry) -> AcronymEntry:
        key = self._key(entry.acronym)
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

        merged_entry = AcronymEntry(
            acronym=existing.acronym,
            expansions=_merge_sequences(existing.expansions, entry.expansions),
            description=entry.description or existing.description,
            categories=_merge_sequences(existing.categories, entry.categories),
            usage_notes=_merge_sequences(existing.usage_notes, entry.usage_notes),
            metadata=merged_metadata,
            confidence=max(existing.confidence, entry.confidence),
            familiarity=max(existing.familiarity, entry.familiarity),
            usage_count=max(existing.usage_count, entry.usage_count),
            last_reviewed=max(existing.last_reviewed, entry.last_reviewed),
        )
        self._entries[key] = merged_entry
        return merged_entry

    def add_expansion(
        self,
        acronym: str,
        expansion: str,
        *,
        category: str | None = None,
        usage_note: str | None = None,
    ) -> AcronymEntry:
        entry = self._ensure_entry(acronym)
        expansions = _merge_sequences(entry.expansions, ( _normalise_text(expansion), ))
        categories = (
            _merge_sequences(entry.categories, (_normalise_text(category),))
            if category
            else entry.categories
        )
        usage_notes = (
            _merge_sequences(entry.usage_notes, (_normalise_text(usage_note),))
            if usage_note
            else entry.usage_notes
        )
        payload = entry.as_dict()
        payload["expansions"] = expansions
        payload["categories"] = categories
        payload["usage_notes"] = usage_notes
        payload["confidence"] = _clamp(entry.confidence + 0.05)
        payload["familiarity"] = _clamp(entry.familiarity + 0.04)
        payload["last_reviewed"] = _utcnow()
        updated = AcronymEntry(**payload)
        self._entries[self._key(updated.acronym)] = updated
        return updated

    def retire_expansion(self, acronym: str, expansion: str) -> AcronymEntry:
        entry = self._ensure_entry(acronym)
        removal = _normalise_text(expansion)
        found = removal in entry.expansions
        filtered = tuple(item for item in entry.expansions if item != removal)
        payload = entry.as_dict()
        payload["expansions"] = filtered
        payload["confidence"] = _clamp(entry.confidence - 0.05) if found else entry.confidence
        payload["last_reviewed"] = _utcnow()
        updated = AcronymEntry(**payload)
        self._entries[self._key(updated.acronym)] = updated
        return updated

    def record_observation(self, acronym: str, *, weight: float = 1.0) -> AcronymEntry:
        entry = self._ensure_entry(acronym)
        boost = max(0.0, float(weight))
        payload = entry.as_dict()
        payload["usage_count"] = entry.usage_count + int(round(boost))
        payload["familiarity"] = _clamp(entry.familiarity + 0.03 * boost)
        payload["confidence"] = _clamp(entry.confidence + 0.01 * boost)
        payload["last_reviewed"] = _utcnow()
        updated = AcronymEntry(**payload)
        self._entries[self._key(updated.acronym)] = updated
        return updated

    def _ensure_entry(self, acronym: str) -> AcronymEntry:
        key = self._key(acronym)
        existing = self._entries.get(key)
        if existing is not None:
            return existing
        new_entry = AcronymEntry(acronym=acronym)
        self._entries[key] = new_entry
        return new_entry

    # lookup utilities ---------------------------------------------------------
    def lookup(self, query: str) -> AcronymEntry | None:
        key = self._key(query)
        entry = self._entries.get(key)
        if entry is not None:
            return entry
        lowered = query.strip().lower()
        if not lowered:
            return None
        for candidate in self._entries.values():
            if lowered in candidate.lookup_tokens:
                return candidate
        return None

    def expansions_for(self, acronym: str) -> tuple[str, ...]:
        entry = self.lookup(acronym)
        if entry is None:
            return ()
        return entry.expansions

    def search(self, query: str) -> tuple[AcronymEntry, ...]:
        needle = query.strip().lower()
        if not needle:
            return ()
        matches = [
            entry
            for entry in self._entries.values()
            if needle in entry.lookup_tokens
        ]
        matches.sort(key=lambda entry: (-entry.confidence, entry.acronym))
        return tuple(matches)

    # reporting ----------------------------------------------------------------
    def snapshot(self) -> AcronymSnapshot:
        entries = tuple(sorted(self._entries.values(), key=lambda e: e.acronym))
        return AcronymSnapshot(created_at=_utcnow(), entries=entries)

    def digest(self) -> AcronymDigest:
        entries = tuple(self._entries.values())
        if not entries:
            return AcronymDigest(
                total_acronyms=0,
                total_expansions=0,
                average_confidence=0.0,
                average_familiarity=0.0,
                ambiguous_acronyms=(),
                last_reviewed=None,
            )

        total_expansions = sum(len(entry.expansions) for entry in entries)
        avg_confidence = sum(entry.confidence for entry in entries) / len(entries)
        avg_familiarity = sum(entry.familiarity for entry in entries) / len(entries)
        ambiguous = sorted(
            (entry for entry in entries if entry.ambiguity > 0),
            key=lambda entry: (-entry.ambiguity, -entry.confidence, entry.acronym),
        )
        top_ambiguous = tuple(entry.acronym for entry in ambiguous[:5])
        last_reviewed = max(entry.last_reviewed for entry in entries)
        return AcronymDigest(
            total_acronyms=len(entries),
            total_expansions=total_expansions,
            average_confidence=round(avg_confidence, 6),
            average_familiarity=round(avg_familiarity, 6),
            ambiguous_acronyms=top_ambiguous,
            last_reviewed=last_reviewed,
        )


# ---------------------------------------------------------------------------
# curated defaults


DEFAULT_ACRONYMS: tuple[AcronymEntry, ...] = (
    AcronymEntry(
        acronym="DYNAMIC",
        expansions=(
            "Driving Yield of New Advancements in Markets, Investing & Capital",
        ),
        description=(
            "Defines the D.Y.N.A.M.I.C. base — a relentless push to uncover "
            "fresh advantages across markets, investing, and capital strategy."
        ),
        categories=("vision", "markets", "innovation"),
        usage_notes=(
            "D.Y.N.A.M.I.C.",
            "Use when highlighting the discovery engine that fuels Dynamic Capital.",
        ),
        metadata={
            "source": "community",
            "context": "Updated Dynamic Capital prefix expansion shared by the user.",
        },
        confidence=0.85,
        familiarity=0.65,
    ),
    AcronymEntry(
        acronym="CAPITAL",
        expansions=(
            "Creating Asset Profitability through Intelligent Trading, Algorithms & Leverage",
        ),
        description=(
            "Captures the C.A.P.I.T.A.L. foundation — disciplined systems that "
            "translate insight into compounding performance."
        ),
        categories=("strategy", "finance", "execution"),
        usage_notes=(
            "C.A.P.I.T.A.L.",
            "Use when focusing on the intelligent trading stack that scales returns.",
        ),
        metadata={
            "source": "community",
            "context": "Companion acronym completing the Dynamic Capital formula.",
        },
        confidence=0.83,
        familiarity=0.62,
    ),
    AcronymEntry(
        acronym="DYNAMIC CAPITAL",
        expansions=(
            "Dynamic Capital = Driving Yield of New Advancements in Markets, Investing & Capital — "
            "Creating Asset Profitability through Intelligent Trading, Algorithms & Leverage",
        ),
        description=(
            "Final form statement that unifies the D.Y.N.A.M.I.C. discovery engine with the "
            "C.A.P.I.T.A.L. execution layer."
        ),
        categories=("vision", "strategy", "identity"),
        usage_notes=(
            "D.Y.N.A.M.I.C.",
            "C.A.P.I.T.A.L.",
            "Use for the complete Dynamic Capital mantra.",
        ),
        metadata={
            "source": "community",
            "context": "Combined articulation aligning the two companion acronyms.",
        },
        confidence=0.88,
        familiarity=0.7,
    ),
)


def create_default_acronym_registry() -> DynamicAcronym:
    """Return a registry pre-populated with curated acronym entries."""

    return DynamicAcronym(DEFAULT_ACRONYMS)
