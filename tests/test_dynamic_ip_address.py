"""Tests for the dynamic IP address allocator."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_ip_address import (  # noqa: E402  pylint: disable=wrong-import-position
    DynamicIPAddressPool,
    IPAddressPoolError,
    IPAddressPoolExhaustedError,
    LeaseNotFoundError,
)


def _ts(minutes: int = 0, seconds: int = 0) -> datetime:
    base = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
    return base + timedelta(minutes=minutes, seconds=seconds)


def test_allocate_and_release_addresses() -> None:
    pool = DynamicIPAddressPool(["10.10.0.0/30"])

    lease_a = pool.allocate("client-a", now=_ts())
    lease_b = pool.allocate("client-b", now=_ts(seconds=1))

    assert str(lease_a.address) == "10.10.0.1"
    assert str(lease_b.address) == "10.10.0.2"
    assert pool.available == 0
    assert pool.leased == 2

    pool.release(lease_a.address)
    assert pool.available == 1
    assert pool.leased == 1

    lease_c = pool.allocate("client-c", now=_ts(minutes=1))
    assert str(lease_c.address) == "10.10.0.1"


def test_enforces_ttl_and_pruning() -> None:
    pool = DynamicIPAddressPool(["10.10.1.0/30"], lease_duration=30)

    lease = pool.allocate("client-a", now=_ts())
    assert lease.expires_at == _ts(seconds=30)

    pool.prune(now=_ts(seconds=29))
    assert pool.leased == 1

    released = pool.prune(now=_ts(seconds=31))
    assert released == 1
    assert pool.leased == 0
    assert pool.available == pool.total_capacity


def test_reserve_specific_address_and_metadata() -> None:
    pool = DynamicIPAddressPool(
        ["2001:db8::/126"],
        lease_duration=None,
        metadata={"region": "edge"},
    )

    lease = pool.reserve("2001:db8::1", "client-ipv6", metadata={"role": "ingress"}, tags=["Primary", "Ingress"])

    assert str(lease.address) == "2001:db8::1"
    assert lease.metadata == {"region": "edge", "role": "ingress"}
    assert lease.tags == ("primary", "ingress")
    assert lease.remaining_ttl is None

    with pytest.raises(IPAddressPoolError):
        pool.reserve("2001:db8::1", "client-b")


def test_max_leases_per_client_and_renewal() -> None:
    pool = DynamicIPAddressPool(["10.20.0.0/29"], lease_duration=10, max_leases_per_client=1)

    lease = pool.allocate("client-a", now=_ts())

    with pytest.raises(IPAddressPoolError):
        pool.allocate("client-a", now=_ts(seconds=1))

    renewed = pool.renew(lease.address, ttl=25, now=_ts(seconds=5))
    assert renewed.expires_at == _ts(seconds=30)
    assert renewed.remaining_ttl == pytest.approx(25.0)

    with pytest.raises(LeaseNotFoundError):
        pool.renew("10.20.0.99", ttl=10)

    pool.release(lease.address)
    with pytest.raises(LeaseNotFoundError):
        pool.release(lease.address)


def test_exhaustion_and_iteration() -> None:
    pool = DynamicIPAddressPool(["10.30.0.0/32"], lease_duration=None)

    lease = pool.allocate("client-a", now=_ts())
    assert pool.available == 0

    with pytest.raises(IPAddressPoolExhaustedError):
        pool.allocate("client-b")

    leases = list(pool.iter_leases(now=_ts(seconds=5)))
    assert len(leases) == 1
    assert leases[0].client_id == "client-a"

    pool.release(lease.address)
    assert pool.has_available() is True
