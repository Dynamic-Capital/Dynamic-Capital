from __future__ import annotations

import statistics
from datetime import UTC, datetime, timedelta

import pytest

from algorithms.python.awesome_api import AwesomeAPIError
from algorithms.python.data_pipeline import RawBar
from algorithms.python.mechanical_analysis import MechanicalAnalysisCalculator


def _make_bar(
    timestamp: datetime,
    *,
    open_price: float,
    high: float,
    low: float,
    close: float,
) -> RawBar:
    return RawBar(
        timestamp=timestamp,
        open=open_price,
        high=high,
        low=low,
        close=close,
    )


def test_mechanical_metrics_calculation() -> None:
    base = datetime(2024, 1, 1, tzinfo=UTC)
    closes = [100.0, 102.0, 105.0, 107.0]
    highs = [101.0, 103.0, 106.0, 108.0]
    lows = [99.0, 101.0, 104.0, 106.0]
    bars = [
        _make_bar(
            base + timedelta(days=idx),
            open_price=close,
            high=high,
            low=low,
            close=close,
        )
        for idx, (close, high, low) in enumerate(zip(closes, highs, lows))
    ]

    calculator = MechanicalAnalysisCalculator()
    metrics = calculator.compute_metrics("USD-BRL", bars=bars)

    assert metrics.velocity == pytest.approx(2.0)
    assert metrics.acceleration == pytest.approx(-1.0)
    assert metrics.jerk == pytest.approx(-2.0)

    volatility = statistics.pstdev(closes)
    expected_energy = 0.5 * (volatility ** 2)
    assert metrics.energy == pytest.approx(expected_energy)

    average_close = sum(closes) / len(closes)
    expected_stress = (highs[-1] - lows[-1]) / average_close
    assert metrics.stress_ratio == pytest.approx(expected_stress)
    assert metrics.state == "Turbulent"
    assert metrics.timestamp == bars[-1].timestamp


def test_mechanical_state_classification_bearish() -> None:
    base = datetime(2024, 1, 1, tzinfo=UTC)
    closes = [110.0, 108.0, 105.0, 101.0]
    bars = [
        _make_bar(
            base + timedelta(days=idx),
            open_price=close,
            high=close + 0.5,
            low=close - 0.5,
            close=close,
        )
        for idx, close in enumerate(closes)
    ]

    calculator = MechanicalAnalysisCalculator()
    metrics = calculator.compute_metrics("EUR-USD", bars=bars)

    assert metrics.velocity < 0
    assert metrics.acceleration < 0
    assert metrics.state == "Bearish"


def test_mechanical_series_generation() -> None:
    base = datetime(2024, 1, 1, tzinfo=UTC)
    closes = [100.0, 101.0, 103.0, 104.0, 106.0]
    bars = [
        _make_bar(
            base + timedelta(days=idx),
            open_price=close,
            high=close + 1,
            low=close - 1,
            close=close,
        )
        for idx, close in enumerate(closes)
    ]

    calculator = MechanicalAnalysisCalculator()
    series = calculator.compute_series("BTC-USD", bars=bars)

    assert len(series) == len(bars) - 3
    last_timestamp, last_metrics = series[-1]
    assert last_timestamp == bars[-1].timestamp
    assert last_metrics.pair == "BTC-USD"


def test_mechanical_metrics_insufficient_history() -> None:
    base = datetime(2024, 1, 1, tzinfo=UTC)
    bars = [
        _make_bar(
            base + timedelta(days=idx),
            open_price=100 + idx,
            high=101 + idx,
            low=99 + idx,
            close=100 + idx,
        )
        for idx in range(3)
    ]

    calculator = MechanicalAnalysisCalculator()
    with pytest.raises(AwesomeAPIError):
        calculator.compute_metrics("USD-JPY", bars=bars)

