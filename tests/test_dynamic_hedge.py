from __future__ import annotations

import pytest

from dynamic.intelligence.ai_apps.hedge import (
    AccountState,
    DynamicHedgePolicy,
    ExposurePosition,
    HedgePosition,
    MarketState,
    NewsEvent,
    VolatilitySnapshot,
)


def _vol(symbol: str, atr: float, close: float, median: float, pip: float | None = None) -> VolatilitySnapshot:
    return VolatilitySnapshot(symbol=symbol, atr=atr, close=close, median_ratio=median, pip_value=pip)


def test_policy_opens_inverse_hedge_for_atr_spike() -> None:
    policy = DynamicHedgePolicy()
    market = MarketState(
        volatility={"XAUUSD": _vol("XAUUSD", atr=25, close=1900, median=0.01)},
        correlations={"XAUUSD": {"DXY": -0.78}},
    )
    account = AccountState(
        mode="netting",
        exposures=[ExposurePosition(symbol="XAUUSD", side="LONG", quantity=2.5, beta=1.2)],
        drawdown_r=0.5,
    )

    decisions = policy.evaluate(market, account)
    assert len(decisions) == 1
    decision = decisions[0]
    assert decision.action == "OPEN"
    assert decision.side == "SHORT_HEDGE"
    assert decision.hedge_symbol == "DXY"
    assert decision.reason == "ATR_SPIKE"
    assert decision.quantity > 2.5


def test_policy_uses_atr_formula_for_drawdown_capital() -> None:
    policy = DynamicHedgePolicy()
    market = MarketState(volatility={"BTCUSDT": _vol("BTCUSDT", atr=200, close=64000, median=0.004, pip=10)})
    account = AccountState(
        mode="hedging",
        exposures=[ExposurePosition(symbol="BTCUSDT", side="SHORT", quantity=1.8, price=64000, pip_value=10)],
        drawdown_r=2.4,
        risk_capital=900,
        max_basket_risk=2.0,
    )

    decisions = policy.evaluate(market, account)
    assert len(decisions) == 1
    decision = decisions[0]
    assert decision.reason == "DD_LIMIT"
    expected_qty = account.risk_capital / (200 * 10)
    assert decision.quantity == pytest.approx(expected_qty)


def test_policy_skips_duplicate_when_active() -> None:
    policy = DynamicHedgePolicy()
    market = MarketState(volatility={"ETHUSDT": _vol("ETHUSDT", atr=40, close=3200, median=0.01)})
    account = AccountState(
        exposures=[ExposurePosition(symbol="ETHUSDT", side="LONG", quantity=3.0)],
        hedges=[
            HedgePosition(
                id="hedge-1",
                symbol="ETHUSDT",
                hedge_symbol="ETHUSDT",
                side="SHORT_HEDGE",
                qty=3.2,
                reason="ATR_SPIKE",
            )
        ],
    )

    decisions = policy.evaluate(market, account)
    # Should only propose a close if applicable but no new open for same reason
    assert not any(decision.action == "OPEN" for decision in decisions)


def test_policy_closes_when_vol_normalises() -> None:
    policy = DynamicHedgePolicy()
    market = MarketState(volatility={"XAUUSD": _vol("XAUUSD", atr=18, close=1920, median=0.01)})
    account = AccountState(
        hedges=[
            HedgePosition(
                id="hedge-2",
                symbol="XAUUSD",
                hedge_symbol="XAUUSD",
                side="SHORT_HEDGE",
                qty=1.2,
                reason="ATR_SPIKE",
            )
        ]
    )

    decisions = policy.evaluate(market, account)
    assert any(decision.action == "CLOSE" and decision.hedge_id == "hedge-2" for decision in decisions)


def test_policy_closes_news_after_event() -> None:
    policy = DynamicHedgePolicy(news_lead_minutes=45)
    market = MarketState(volatility={})
    account = AccountState(
        hedges=[
            HedgePosition(
                id="hedge-3",
                symbol="BTCUSDT",
                hedge_symbol="BTCUSDT",
                side="LONG_HEDGE",
                qty=0.8,
                reason="NEWS",
            )
        ]
    )

    # Event already passed so hedge should close
    news = [NewsEvent(symbol="BTCUSDT", minutes_until=90, severity="high")]
    decisions = policy.evaluate(MarketState(volatility={}, news=news), account)
    assert any(decision.action == "CLOSE" and decision.hedge_id == "hedge-3" for decision in decisions)
