"""Dynamic blob storage orchestration primitives."""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta, timezone
from enum import Enum
from hashlib import blake2b
from io import BufferedReader, BytesIO
from typing import BinaryIO, Iterable, Mapping, MutableMapping, Sequence
from uuid import uuid4

__all__ = [
    "StorageTier",
    "BlobMetadata",
    "BlobHandle",
    "StorageStats",
    "DynamicBlobStorage",
]


BlobInput = bytes | bytearray | memoryview | str | Iterable[int] | BinaryIO


class StorageTier(str, Enum):
    """Logical storage tiers for orchestrating blob residency."""

    HOT = "hot"
    WARM = "warm"
    COLD = "cold"
    ARCHIVE = "archive"

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.value


@dataclass(slots=True)
class BlobMetadata:
    """Immutable metadata snapshot describing a stored blob."""

    blob_id: str
    checksum: str
    size: int
    created_at: datetime
    updated_at: datetime
    tier: StorageTier
    version: int
    tags: tuple[str, ...] = field(default_factory=tuple)
    content_type: str | None = None
    access_count: int = 0
    expires_at: datetime | None = None

    def with_updates(
        self,
        *,
        tier: StorageTier | None = None,
        tags: Sequence[str] | None = None,
        content_type: str | None = None,
        expires_at: datetime | None = None,
    ) -> "BlobMetadata":
        """Return a new metadata instance with provided fields updated."""

        return replace(
            self,
            tier=tier or self.tier,
            tags=_normalise_tags(tags) if tags is not None else self.tags,
            content_type=content_type if content_type is not None else self.content_type,
            expires_at=expires_at if expires_at is not None else self.expires_at,
        )


@dataclass(slots=True)
class BlobHandle:
    """Handle returned by storage operations."""

    blob_id: str
    version: int
    checksum: str
    size: int
    tier: StorageTier
    expires_at: datetime | None


@dataclass(slots=True)
class StorageStats:
    """Aggregate statistics describing current storage state."""

    total_blobs: int
    total_bytes: int
    average_size: float
    tier_distribution: Mapping[StorageTier, int]
    expires_within_7_days: int


@dataclass(slots=True)
class _BlobRecord:
    data: bytes
    metadata: BlobMetadata


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


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


def _coerce_bytes(data: BlobInput) -> bytes:
    if isinstance(data, bytes):
        return data
    if isinstance(data, bytearray):
        return bytes(data)
    if isinstance(data, memoryview):
        return data.tobytes()
    if isinstance(data, str):
        return data.encode("utf-8")
    if isinstance(data, Iterable):
        return bytes(byte for byte in data)
    if isinstance(data, (BufferedReader, BytesIO)) or hasattr(data, "read"):
        chunk = data.read()
        if isinstance(chunk, str):
            return chunk.encode("utf-8")
        if not isinstance(chunk, (bytes, bytearray, memoryview)):
            raise TypeError("file-like objects must return bytes")
        return bytes(chunk)
    raise TypeError("Unsupported blob input type")


def _checksum(payload: bytes) -> str:
    return blake2b(payload, digest_size=16).hexdigest()


