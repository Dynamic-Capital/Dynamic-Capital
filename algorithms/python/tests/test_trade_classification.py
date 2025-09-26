from __future__ import annotations

import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.trade_logic import (
    CompletedTrade,
    TradeClassificationRules,
    classify_trade_type,
)


def make_trade(duration: timedelta, pips: float = 15.0) -> CompletedTrade:
    opened = datetime(2024, 1, 1, tzinfo=UTC)
    closed = opened + duration
    return CompletedTrade(
        symbol="EURUSD",
        direction=1,
        size=1.0,
        entry_price=1.1000,
        exit_price=1.1015,
        open_time=opened,
        close_time=closed,
        profit=50.0,
        pips=pips,
    )


def test_classify_scalp_default_rules() -> None:
    trade = make_trade(timedelta(minutes=30))
    assert classify_trade_type(trade) == "Scalp"


def test_classify_intraday_default_rules() -> None:
    trade = make_trade(timedelta(hours=6))
    assert classify_trade_type(trade) == "Intra-day"


def test_classify_swing_default_rules() -> None:
    trade = make_trade(timedelta(days=3))
    assert classify_trade_type(trade) == "Swing"


def test_classify_respects_custom_pip_threshold() -> None:
    trade = make_trade(timedelta(minutes=30), pips=30.0)
    rules = TradeClassificationRules(scalp_max_pips=20.0)
    assert classify_trade_type(trade, rules=rules) == "Intra-day"


def test_completed_trade_holding_period_minutes() -> None:
    trade = make_trade(timedelta(minutes=45))
    assert trade.holding_period_minutes() == 45.0
