from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_memoryless_property import DynamicMemorylessPropertyEngine
from dynamic_property import DynamicPropertyEngine, PropertySnapshot


def _snapshot(
    *,
    days: int,
    valuation: float,
    rental_income: float,
    operating_expenses: float,
    occupancy: float,
    units: int = 10,
) -> PropertySnapshot:
    base = datetime(2024, 1, 1, tzinfo=timezone.utc)
    return PropertySnapshot(
        timestamp=base + timedelta(days=days),
        valuation=valuation,
        rental_income=rental_income,
        operating_expenses=operating_expenses,
        occupancy=occupancy,
        units=units,
    )


def test_property_engine_profile_computes_expected_metrics() -> None:
    engine = DynamicPropertyEngine(window=5)
    snapshots = [
        _snapshot(days=0, valuation=1_000_000, rental_income=100_000, operating_expenses=40_000, occupancy=0.90),
        _snapshot(days=7, valuation=1_050_000, rental_income=110_000, operating_expenses=45_000, occupancy=0.95),
        _snapshot(days=14, valuation=1_100_000, rental_income=120_000, operating_expenses=50_000, occupancy=0.80, units=12),
    ]
    profile = engine.observe_many(snapshots)

    assert profile.sample_size == 3
    assert profile.average_valuation == pytest.approx(1_050_000)
    assert profile.average_noi == pytest.approx(65_000)
    assert profile.average_noi_margin == pytest.approx((0.6 + 65_000 / 110_000 + 70_000 / 120_000) / 3)
    assert profile.occupancy_rate == pytest.approx((9 + 9.5 + 9.6) / (10 + 10 + 12))
    assert profile.valuation_trend == pytest.approx(0.1)
    assert 0.95 < profile.stability_score <= 1.0
    assert profile.last_updated == snapshots[-1].timestamp

    cached_profile = engine.profile
    assert cached_profile is engine.profile


def test_property_snapshot_requires_positive_units() -> None:
    with pytest.raises(ValueError):
        _snapshot(
            days=0,
            valuation=1_000_000,
            rental_income=100_000,
            operating_expenses=40_000,
            occupancy=0.9,
            units=0,
        )


def test_memoryless_engine_smooths_signals() -> None:
    engine = DynamicMemorylessPropertyEngine(smoothing=0.5)
    first = _snapshot(days=0, valuation=1_000_000, rental_income=100_000, operating_expenses=40_000, occupancy=0.90)
    second = _snapshot(days=1, valuation=1_200_000, rental_income=130_000, operating_expenses=55_000, occupancy=0.70)

    profile_first = engine.observe(first)
    assert profile_first.sample_size == 1
    assert profile_first.average_valuation == 1_000_000
    assert profile_first.occupancy_rate == pytest.approx(0.90)

    profile_second = engine.observe(second)
    assert profile_second.sample_size == 2
    assert profile_second.average_valuation == pytest.approx(1_100_000)
    assert profile_second.average_noi == pytest.approx(67_500)
    expected_margin = (0.6 + (75_000 / 130_000)) / 2
    assert profile_second.average_noi_margin == pytest.approx(expected_margin)
    assert profile_second.occupancy_rate == pytest.approx(0.80)
    assert profile_second.valuation_trend == pytest.approx(0.1)
    assert profile_second.stability_score == pytest.approx((1 + 1 / (1 + 0.2)) / 2)
    assert profile_second.last_updated == second.timestamp

    engine.reset()
    assert engine.profile.sample_size == 0
