from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dynamic_candles import Candle, CandleAnalytics, CandleSeries, DynamicCandles, PatternSignal


def make_candle(**overrides: object) -> Candle:
    base = {
        "symbol": "BTCUSD",
        "open": 100.0,
        "high": 110.0,
        "low": 95.0,
        "close": 105.0,
        "volume": 500.0,
        "timestamp": datetime(2024, 1, 1, tzinfo=timezone.utc),
    }
    base.update(overrides)
    return Candle(**base)


class TestCandle:
    def test_metrics_and_normalisation(self) -> None:
        candle = make_candle(open=101.0, close=108.0)
        assert candle.symbol == "BTCUSD"
        assert candle.body == pytest.approx(7.0)
        assert candle.upper_wick == pytest.approx(2.0)
        assert candle.lower_wick == pytest.approx(6.0)
        assert candle.direction == "bullish"
        assert candle.typical_price == pytest.approx((110 + 95 + 108) / 3)
        assert candle.true_range(99.0) == pytest.approx(15.0)

    def test_invalid_bounds_raise(self) -> None:
        with pytest.raises(ValueError):
            make_candle(high=98.0)
        with pytest.raises(ValueError):
            make_candle(open=120.0)
        with pytest.raises(ValueError):
            make_candle(close=90.0)


class TestCandleSeries:
    def test_append_from_mapping_and_limits(self) -> None:
        series = CandleSeries(maxlen=3)
        series.append(
            {
                "symbol": "ETHUSD",
                "open": 100,
                "high": 104,
                "low": 99,
                "close": 102,
                "volume": 50,
            }
        )
        series.extend(
            [
                make_candle(open=102, high=112, low=101, close=111, volume=70),
                make_candle(open=111, high=115, low=108, close=109, volume=60),
                make_candle(open=109, high=118, low=107, close=117, volume=90),
            ]
        )
        assert len(series.candles) == 3  # respects maxlen
        assert series.latest.close == pytest.approx(117)
        assert series.average_true_range(2) > 0
        assert series.momentum(2) != 0
        assert -1.0 <= series.volume_pressure(3) <= 1.0
        assert -1.0 <= series.trend_strength(3) <= 1.0


class TestDynamicCandles:
    def test_snapshot_contains_metrics(self) -> None:
        engine = DynamicCandles(max_candles=10, pattern_sensitivity=0.4)
        engine.ingest_many(
            [
                make_candle(open=100, high=110, low=95, close=96, volume=40),
                make_candle(open=96, high=105, low=92, close=93, volume=50),
                make_candle(open=92, high=108, low=90, close=107, volume=120),
            ]
        )
        snapshot = engine.snapshot()
        assert isinstance(snapshot, CandleAnalytics)
        assert snapshot.window == 3
        assert snapshot.latest_close == pytest.approx(107)
        assert snapshot.atr > 0
        assert snapshot.momentum > 0
        assert -1.0 <= snapshot.volume_pressure <= 1.0
        assert -1.0 <= snapshot.trend_strength <= 1.0

    def test_bullish_engulfing_pattern_detected(self) -> None:
        engine = DynamicCandles(pattern_sensitivity=0.4)
        engine.ingest(
            make_candle(open=110, high=115, low=100, close=101, volume=80)
        )  # bearish candle
        engine.ingest(
            make_candle(open=99, high=118, low=98, close=116, volume=120)
        )  # bullish engulfing candle
        snapshot = engine.snapshot()
        names = {signal.name for signal in snapshot.patterns}
        assert "bullish-engulfing" in names

    def test_hammer_and_doji_filters(self) -> None:
        engine = DynamicCandles(pattern_sensitivity=0.3)
        hammer = make_candle(open=105, high=108, low=95, close=107, volume=75)
        doji = make_candle(open=110, high=111, low=109, close=110.2, volume=30)
        engine.ingest_many([hammer, doji])
        snapshot = engine.snapshot()
        directions = {signal.direction for signal in snapshot.patterns}
        for signal in snapshot.patterns:
            assert isinstance(signal, PatternSignal)
            assert 0.0 <= signal.confidence <= 1.0
            assert signal.index == len(engine.candles) - 1
        assert {signal.name for signal in snapshot.patterns} <= {"hammer", "doji"}
        assert directions <= {"bullish", "neutral"}
