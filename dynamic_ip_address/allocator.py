"""Dynamic IP address pool management primitives."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from ipaddress import (
    IPv4Address,
    IPv4Network,
    IPv6Address,
    IPv6Network,
    ip_address,
    ip_network,
)
from typing import Deque, Dict, Iterator, Mapping, MutableMapping, Sequence

__all__ = [
    "DynamicIPAddressPool",
    "IPAddressPoolError",
    "IPAddressPoolExhaustedError",
    "LeaseNotFoundError",
    "LeaseSnapshot",
]

IPAddress = IPv4Address | IPv6Address
IPNetwork = IPv4Network | IPv6Network


class IPAddressPoolError(RuntimeError):
    """Base error for IP address pool failures."""


class IPAddressPoolExhaustedError(IPAddressPoolError):
    """Raised when the pool has no remaining free addresses."""


class LeaseNotFoundError(IPAddressPoolError):
    """Raised when a requested lease cannot be located."""


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_client_id(value: str) -> str:
    client_id = str(value).strip()
    if not client_id:
        raise IPAddressPoolError("client identifier must not be empty")
    return client_id


def _ensure_mapping(metadata: Mapping[str, object] | None) -> MutableMapping[str, object]:
    if metadata is None:
        return {}
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive
        raise IPAddressPoolError("metadata must be a mapping")
    return dict(metadata)


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    cleaned: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        item = str(tag).strip().lower()
        if item and item not in seen:
            cleaned.append(item)
            seen.add(item)
    return tuple(cleaned)


def _coerce_positive_seconds(value: float | int | None) -> float | None:
    if value is None:
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise IPAddressPoolError("ttl must be numeric") from exc
    if numeric <= 0:
        raise IPAddressPoolError("ttl must be positive")
    return numeric


def _coerce_ip(value: str | IPAddress) -> IPAddress:
    if isinstance(value, (IPv4Address, IPv6Address)):
        return value
    try:
        return ip_address(str(value).strip())
    except ValueError as exc:  # pragma: no cover - defensive
        raise IPAddressPoolError("invalid IP address") from exc


def _parse_networks(subnets: Sequence[str | IPNetwork]) -> tuple[IPNetwork, ...]:
    if not subnets:
        raise IPAddressPoolError("at least one subnet must be provided")
    parsed: list[IPNetwork] = []
    seen: set[str] = set()
    for subnet in subnets:
        network = ip_network(subnet, strict=False) if not isinstance(subnet, (IPv4Network, IPv6Network)) else subnet
        key = str(network)
        if key not in seen:
            seen.add(key)
            parsed.append(network)
    return tuple(parsed)


# ---------------------------------------------------------------------------
# data structures


@dataclass(slots=True)
class Lease:
    """Mutable lease representation inside the pool."""

    address: IPAddress
    client_id: str
    allocated_at: datetime = field(default_factory=_utcnow)
    expires_at: datetime | None = None
    metadata: MutableMapping[str, object] = field(default_factory=dict)
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.client_id = _normalise_client_id(self.client_id)
        if self.allocated_at.tzinfo is None:
            self.allocated_at = self.allocated_at.replace(tzinfo=timezone.utc)
        else:
            self.allocated_at = self.allocated_at.astimezone(timezone.utc)
        if self.expires_at is not None:
            if self.expires_at.tzinfo is None:
                self.expires_at = self.expires_at.replace(tzinfo=timezone.utc)
            else:
                self.expires_at = self.expires_at.astimezone(timezone.utc)
        self.metadata = _ensure_mapping(self.metadata)
        self.tags = _normalise_tags(self.tags)

    # ------------------------------------------------------------------ helpers
    def is_expired(self, *, now: datetime | None = None) -> bool:
        if self.expires_at is None:
            return False
        now = now or _utcnow()
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        else:
            now = now.astimezone(timezone.utc)
        return now >= self.expires_at

    def remaining_ttl(self, *, now: datetime | None = None) -> float | None:
        if self.expires_at is None:
            return None
        now = now or _utcnow()
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        else:
            now = now.astimezone(timezone.utc)
        delta = self.expires_at - now
        return max(delta.total_seconds(), 0.0)

    def renew(self, ttl_seconds: float | int | None, *, now: datetime | None = None) -> None:
        ttl = _coerce_positive_seconds(ttl_seconds)
        if ttl is None:
            self.expires_at = None
            return
        now = now or _utcnow()
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        else:
            now = now.astimezone(timezone.utc)
        self.expires_at = now + timedelta(seconds=ttl)

    def snapshot(self, *, now: datetime | None = None) -> "LeaseSnapshot":
        return LeaseSnapshot(
            address=self.address,
            client_id=self.client_id,
            allocated_at=self.allocated_at,
            expires_at=self.expires_at,
            metadata=dict(self.metadata),
            tags=self.tags,
            remaining_ttl=self.remaining_ttl(now=now),
        )


@dataclass(slots=True, frozen=True)
class LeaseSnapshot:
    """Read-only view of a lease."""

    address: IPAddress
    client_id: str
    allocated_at: datetime
    expires_at: datetime | None
    metadata: Mapping[str, object]
    tags: tuple[str, ...]
    remaining_ttl: float | None


# ---------------------------------------------------------------------------
# main pool implementation


class DynamicIPAddressPool:
    """Allocate, track, and recycle IP addresses across subnets."""

    def __init__(
        self,
        subnets: Sequence[str | IPNetwork],
        *,
        lease_duration: float | int | None = None,
        max_leases_per_client: int | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> None:
        self._networks: tuple[IPNetwork, ...] = _parse_networks(subnets)
        self._default_ttl = _coerce_positive_seconds(lease_duration)
        if max_leases_per_client is not None:
            max_leases = int(max_leases_per_client)
            if max_leases <= 0:
                raise IPAddressPoolError("max_leases_per_client must be positive")
            self._max_leases_per_client = max_leases
        else:
            self._max_leases_per_client = None
        self._base_metadata = _ensure_mapping(metadata)

        self._capacity: set[IPAddress] = set()
        self._available: Deque[IPAddress] = deque()
        self._available_set: set[IPAddress] = set()
        for network in self._networks:
            for address in network.hosts():
                if address not in self._capacity:
                    self._capacity.add(address)
                    self._available.append(address)
                    self._available_set.add(address)

        if not self._capacity:
            raise IPAddressPoolError("provided subnets contain no assignable hosts")

        self._leases: Dict[IPAddress, Lease] = {}

    # ------------------------------------------------------------------ private
    def _resolve_ttl(self, ttl: float | int | None) -> float | None:
        if ttl is None:
            return self._default_ttl
        return _coerce_positive_seconds(ttl)

    def _prune_expired(self, *, now: datetime | None = None) -> None:
        now = now or _utcnow()
        expired: list[IPAddress] = []
        for address, lease in list(self._leases.items()):
            if lease.is_expired(now=now):
                expired.append(address)
        for address in expired:
            self._leases.pop(address, None)
            if address not in self._available_set:
                self._available.append(address)
                self._available_set.add(address)

    def _remove_from_available(self, address: IPAddress) -> None:
        if address in self._available_set:
            self._available_set.remove(address)
            try:
                self._available.remove(address)
            except ValueError:  # pragma: no cover - should not happen
                pass

    def _assert_within_capacity(self, address: IPAddress) -> None:
        if address not in self._capacity:
            raise IPAddressPoolError("address is outside of configured subnets")

    # ------------------------------------------------------------------ public
    @property
    def total_capacity(self) -> int:
        return len(self._capacity)

    @property
    def available(self) -> int:
        return len(self._available_set)

    @property
    def leased(self) -> int:
        return len(self._leases)

    def allocate(
        self,
        client_id: str,
        *,
        ttl: float | int | None = None,
        metadata: Mapping[str, object] | None = None,
        tags: Sequence[str] | None = None,
        now: datetime | None = None,
    ) -> LeaseSnapshot:
        now = now or _utcnow()
        client_id = _normalise_client_id(client_id)
        self._prune_expired(now=now)

        if self._max_leases_per_client is not None:
            active_for_client = sum(1 for lease in self._leases.values() if lease.client_id == client_id)
            if active_for_client >= self._max_leases_per_client:
                raise IPAddressPoolError("client has reached the maximum number of leases")

        if not self._available:
            raise IPAddressPoolExhaustedError("no IP addresses available for allocation")

        address = self._available.popleft()
        self._available_set.remove(address)

        ttl_value = self._resolve_ttl(ttl)
        expires_at = now + timedelta(seconds=ttl_value) if ttl_value is not None else None
        lease_metadata = dict(self._base_metadata)
        if metadata is not None:
            lease_metadata.update(_ensure_mapping(metadata))

        lease = Lease(
            address=address,
            client_id=client_id,
            allocated_at=now,
            expires_at=expires_at,
            metadata=lease_metadata,
            tags=_normalise_tags(tags),
        )
        self._leases[address] = lease
        return lease.snapshot(now=now)

    def reserve(
        self,
        address: str | IPAddress,
        client_id: str,
        *,
        ttl: float | int | None = None,
        metadata: Mapping[str, object] | None = None,
        tags: Sequence[str] | None = None,
        now: datetime | None = None,
    ) -> LeaseSnapshot:
        now = now or _utcnow()
        client_id = _normalise_client_id(client_id)
        ip_obj = _coerce_ip(address)
        self._assert_within_capacity(ip_obj)
        self._prune_expired(now=now)

        if ip_obj in self._leases:
            raise IPAddressPoolError("address is already leased")

        if self._max_leases_per_client is not None:
            active_for_client = sum(1 for lease in self._leases.values() if lease.client_id == client_id)
            if active_for_client >= self._max_leases_per_client:
                raise IPAddressPoolError("client has reached the maximum number of leases")

        self._remove_from_available(ip_obj)

        ttl_value = self._resolve_ttl(ttl)
        expires_at = now + timedelta(seconds=ttl_value) if ttl_value is not None else None
        lease_metadata = dict(self._base_metadata)
        if metadata is not None:
            lease_metadata.update(_ensure_mapping(metadata))

        lease = Lease(
            address=ip_obj,
            client_id=client_id,
            allocated_at=now,
            expires_at=expires_at,
            metadata=lease_metadata,
            tags=_normalise_tags(tags),
        )
        self._leases[ip_obj] = lease
        return lease.snapshot(now=now)

    def release(self, address: str | IPAddress) -> None:
        ip_obj = _coerce_ip(address)
        lease = self._leases.pop(ip_obj, None)
        if lease is None:
            raise LeaseNotFoundError("no lease found for the provided address")
        if ip_obj not in self._available_set:
            self._available.appendleft(ip_obj)
            self._available_set.add(ip_obj)

    def renew(self, address: str | IPAddress, *, ttl: float | int | None = None, now: datetime | None = None) -> LeaseSnapshot:
        ip_obj = _coerce_ip(address)
        lease = self._leases.get(ip_obj)
        if lease is None:
            raise LeaseNotFoundError("no lease found for the provided address")
        now = now or _utcnow()
        ttl_value = self._resolve_ttl(ttl)
        if ttl_value is None:
            lease.renew(None, now=now)
        else:
            lease.renew(ttl_value, now=now)
        return lease.snapshot(now=now)

    def get(self, address: str | IPAddress, *, now: datetime | None = None) -> LeaseSnapshot:
        ip_obj = _coerce_ip(address)
        lease = self._leases.get(ip_obj)
        if lease is None:
            raise LeaseNotFoundError("no lease found for the provided address")
        return lease.snapshot(now=now)

    def prune(self, *, now: datetime | None = None) -> int:
        before = len(self._leases)
        self._prune_expired(now=now)
        return before - len(self._leases)

    def iter_leases(self, *, now: datetime | None = None) -> Iterator[LeaseSnapshot]:
        self._prune_expired(now=now)
        for lease in self._leases.values():
            yield lease.snapshot(now=now)

    def has_available(self) -> bool:
        self._prune_expired()
        return bool(self._available)

    def __contains__(self, address: object) -> bool:  # pragma: no cover - convenience
        try:
            ip_obj = _coerce_ip(address)  # type: ignore[arg-type]
        except IPAddressPoolError:
            return False
        return ip_obj in self._leases

    def __len__(self) -> int:
        return len(self._leases)
