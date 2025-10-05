import types
from datetime import datetime, timezone
from typing import Any

import pytest

from dynamic.intelligence.ai_apps.risk import PositionSizing

from dynamic.trading.algo.trading_core import (
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


class RecordingCollector:
    def __init__(self) -> None:
        self.trades: list[dict[str, Any]] = []

    def record_trade(self, payload: dict[str, Any]) -> dict[str, Any]:
        self.trades.append(payload)
        return {"status": "accepted"}


def test_bootstrap_connector_prefers_trade_api(monkeypatch: pytest.MonkeyPatch) -> None:
    class DummyConnector:
        def __init__(self, base_url: str, **kwargs: Any) -> None:
            self.base_url = base_url
            self.kwargs = kwargs

    monkeypatch.setenv("TRADE_EXECUTION_API_URL", "https://broker.test/api")
    monkeypatch.setenv("TRADE_EXECUTION_API_KEY", "token")
    monkeypatch.setattr(
        "dynamic.trading.algo.trading_core.TradeAPIConnector",
        DummyConnector,
    )
    monkeypatch.setattr("dynamic.trading.algo.trading_core.MT5Connector", None, raising=False)

    algo = DynamicTradingAlgo()

    assert isinstance(algo.connector, DummyConnector)
    assert algo.connector.base_url == "https://broker.test/api"
    assert algo.connector.kwargs["api_key"] == "token"


def test_bootstrap_connector_propagates_retry_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    class DummyConnector:
        def __init__(self, base_url: str, **kwargs: Any) -> None:  # type: ignore[override]
            captured["base_url"] = base_url
            captured["kwargs"] = kwargs

    monkeypatch.setenv("TRADE_EXECUTION_API_URL", "https://broker.test")
    monkeypatch.setenv("TRADE_EXECUTION_MAX_ATTEMPTS", "4")
    monkeypatch.setenv("TRADE_EXECUTION_RETRY_BACKOFF", "0.15")
    monkeypatch.setattr(
        "dynamic.trading.algo.trading_core.TradeAPIConnector",
        DummyConnector,
    )
    monkeypatch.setattr("dynamic.trading.algo.trading_core.MT5Connector", None, raising=False)

    _ = DynamicTradingAlgo()

    assert captured["base_url"] == "https://broker.test"
    assert captured["kwargs"]["max_attempts"] == 4
    assert captured["kwargs"]["retry_backoff"] == pytest.approx(0.15)


def test_execute_trade_preserves_mapping_response_fields() -> None:
    class MappingConnector:
        def __init__(self) -> None:
            self.calls: list[tuple[str, float]] = []

        def buy(self, symbol: str, lot: float) -> dict[str, object]:
            self.calls.append((symbol, lot))
            return {
                "retcode": 201,
                "profit": 12.5,
                "ticket": 512,
                "price": 1.1111,
                "comment": "dict response",
            }

    connector = MappingConnector()
    algo = DynamicTradingAlgo(connector=connector)

    result = algo.execute_trade({"action": ORDER_ACTION_BUY}, lot=0.05, symbol="eurusd")

    assert connector.calls == [("EURUSD", 0.05)]
    assert result.retcode == 201
    assert result.profit == pytest.approx(12.5)
    assert result.ticket == 512
    assert result.price == pytest.approx(1.1111)
    assert result.message == "dict response"
    assert result.raw_response == {
        "retcode": 201,
        "profit": 12.5,
        "ticket": 512,
        "price": 1.1111,
        "comment": "dict response",
    }


def test_execute_trade_handles_nested_mapping_payload() -> None:
    class NestedConnector:
        def __init__(self) -> None:
            self.calls: list[tuple[str, float]] = []

        def buy(self, symbol: str, lot: float) -> dict[str, object]:
            self.calls.append((symbol, lot))
            return {
                "result": {
                    "code": "10009",
                    "profit": "18.75",
                    "order": "9001",
                    "price": "1.2345",
                    "message": "filled",
                },
                "meta": {"latency_ms": 45},
            }

    connector = NestedConnector()
    algo = DynamicTradingAlgo(connector=connector)

    result = algo.execute_trade({"action": ORDER_ACTION_BUY}, lot=0.02, symbol="ethusd")

    assert connector.calls == [("ETHUSD", 0.02)]
    assert result.retcode == SUCCESS_RETCODE
    assert result.profit == pytest.approx(18.75)
    assert result.ticket == 9001
    assert result.price == pytest.approx(1.2345)
    assert result.message == "filled"
    assert result.raw_response == {
        "result": {
            "code": "10009",
            "profit": "18.75",
            "order": "9001",
            "price": "1.2345",
            "message": "filled",
        },
        "meta": {"latency_ms": 45},
    }


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
    gauss_value = 7.5
    random_values = iter([0.8, 0.4])

    monkeypatch.setattr("dynamic.trading.algo.trading_core.random.gauss", lambda *_args: gauss_value)
    monkeypatch.setattr(
        "dynamic.trading.algo.trading_core.random.random",
        lambda: next(random_values),
    )
    monkeypatch.setattr("dynamic.trading.algo.trading_core.random.randint", lambda _a, _b: 12345)

    result = algo.execute_trade({"action": "sell"}, lot=0.001, symbol="xrp/usdt")

    assert result.symbol == "XRPUSD"
    assert result.lot == pytest.approx(1.0)
    assert result.profit == pytest.approx(-16.48, rel=0, abs=1e-9)
    assert result.price == pytest.approx(0.6095, rel=0, abs=1e-9)
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


def test_execute_trade_blends_intelligence_overlays() -> None:
    connector = StubConnector()
    algo = DynamicTradingAlgo(connector=connector)

    signal = {
        "action": ORDER_ACTION_BUY,
        "intelligence": {
            "ai": {"confidence": 0.8, "conviction": 0.65, "bias": 0.25},
            "agi": {"directive": "scale_up", "risk": 0.3, "alignment": 0.1},
            "exposure_bias": 0.1,
            "stability": 0.4,
        },
    }

    expected = 0.2
    expected *= 0.72 + 0.56 * 0.8
    expected *= 0.75 + 0.45 * 0.65
    expected *= 1.0 + 0.18 * 0.25
    expected *= 1.0 + 0.12 * 0.1
    expected *= 1.0 + 0.15 * 0.1
    expected *= max(0.55, 1.0 - 0.6 * 0.3)
    expected *= 0.85 + 0.3 * 0.4
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


def test_execute_trade_emits_data_collection_payload() -> None:
    connector = StubConnector()
    collector = RecordingCollector()
    algo = DynamicTradingAlgo(connector=connector, data_collector=collector)

    signal = {
        "action": ORDER_ACTION_BUY,
        "note": "collect",
        "timestamp": datetime(2024, 5, 1, 12, 0, tzinfo=timezone.utc),
        "intelligence": {"confidence": 0.9},
    }

    result = algo.execute_trade(signal, lot=0.2, symbol="eurusd")

    assert collector.trades
    payload = collector.trades[-1]
    assert payload["trade"]["symbol"] == "EURUSD"
    assert payload["context"]["symbol"] == "EURUSD"
    assert payload["context"]["lot"] == pytest.approx(result.lot)
    assert payload["context"]["profile"]["symbol"] == "EURUSD"
    assert payload["signal"]["note"] == "collect"
    assert payload["signal"]["timestamp"].endswith("+00:00")


def test_bootstrap_data_collector(monkeypatch: pytest.MonkeyPatch) -> None:
    sentinel = object()
    monkeypatch.setenv("DATA_COLLECTION_API_URL", "https://collector.test")
    monkeypatch.setattr(
        "dynamic.trading.algo.trading_core.bootstrap_data_collection_api",
        lambda: sentinel,
    )
    monkeypatch.setattr("dynamic.trading.algo.trading_core.MT5Connector", None, raising=False)

    algo = DynamicTradingAlgo()

    assert algo.data_collector is sentinel
