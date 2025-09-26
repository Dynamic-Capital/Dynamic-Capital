from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from algorithms.python.awesome_api import (
    AwesomeAPIAutoCalculator,
    AwesomeAPIAutoMetrics,
    AwesomeAPIError,
)
from algorithms.python.data_pipeline import RawBar


@pytest.fixture
def sample_bars() -> list[RawBar]:
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    closes = [100.0, 102.0, 101.0, 105.0, 107.0]
    bars: list[RawBar] = []
    for idx, close in enumerate(closes):
        moment = start + timedelta(days=idx)
        bars.append(
            RawBar(
                timestamp=moment,
                open=close - 1.0,
                high=close + 3.0,
                low=close - 2.0,
                close=close,
                volume=1_000 + idx,
            )
        )
    return bars


def test_auto_calculator_computes_metrics(sample_bars: list[RawBar]) -> None:
    class StubClient:
        def fetch_bars(self, pair: str, *, limit: int) -> list[RawBar]:
            assert pair == "XAU-USD"
            assert limit == 5
            return list(sample_bars)

    calculator = AwesomeAPIAutoCalculator(client=StubClient(), history=5)

    metrics = calculator.compute_metrics("XAU-USD")

    assert isinstance(metrics, AwesomeAPIAutoMetrics)
    assert metrics.pair == "XAU-USD"
    assert metrics.sample_size == len(sample_bars)
    assert metrics.latest_close == pytest.approx(107.0)
    assert metrics.previous_close == pytest.approx(105.0)
    assert metrics.absolute_change == pytest.approx(2.0)
    assert metrics.percentage_change == pytest.approx(1.9047619, rel=1e-6)
    assert metrics.average_close == pytest.approx(103.0)
    assert metrics.high == pytest.approx(110.0)
    assert metrics.low == pytest.approx(98.0)
    assert metrics.price_range == pytest.approx(12.0)
    assert metrics.cumulative_return == pytest.approx(0.07)
    assert metrics.average_daily_change == pytest.approx(1.75)
    assert metrics.volatility == pytest.approx(2.607680962, rel=1e-6)
    assert metrics.trend_strength == pytest.approx(0.04950495, rel=1e-6)


def test_auto_calculator_respects_history_override(sample_bars: list[RawBar]) -> None:
    class TrackingClient:
        def __init__(self) -> None:
            self.calls: list[tuple[str, int]] = []

        def fetch_bars(self, pair: str, *, limit: int) -> list[RawBar]:
            self.calls.append((pair, limit))
            return list(sample_bars[:limit])

    client = TrackingClient()
    calculator = AwesomeAPIAutoCalculator(client=client, history=10)

    metrics = calculator.compute_metrics("EUR-USD", history=3)

    assert client.calls == [("EUR-USD", 3)]
    assert metrics.sample_size == 3
    assert metrics.latest_close == pytest.approx(101.0)
    assert metrics.previous_close == pytest.approx(102.0)
    assert metrics.absolute_change == pytest.approx(-1.0)
    assert metrics.percentage_change == pytest.approx(-0.98039215, rel=1e-6)
    assert metrics.cumulative_return == pytest.approx(0.01)
    assert metrics.average_daily_change == pytest.approx(0.5)
    assert metrics.volatility == pytest.approx(0.81649658, rel=1e-6)
    assert metrics.trend_strength == pytest.approx(0.01)


def test_auto_calculator_accepts_explicit_bars(sample_bars: list[RawBar]) -> None:
    class GuardedClient:
        def fetch_bars(self, pair: str, *, limit: int) -> list[RawBar]:  # pragma: no cover - defensive
            raise AssertionError("fetch_bars should not be called when bars are supplied")

    calculator = AwesomeAPIAutoCalculator(client=GuardedClient())

    metrics = calculator.compute_metrics("BTC-USD", bars=sample_bars)

    assert metrics.sample_size == len(sample_bars)
    assert metrics.latest_close == pytest.approx(sample_bars[-1].close)


def test_auto_calculator_validates_inputs(sample_bars: list[RawBar]) -> None:
    class SparseClient:
        def fetch_bars(self, pair: str, *, limit: int) -> list[RawBar]:
            return [sample_bars[0]]

    calculator = AwesomeAPIAutoCalculator(client=SparseClient(), history=2)

    with pytest.raises(AwesomeAPIError):
        calculator.compute_metrics("XAU-USD")

    with pytest.raises(ValueError):
        calculator.compute_metrics("XAU-USD", history=1)

    with pytest.raises(ValueError):
        calculator.compute_metrics("XAU-USD", bars=[])
