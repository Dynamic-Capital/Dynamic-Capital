"""Tests for the Dynamic Mark mark-to-market helper."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dynamic.trading.algo.dynamic_mark import DynamicMark


def _ts() -> datetime:
    return datetime(2025, 1, 1, 12, tzinfo=timezone.utc)


def test_upsert_position_normalises_symbol_and_computes_metrics() -> None:
    mark = DynamicMark()

    position = mark.upsert_position(
        "ethusd",
        quantity=2.0,
        entry_price=1800.0,
        current_price=1825.0,
        timestamp=_ts(),
        metadata={"desk": "alpha"},
    )

    assert position.symbol == "ETHUSD"
    assert position.direction == "long"
    assert position.notional == pytest.approx(3650.0)
    assert position.unrealised_pnl == pytest.approx(50.0)
    assert position.return_pct == pytest.approx(round(50.0 / 3600.0, 6))
    assert position.as_dict()["metadata"] == {"desk": "alpha"}


def test_mark_price_updates_existing_position() -> None:
    mark = DynamicMark()
    mark.upsert_position("BTCUSD", quantity=0.5, entry_price=30_000.0)

    updated = mark.mark_price("btcusd", 32_000.0, timestamp=_ts())

    assert updated is not None
    assert updated.current_price == pytest.approx(32_000.0)
    assert updated.unrealised_pnl == pytest.approx(1_000.0)
    assert updated.last_updated == _ts()


def test_portfolio_snapshot_aggregates_positions() -> None:
    mark = DynamicMark()
    mark.upsert_position("BTCUSD", quantity=0.5, entry_price=30_000.0, current_price=32_000.0)
    mark.upsert_position("ETHUSD", quantity=-1.0, entry_price=1_800.0, current_price=1_750.0)

    snapshot = mark.portfolio_snapshot()

    assert snapshot.position_count == 2
    assert snapshot.gross_exposure == pytest.approx((0.5 * 32_000.0) + (1.0 * 1_750.0))
    assert snapshot.net_exposure == pytest.approx((0.5 * 32_000.0) - (1.0 * 1_750.0))
    assert snapshot.long_exposure == pytest.approx(16_000.0)
    assert snapshot.short_exposure == pytest.approx(1_750.0)
    assert snapshot.total_unrealised_pnl == pytest.approx(1_050.0)
    assert snapshot.best_symbol == "BTCUSD"
    assert snapshot.worst_symbol == "ETHUSD"

    snapshot_dict = snapshot.as_dict()
    assert snapshot_dict["position_count"] == 2
    assert len(snapshot_dict["marks"]) == 2


def test_close_position_removes_symbol() -> None:
    mark = DynamicMark()
    mark.upsert_position("XAUUSD", quantity=1.0, entry_price=1_950.0)

    assert mark.close_position("xauusd") is True
    assert mark.get("XAUUSD") is None
    assert mark.close_position("XAUUSD") is False
