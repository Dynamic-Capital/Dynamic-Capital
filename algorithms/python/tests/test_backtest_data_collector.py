from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from algorithms.python.backtest_data_collector import (
    YahooDownloadConfig,
    collect_backtest_data,
    parse_yahoo_csv,
)
from algorithms.python.data_pipeline import InstrumentMeta, MarketDataIngestionJob, RawBar


@pytest.fixture
def sample_csv() -> str:
    lines = ["Date,Open,High,Low,Close,Adj Close,Volume"]
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    price = 2000.0
    for idx in range(20):
        timestamp = start + timedelta(hours=idx)
        open_price = price
        high = price + 3.0
        low = price - 3.0
        close = price + (1.5 if idx % 2 == 0 else -1.2)
        volume = 1000 + idx
        stamp = timestamp.isoformat().replace("+00:00", "Z")
        lines.append(
            f"{stamp},{open_price:.2f},{high:.2f},{low:.2f},{close:.2f},{close:.2f},{volume}"
        )
        price = close
    return "\n".join(lines)


@pytest.fixture
def sample_bars(sample_csv: str) -> list[RawBar]:
    return parse_yahoo_csv(sample_csv)


def test_parse_yahoo_csv(sample_csv: str) -> None:
    bars = parse_yahoo_csv(sample_csv)
    assert len(bars) == 20
    assert bars[0].timestamp == datetime(2024, 1, 1, tzinfo=timezone.utc)
    assert bars[-1].close != 0.0


def test_collect_backtest_data(tmp_path: Path, sample_bars: list[RawBar]) -> None:
    instrument = InstrumentMeta(symbol="XAUUSD", pip_size=0.1, pip_value=1.0)
    job = MarketDataIngestionJob(rsi_fast=3, rsi_slow=5, adx_fast=3, adx_slow=5)
    result = collect_backtest_data(
        dataset_symbol=instrument.symbol,
        vendor_symbol=None,
        start=sample_bars[0].timestamp,
        end=sample_bars[-1].timestamp,
        interval="1h",
        pip_size=instrument.pip_size,
        pip_value=instrument.pip_value,
        output_path=tmp_path / "snapshots.csv",
        metadata_path=tmp_path / "snapshots.metadata.json",
        job=job,
        bars=sample_bars,
    )
    assert result.snapshots
    assert result.snapshot_path and result.snapshot_path.exists()
    assert result.metadata_path and result.metadata_path.exists()
    assert result.metadata["symbol"] == instrument.symbol


def test_yahoo_download_config_validates_interval(sample_bars: list[RawBar]) -> None:
    start = sample_bars[0].timestamp
    end = sample_bars[-1].timestamp
    with pytest.raises(ValueError):
        YahooDownloadConfig(symbol="XAUUSD=X", start=start, end=end, interval="2h")

    with pytest.raises(ValueError):
        YahooDownloadConfig(symbol="XAUUSD=X", start=end, end=start, interval="1h")
