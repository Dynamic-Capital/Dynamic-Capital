from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:  # pragma: no cover - ensure package import path
    sys.path.append(str(PROJECT_ROOT))

from dynamic_trading_language.model import TradeIntent


@pytest.fixture
def base_intent_kwargs():
    return {
        "instrument": "BTC/USDT",
        "direction": "long",
        "conviction": 0.5,
        "timeframe": "1h",
    }


def test_trade_intent_rejects_non_positive_levels(base_intent_kwargs):
    for field in ("entry", "target", "stop"):
        with pytest.raises(ValueError):
            TradeIntent(**base_intent_kwargs, **{field: 0.0})
        with pytest.raises(ValueError):
            TradeIntent(**base_intent_kwargs, **{field: -1.0})


@pytest.mark.parametrize("invalid_level", [float("nan"), float("inf"), float("-inf")])
def test_trade_intent_rejects_non_finite_levels(base_intent_kwargs, invalid_level):
    with pytest.raises(ValueError):
        TradeIntent(**base_intent_kwargs, entry=invalid_level)


def test_trade_intent_accepts_naive_datetime(base_intent_kwargs):
    naive_created_at = datetime(2024, 1, 2, 12, 30, 0)
    intent = TradeIntent(**base_intent_kwargs, created_at=naive_created_at)
    assert intent.created_at.tzinfo == timezone.utc
    assert intent.created_at == naive_created_at.replace(tzinfo=timezone.utc)
