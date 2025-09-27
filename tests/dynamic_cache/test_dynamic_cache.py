from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from dynamic_cache import DynamicCache


class ManualClock:
    def __init__(self) -> None:
        self._now = datetime(2024, 1, 1, tzinfo=timezone.utc)

    def advance(self, seconds: float) -> None:
        self._now += timedelta(seconds=seconds)

    def now(self) -> datetime:
        return self._now


@pytest.fixture()
def manual_clock() -> ManualClock:
    return ManualClock()


def test_set_and_get_records_hits(manual_clock: ManualClock) -> None:
    cache = DynamicCache(default_ttl=None, time_provider=manual_clock.now)
    cache.set("alpha", 42)

    assert cache.get("alpha") == 42
    assert cache.get("beta") is None

    metrics = cache.metrics
    assert metrics.hits == 1
    assert metrics.misses == 1
    assert metrics.insertions == 1
    assert metrics.updates == 0


def test_expiration_and_sweep(manual_clock: ManualClock) -> None:
    cache = DynamicCache(default_ttl=5, time_provider=manual_clock.now)
    cache.set("temp", "value")
    manual_clock.advance(10)

    assert cache.get("temp") is None
    metrics = cache.metrics
    assert metrics.expirations == 1
    assert metrics.evictions == 1
    assert metrics.misses == 1

    cache.set("temp", "value")
    manual_clock.advance(6)
    assert cache.sweep() == 1
    assert cache.metrics.sweeps == 1


def test_eviction_prefers_low_priority(manual_clock: ManualClock) -> None:
    cache = DynamicCache(max_items=2, default_ttl=None, time_provider=manual_clock.now)
    cache.set("alpha", 1, priority=0.2)
    cache.set("bravo", 2, priority=0.9)
    cache.set("charlie", 3, priority=0.5)

    assert "alpha" not in cache
    assert cache.get("bravo") == 2
    assert cache.get("charlie") == 3


def test_touch_extends_ttl(manual_clock: ManualClock) -> None:
    cache = DynamicCache(default_ttl=5, time_provider=manual_clock.now)
    cache.set("session", "value")
    manual_clock.advance(4)

    assert cache.touch("session") is not None
    manual_clock.advance(4)
    assert cache.get("session") == "value"


def test_prune_by_tags(manual_clock: ManualClock) -> None:
    cache = DynamicCache(default_ttl=None, time_provider=manual_clock.now)
    cache.set("alpha", 1, tags=["report", "daily"])
    cache.set("beta", 2, tags=["report", "weekly"])
    cache.set("gamma", 3, tags=["transient"])

    removed = cache.prune(tags=["report"])
    assert removed == 2
    assert len(cache) == 1
    assert cache.get("gamma") == 3
