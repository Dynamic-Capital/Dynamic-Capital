"""Dynamic Memory retrieval with lightweight scoring heuristics."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "MemoryRecord",
    "MemoryQuery",
    "MemoryMatch",
    "DynamicMemoryRetriever",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_identifier(value: str | int) -> str:
    ident = str(value).strip()
    if not ident:
        raise ValueError("record id must not be empty")
    return ident


def _normalise_domain(value: str) -> str:
    domain = value.strip().lower()
    if not domain:
        raise ValueError("domain must not be empty")
    return domain


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _normalise_timestamp(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@dataclass(slots=True)
class MemoryRecord:
    """Atomic unit stored inside Dynamic Memory."""

    record_id: str
    domain: str
    summary: str
    details: str = ""
    tags: tuple[str, ...] = field(default_factory=tuple)
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.record_id = _normalise_identifier(self.record_id)
        self.domain = _normalise_domain(self.domain)
        self.summary = self.summary.strip()
        self.details = self.details.strip()
        self.tags = _normalise_tags(self.tags)
        self.weight = max(float(self.weight), 0.0)
        self.timestamp = _normalise_timestamp(self.timestamp) or _utcnow()
        self.metadata = _coerce_metadata(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "record_id": self.record_id,
            "domain": self.domain,
            "summary": self.summary,
            "details": self.details,
            "tags": list(self.tags),
            "weight": self.weight,
            "timestamp": self.timestamp.isoformat(),
            "metadata": dict(self.metadata) if self.metadata is not None else None,
        }


@dataclass(slots=True)
class MemoryQuery:
    """Parameters for searching Dynamic Memory."""

    terms: Sequence[str] | str = field(default_factory=tuple)
    domain: str | None = None
    tags: Sequence[str] | None = None
    since: datetime | None = None
    until: datetime | None = None
    reference_time: datetime | None = None

    def __post_init__(self) -> None:
        raw_terms = self.terms
        processed: list[str] = []
        if isinstance(raw_terms, str):
            raw_terms = [raw_terms]
        for term in raw_terms:
            for part in term.split():
                cleaned = part.strip().lower()
                if cleaned:
                    processed.append(cleaned)
        self.terms = tuple(processed)
        self.domain = _normalise_domain(self.domain) if self.domain else None
        self.tags = _normalise_tags(self.tags)
        self.since = _normalise_timestamp(self.since)
        self.until = _normalise_timestamp(self.until)
        self.reference_time = _normalise_timestamp(self.reference_time) or _utcnow()
        if self.since and self.until and self.since > self.until:
            raise ValueError("since must be earlier than until")


@dataclass(slots=True)
class MemoryMatch:
    """Result of a retrieval query containing the score rationale."""

    record: MemoryRecord
    score: float
    reasons: tuple[str, ...] = field(default_factory=tuple)

    def as_dict(self) -> MutableMapping[str, object]:
        payload = self.record.as_dict()
        payload.update({"score": self.score, "reasons": list(self.reasons)})
        return payload


class DynamicMemoryRetriever:
    """Lightweight retrieval and ranking for Dynamic Memory records."""

    def __init__(
        self,
        records: Iterable[MemoryRecord | Mapping[str, object]] | None = None,
        *,
        time_decay_half_life_days: float = 7.0,
    ) -> None:
        if time_decay_half_life_days <= 0:
            raise ValueError("time_decay_half_life_days must be positive")
        self._records: list[MemoryRecord] = []
        self._half_life_days = float(time_decay_half_life_days)
        if records:
            self.extend(records)

    def add(self, record: MemoryRecord | Mapping[str, object]) -> MemoryRecord:
        resolved = self._coerce_record(record)
        self._records.append(resolved)
        return resolved

    def extend(self, records: Iterable[MemoryRecord | Mapping[str, object]]) -> None:
        for record in records:
            self.add(record)

    def retrieve(self, query: MemoryQuery, *, limit: int = 10) -> list[MemoryMatch]:
        if limit <= 0:
            return []
        matches: list[MemoryMatch] = []
        for record in self._records:
            if not self._record_in_window(record, query):
                continue
            score, reasons = self._score_record(record, query)
            if score <= 0.0:
                continue
            matches.append(MemoryMatch(record=record, score=score, reasons=tuple(reasons)))
        matches.sort(
            key=lambda match: (
                -match.score,
                -match.record.timestamp.timestamp(),
                match.record.record_id,
            )
        )
        return matches[:limit]

    def clear(self) -> None:
        self._records.clear()

    # --------------------------------------------------------------- internals
    def _coerce_record(self, record: MemoryRecord | Mapping[str, object]) -> MemoryRecord:
        if isinstance(record, MemoryRecord):
            return record
        if isinstance(record, Mapping):
            payload: MutableMapping[str, object] = dict(record)
            return MemoryRecord(**payload)  # type: ignore[arg-type]
        raise TypeError("record must be MemoryRecord or mapping")

    def _record_in_window(self, record: MemoryRecord, query: MemoryQuery) -> bool:
        if query.since and record.timestamp < query.since:
            return False
        if query.until and record.timestamp > query.until:
            return False
        return True

    def _score_record(self, record: MemoryRecord, query: MemoryQuery) -> tuple[float, list[str]]:
        if query.domain and record.domain != query.domain:
            return (0.0, [])
        reasons: list[str] = []
        score = record.weight
        if query.domain:
            score += 0.5
            reasons.append("domain_match")
        if query.tags:
            overlap = set(record.tags).intersection(query.tags)
            if not overlap:
                return (0.0, [])
            tag_score = 0.2 * len(overlap)
            score += tag_score
            reasons.append(f"tag_overlap={sorted(overlap)}")
        if query.terms:
            tag_corpus = " ".join(record.tags)
            corpus = f"{record.summary} {record.details} {tag_corpus}".lower()
            hits = sum(1 for term in query.terms if term in corpus)
            if hits == 0:
                return (0.0, [])
            term_score = 0.3 * hits
            score += term_score
            reasons.append(f"term_hits={hits}")
        decay_factor = self._recency_factor(record.timestamp, query.reference_time)
        score *= decay_factor
        reasons.append(f"recency_decay={decay_factor:.3f}")
        if score <= 0.0:
            return (0.0, [])
        return (score, reasons)

    def _recency_factor(self, timestamp: datetime, reference: datetime) -> float:
        elapsed = (reference - timestamp).total_seconds()
        if elapsed <= 0:
            return 1.0
        half_life_seconds = self._half_life_days * 86400.0
        decay = 0.5 ** (elapsed / half_life_seconds)
        return 0.5 + 0.5 * decay
