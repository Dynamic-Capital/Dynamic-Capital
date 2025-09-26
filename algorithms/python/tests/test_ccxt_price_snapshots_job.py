from __future__ import annotations

from datetime import datetime, timezone

import pytest

from algorithms.python.jobs import ccxt_price_snapshots_job as job


def test_sync_ccxt_price_snapshots_normalises_and_writes(monkeypatch: pytest.MonkeyPatch) -> None:
    class DummyExchange:
        def __init__(self) -> None:
            self.closed = False

        def fetch_ticker(self, market: str) -> dict[str, object]:
            assert market == "BTC/USDT"
            return {
                "last": 26123.45,
                "timestamp": 1_700_000_000_000,
                "info": {},
            }

        def close(self) -> None:
            self.closed = True

    class DummyCcxtModule:
        def __init__(self, exchange: DummyExchange) -> None:
            self._exchange = exchange

        def __getattr__(self, name: str):
            if name == "binance":
                return lambda: self._exchange
            raise AttributeError(name)

    exchange = DummyExchange()
    monkeypatch.setattr(job, "_load_ccxt", lambda: DummyCcxtModule(exchange))

    captured: dict[str, object] = {}

    class DummyWriter:
        def __init__(self, *, table: str, conflict_column: str, **_: object) -> None:
            captured["table"] = table
            captured["conflict_column"] = conflict_column

        def upsert(self, rows: list[dict[str, object]]) -> int:
            captured["rows"] = rows
            return len(rows)

    monkeypatch.setattr(job, "SupabaseTableWriter", DummyWriter)  # type: ignore[arg-type]

    count = job.sync_ccxt_price_snapshots(markets=["BTC/USDT"], exchange_id="binance")

    assert count == 1
    assert captured["table"] == "price_snapshots"
    assert captured["conflict_column"] == "symbol,signed_at"

    rows = captured["rows"]
    assert isinstance(rows, list)
    row = rows[0]
    assert row["symbol"] == "BTCUSDT"
    assert row["quote_currency"] == "USDT"
    assert row["price_usd"] == pytest.approx(26123.45)
    assert isinstance(row["signed_at"], datetime)
    assert row["signed_at"].tzinfo is timezone.utc
    assert row["signature"].startswith("binance:BTC/USDT:")

