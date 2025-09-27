"""Tests for the dynamic proxy pool."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest

from dynamic_proxy import DynamicProxyPool, ProxyNotAvailableError


def _ts(*, minutes: int = 0, seconds: int = 0) -> datetime:
    base = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
    return base + timedelta(minutes=minutes, seconds=seconds)


def test_proxy_pool_normalises_configuration() -> None:
    pool = DynamicProxyPool(
        [
            {
                "identifier": "  proxy-a  ",
                "url": " https://proxy-a.example.com ",
                "weight": "2.5",
                "max_sessions": "2",
                "metadata": {"region": "us-east-1"},
            }
        ],
        decay=0.5,
        default_latency=250.0,
        session_ttl=60.0,
    )

    snapshot = pool.get_snapshot("proxy-a")

    assert snapshot.identifier == "proxy-a"
    assert snapshot.url == "https://proxy-a.example.com"
    assert snapshot.weight == pytest.approx(2.5)
    assert snapshot.max_sessions == 2
    assert snapshot.metadata == {"region": "us-east-1"}
    assert snapshot.healthy is True


def test_proxy_pool_rotation_and_recovery() -> None:
    pool = DynamicProxyPool(
        [
            {"identifier": "proxy-a", "url": "https://a", "weight": 1.2},
            {
                "identifier": "proxy-b",
                "url": "https://b",
                "weight": 2.0,
                "failure_threshold": 0.4,
                "recovery_threshold": 0.75,
            },
            {"identifier": "proxy-c", "url": "https://c", "weight": 1.5},
        ],
        decay=0.5,
        session_ttl=45.0,
    )

    for identifier in ("proxy-a", "proxy-b", "proxy-c"):
        pool.record_result(identifier, success=True, latency_ms=180)

    for step in range(4):
        pool.record_result("proxy-b", success=False, latency_ms=1200, now=_ts(seconds=step * 5))

    lease = pool.acquire(now=_ts(minutes=1))
    assert lease.identifier != "proxy-b"

    pool.record_result(
        lease.identifier,
        success=True,
        latency_ms=160,
        now=_ts(minutes=1),
        session_id=lease.session_id,
    )

    for offset in range(5):
        pool.record_result(
            "proxy-b",
            success=True,
            latency_ms=180,
            now=_ts(minutes=2, seconds=offset * 5),
        )

    lease_b = pool.acquire(now=_ts(minutes=3))
    assert lease_b.identifier == "proxy-b"

    pool.record_result(
        lease_b.identifier,
        success=True,
        latency_ms=150,
        now=_ts(minutes=3),
        session_id=lease_b.session_id,
    )


def test_proxy_pool_enforces_sessions_and_sticky_clients() -> None:
    pool = DynamicProxyPool(
        [
            {
                "identifier": "proxy-a",
                "url": "https://a",
                "weight": 1.0,
                "max_sessions": 1,
                "cooldown_seconds": 30,
                "recovery_threshold": 0.6,
            },
            {
                "identifier": "proxy-b",
                "url": "https://b",
                "weight": 1.0,
                "max_sessions": 2,
                "cooldown_seconds": 10,
            },
        ],
        decay=0.6,
        session_ttl=20.0,
        sticky_ttl=90.0,
    )

    first = pool.acquire(now=_ts())
    second = pool.acquire(now=_ts())
    third = pool.acquire(now=_ts())

    assert {first.identifier, second.identifier} == {"proxy-a", "proxy-b"}
    assert third.identifier == "proxy-b"

    with pytest.raises(ProxyNotAvailableError):
        pool.acquire(now=_ts())

    pool.record_result(
        first.identifier,
        success=False,
        latency_ms=900,
        now=_ts(seconds=5),
        session_id=first.session_id,
    )
    pool.record_result(
        second.identifier,
        success=True,
        latency_ms=120,
        now=_ts(seconds=5),
        session_id=second.session_id,
    )
    pool.record_result(
        third.identifier,
        success=True,
        latency_ms=130,
        now=_ts(seconds=5),
        session_id=third.session_id,
    )

    lease_b = pool.acquire(now=_ts(seconds=6))
    assert lease_b.identifier == "proxy-b"

    pool.record_result(
        lease_b.identifier,
        success=True,
        latency_ms=110,
        now=_ts(seconds=6),
        session_id=lease_b.session_id,
    )

    sticky = pool.acquire(client_id="client-1", now=_ts(minutes=5))
    pool.record_result(
        sticky.identifier,
        success=True,
        latency_ms=150,
        now=_ts(minutes=5),
        session_id=sticky.session_id,
    )

    sticky_follow_up = pool.acquire(client_id="client-1", now=_ts(minutes=5, seconds=10))
    assert sticky_follow_up.identifier == sticky.identifier

    pool.record_result(
        sticky_follow_up.identifier,
        success=True,
        latency_ms=140,
        now=_ts(minutes=5, seconds=10),
        session_id=sticky_follow_up.session_id,
    )
