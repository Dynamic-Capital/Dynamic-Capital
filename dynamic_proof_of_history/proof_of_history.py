"""Time-anchored attestations for Dynamic Proof of History."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
import json
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "DynamicProofOfHistory",
    "HistoricalEvent",
    "HistoryProof",
    "HistorySlice",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_utc(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_identifier(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("identifier must not be empty")
    return cleaned


def _normalise_hash(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("hash must not be empty")
    return cleaned


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _normalise_payload(payload: Mapping[str, object] | Sequence[tuple[str, object]] | None) -> Mapping[str, object]:
    if payload is None:
        return {}
    if isinstance(payload, Mapping):
        return dict(payload)
    normalised: dict[str, object] = {}
    for key, value in payload:
        key_normalised = _normalise_identifier(str(key))
        normalised[key_normalised] = value
    return normalised


def _serialise_timestamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _hash_payload(payload: Mapping[str, object]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return sha256(encoded).hexdigest()


def _coerce_event(value: HistoricalEvent | Mapping[str, object]) -> HistoricalEvent:
    if isinstance(value, HistoricalEvent):
        return value
    if not isinstance(value, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("event must be a HistoricalEvent or mapping")
    return HistoricalEvent(**value)


@dataclass(slots=True)
class HistoricalEvent:
    """A single chronological commitment in the history ledger."""

    event_id: str
    payload: Mapping[str, object]
    timestamp: datetime = field(default_factory=_utcnow)
    previous_hash: str = ""
    metadata: Mapping[str, object] | None = None
    hash: str = field(init=False)

    def __post_init__(self) -> None:
        self.event_id = _normalise_identifier(self.event_id)
        self.payload = _normalise_payload(self.payload)
        self.timestamp = _ensure_utc(self.timestamp)
        self.previous_hash = _normalise_hash(self.previous_hash) if self.previous_hash else "0" * 64
        self.metadata = _coerce_metadata(self.metadata)
        payload_hash = _hash_payload(self.payload)
        encoded = "|".join(
            (
                self.event_id,
                payload_hash,
                self.previous_hash,
                _serialise_timestamp(self.timestamp),
            )
        )
        if self.metadata:
            metadata_hash = _hash_payload(self.metadata)
            encoded = f"{encoded}|{metadata_hash}"
        self.hash = sha256(encoded.encode("utf-8")).hexdigest()

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "event_id": self.event_id,
            "payload": dict(self.payload),
            "timestamp": _serialise_timestamp(self.timestamp),
            "previous_hash": self.previous_hash,
            "hash": self.hash,
            "metadata": dict(self.metadata) if self.metadata is not None else None,
        }


@dataclass(slots=True)
class HistorySlice:
    """A contiguous subset of events summarised for auditing."""

    start_event: str
    end_event: str
    event_count: int
    start_at: datetime
    end_at: datetime
    digests: tuple[tuple[str, str], ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "start_event": self.start_event,
            "end_event": self.end_event,
            "event_count": self.event_count,
            "start_at": _serialise_timestamp(self.start_at),
            "end_at": _serialise_timestamp(self.end_at),
            "digests": self.digests,
        }


@dataclass(slots=True)
class HistoryProof:
    """Digest that attests to the integrity of the full history chain."""

    root_hash: str
    event_count: int
    start_event: str
    end_event: str
    start_at: datetime
    end_at: datetime
    digests: tuple[tuple[str, str, str], ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "root_hash": self.root_hash,
            "event_count": self.event_count,
            "start_event": self.start_event,
            "end_event": self.end_event,
            "start_at": _serialise_timestamp(self.start_at),
            "end_at": _serialise_timestamp(self.end_at),
            "digests": self.digests,
        }


class DynamicProofOfHistory:
    """Maintains a deterministic sequence of hashed historical events."""

    def __init__(
        self,
        *,
        genesis_event: str = "GENESIS",
        payload: Mapping[str, object] | Sequence[tuple[str, object]] | None = None,
        metadata: Mapping[str, object] | None = None,
        timestamp: datetime | None = None,
    ) -> None:
        self._events: list[HistoricalEvent] = []
        self._index: dict[str, int] = {}
        self._append_genesis(genesis_event, payload=payload, metadata=metadata, timestamp=timestamp)

    def _append_genesis(
        self,
        event_id: str,
        *,
        payload: Mapping[str, object] | Sequence[tuple[str, object]] | None,
        metadata: Mapping[str, object] | None,
        timestamp: datetime | None,
    ) -> None:
        genesis = HistoricalEvent(
            event_id=event_id,
            payload=_normalise_payload(payload),
            timestamp=_ensure_utc(timestamp),
            previous_hash="0" * 64,
            metadata=_coerce_metadata(metadata),
        )
        self._events.append(genesis)
        self._index[genesis.event_id] = 0

    def events(self) -> tuple[HistoricalEvent, ...]:
        return tuple(self._events)

    def last_hash(self) -> str:
        return self._events[-1].hash

    def append(
        self,
        event_id: str,
        payload: Mapping[str, object] | Sequence[tuple[str, object]] | None = None,
        *,
        timestamp: datetime | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> HistoricalEvent:
        if event_id in self._index:
            raise ValueError(f"event '{event_id}' already exists")
        previous_hash = self._events[-1].hash
        event = HistoricalEvent(
            event_id=event_id,
            payload=_normalise_payload(payload),
            timestamp=_ensure_utc(timestamp),
            previous_hash=previous_hash,
            metadata=_coerce_metadata(metadata),
        )
        self._events.append(event)
        self._index[event.event_id] = len(self._events) - 1
        return event

    def extend(self, events: Iterable[Mapping[str, object] | HistoricalEvent]) -> None:
        for value in events:
            event = _coerce_event(value)
            self.append(
                event.event_id,
                payload=event.payload,
                timestamp=event.timestamp,
                metadata=event.metadata,
            )

    def slice(self, start: datetime, end: datetime) -> HistorySlice:
        start_at = _ensure_utc(start)
        end_at = _ensure_utc(end)
        if end_at < start_at:
            raise ValueError("end must not be earlier than start")
        subset = [
            event for event in self._events if start_at <= event.timestamp <= end_at
        ]
        if not subset:
            raise ValueError("no events within the specified window")
        digests = tuple((event.event_id, event.hash) for event in subset)
        return HistorySlice(
            start_event=subset[0].event_id,
            end_event=subset[-1].event_id,
            event_count=len(subset),
            start_at=subset[0].timestamp,
            end_at=subset[-1].timestamp,
            digests=digests,
        )

    def generate_proof(self) -> HistoryProof:
        events = self._events
        digests = tuple(
            (event.event_id, event.hash, _serialise_timestamp(event.timestamp))
            for event in events
        )
        return HistoryProof(
            root_hash=events[-1].hash,
            event_count=len(events),
            start_event=events[0].event_id,
            end_event=events[-1].event_id,
            start_at=events[0].timestamp,
            end_at=events[-1].timestamp,
            digests=digests,
        )

    def verify_chain(self) -> bool:
        for index, event in enumerate(self._events[1:], start=1):
            previous_hash = self._events[index - 1].hash
            if event.previous_hash != previous_hash:
                return False
            recalculated = HistoricalEvent(
                event_id=event.event_id,
                payload=event.payload,
                timestamp=event.timestamp,
                previous_hash=event.previous_hash,
                metadata=event.metadata,
            )
            if recalculated.hash != event.hash:
                return False
        return True

    def verify_proof(self, proof: HistoryProof) -> bool:
        local_proof = self.generate_proof()
        return (
            proof.root_hash == local_proof.root_hash
            and proof.event_count == local_proof.event_count
            and proof.start_event == local_proof.start_event
            and proof.end_event == local_proof.end_event
            and proof.start_at == local_proof.start_at
            and proof.end_at == local_proof.end_at
            and proof.digests == local_proof.digests
        )
