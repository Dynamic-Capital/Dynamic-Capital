from __future__ import annotations

from datetime import datetime, timezone

import pytest

from algorithms.python.jobs import cryptofeed_orderbook_job as job


def test_sync_cryptofeed_orderbooks_normalises(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {
        "bids": [(27000.0, 1.5), (26990.0, 2.0)],
        "asks": [(27010.0, 1.2), (27020.0, 0.5)],
        "timestamp": 1_700_000_000,
    }

    class DummyClient:
        def l2_book(self, *, symbol: str, depth: int) -> dict[str, object]:
            assert symbol == "BTC-USDT"
            assert depth == 5
            return payload

        def close(self) -> None:
            pass

    class DummyModule:
        def __init__(self, client: DummyClient) -> None:
            class RestNamespace:
                def __init__(self, client: DummyClient) -> None:
                    self.Binance = lambda: client

            self.rest = RestNamespace(client)

    client = DummyClient()
    monkeypatch.setattr(job, "_load_cryptofeed", lambda: DummyModule(client))

    captured: dict[str, object] = {}

    class DummyWriter:
        def __init__(self, *, table: str, conflict_column: str, **_: object) -> None:
            captured["table"] = table
            captured["conflict_column"] = conflict_column

        def upsert(self, rows: list[dict[str, object]]) -> int:
            captured["rows"] = rows
            return len(rows)

    monkeypatch.setattr(job, "SupabaseTableWriter", DummyWriter)  # type: ignore[arg-type]

    count = job.sync_cryptofeed_orderbooks(markets=["BTC-USDT"], exchange_id="Binance")

    assert count == 1
    assert captured["table"] == "orderbook_snapshots"
    assert captured["conflict_column"] == "symbol,observed_at"

    rows = captured["rows"]
    assert isinstance(rows, list)
    row = rows[0]
    assert row["symbol"] == "BTCUSDT"
    assert row["bid_price"] == pytest.approx(27000.0)
    assert row["ask_price"] == pytest.approx(27010.0)
    assert row["mid_price"] == pytest.approx(27005.0)
    assert row["spread_bps"] == pytest.approx((27010 - 27000) / 27005 * 10_000)
    assert row["depth_usd"] == pytest.approx(
        27000.0 * 1.5 + 26990.0 * 2.0 + 27010.0 * 1.2 + 27020.0 * 0.5
    )
    assert isinstance(row["observed_at"], datetime)
    assert row["observed_at"].tzinfo is timezone.utc
    assert row["source"] == "Binance"

