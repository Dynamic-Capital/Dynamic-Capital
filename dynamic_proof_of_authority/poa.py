"""Dynamic Proof of Authority (PoA) consensus primitives."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Iterable, Mapping, MutableMapping, Sequence
import hmac
import json

__all__ = [
    "Authority",
    "AuthorityBlock",
    "DynamicProofOfAuthority",
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


def _normalise_secret(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("secret must not be empty")
    return cleaned


def _coerce_weight(value: int) -> int:
    try:
        weight = int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("weight must be an integer") from exc
    if weight < 1:
        raise ValueError("weight must be at least 1")
    return weight


def _coerce_slot(value: int) -> int:
    try:
        slot = int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("slot must be an integer") from exc
    if slot < 0:
        raise ValueError("slot must be non-negative")
    return slot


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("value must be a mapping")
    return dict(mapping)


def _serialise_datetime(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _hash_payload(payload: Mapping[str, object]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return sha256(encoded).hexdigest()


def _coerce_slot_duration(seconds: float | int) -> timedelta:
    try:
        value = float(seconds)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("slot duration must be numeric") from exc
    if value <= 0:
        raise ValueError("slot duration must be positive")
    return timedelta(seconds=value)


def _normalise_authority(value: Authority | Mapping[str, object]) -> Authority:
    if isinstance(value, Authority):
        return value
    if not isinstance(value, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("authority must be an Authority or mapping")
    return Authority(**value)


def _coerce_payload(payload: Mapping[str, object] | None) -> Mapping[str, object]:
    if payload is None:
        return {}
    if not isinstance(payload, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("payload must be a mapping")
    return dict(payload)


def _clone_authority(authority: Authority) -> Authority:
    return Authority(
        identifier=authority.identifier,
        secret=authority.secret,
        weight=authority.weight,
        active=authority.active,
        metadata=authority.metadata,
    )


@dataclass(slots=True)
class Authority:
    """Represents a validator allowed to propose blocks."""

    identifier: str
    secret: str
    weight: int = 1
    active: bool = True
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.secret = _normalise_secret(self.secret)
        self.weight = _coerce_weight(self.weight)
        self.active = bool(self.active)
        self.metadata = _coerce_mapping(self.metadata)

    def sign(self, message: str) -> str:
        key = self.secret.encode("utf-8")
        return hmac.new(key, message.encode("utf-8"), sha256).hexdigest()

    def snapshot(self) -> Mapping[str, object]:
        return {
            "identifier": self.identifier,
            "weight": self.weight,
            "active": self.active,
            "metadata": self.metadata,
        }


@dataclass(slots=True)
class AuthorityBlock:
    """A block produced by an authority for a specific slot."""

    slot: int
    proposer: str
    timestamp: datetime
    payload: Mapping[str, object]
    parent_hash: str
    signature: str | None = None
    metadata: Mapping[str, object] | None = None

    _hash: str = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.slot = _coerce_slot(self.slot)
        self.proposer = _normalise_identifier(self.proposer)
        self.timestamp = _ensure_utc(self.timestamp)
        self.payload = _coerce_payload(self.payload)
        self.parent_hash = _normalise_identifier(self.parent_hash)
        self.metadata = _coerce_mapping(self.metadata)
        self._hash = self.compute_hash()

    @property
    def hash(self) -> str:
        return self._hash

    def base_payload(self) -> Mapping[str, object]:
        return {
            "slot": self.slot,
            "proposer": self.proposer,
            "timestamp": _serialise_datetime(self.timestamp),
            "payload": self.payload,
            "parent_hash": self.parent_hash,
            "metadata": self.metadata,
        }

    def compute_hash(self) -> str:
        return _hash_payload(self.base_payload())

    def refresh_hash(self) -> str:
        self._hash = self.compute_hash()
        return self._hash

    def signing_message(self) -> str:
        return self.hash

    def to_payload(self) -> Mapping[str, object]:
        return {
            "slot": self.slot,
            "proposer": self.proposer,
            "timestamp": _serialise_datetime(self.timestamp),
            "payload": self.payload,
            "parent_hash": self.parent_hash,
            "hash": self.hash,
            "signature": self.signature,
            "metadata": self.metadata,
        }

    @classmethod
    def genesis(
        cls,
        *,
        timestamp: datetime,
        payload: Mapping[str, object] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> "AuthorityBlock":
        block = cls(
            slot=0,
            proposer="__genesis__",
            timestamp=timestamp,
            payload=_coerce_payload(payload),
            parent_hash="0" * 64,
            signature=None,
            metadata=metadata,
        )
        return block


class DynamicProofOfAuthority:
    """Coordinates authorities and validates PoA blocks."""

    def __init__(
        self,
        *,
        slot_duration_seconds: float = 5.0,
        genesis_payload: Mapping[str, object] | None = None,
        genesis_metadata: Mapping[str, object] | None = None,
        genesis_time: datetime | None = None,
        authorities: Sequence[Authority | Mapping[str, object]] | None = None,
    ) -> None:
        self.slot_duration = _coerce_slot_duration(slot_duration_seconds)
        self.genesis_time = _ensure_utc(genesis_time)
        self._authorities: MutableMapping[str, Authority] = {}
        self._authority_history: list[tuple[int, tuple[Authority, ...]]] = []
        self._chain: list[AuthorityBlock] = [
            AuthorityBlock.genesis(
                timestamp=self.genesis_time,
                payload=genesis_payload,
                metadata=genesis_metadata,
            )
        ]
        if authorities:
            for authority in authorities:
                normalised = _normalise_authority(authority)
                self.register_authority(
                    identifier=normalised.identifier,
                    secret=normalised.secret,
                    weight=normalised.weight,
                    active=normalised.active,
                    metadata=normalised.metadata,
                    overwrite=True,
                )
        # Ensure an initial snapshot is recorded for slots after genesis.
        self._record_authority_state(start_slot=1)

    @property
    def chain(self) -> tuple[AuthorityBlock, ...]:
        return tuple(self._chain)

    @property
    def last_block(self) -> AuthorityBlock:
        return self._chain[-1]

    @property
    def height(self) -> int:
        return len(self._chain)

    @property
    def authorities(self) -> tuple[Authority, ...]:
        return tuple(self._authorities.values())

    def register_authority(
        self,
        *,
        identifier: str,
        secret: str,
        weight: int = 1,
        active: bool = True,
        metadata: Mapping[str, object] | None = None,
        overwrite: bool = False,
    ) -> Authority:
        authority = Authority(
            identifier=identifier,
            secret=secret,
            weight=weight,
            active=active,
            metadata=metadata,
        )
        if not overwrite and authority.identifier in self._authorities:
            raise ValueError(f"authority '{authority.identifier}' already registered")
        self._authorities[authority.identifier] = authority
        self._record_authority_state()
        return authority

    def deregister_authority(self, identifier: str) -> Authority:
        identifier = _normalise_identifier(identifier)
        try:
            removed = self._authorities.pop(identifier)
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise KeyError(f"authority '{identifier}' not registered") from exc
        self._record_authority_state()
        return removed

    def update_authority(
        self,
        identifier: str,
        *,
        secret: str | None = None,
        weight: int | None = None,
        active: bool | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> Authority:
        identifier = _normalise_identifier(identifier)
        if identifier not in self._authorities:
            raise KeyError(f"authority '{identifier}' not registered")
        authority = self._authorities[identifier]
        if secret is not None:
            authority.secret = _normalise_secret(secret)
        if weight is not None:
            authority.weight = _coerce_weight(weight)
        if active is not None:
            authority.active = bool(active)
        if metadata is not None:
            authority.metadata = _coerce_mapping(metadata)
        self._record_authority_state()
        return authority

    def active_authorities(self) -> tuple[Authority, ...]:
        active = [
            authority
            for authority in sorted(self._authorities.values(), key=lambda item: item.identifier)
            if authority.active
        ]
        return tuple(active)

    def _record_authority_state(self, *, start_slot: int | None = None) -> None:
        start = start_slot if start_slot is not None else self.last_block.slot + 1
        snapshot = tuple(
            _clone_authority(authority)
            for authority in sorted(self._authorities.values(), key=lambda item: item.identifier)
        )
        # Remove any snapshot with the same start slot to avoid duplicates before appending.
        self._authority_history = [entry for entry in self._authority_history if entry[0] != start]
        self._authority_history.append((start, snapshot))
        self._authority_history.sort(key=lambda item: item[0])

    def _snapshot_for_slot(self, slot: int) -> tuple[Authority, ...]:
        slot = _coerce_slot(slot)
        applicable: tuple[Authority, ...] | None = None
        for start, snapshot in self._authority_history:
            if start <= slot:
                applicable = snapshot
            else:
                break
        if applicable is None:
            raise ValueError(f"no authority snapshot available for slot {slot}")
        return applicable

    def _authority_from_snapshot(self, slot: int, identifier: str) -> Authority:
        identifier = _normalise_identifier(identifier)
        snapshot = self._snapshot_for_slot(slot)
        for authority in snapshot:
            if authority.identifier == identifier:
                return authority
        raise KeyError(f"authority '{identifier}' not present in snapshot for slot {slot}")

    def authority_for_slot(self, slot: int) -> Authority:
        slot = _coerce_slot(slot)
        if slot == 0:
            raise ValueError("slot zero is reserved for the genesis block")
        snapshot = self._snapshot_for_slot(slot)
        active = [authority for authority in snapshot if authority.active]
        if not active:
            raise ValueError(f"no active authorities available for slot {slot}")
        total_weight = sum(authority.weight for authority in active)
        position = (slot - 1) % total_weight
        cumulative = 0
        for authority in active:
            cumulative += authority.weight
            if position < cumulative:
                return authority
        # The loop should always return within the loop; this is a safeguard.
        raise RuntimeError("failed to resolve authority for slot")

    def slot_for_timestamp(self, timestamp: datetime) -> int:
        timestamp = _ensure_utc(timestamp)
        delta = timestamp - self.genesis_time
        seconds = delta.total_seconds()
        if seconds < 0:
            raise ValueError("timestamp precedes genesis time")
        slot = int(seconds // self.slot_duration.total_seconds())
        return slot

    def slot_start_time(self, slot: int) -> datetime:
        slot = _coerce_slot(slot)
        return self.genesis_time + self.slot_duration * slot

    def expected_authority_at(self, timestamp: datetime) -> Authority:
        slot = self.slot_for_timestamp(timestamp)
        if slot == 0:
            raise ValueError("timestamp corresponds to the genesis slot")
        return self.authority_for_slot(slot)

    def _ensure_slot_gap(self, slot: int) -> None:
        if slot <= self.last_block.slot:
            raise ValueError("slot must be greater than the last block slot")

    def create_block(
        self,
        *,
        authority_id: str,
        payload: Mapping[str, object] | None = None,
        timestamp: datetime | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> AuthorityBlock:
        authority_id = _normalise_identifier(authority_id)
        if authority_id not in self._authorities:
            raise KeyError(f"authority '{authority_id}' not registered")
        authority = self._authorities[authority_id]
        if not authority.active:
            raise ValueError(f"authority '{authority_id}' is not active")
        timestamp = _ensure_utc(timestamp)
        slot = self.slot_for_timestamp(timestamp)
        if slot == 0:
            raise ValueError("cannot create a block for the genesis slot")
        self._ensure_slot_gap(slot)
        expected = self.authority_for_slot(slot)
        if expected.identifier != authority.identifier:
            raise ValueError(
                f"authority '{authority.identifier}' is not scheduled for slot {slot}; expected '{expected.identifier}'"
            )
        block = AuthorityBlock(
            slot=slot,
            proposer=authority.identifier,
            timestamp=timestamp,
            payload=_coerce_payload(payload),
            parent_hash=self.last_block.hash,
            metadata=metadata,
        )
        block.signature = authority.sign(block.signing_message())
        return block

    def verify_block(
        self,
        block: AuthorityBlock,
        *,
        previous_block: AuthorityBlock | None = None,
    ) -> bool:
        if block.slot == 0:
            return previous_block is None and block is self._chain[0]
        if block.hash != block.compute_hash():
            return False
        if previous_block is None:
            previous_block = self.last_block
        if block.slot <= previous_block.slot:
            return False
        if block.parent_hash != previous_block.hash:
            return False
        try:
            expected = self.authority_for_slot(block.slot)
        except ValueError:
            return False
        if block.proposer != expected.identifier:
            return False
        try:
            authority_snapshot = self._authority_from_snapshot(block.slot, block.proposer)
        except KeyError:
            return False
        if not authority_snapshot.active:
            return False
        try:
            expected_slot = self.slot_for_timestamp(block.timestamp)
        except ValueError:
            return False
        if expected_slot != block.slot:
            return False
        if not block.signature:
            return False
        expected_signature = authority_snapshot.sign(block.signing_message())
        if block.signature != expected_signature:
            return False
        return True

    def submit_block(self, block: AuthorityBlock) -> AuthorityBlock:
        if not self.verify_block(block):
            raise ValueError("block failed verification")
        self._ensure_slot_gap(block.slot)
        self._chain.append(block)
        return block

    def iter_blocks(self) -> Iterable[AuthorityBlock]:
        return iter(self._chain)

    def iter_authorities(self) -> Iterable[Authority]:
        return iter(self._authorities.values())

    def snapshot(self) -> Mapping[str, object]:
        return {
            "genesis_time": _serialise_datetime(self.genesis_time),
            "slot_duration_seconds": self.slot_duration.total_seconds(),
            "authorities": [authority.snapshot() for authority in self._authorities.values()],
            "authority_history": [
                {
                    "start_slot": start,
                    "authorities": [authority.snapshot() for authority in snapshot],
                }
                for start, snapshot in self._authority_history
            ],
            "chain": [block.to_payload() for block in self._chain],
        }

    def validate_chain(self) -> bool:
        for index, block in enumerate(self._chain):
            if index == 0:
                if block.slot != 0:
                    return False
                continue
            previous = self._chain[index - 1]
            if not self.verify_block(block, previous_block=previous):
                return False
        return True
