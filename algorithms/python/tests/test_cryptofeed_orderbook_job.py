from __future__ import annotations

from datetime import datetime, timezone

import pytest

from algorithms.python.jobs import cryptofeed_orderbook_job as job
from algorithms.python.providers import MarketDepthSnapshot, ProviderError


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

    client = DummyClient()
    monkeypatch.setattr(job, "_load_cryptofeed", lambda: object())
    monkeypatch.setattr(job, "_initialise_rest_client", lambda module, exchange_id: client)

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
    assert captured["table"] == "market_depth_snapshots"
    assert captured["conflict_column"] == "symbol,observed_at,provider"

    rows = captured["rows"]
    assert isinstance(rows, list)
    row = rows[0]
    assert row["symbol"] == "BTCUSDT"
    assert row["bid_price"] == pytest.approx(27000.0)
    assert row["ask_price"] == pytest.approx(27010.0)
    assert row["mid_price"] == pytest.approx(27005.0)
    assert row["spread_bps"] == pytest.approx((27010 - 27000) / 27005 * 10_000)
    expected_depth = 27000.0 * 1.5 + 26990.0 * 2.0 + 27010.0 * 1.2 + 27020.0 * 0.5
    assert row["depth_usd"] == pytest.approx(expected_depth)
    assert row["bid_volume"] == pytest.approx(1.5 + 2.0)
    assert row["ask_volume"] == pytest.approx(1.2 + 0.5)
    assert row["tick_volume"] == pytest.approx(1.5 + 1.2)
    assert isinstance(row["observed_at"], datetime)
    assert row["observed_at"].tzinfo is timezone.utc
    assert row["provider"] == "cryptofeed-binance"


def test_sync_orderbooks_switches_providers(monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime(2024, 1, 1, tzinfo=timezone.utc)

    class StaticProvider:
        def __init__(self, *, provider: str, price: float) -> None:
            self.provider = provider
            self.price = price

        def snapshot(self, market: str, *, depth: int = 5) -> MarketDepthSnapshot:
            return MarketDepthSnapshot(
                symbol=f"{market.replace('-', '')}",
                provider=self.provider,
                bid_price=self.price,
                ask_price=self.price + 1,
                mid_price=self.price + 0.5,
                spread_bps=10.0,
                depth_usd=100.0,
                bid_volume=2.0,
                ask_volume=3.0,
                tick_volume=1.0,
                observed_at=now,
            )

    cryptocompare = StaticProvider(provider="cryptocompare", price=100.0)
    kaiko = StaticProvider(provider="kaiko", price=200.0)

    monkeypatch.setattr(
        job,
        "_load_cryptofeed",
        lambda: (_ for _ in ()).throw(AssertionError("cryptofeed should not load")),
    )

    captured: dict[str, object] = {}

    class DummyWriter:
        def __init__(self, *, table: str, conflict_column: str, **_: object) -> None:
            captured["table"] = table
            captured["conflict_column"] = conflict_column

        def upsert(self, rows: list[dict[str, object]]) -> int:
            captured["rows"] = rows
            return len(rows)

    monkeypatch.setattr(job, "SupabaseTableWriter", DummyWriter)  # type: ignore[arg-type]

    count = job.sync_cryptofeed_orderbooks(
        markets=["BTC-USDT", "ETH-USDT"],
        default_provider="cryptocompare",
        provider_overrides={"BTC-USDT": "kaiko"},
        providers={"cryptocompare": cryptocompare, "kaiko": kaiko},
    )

    assert count == 2
    rows = captured["rows"]
    providers = {row["provider"] for row in rows}
    assert providers == {"cryptocompare", "kaiko"}


def test_sync_orderbooks_handles_provider_error(monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime(2024, 1, 1, tzinfo=timezone.utc)

    class FailingProvider:
        def snapshot(self, market: str, *, depth: int = 5) -> MarketDepthSnapshot:  # pragma: no cover - signature
            raise ProviderError("boom")

    class GoodProvider:
        def snapshot(self, market: str, *, depth: int = 5) -> MarketDepthSnapshot:
            return MarketDepthSnapshot(
                symbol=market.replace("-", ""),
                provider="kaiko",
                bid_price=1.0,
                ask_price=2.0,
                mid_price=1.5,
                spread_bps=50.0,
                depth_usd=10.0,
                bid_volume=1.0,
                ask_volume=1.0,
                tick_volume=0.5,
                observed_at=now,
            )

    monkeypatch.setattr(job, "_load_cryptofeed", lambda: object())
    monkeypatch.setattr(job, "_initialise_rest_client", lambda module, exchange_id: object())

    captured: dict[str, object] = {}

    class DummyWriter:
        def __init__(self, *, table: str, conflict_column: str, **_: object) -> None:
            captured["table"] = table
            captured["conflict_column"] = conflict_column

        def upsert(self, rows: list[dict[str, object]]) -> int:
            captured["rows"] = rows
            return len(rows)

    monkeypatch.setattr(job, "SupabaseTableWriter", DummyWriter)  # type: ignore[arg-type]

    count = job.sync_cryptofeed_orderbooks(
        markets=["BTC-USDT", "ETH-USDT"],
        default_provider="cryptocompare",
        provider_overrides={"ETH-USDT": "kaiko"},
        providers={"cryptocompare": FailingProvider(), "kaiko": GoodProvider()},
    )

    assert count == 1
    rows = captured["rows"]
    assert len(rows) == 1
    assert rows[0]["provider"] == "kaiko"

