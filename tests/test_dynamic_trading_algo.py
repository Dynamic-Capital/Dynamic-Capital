import types

import pytest

from dynamic_ai.risk import PositionSizing

from dynamic_algo.trading_core import (
    ORDER_ACTION_BUY,
    SUCCESS_RETCODE,
    DynamicTradingAlgo,
    TradeExecutionResult,
    normalise_symbol,
)


@pytest.mark.parametrize(
    "alias, expected",
    [
        ("eur/usd", "EURUSD"),
        ("GBPUSDT", "GBPUSD"),
        ("usd-jpy", "USDJPY"),
        ("gold", "XAUUSD"),
        ("silver", "XAGUSD"),
        ("btc-usdt", "BTCUSD"),
        ("eth/usd", "ETHUSD"),
        ("xrpusd", "XRPUSD"),
        ("bnb-usd", "BNBUSD"),
        ("toncoinusdt", "TONUSD"),
        ("dct-ton", "DCTTON"),
        ("", "XAUUSD"),
    ],
)
def test_normalise_symbol_aliases(alias: str, expected: str) -> None:
    assert normalise_symbol(alias) == expected


class StubConnector:
    def __init__(self) -> None:
        self.calls: list[tuple[str, float]] = []

    def buy(self, symbol: str, lot: float) -> types.SimpleNamespace:
        self.calls.append((symbol, lot))
        return types.SimpleNamespace(
            retcode=SUCCESS_RETCODE,
            comment="ok",
            profit=123.4,
            order=42,
            price=1.2345,
        )


class StubHedgeConnector:
    def __init__(self) -> None:
        self.open_calls: list[tuple[str, float, str]] = []
        self.close_calls: list[tuple[str, float, str]] = []

    def open_hedge(self, symbol: str, lot: float, side: str) -> types.SimpleNamespace:
        self.open_calls.append((symbol, lot, side))
        return types.SimpleNamespace(retcode=SUCCESS_RETCODE, comment="open", profit=0.0, order=10)

    def close_hedge(self, symbol: str, lot: float, side: str) -> types.SimpleNamespace:
        self.close_calls.append((symbol, lot, side))
        return types.SimpleNamespace(retcode=SUCCESS_RETCODE, comment="close", profit=0.0, order=11)


def test_execute_trade_normalises_symbol_and_uses_connector() -> None:
    connector = StubConnector()
    algo = DynamicTradingAlgo(connector=connector)

    result = algo.execute_trade({"action": ORDER_ACTION_BUY}, lot=0.05, symbol="eur/usdt")

    assert connector.calls == [("EURUSD", 0.05)]
    assert isinstance(result, TradeExecutionResult)
    assert result.symbol == "EURUSD"
    assert result.lot == pytest.approx(0.05)


def test_execute_trade_uses_instrument_profile_for_paper(monkeypatch: pytest.MonkeyPatch) -> None:
    algo = DynamicTradingAlgo(connector=None)
    values = iter([10.0, 0.5])

    def fake_uniform(_a: float, _b: float) -> float:
        return next(values)

    monkeypatch.setattr("dynamic_algo.trading_core.random.uniform", fake_uniform)
    monkeypatch.setattr("dynamic_algo.trading_core.random.randint", lambda _a, _b: 12345)

    result = algo.execute_trade({"action": "sell"}, lot=0.001, symbol="xrp/usdt")

    assert result.symbol == "XRPUSD"
    assert result.lot == pytest.approx(1.0)
    assert result.profit == pytest.approx(-16.5)
    assert result.price == pytest.approx(0.61, rel=0, abs=1e-9)
    assert result.ticket == 12345


def test_execute_hedge_normalises_symbol_and_clamps_lot() -> None:
    connector = StubHedgeConnector()
    algo = DynamicTradingAlgo(connector=connector)

    open_result = algo.execute_hedge(symbol="tonusdt", lot=0.01, side="long_hedge")
    close_result = algo.execute_hedge(symbol="tonusdt", lot=0.01, side="long_hedge", close=True)

    assert connector.open_calls == [("TONUSD", 0.1, "long_hedge")]
    assert connector.close_calls == [("TONUSD", 0.1, "long_hedge")]
    assert open_result.symbol == "TONUSD"
    assert close_result.symbol == "TONUSD"
    assert open_result.lot == pytest.approx(0.1)
    assert close_result.lot == pytest.approx(0.1)


