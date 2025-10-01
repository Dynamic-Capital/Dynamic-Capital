"""Tests for the dynamic market flow analytics helper."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic.trading.algo.market_flow import DynamicMarketFlow
from dynamic.trading.algo.trading_core import SUCCESS_RETCODE, TradeExecutionResult


def _dt(offset_minutes: int = 0) -> datetime:
    return datetime(2025, 1, 1, tzinfo=timezone.utc) + timedelta(minutes=offset_minutes)


def test_snapshot_computes_directional_pressure() -> None:
    flow = DynamicMarketFlow()
    flow.record("XAUUSD", "buy", 2.0, price=1945.5, profit=120.0, timestamp=_dt())
    flow.record("XAUUSD", "SELL", 1.0, price=1950.0, profit=-30.0, timestamp=_dt(5))

    snapshot = flow.snapshot("xauusd")

    assert snapshot.symbol == "XAUUSD"
    assert snapshot.trade_count == 2
    assert snapshot.buy_volume == pytest.approx(2.0)
    assert snapshot.sell_volume == pytest.approx(1.0)
    assert snapshot.net_volume == pytest.approx(1.0)
    assert snapshot.gross_volume == pytest.approx(3.0)
    assert snapshot.pressure == pytest.approx(1.0 / 3.0, rel=1e-3)
    assert snapshot.bias == "buy"
    assert snapshot.realised_pnl == pytest.approx(90.0)
    assert snapshot.average_buy_price == pytest.approx(1945.5)
    assert snapshot.average_sell_price == pytest.approx(1950.0)
    assert snapshot.last_trade_at is not None
    assert snapshot.flow_score == pytest.approx(33.33, rel=1e-2)

    state = flow.flow_state("XAUUSD")
    assert state["symbol"] == "XAUUSD"
    assert state["bias"] == "buy"
    assert state["flow_score"] == pytest.approx(snapshot.flow_score)
    assert isinstance(state["last_trade_at"], str)


def test_snapshot_handles_empty_history() -> None:
    flow = DynamicMarketFlow()
    snapshot = flow.snapshot("EURUSD")

    assert snapshot.symbol == "EURUSD"
    assert snapshot.trade_count == 0
    assert snapshot.pressure == 0.0
    assert snapshot.bias == "balanced"


def test_window_size_limits_history() -> None:
    flow = DynamicMarketFlow(window_size=2)
    flow.record("EURUSD", "BUY", 1.0, timestamp=_dt())
    flow.record("EURUSD", "BUY", 1.0, timestamp=_dt(1))
    flow.record("EURUSD", "SELL", 1.0, timestamp=_dt(2))

    snapshot = flow.snapshot("EURUSD")

    assert snapshot.trade_count == 2
    assert snapshot.buy_volume == pytest.approx(1.0)
    assert snapshot.sell_volume == pytest.approx(1.0)


def test_window_duration_prunes_old_trades() -> None:
    flow = DynamicMarketFlow(window_duration=timedelta(minutes=5))
    flow.record("GBPUSD", "BUY", 1.0, timestamp=_dt())
    flow.record("GBPUSD", "SELL", 0.5, timestamp=_dt(10))

    snapshot = flow.snapshot("GBPUSD")

    assert snapshot.trade_count == 1
    assert snapshot.sell_volume == pytest.approx(0.5)
    assert snapshot.buy_volume == pytest.approx(0.0)


def test_ingest_execution_accepts_trade_result() -> None:
    flow = DynamicMarketFlow()
    result = TradeExecutionResult(
        retcode=SUCCESS_RETCODE,
        message="ok",
        profit=12.5,
        ticket=42,
        symbol="BTCUSD",
        lot=0.8,
        price=68_500.0,
    )

    ingested = flow.ingest_execution(result, action="buy")
    assert ingested is True

    snapshot = flow.snapshot("BTCUSD")
    assert snapshot.trade_count == 1
    assert snapshot.buy_volume == pytest.approx(0.8)
    assert snapshot.average_buy_price == pytest.approx(68_500.0)
    assert snapshot.realised_pnl == pytest.approx(12.5)


def test_ingest_execution_rejects_incomplete_payload() -> None:
    flow = DynamicMarketFlow()
    result = TradeExecutionResult(retcode=SUCCESS_RETCODE, message="noop", profit=0.0)

    assert flow.ingest_execution(result) is False
    assert flow.snapshot("SPX").trade_count == 0
