"""Higher-level orchestration layer for the Dynamic Capital database fabric."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Callable, Iterable, Mapping, MutableMapping, Sequence

from .database import DatabaseRecord, DynamicDatabase

__all__ = [
    "TableDefinition",
    "QueryFilters",
    "QueryResult",
    "TableHealth",
    "DynamicDatabaseEngine",
]


# ---------------------------------------------------------------------------
# normalisation helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_table(value: str) -> str:
    return _normalise_text(value).lower()


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


# ---------------------------------------------------------------------------
# dataclass definitions


@dataclass(slots=True)
class TableDefinition:
    """Declarative configuration for a managed table."""

    name: str
    description: str
    tags: tuple[str, ...] = field(default_factory=tuple)
    owner: str | None = None
    sensitivity: float = 0.5
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.name = _normalise_table(self.name)
        self.description = _normalise_text(self.description)
        self.tags = _normalise_tags(self.tags)
        self.owner = _normalise_optional_text(self.owner)
        self.sensitivity = _clamp(float(self.sensitivity))
        self.created_at = _ensure_utc(self.created_at)
        self.updated_at = _ensure_utc(self.updated_at)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "description": self.description,
            "tags": self.tags,
            "owner": self.owner,
            "sensitivity": self.sensitivity,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


@dataclass(slots=True)
class QueryFilters:
    """Normalised filter set used when retrieving records."""

    min_confidence: float = 0.0
    min_relevance: float = 0.0
    tags: tuple[str, ...] = field(default_factory=tuple)
    order_by: str = "freshness"

    def __post_init__(self) -> None:
        self.min_confidence = _clamp(float(self.min_confidence))
        self.min_relevance = _clamp(float(self.min_relevance))
        self.tags = _normalise_tags(self.tags)
        self.order_by = _normalise_text(self.order_by).lower()

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "min_confidence": self.min_confidence,
            "min_relevance": self.min_relevance,
            "tags": self.tags,
            "order_by": self.order_by,
        }


@dataclass(slots=True)
class QueryResult:
    """Materialised result set for a filtered query."""

    table: str
    requested_limit: int
    filters: QueryFilters
    records: tuple[DatabaseRecord, ...]
    available: int
    total_records: int
    coverage_ratio: float
    mean_confidence: float
    issued_at: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.table = _normalise_table(self.table)
        self.requested_limit = max(int(self.requested_limit), 0)
        self.available = max(int(self.available), 0)
        self.total_records = max(int(self.total_records), 0)
        self.coverage_ratio = _clamp(float(self.coverage_ratio))
        self.mean_confidence = _clamp(float(self.mean_confidence))
        self.issued_at = _ensure_utc(self.issued_at)

    @property
    def is_empty(self) -> bool:
        return not self.records

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "table": self.table,
            "requested_limit": self.requested_limit,
            "filters": self.filters.as_dict(),
            "records": self.records,
            "available": self.available,
            "total_records": self.total_records,
            "coverage_ratio": self.coverage_ratio,
            "mean_confidence": self.mean_confidence,
            "issued_at": self.issued_at,
        }


@dataclass(slots=True)
class TableHealth:
    """Derived health snapshot that merges metadata and live metrics."""

    table: str
    description: str
    tags: tuple[str, ...]
    owner: str | None
    sensitivity: float
    record_count: int
    mean_confidence: float
    mean_relevance: float
    mean_freshness: float
    coverage_score: float
    updated_at: datetime
    metadata_updated_at: datetime

    def __post_init__(self) -> None:
        self.table = _normalise_table(self.table)
        self.description = _normalise_text(self.description)
        self.tags = _normalise_tags(self.tags)
        self.owner = _normalise_optional_text(self.owner)
        self.sensitivity = _clamp(float(self.sensitivity))
        self.record_count = max(int(self.record_count), 0)
        self.mean_confidence = _clamp(float(self.mean_confidence))
        self.mean_relevance = _clamp(float(self.mean_relevance))
        self.mean_freshness = _clamp(float(self.mean_freshness))
        self.coverage_score = _clamp(float(self.coverage_score))
        self.updated_at = _ensure_utc(self.updated_at)
        self.metadata_updated_at = _ensure_utc(self.metadata_updated_at)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "table": self.table,
            "description": self.description,
            "tags": self.tags,
            "owner": self.owner,
            "sensitivity": self.sensitivity,
            "record_count": self.record_count,
            "mean_confidence": self.mean_confidence,
            "mean_relevance": self.mean_relevance,
            "mean_freshness": self.mean_freshness,
            "coverage_score": self.coverage_score,
            "updated_at": self.updated_at,
            "metadata_updated_at": self.metadata_updated_at,
        }


# ---------------------------------------------------------------------------
# engine implementation


class DynamicDatabaseEngine:
    """Coordinator providing metadata-aware access to the dynamic database."""

    def __init__(self, *, history: int = 256) -> None:
        self._database = DynamicDatabase(history=history)
        self._tables: dict[str, TableDefinition] = {}

    @property
    def database(self) -> DynamicDatabase:
        return self._database

    def register_table(
        self,
        name: str,
        *,
        description: str,
        tags: Sequence[str] | None = None,
        owner: str | None = None,
        sensitivity: float = 0.5,
    ) -> TableDefinition:
        table = _normalise_table(name)
        now = _utcnow()

        definition = TableDefinition(
            name=table,
            description=description,
            tags=_normalise_tags(tags),
            owner=owner,
            sensitivity=sensitivity,
            created_at=now,
            updated_at=now,
        )

        existing = self._tables.get(table)
        if existing:
            definition = TableDefinition(
                name=table,
                description=description,
                tags=_normalise_tags(tags),
                owner=owner,
                sensitivity=sensitivity,
                created_at=existing.created_at,
                updated_at=now,
            )

        self._tables[table] = definition
        return definition

    def ensure_table(self, name: str) -> TableDefinition:
        table = _normalise_table(name)
        definition = self._tables.get(table)
        if definition is None:
            definition = TableDefinition(
                name=table,
                description=f"Auto registered table '{table}'",
                tags=(),
                owner=None,
                sensitivity=0.5,
            )
            self._tables[table] = definition
        return definition

    def get_table(self, name: str) -> TableDefinition | None:
        return self._tables.get(_normalise_table(name))

    def list_tables(self) -> tuple[TableDefinition, ...]:
        return tuple(self._tables[name] for name in sorted(self._tables))

    def ingest(self, table: str, record: DatabaseRecord) -> DatabaseRecord:
        self.ensure_table(table)
        return self._database.ingest(table, record)

    def bulk_ingest(
        self, table: str, records: Iterable[DatabaseRecord]
    ) -> list[DatabaseRecord]:
        self.ensure_table(table)
        return self._database.bulk_ingest(table, records)

    def recent_events(self, limit: int = 10):
        return self._database.recent_events(limit)

    def table_health(self, table: str) -> TableHealth:
        table_key = _normalise_table(table)
        snapshot = self._database.snapshot(table_key)
        metadata = self._tables.get(table_key)

        description = (
            metadata.description
            if metadata
            else f"Auto registered table '{table_key}'"
        )
        tags = metadata.tags if metadata else ()
        owner = metadata.owner if metadata else None
        sensitivity = metadata.sensitivity if metadata else 0.5
        metadata_updated_at = (
            metadata.updated_at if metadata else snapshot.updated_at
        )

        coverage_score = _clamp(
            (snapshot.mean_confidence + snapshot.mean_relevance + snapshot.mean_freshness)
            / 3.0
        )

        return TableHealth(
            table=table_key,
            description=description,
            tags=tags,
            owner=owner,
            sensitivity=sensitivity,
            record_count=snapshot.record_count,
            mean_confidence=snapshot.mean_confidence,
            mean_relevance=snapshot.mean_relevance,
            mean_freshness=snapshot.mean_freshness,
            coverage_score=coverage_score,
            updated_at=snapshot.updated_at,
            metadata_updated_at=metadata_updated_at,
        )

    def summary(self) -> tuple[TableHealth, ...]:
        return tuple(self.table_health(defn.name) for defn in self.list_tables())

    def query(
        self,
        table: str,
        *,
        limit: int = 10,
        min_confidence: float = 0.0,
        min_relevance: float = 0.0,
        tags: Sequence[str] | None = None,
        order_by: str = "freshness",
    ) -> QueryResult:
        table_key = _normalise_table(table)
        filters = QueryFilters(
            min_confidence=min_confidence,
            min_relevance=min_relevance,
            tags=tags,
            order_by=order_by,
        )

        snapshot = self._database.snapshot(table_key)

        tags_filter = set(filters.tags)
        filtered: list[DatabaseRecord] = []
        for record in snapshot.records:
            if record.confidence < filters.min_confidence:
                continue
            if record.relevance < filters.min_relevance:
                continue
            if tags_filter and not tags_filter.issubset(set(record.tags)):
                continue
            filtered.append(record)

        key_map: Mapping[str, Callable[[DatabaseRecord], tuple[object, ...]]] = {
            "freshness": lambda r: (r.freshness, r.timestamp),
            "relevance": lambda r: (r.relevance, r.timestamp),
            "confidence": lambda r: (r.confidence, r.timestamp),
            "timestamp": lambda r: (r.timestamp,),
        }
        sort_key = key_map.get(filters.order_by, key_map["freshness"])
        filtered.sort(key=sort_key, reverse=True)

        requested_limit = max(int(limit), 0)
        limited = tuple(filtered[:requested_limit]) if requested_limit else ()
        available = len(filtered)
        total_records = snapshot.record_count
        coverage_ratio = (
            available / total_records if total_records > 0 else 0.0
        )
        mean_confidence = (
            fmean(record.confidence for record in limited) if limited else 0.0
        )

        return QueryResult(
            table=table_key,
            requested_limit=requested_limit,
            filters=filters,
            records=limited,
            available=available,
            total_records=total_records,
            coverage_ratio=coverage_ratio,
            mean_confidence=mean_confidence,
        )
