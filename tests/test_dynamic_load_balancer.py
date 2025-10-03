"""Tests for the dynamic load balancer helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest

from dynamic_load_balancer import DynamicLoadBalancer, LoadBalancerError


def _ts(minutes: int = 0, seconds: int = 0) -> datetime:
    base = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
    return base + timedelta(minutes=minutes, seconds=seconds)


def test_load_balancer_normalises_configuration() -> None:
    balancer = DynamicLoadBalancer(
        [
            {
                "identifier": "  edge-a  ",
                "endpoint": " https://edge-a.example.com ",
                "weight": "2.5",
                "max_concurrency": "2",
                "metadata": {"region": "eu-west-1"},
            }
        ],
        decay=0.4,
    )

    snapshot = balancer.get_snapshot("edge-a")

    assert snapshot.identifier == "edge-a"
    assert snapshot.endpoint == "https://edge-a.example.com"
    assert snapshot.weight == pytest.approx(2.5)
    assert snapshot.max_concurrency == 2
    assert snapshot.metadata == {"region": "eu-west-1"}
    assert snapshot.healthy is True


def test_load_balancer_prioritises_health_and_weight() -> None:
    balancer = DynamicLoadBalancer(
        [
            {"identifier": "edge-a", "weight": 1.2},
            {
                "identifier": "edge-b",
                "weight": 2.0,
                "error_threshold": 0.4,
                "recovery_threshold": 0.75,
            },
            {"identifier": "edge-c", "weight": 1.5},
        ],
        decay=0.5,
    )

    # Warm up the nodes with an initial success observation.
    for identifier in ("edge-a", "edge-b", "edge-c"):
        balancer.record_result(identifier, success=True, latency_ms=120)

    # Degrade edge-b with failures until it is considered unhealthy.
    for _ in range(5):
        balancer.record_result("edge-b", success=False, latency_ms=450, now=_ts())

    # edge-c remains healthy but is slower.
    for _ in range(3):
        balancer.record_result("edge-c", success=True, latency_ms=800)

    assignment = balancer.acquire(now=_ts())
    assert assignment.identifier == "edge-a"

    balancer.record_result(assignment.identifier, success=True, latency_ms=90)

    # Recover edge-b with a streak of successful requests.
    for _ in range(4):
        balancer.record_result("edge-b", success=True, latency_ms=120)

    assignment = balancer.acquire(now=_ts(minutes=5))
    assert assignment.identifier == "edge-b"


def test_load_balancer_enforces_concurrency_and_cooldown() -> None:
    balancer = DynamicLoadBalancer(
        [
            {
                "identifier": "edge-a",
                "weight": 1.0,
                "max_concurrency": 1,
                "cooldown_seconds": 30,
                "warmup_requests": 1,
                "recovery_threshold": 0.5,
            },
            {
                "identifier": "edge-b",
                "weight": 1.0,
                "max_concurrency": 2,
                "cooldown_seconds": 10,
            },
        ],
        decay=0.5,
    )

    first = balancer.acquire(now=_ts())
    second = balancer.acquire(now=_ts())

    assert {first.identifier, second.identifier} == {"edge-a", "edge-b"}

    balancer.record_result(first.identifier, success=False, latency_ms=500, now=_ts())
    balancer.record_result(second.identifier, success=True, latency_ms=100, now=_ts())

    # edge-a is unhealthy and within its cooldown window so only edge-b is available.
    assignment_b1 = balancer.acquire(now=_ts(seconds=5))
    assignment_b2 = balancer.acquire(now=_ts(seconds=5))

    assert assignment_b1.identifier == assignment_b2.identifier == "edge-b"

    with pytest.raises(LoadBalancerError):
        balancer.acquire(now=_ts(seconds=5))

    balancer.record_result(assignment_b1.identifier, success=True, latency_ms=110, now=_ts(seconds=6))
    balancer.record_result(assignment_b2.identifier, success=True, latency_ms=105, now=_ts(seconds=6))

    balancer.remove_target("edge-b")

    snapshot = balancer.get_snapshot("edge-a")
    assert snapshot.healthy is False

    with pytest.raises(LoadBalancerError):
        balancer.acquire(now=_ts(seconds=20), allow_unhealthy_fallback=False)

    recovery_time = _ts(seconds=40)
    assignment = balancer.acquire(now=recovery_time)
    assert assignment.identifier == "edge-a"

    balancer.record_result("edge-a", success=True, latency_ms=140, now=recovery_time)
    assert balancer.get_snapshot("edge-a").healthy is True


def test_load_balancer_enable_all_recovers_targets() -> None:
    balancer = DynamicLoadBalancer(
        [
            {"identifier": "edge-a", "weight": 1.0, "recovery_threshold": 0.6},
            {"identifier": "edge-b", "weight": 1.0, "recovery_threshold": 0.65},
        ],
        decay=0.4,
    )

    for index in range(4):
        balancer.record_result("edge-a", success=False, latency_ms=450, now=_ts(seconds=index))
        balancer.record_result("edge-b", success=False, latency_ms=520, now=_ts(seconds=index))

    assert balancer.get_snapshot("edge-a").healthy is False
    assert balancer.get_snapshot("edge-b").healthy is False

    snapshots = balancer.enable_all()

    assert all(snapshot.healthy for snapshot in snapshots)
    assert balancer.get_snapshot("edge-a").success_score >= 0.6
    assert balancer.get_snapshot("edge-b").success_score >= 0.65
