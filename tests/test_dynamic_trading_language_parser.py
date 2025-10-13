from datetime import datetime, timezone

import pytest

from dynamic_trading_language import TradeIntentParseError, parse_trade_intent


def test_parse_trade_intent_happy_path():
    payload = """
    instrument: ETHUSD
    direction: long
    conviction: 0.72
    timeframe: Intraday
    catalysts: London upgrade; Funding premium stabilising
    entry: 1820.25
    target: 1895
    stop: 1778.5
    reasoning: Momentum returning alongside liquidity rebuild
    risk_notes: Watch on-chain flows | Funding flip risk
    metrics: skew=0.45, momentum=0.62
    created_at: 2025-02-14T12:00:00+00:00
    """

    intent = parse_trade_intent(payload)
    assert intent.instrument == "ETHUSD"
    assert intent.direction == "long"
    assert intent.conviction == pytest.approx(0.72)
    assert intent.timeframe == "Intraday"
    assert intent.catalysts == (
        "London upgrade",
        "Funding premium stabilising",
    )
    assert intent.risk_notes == (
        "Watch on-chain flows",
        "Funding flip risk",
    )
    assert intent.metrics == {"skew": 0.45, "momentum": 0.62}
    assert intent.created_at == datetime(2025, 2, 14, 12, tzinfo=timezone.utc)


def test_parse_trade_intent_rejects_deprecated_syntax():
    payload = "instrument->ETHUSD\ndirection: long\nconviction: 0.5\ntimeframe: Intraday"
    with pytest.raises(TradeIntentParseError):
        parse_trade_intent(payload)


def test_parse_trade_intent_requires_fields():
    payload = "instrument: ETHUSD\ndirection: long"
    with pytest.raises(TradeIntentParseError) as exc:
        parse_trade_intent(payload)
    assert "missing required field" in str(exc.value)
