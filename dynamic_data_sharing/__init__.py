"""Dynamic data-sharing orchestration utilities.

This module layers a light-weight sharing façade on top of the
``dynamic_database`` primitives so curated slices of the knowledge fabric can
be exported without leaking sensitive payloads.  Policies gate which records
qualify for sharing, redact disallowed keys, and optionally anonymise record
identifiers before export.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
from typing import Iterable, Mapping, MutableMapping, Sequence

from dynamic_database import DatabaseRecord, DynamicDatabaseEngine

__all__ = [
    "SharePolicy",
    "ShareRecord",
    "SharePackage",
    "DynamicDataSharingEngine",
    "GoogleDriveShareRepository",
]


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = str(value).strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_identifier(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    result: list[str] = []
    for tag in tags:
        cleaned = str(tag).strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            result.append(cleaned)
    return tuple(result)


def _normalise_keys(keys: Sequence[str] | None) -> tuple[str, ...]:
    if not keys:
        return ()
    seen: set[str] = set()
    result: list[str] = []
    for key in keys:
        cleaned = str(key).strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            result.append(cleaned)
    return tuple(result)


def _anonymise_key(value: str) -> str:
    digest = sha256(value.encode("utf-8")).hexdigest()[:16]
    return f"share-{digest}"


@dataclass(slots=True)
class SharePolicy:
    """Normalised configuration describing a sharing envelope."""

    max_records: int = 128
    min_confidence: float = 0.5
    min_relevance: float = 0.4
    allowed_tags: tuple[str, ...] = field(default_factory=tuple)
    redact_keys: tuple[str, ...] = field(default_factory=tuple)
    anonymise_keys: bool = True
    include_sources: bool = False

    def __post_init__(self) -> None:
        self.max_records = max(int(self.max_records), 0)
        if self.max_records == 0:
            raise ValueError("max_records must be greater than zero")
        self.min_confidence = _clamp(float(self.min_confidence))
        self.min_relevance = _clamp(float(self.min_relevance))
        self.allowed_tags = _normalise_tags(self.allowed_tags)
        self.redact_keys = _normalise_keys(self.redact_keys)
        self.anonymise_keys = bool(self.anonymise_keys)
        self.include_sources = bool(self.include_sources)

    def to_dict(self) -> MutableMapping[str, object]:
        return {
            "max_records": self.max_records,
            "min_confidence": self.min_confidence,
            "min_relevance": self.min_relevance,
            "allowed_tags": list(self.allowed_tags),
            "redact_keys": list(self.redact_keys),
            "anonymise_keys": self.anonymise_keys,
            "include_sources": self.include_sources,
        }

    @classmethod
    def from_dict(cls, payload: Mapping[str, object]) -> "SharePolicy":
        if not isinstance(payload, Mapping):
            raise TypeError("payload must be a mapping")
        return cls(
            max_records=payload.get("max_records", 128),
            min_confidence=payload.get("min_confidence", 0.5),
            min_relevance=payload.get("min_relevance", 0.4),
            allowed_tags=payload.get("allowed_tags"),
            redact_keys=payload.get("redact_keys"),
            anonymise_keys=payload.get("anonymise_keys", True),
            include_sources=payload.get("include_sources", False),
        )


@dataclass(slots=True)
class ShareRecord:
    """Sanitised representation of a shareable database record."""

    key: str
    payload: Mapping[str, object]
    tags: tuple[str, ...]
    timestamp: datetime
    sources: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.key = _normalise_text(self.key)
        self.payload = dict(self.payload)
        self.tags = _normalise_tags(self.tags)
        self.timestamp = _ensure_utc(self.timestamp)
        self.sources = _normalise_keys(self.sources)

    def to_dict(self) -> MutableMapping[str, object]:
        return {
            "key": self.key,
            "payload": dict(self.payload),
            "tags": list(self.tags),
            "timestamp": self.timestamp.isoformat(),
            "sources": list(self.sources),
        }

    @classmethod
    def from_dict(cls, payload: Mapping[str, object]) -> "ShareRecord":
        if not isinstance(payload, Mapping):
            raise TypeError("payload must be a mapping")
        timestamp_raw = payload.get("timestamp")
        timestamp: datetime
        if isinstance(timestamp_raw, datetime):
            timestamp = timestamp_raw
        elif isinstance(timestamp_raw, str):
            try:
                timestamp = datetime.fromisoformat(timestamp_raw)
            except ValueError as error:
                raise ValueError("Invalid timestamp in share record payload") from error
        else:
            raise ValueError("Share record payload requires a timestamp")
        sources = payload.get("sources")
        tags = payload.get("tags")
        return cls(
            key=str(payload.get("key", "")),
            payload=dict(payload.get("payload", {})),
            tags=tuple(tags or ()),
            timestamp=timestamp,
            sources=tuple(sources or ()),
        )


@dataclass(slots=True)
class SharePackage:
    """Materialised bundle ready for downstream distribution."""

    table: str
    generated_at: datetime
    policy: SharePolicy
    records: tuple[ShareRecord, ...]
    metadata: Mapping[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.table = _normalise_identifier(self.table)
        self.generated_at = _ensure_utc(self.generated_at)
        self.records = tuple(self.records)
        self.metadata = dict(self.metadata)

    @property
    def record_count(self) -> int:
        return len(self.records)

    @property
    def checksum(self) -> str:
        digest = sha256()
        digest.update(self.table.encode("utf-8"))
        digest.update(self.generated_at.isoformat().encode("utf-8"))
        digest.update(json.dumps(self.policy.to_dict(), sort_keys=True).encode("utf-8"))
        for record in self.records:
            digest.update(
                json.dumps(record.to_dict(), sort_keys=True).encode("utf-8")
            )
        digest.update(json.dumps(self.metadata, sort_keys=True).encode("utf-8"))
        return f"sha256:{digest.hexdigest()}"

    def to_dict(self) -> MutableMapping[str, object]:
        return {
            "table": self.table,
            "generated_at": self.generated_at.isoformat(),
            "record_count": self.record_count,
            "checksum": self.checksum,
            "policy": self.policy.to_dict(),
            "metadata": dict(self.metadata),
            "records": [record.to_dict() for record in self.records],
        }

    @classmethod
    def from_dict(cls, payload: Mapping[str, object]) -> "SharePackage":
        if not isinstance(payload, Mapping):
            raise TypeError("payload must be a mapping")
        table = payload.get("table")
        if not isinstance(table, str) or not table.strip():
            raise ValueError("Share package payload requires a table name")
        generated_raw = payload.get("generated_at")
        if isinstance(generated_raw, datetime):
            generated_at = generated_raw
        elif isinstance(generated_raw, str):
            try:
                generated_at = datetime.fromisoformat(generated_raw)
            except ValueError as error:
                raise ValueError("Invalid generated_at in share package payload") from error
        else:
            raise ValueError("Share package payload requires a generated_at timestamp")
        policy_payload = payload.get("policy")
        if not isinstance(policy_payload, Mapping):
            raise ValueError("Share package payload requires a policy mapping")
        records_payload = payload.get("records")
        if records_payload is None:
            records_iterable: Iterable[Mapping[str, object]] = ()
        elif isinstance(records_payload, Iterable):
            records_iterable = records_payload  # type: ignore[assignment]
        else:
            raise ValueError("Share package 'records' must be iterable")
        metadata_payload = payload.get("metadata") or {}
        if not isinstance(metadata_payload, Mapping):
            raise ValueError("Share package metadata must be a mapping")
        normalised_records: list[Mapping[str, object]] = []
        for record_payload in records_iterable:
            if not isinstance(record_payload, Mapping):
                raise ValueError("Each share package record must be a mapping")
            normalised_records.append(record_payload)
        records = [ShareRecord.from_dict(record) for record in normalised_records]
        return cls(
            table=table,
            generated_at=generated_at,
            policy=SharePolicy.from_dict(policy_payload),
            records=tuple(records),
            metadata=dict(metadata_payload),
        )


def _sanitise_payload(
    payload: Mapping[str, object], redact_keys: Sequence[str]
) -> MutableMapping[str, object]:
    if not isinstance(payload, Mapping):
        raise TypeError("payload must be a mapping")
    return {
        key: value
        for key, value in payload.items()
        if key not in set(redact_keys)
    }


class DynamicDataSharingEngine:
    """High-level façade that prepares data-share bundles."""

    def __init__(self, *, engine: DynamicDatabaseEngine | None = None) -> None:
        self._engine = engine or DynamicDatabaseEngine()

    @property
    def engine(self) -> DynamicDatabaseEngine:
        return self._engine

    def register_table(
        self,
        name: str,
        *,
        description: str,
        tags: Sequence[str] | None = None,
        owner: str | None = None,
        sensitivity: float = 0.5,
    ):
        return self._engine.register_table(
            name,
            description=description,
            tags=tags,
            owner=owner,
            sensitivity=sensitivity,
        )

    def ingest(self, table: str, record: DatabaseRecord) -> DatabaseRecord:
        return self._engine.ingest(table, record)

    def bulk_ingest(
        self, table: str, records: Iterable[DatabaseRecord]
    ) -> list[DatabaseRecord]:
        return self._engine.bulk_ingest(table, records)

    def prepare_share(
        self,
        table: str,
        *,
        policy: SharePolicy,
        note: str | None = None,
    ) -> SharePackage:
        filters_tags = policy.allowed_tags or None
        query = self._engine.query(
            table,
            limit=policy.max_records,
            min_confidence=policy.min_confidence,
            min_relevance=policy.min_relevance,
            tags=filters_tags,
            order_by="freshness",
        )

        records: list[ShareRecord] = []
        for record in query.records:
            payload = _sanitise_payload(record.payload, policy.redact_keys)
            key = record.key
            if policy.anonymise_keys:
                key = _anonymise_key(record.key)
            sources = record.sources if policy.include_sources else ()
            records.append(
                ShareRecord(
                    key=key,
                    payload=payload,
                    tags=record.tags,
                    timestamp=record.timestamp,
                    sources=sources,
                )
            )

        metadata: dict[str, object] = {
            "requested_limit": query.requested_limit,
            "available": query.available,
            "total_records": query.total_records,
            "coverage_ratio": query.coverage_ratio,
            "mean_confidence": query.mean_confidence,
            "filters": {
                "min_confidence": policy.min_confidence,
                "min_relevance": policy.min_relevance,
                "allowed_tags": list(policy.allowed_tags),
            },
        }

        if note and note.strip():
            metadata["note"] = note.strip()

        return SharePackage(
            table=query.table,
            generated_at=query.issued_at,
            policy=policy,
            records=tuple(records),
            metadata=metadata,
        )

    def share(
        self,
        table: str,
        *,
        policy: SharePolicy,
        note: str | None = None,
    ) -> Mapping[str, object]:
        """Convenience helper returning a serialisable payload."""

        package = self.prepare_share(table, policy=policy, note=note)
        return package.to_dict()


from .google_drive import GoogleDriveShareRepository  # noqa: E402  (circular-safe import)

