from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest

from algorithms.python.awesome_api import AwesomeAPIError
from algorithms.python.data_pipeline import RawBar
from algorithms.python.elliott_wave import (
    ElliottSwing,
    ElliottWaveAnalyzer,
    ElliottWaveReport,
)


def _build_bars(values: list[float]) -> list[RawBar]:
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    bars: list[RawBar] = []
    for idx, close in enumerate(values):
        moment = start + timedelta(hours=idx)
        bars.append(
            RawBar(
                timestamp=moment,
                open=close,
                high=close + 1.0,
                low=close - 1.0,
                close=close,
                volume=1_000 + idx,
            )
        )
    return bars


@pytest.fixture
def impulse_bars() -> list[RawBar]:
    closes = [
        101.0,
        100.0,
        103.0,
        109.0,
        105.0,
        101.0,
        114.0,
        121.0,
        116.0,
        110.0,
        128.0,
        135.0,
    ]
    return _build_bars(closes)


@pytest.fixture
def impulse_with_correction_bars() -> list[RawBar]:
    closes = [
        101.0,
        100.0,
        103.0,
        109.0,
        105.0,
        101.0,
        114.0,
        121.0,
        116.0,
        110.0,
        128.0,
        135.0,
        125.0,
        131.0,
        118.0,
    ]
    return _build_bars(closes)


def test_analyzer_detects_bullish_impulse(impulse_bars: list[RawBar]) -> None:
    analyzer = ElliottWaveAnalyzer(pivot_lookback=1)

    report = analyzer.analyse("USD-BRL", bars=impulse_bars)

    assert isinstance(report, ElliottWaveReport)
    assert report.pair == "USD-BRL"
    assert report.impulse_confirmed is True
    assert report.impulse_direction == "bullish"
    assert report.impulse_score >= 0.6
    assert report.corrective_confirmed is False
    assert all(isinstance(swing, ElliottSwing) for swing in report.swings)
    assert len(report.swings) >= 6


def test_analyzer_detects_corrective_sequence(impulse_with_correction_bars: list[RawBar]) -> None:
    analyzer = ElliottWaveAnalyzer(pivot_lookback=1)

    report = analyzer.analyse("USD-BRL", bars=impulse_with_correction_bars)

    assert report.impulse_confirmed is True
    assert report.corrective_confirmed is True
    assert report.corrective_direction == "bearish"
    assert report.corrective_score >= 0.5


def test_analyzer_uses_client_when_bars_missing(impulse_bars: list[RawBar]) -> None:
    class StubClient:
        def __init__(self) -> None:
            self.calls: list[tuple[str, int]] = []

        def fetch_bars(self, pair: str, *, limit: int) -> list[RawBar]:
            self.calls.append((pair, limit))
            return impulse_bars

    client = StubClient()
    analyzer = ElliottWaveAnalyzer(client=client, history=12, pivot_lookback=1)

    report = analyzer.analyse("EUR-USD")

    assert client.calls == [("EUR-USD", 12)]
    assert report.impulse_confirmed is True


def test_analyzer_validates_inputs(impulse_bars: list[RawBar]) -> None:
    analyzer = ElliottWaveAnalyzer(pivot_lookback=1)

    with pytest.raises(ValueError):
        analyzer.analyse("EUR-USD", bars=[])

    with pytest.raises(ValueError):
        analyzer.analyse("EUR-USD", history=2)

    with pytest.raises(AwesomeAPIError):
        short_bars = impulse_bars[:5]
        analyzer.analyse("EUR-USD", bars=short_bars)
