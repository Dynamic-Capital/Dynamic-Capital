"""Core primitives for orchestrating the Dynamic Capital database fabric."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "DatabaseRecord",
    "ReplicationEvent",
    "TableSnapshot",
    "DynamicDatabase",
]


# ---------------------------------------------------------------------------
# normalisation helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_identifier(value: str) -> str:
    return _normalise_text(value)


def _canonical_identifier(value: str) -> str:
    return _normalise_identifier(value).lower()


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _normalise_sources(sources: Sequence[str] | None) -> tuple[str, ...]:
    if not sources:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for source in sources:
        cleaned = source.strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_payload(payload: Mapping[str, object]) -> Mapping[str, object]:
    if not isinstance(payload, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("payload must be a mapping")
    return dict(payload)


# ---------------------------------------------------------------------------
# dataclass definitions


@dataclass(slots=True)
class DatabaseRecord:
    """A single record flowing through the dynamic database fabric."""

    key: str
    payload: Mapping[str, object]
    confidence: float = 0.5
    relevance: float = 0.5
    freshness: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    sources: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.key = _normalise_identifier(self.key)
        self.payload = _coerce_payload(self.payload)
        self.confidence = _clamp(float(self.confidence))
        self.relevance = _clamp(float(self.relevance))
        self.freshness = _clamp(float(self.freshness))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.sources = _normalise_sources(self.sources)

    @property
    def canonical_key(self) -> str:
        """Lower-cased key used for table indexing."""

        return _canonical_identifier(self.key)

    def merge(self, other: "DatabaseRecord") -> "DatabaseRecord":
        """Combine two records with the same key into a harmonised view."""

        if self.canonical_key != other.canonical_key:
            raise ValueError("records must share the same canonical key")

        total_weight = self.weight + other.weight
        if total_weight <= 0.0:
            raise ValueError("merged weight must be positive")

        payload = {**self.payload, **other.payload}
        tags = tuple(dict.fromkeys(self.tags + other.tags))
        sources = tuple(dict.fromkeys(self.sources + other.sources))
        timestamp = max(self.timestamp, other.timestamp)
        confidence = _clamp(
            (self.confidence * self.weight + other.confidence * other.weight)
            / total_weight
        )
        relevance = _clamp(
            (self.relevance * self.weight + other.relevance * other.weight)
            / total_weight
        )
        freshness = _clamp(
            (self.freshness * self.weight + other.freshness * other.weight)
            / total_weight
        )

        return DatabaseRecord(
            key=self.key,
            payload=payload,
            confidence=confidence,
            relevance=relevance,
            freshness=freshness,
            weight=total_weight,
            timestamp=timestamp,
            tags=tags,
            sources=sources,
        )


@dataclass(slots=True)
class ReplicationEvent:
    """Trace entry capturing how a record evolved inside the database."""

    table: str
    key: str
    action: str
    confidence_shift: float
    relevance_shift: float
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.table = _canonical_identifier(self.table)
        self.key = _canonical_identifier(self.key)
        self.action = _normalise_text(self.action).lower()
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)


@dataclass(slots=True)
class TableSnapshot:
    """Immutable snapshot of a table's current health."""

    table: str
    records: tuple[DatabaseRecord, ...]
    mean_confidence: float
    mean_relevance: float
    mean_freshness: float
    tag_catalog: tuple[str, ...]
    updated_at: datetime

    def __post_init__(self) -> None:
        self.table = _canonical_identifier(self.table)
        if self.updated_at.tzinfo is None:
            self.updated_at = self.updated_at.replace(tzinfo=timezone.utc)
        else:
            self.updated_at = self.updated_at.astimezone(timezone.utc)

    @property
    def record_count(self) -> int:
        return len(self.records)


class DynamicDatabase:
    """Coordinator that maintains harmonised tables and replication history."""

    def __init__(self, *, history: int = 256) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._tables: MutableMapping[str, MutableMapping[str, DatabaseRecord]] = {}
        self._log: Deque[ReplicationEvent] = deque(maxlen=int(history))

    @property
    def tables(self) -> tuple[str, ...]:
        return tuple(sorted(self._tables))

    @property
    def log(self) -> tuple[ReplicationEvent, ...]:
        return tuple(self._log)

    def get_record(self, table: str, key: str) -> DatabaseRecord | None:
        table_key = _canonical_identifier(table)
        record_key = _canonical_identifier(key)
        bucket = self._tables.get(table_key)
        if not bucket:
            return None
        return bucket.get(record_key)

    def ingest(self, table: str, record: DatabaseRecord) -> DatabaseRecord:
        table_key = _canonical_identifier(table)
        bucket = self._tables.setdefault(table_key, {})
        canonical_key = record.canonical_key

        existing = bucket.get(canonical_key)
        if existing is None:
            bucket[canonical_key] = record
            confidence_shift = record.confidence
            relevance_shift = record.relevance
            action = "insert"
            stored = record
        else:
            merged = existing.merge(record)
            bucket[canonical_key] = merged
            confidence_shift = merged.confidence - existing.confidence
            relevance_shift = merged.relevance - existing.relevance
            action = "update"
            stored = merged

        self._log.append(
            ReplicationEvent(
                table=table_key,
                key=canonical_key,
                action=action,
                confidence_shift=confidence_shift,
                relevance_shift=relevance_shift,
            )
        )
        return stored

    def bulk_ingest(self, table: str, records: Iterable[DatabaseRecord]) -> list[DatabaseRecord]:
        results: list[DatabaseRecord] = []
        for record in records:
            results.append(self.ingest(table, record))
        return results

    def evict(self, table: str, keys: Iterable[str]) -> int:
        table_key = _canonical_identifier(table)
        bucket = self._tables.get(table_key)
        if not bucket:
            return 0

        removed = 0
        for key in keys:
            canonical_key = _canonical_identifier(key)
            existing = bucket.pop(canonical_key, None)
            if existing is None:
                continue
            removed += 1
            self._log.append(
                ReplicationEvent(
                    table=table_key,
                    key=canonical_key,
                    action="delete",
                    confidence_shift=-existing.confidence,
                    relevance_shift=-existing.relevance,
                )
            )
        if not bucket:
            self._tables.pop(table_key, None)
        return removed

    def snapshot(self, table: str) -> TableSnapshot:
        table_key = _canonical_identifier(table)
        bucket = self._tables.get(table_key)
        if not bucket:
            return TableSnapshot(
                table=table_key,
                records=(),
                mean_confidence=0.0,
                mean_relevance=0.0,
                mean_freshness=0.0,
                tag_catalog=(),
                updated_at=_utcnow(),
            )

        records = tuple(sorted(bucket.values(), key=lambda record: record.timestamp))
        mean_confidence = fmean(record.confidence for record in records)
        mean_relevance = fmean(record.relevance for record in records)
        mean_freshness = fmean(record.freshness for record in records)
        tag_catalog = tuple(sorted({tag for record in records for tag in record.tags}))
        updated_at = max(record.timestamp for record in records)

        return TableSnapshot(
            table=table_key,
            records=records,
            mean_confidence=_clamp(mean_confidence),
            mean_relevance=_clamp(mean_relevance),
            mean_freshness=_clamp(mean_freshness),
            tag_catalog=tag_catalog,
            updated_at=updated_at,
        )

    def recent_events(self, limit: int = 10) -> tuple[ReplicationEvent, ...]:
        if limit <= 0:
            return ()
        slice_start = max(len(self._log) - limit, 0)
        return tuple(list(self._log)[slice_start:])
