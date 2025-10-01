from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from algorithms.python.trading_psychology_elements import Element
from dynamic.trading.algo.dynamic_elements import DynamicElementAlgo


def _dt(minutes: int = 0) -> datetime:
    return datetime(2025, 3, 1, tzinfo=timezone.utc) + timedelta(minutes=minutes)
def test_snapshot_aggregates_contributions() -> None:
    algo = DynamicElementAlgo()

    algo.record("fire", 6.0, weight=1.0, source="desk-a", timestamp=_dt())
    algo.record(Element.FIRE, 8.0, weight=2.0, source="desk-b", timestamp=_dt(5))
    algo.record("earth", 5.5, weight=1.5, source="desk-a", timestamp=_dt(6))
    algo.record("light", 4.0, weight=0.5, timestamp=_dt(7))

    snapshot = algo.snapshot()

    assert snapshot.total_samples == 4
    assert snapshot.dominant_element == "fire"
    assert snapshot.dominant_score == pytest.approx(7.3333, rel=1e-3)
    assert snapshot.dominant_level == "critical"
    assert snapshot.readiness_index == pytest.approx(4.75, rel=1e-3)
    assert snapshot.caution_index == pytest.approx(7.3333, rel=1e-3)
    assert snapshot.recovery_index == 0.0
    assert snapshot.balance_index == pytest.approx(-2.5833, rel=1e-3)
    assert snapshot.dispersion > 0.0

    fire_summary = algo.summary(Element.FIRE)
    assert fire_summary.sample_count == 2
    assert fire_summary.average_score == pytest.approx(7.3333, rel=1e-3)
    assert fire_summary.momentum == pytest.approx(2.0, rel=1e-3)
    assert fire_summary.top_sources == ("desk-b", "desk-a")
    assert fire_summary.last_seen_at == _dt(5)

    state = algo.state()
    assert state["dominant_element"] == "fire"
    assert state["summaries"][0]["element"] == "fire"


def test_window_limits_history() -> None:
    algo = DynamicElementAlgo(window_size=2)

    algo.record("fire", 3.0, timestamp=_dt())
    algo.record("fire", 4.0, timestamp=_dt(1))
    algo.record("fire", 5.0, timestamp=_dt(2))

    summary = algo.summary("fire")

    assert summary.sample_count == 2
    assert summary.average_score == pytest.approx(4.5, rel=1e-3)


def test_time_window_prunes_entries() -> None:
    algo = DynamicElementAlgo(window_duration=timedelta(minutes=5))

    algo.record("earth", 6.0, timestamp=_dt())
    algo.record("earth", 7.0, timestamp=_dt(10))

    summary = algo.summary(Element.EARTH)
    assert summary.sample_count == 1
    assert summary.last_seen_at == _dt(10)
    assert summary.average_score == pytest.approx(7.0, rel=1e-3)


def test_clear_resets_history() -> None:
    algo = DynamicElementAlgo()

    algo.record("fire", 5.0, timestamp=_dt())
    algo.record("earth", 6.0, timestamp=_dt(1))

    algo.clear("fire")
    assert algo.summary("fire").sample_count == 0
    assert algo.summary("earth").sample_count == 1

    algo.clear()
    assert algo.snapshot().total_samples == 0
