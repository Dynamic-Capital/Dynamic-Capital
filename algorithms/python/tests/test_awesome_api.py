from __future__ import annotations

import io
import json
from datetime import UTC, datetime, timedelta

import pytest

from algorithms.python.awesome_api import (
    AwesomeAPIClient,
    AwesomeAPIError,
    AwesomeAPISnapshotBuilder,
)
from algorithms.python.data_pipeline import InstrumentMeta, MarketDataIngestionJob, RawBar


class _DummyResponse(io.BytesIO):
    def __enter__(self) -> "_DummyResponse":  # pragma: no cover - protocol glue
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # pragma: no cover - protocol glue
        self.close()


def _payload_entry(timestamp: int, close: float) -> dict[str, str]:
    high = close + 0.5
    low = close - 0.5
    return {
        "timestamp": str(timestamp),
        "high": f"{high:.5f}",
        "low": f"{low:.5f}",
        "bid": f"{close:.5f}",
        "ask": f"{(close + 0.0002):.5f}",
    }


def _bars(count: int) -> list[RawBar]:
    start = datetime(2024, 1, 1, tzinfo=UTC)
    price = 1800.0
    series: list[RawBar] = []
    for idx in range(count):
        timestamp = start + timedelta(hours=idx)
        close = price + (1.0 if idx % 2 == 0 else -0.8)
        series.append(
            RawBar(
                timestamp=timestamp,
                open=price,
                high=price + 2.0,
                low=price - 2.0,
                close=close,
                volume=0.0,
            )
        )
        price = close
    return series


def test_client_fetch_bars_parses_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    from algorithms.python import awesome_api as module

    base = datetime(2024, 1, 1, tzinfo=UTC)
    payload = [
        _payload_entry(int((base + timedelta(days=idx)).timestamp()), 1.05 + idx * 0.01)
        for idx in range(4)
    ]

    def fake_urlopen(request, timeout: float):  # type: ignore[override]
        return _DummyResponse(json.dumps(list(reversed(payload))).encode("utf-8"))

    monkeypatch.setattr(module, "urlopen", fake_urlopen)
    client = AwesomeAPIClient()
    bars = client.fetch_bars("EUR-USD", limit=4)
    assert len(bars) == 4
    assert bars[0].timestamp < bars[-1].timestamp
    assert bars[0].timestamp.tzinfo == module.DESK_TIME_ZONE
    assert pytest.approx(bars[1].open) == bars[0].close


def test_client_fetch_bars_raises_for_invalid_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    from algorithms.python import awesome_api as module

    def fake_urlopen(request, timeout: float):  # type: ignore[override]
        return _DummyResponse(b"{\"invalid\": true}")

    monkeypatch.setattr(module, "urlopen", fake_urlopen)
    client = AwesomeAPIClient()
    with pytest.raises(AwesomeAPIError):
        client.fetch_bars("EUR-USD", limit=3)


def test_snapshot_builder_returns_latest_snapshot() -> None:
    class StubClient:
        def fetch_bars(self, pair: str, *, limit: int) -> list[RawBar]:
            assert pair == "XAU-USD"
            assert limit == 30
            return _bars(40)

    builder = AwesomeAPISnapshotBuilder(
        client=StubClient(),
        job=MarketDataIngestionJob(rsi_fast=3, rsi_slow=5, adx_fast=3, adx_slow=5),
        history=30,
    )
    instrument = InstrumentMeta(symbol="XAUUSD", pip_size=0.1, pip_value=1.0)
    snapshot = builder.latest_snapshot("XAU-USD", instrument)
    assert snapshot.symbol == instrument.symbol
    assert 0 <= snapshot.rsi_fast <= 100
    assert 0 <= snapshot.rsi_slow <= 100
    assert snapshot.close == pytest.approx(_bars(40)[-1].close)


def test_snapshot_builder_validates_history() -> None:
    builder = AwesomeAPISnapshotBuilder()
    instrument = InstrumentMeta(symbol="EURUSD", pip_size=0.0001, pip_value=10.0)
    with pytest.raises(ValueError):
        builder.fetch_snapshots("EUR-USD", instrument, history=0)


def test_client_validates_limit() -> None:
    client = AwesomeAPIClient()
    with pytest.raises(ValueError):
        client.fetch_daily("EUR-USD", limit=0)