class DynamicBlobStorage:
    """In-memory blob storage manager with dynamic tiering semantics."""

    def __init__(
        self,
        *,
        default_tier: StorageTier = StorageTier.HOT,
        default_retention: timedelta | None = timedelta(days=90),
        clock=_utcnow,
    ) -> None:
        self._default_tier = default_tier
        self._default_retention = default_retention
        self._clock = clock
        self._records: MutableMapping[str, _BlobRecord] = {}

    # ------------------------------------------------------------------
    # mutation operations

    def store(
        self,
        data: BlobInput,
        *,
        tags: Sequence[str] | None = None,
        tier: StorageTier | None = None,
        content_type: str | None = None,
        retention: timedelta | None = None,
    ) -> BlobHandle:
        """Store a new blob and return its handle."""

        payload = _coerce_bytes(data)
        blob_id = uuid4().hex
        now = self._clock()
        expires_at = self._compute_expiry(now, retention)
        metadata = BlobMetadata(
            blob_id=blob_id,
            checksum=_checksum(payload),
            size=len(payload),
            created_at=now,
            updated_at=now,
            tier=tier or self._default_tier,
            version=1,
            tags=_normalise_tags(tags),
            content_type=content_type,
            access_count=0,
            expires_at=expires_at,
        )
        self._records[blob_id] = _BlobRecord(data=payload, metadata=metadata)
        return self._handle_from_metadata(metadata)

    def update(
        self,
        blob_id: str,
        data: BlobInput,
        *,
        expected_version: int | None = None,
        tags: Sequence[str] | None = None,
        tier: StorageTier | None = None,
        content_type: str | None = None,
        retention: timedelta | None = None,
    ) -> BlobHandle:
        """Replace the payload of an existing blob."""

        record = self._records.get(blob_id)
        if record is None:
            raise KeyError(f"Blob '{blob_id}' does not exist")
        if expected_version is not None and record.metadata.version != expected_version:
            raise ValueError("Version mismatch during update")

        payload = _coerce_bytes(data)
        now = self._clock()
        expires_at = self._compute_expiry(now, retention)
        metadata = replace(
            record.metadata,
            checksum=_checksum(payload),
            size=len(payload),
            updated_at=now,
            tier=tier or record.metadata.tier,
            version=record.metadata.version + 1,
            tags=_normalise_tags(tags) if tags is not None else record.metadata.tags,
            content_type=content_type if content_type is not None else record.metadata.content_type,
            expires_at=expires_at if retention is not None else record.metadata.expires_at,
        )
        record.data = payload
        record.metadata = metadata
        return self._handle_from_metadata(metadata)

    def promote(self, blob_id: str, *, tier: StorageTier) -> BlobHandle:
        """Promote a blob to a new tier without changing its contents."""

        record = self._records.get(blob_id)
        if record is None:
            raise KeyError(f"Blob '{blob_id}' does not exist")
        if record.metadata.tier == tier:
            return self._handle_from_metadata(record.metadata)
        metadata = replace(record.metadata, tier=tier, updated_at=self._clock())
        record.metadata = metadata
        return self._handle_from_metadata(metadata)

    def delete(self, blob_id: str) -> None:
        """Remove a blob permanently."""

        if blob_id in self._records:
            del self._records[blob_id]

    def prune_expired(self) -> list[str]:
        """Delete expired blobs and return their identifiers."""

        now = self._clock()
        removed: list[str] = []
        for blob_id, record in list(self._records.items()):
            expiry = record.metadata.expires_at
            if expiry is not None and expiry <= now:
                del self._records[blob_id]
                removed.append(blob_id)
        return removed

    # ------------------------------------------------------------------
    # read operations

    def fetch(self, blob_id: str) -> bytes:
        """Return the raw payload for the given blob."""

        record = self._records.get(blob_id)
        if record is None:
            raise KeyError(f"Blob '{blob_id}' does not exist")
        record.metadata = replace(
            record.metadata,
            access_count=record.metadata.access_count + 1,
            updated_at=self._clock(),
        )
        return bytes(record.data)

    def open_stream(self, blob_id: str) -> BytesIO:
        """Create a BytesIO stream for the blob."""

        return BytesIO(self.fetch(blob_id))

    def metadata(self, blob_id: str) -> BlobMetadata:
        """Return a copy of the blob metadata."""

        record = self._records.get(blob_id)
        if record is None:
            raise KeyError(f"Blob '{blob_id}' does not exist")
        return replace(record.metadata)

    def list_blob_handles(self) -> list[BlobHandle]:
        """Return handles for all stored blobs."""

        return [self._handle_from_metadata(record.metadata) for record in self._records.values()]

    def find_by_tag(self, tag: str) -> list[BlobHandle]:
        """Return handles for blobs containing the given tag."""

        cleaned = tag.strip().lower()
        if not cleaned:
            raise ValueError("tag must not be empty")
        return [
            self._handle_from_metadata(record.metadata)
            for record in self._records.values()
            if cleaned in record.metadata.tags
        ]

    def stats(self) -> StorageStats:
        """Return aggregate statistics for the storage."""

        total_blobs = len(self._records)
        total_bytes = sum(record.metadata.size for record in self._records.values())
        average_size = float(total_bytes) / total_blobs if total_blobs else 0.0
        tier_distribution: dict[StorageTier, int] = {tier: 0 for tier in StorageTier}
        expires_within_7 = 0
        threshold = self._clock() + timedelta(days=7)
        for record in self._records.values():
            tier_distribution[record.metadata.tier] += 1
            expiry = record.metadata.expires_at
            if expiry is not None and expiry <= threshold:
                expires_within_7 += 1
        return StorageStats(
            total_blobs=total_blobs,
            total_bytes=total_bytes,
            average_size=average_size,
            tier_distribution=tier_distribution,
            expires_within_7_days=expires_within_7,
        )

    # ------------------------------------------------------------------
    # helpers

    def _handle_from_metadata(self, metadata: BlobMetadata) -> BlobHandle:
        return BlobHandle(
            blob_id=metadata.blob_id,
            version=metadata.version,
            checksum=metadata.checksum,
            size=metadata.size,
            tier=metadata.tier,
            expires_at=metadata.expires_at,
        )

    def _compute_expiry(self, now: datetime, retention: timedelta | None) -> datetime | None:
        effective_retention = retention if retention is not None else self._default_retention
        if effective_retention is None:
            return None
        return now + effective_retention
