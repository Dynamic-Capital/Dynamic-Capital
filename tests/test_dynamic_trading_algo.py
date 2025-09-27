import types

import pytest

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