def test_execute_trade_scales_lot_with_signal_quality() -> None:
    connector = StubConnector()
    algo = DynamicTradingAlgo(connector=connector)

    signal = {
        "action": ORDER_ACTION_BUY,
        "confidence": 0.8,
        "conviction": 0.75,
        "urgency": 0.5,
        "risk": 0.3,
        "volatility": 0.2,
        "size_multiplier": 1.2,
    }

    expected = 0.2
    expected *= 0.6 + 0.4 * 0.8
    expected *= 0.7 + 0.3 * 0.75
    expected *= 0.85 + 0.3 * 0.5
    expected *= 1.0 - 0.5 * 0.3
    expected *= 1.0 - 0.4 * 0.2
    expected *= 1.2

    result = algo.execute_trade(signal, lot=0.2, symbol="eurusd")

    assert len(connector.calls) == 1
    symbol, lot = connector.calls[0]
    assert symbol == "EURUSD"
    assert lot == pytest.approx(expected, abs=1e-4)
    assert result.lot == pytest.approx(expected, abs=1e-4)


def test_execute_trade_respects_signal_caps() -> None:
    connector = StubConnector()
    algo = DynamicTradingAlgo(connector=connector)

    signal = {
        "action": ORDER_ACTION_BUY,
        "size_multiplier": 4.0,
        "max_position": 0.3,
        "notional_cap": 450.0,
    }

    profile = algo.instrument_profiles["XAUUSD"]
    expected = 0.2 * 4.0
    expected = min(expected, 0.3)
    expected = min(expected, 450.0 / profile.reference_price)

    result = algo.execute_trade(signal, lot=0.2, symbol="xauusd")

    assert len(connector.calls) == 1
    symbol, lot = connector.calls[0]
    assert symbol == "XAUUSD"
    assert lot == pytest.approx(expected, abs=1e-4)
    assert result.lot == pytest.approx(expected, abs=1e-4)


def test_execute_trade_applies_dataclass_sizing_override() -> None:
    connector = StubConnector()
    algo = DynamicTradingAlgo(connector=connector)

    signal = {
        "action": ORDER_ACTION_BUY,
        "sizing": PositionSizing(notional=150.0, leverage=1.5, notes="risk guided"),
    }

    result = algo.execute_trade(signal, lot=0.05, symbol="ethusd")

    assert len(connector.calls) == 1
    symbol, lot = connector.calls[0]
    assert symbol == "ETHUSD"

    profile = algo.instrument_profiles["ETHUSD"]
    expected = algo._clamp_lot((150.0 * 1.5) / profile.reference_price, profile)

    assert lot == pytest.approx(expected, abs=1e-4)
    assert result.lot == pytest.approx(expected, abs=1e-4)


def test_execute_trade_applies_fractional_equity_sizing() -> None:
    connector = StubConnector()
    algo = DynamicTradingAlgo(connector=connector)

    signal = {
        "action": ORDER_ACTION_BUY,
        "sizing": {"equity": 100_000, "risk_percent": 1.25, "leverage": 2.0},
    }

    result = algo.execute_trade(signal, lot=0.1, symbol="xauusd")

    assert len(connector.calls) == 1
    symbol, lot = connector.calls[0]
    assert symbol == "XAUUSD"

    profile = algo.instrument_profiles["XAUUSD"]
    expected_raw = (100_000 * (1.25 / 100.0) * 2.0) / profile.reference_price
    expected = algo._clamp_lot(expected_raw, profile)

    assert lot == pytest.approx(expected, abs=1e-4)
    assert result.lot == pytest.approx(expected, abs=1e-4)


def test_execute_trade_respects_disabled_sizing_directive() -> None:
    connector = StubConnector()
    algo = DynamicTradingAlgo(connector=connector)

    signal = {
        "action": ORDER_ACTION_BUY,
        "sizing": {"apply": False, "lot": 5.0},
    }

    result = algo.execute_trade(signal, lot=0.3, symbol="eurusd")

    assert len(connector.calls) == 1
    symbol, lot = connector.calls[0]
    assert symbol == "EURUSD"

    profile = algo.instrument_profiles["EURUSD"]
    expected = algo._clamp_lot(0.3, profile)

    assert lot == pytest.approx(expected, abs=1e-4)
    assert result.lot == pytest.approx(expected, abs=1e-4)
