from __future__ import annotations

from dynamic_wyckoff import (
    DynamicWyckoffEngine,
    WyckoffBias,
    WyckoffCandle,
    WyckoffConfig,
    WyckoffPhase,
    WyckoffWindow,
)


def _range_sequence(length: int = 18, base: float = 100.0) -> list[WyckoffCandle]:
    candles: list[WyckoffCandle] = []
    for idx in range(length):
        mid = base + ((idx % 4) - 1.5) * 0.2
        high = mid + 0.6
        low = mid - 0.6
        open_price = min(high - 0.05, max(low + 0.05, mid - 0.1))
        close_price = min(high - 0.05, max(low + 0.05, mid + 0.1 * ((idx % 2) * 2 - 1)))
        volume = 900.0 + (idx % 5) * 40.0
        candles.append(
            WyckoffCandle(
                open=open_price,
                high=high,
                low=low,
                close=close_price,
                volume=volume,
            )
        )
    return candles


def test_detects_spring_event_with_volume_confirmation() -> None:
    candles = _range_sequence()
    candles.append(
        WyckoffCandle(
            open=100.1,
            high=101.0,
            low=98.4,
            close=100.8,
            volume=1800.0,
        )
    )
    window = WyckoffWindow(candles=candles, average_daily_range=1.9)

    engine = DynamicWyckoffEngine(WyckoffConfig(volume_spike_factor=1.5))
    evaluation = engine.evaluate(window)

    assert evaluation.phase is WyckoffPhase.ACCUMULATION
    assert evaluation.signal.trigger == "spring"
    assert evaluation.bias is WyckoffBias.BULLISH
    assert evaluation.confidence >= 0.55
    assert any("Spring event" in note for note in evaluation.signal.notes)


def test_detects_utad_event_for_distribution() -> None:
    candles = _range_sequence()
    candles.append(
        WyckoffCandle(
            open=100.6,
            high=102.4,
            low=100.2,
            close=100.5,
            volume=1700.0,
        )
    )
    window = WyckoffWindow(candles=candles, average_daily_range=1.8)

    engine = DynamicWyckoffEngine(WyckoffConfig(volume_spike_factor=1.4))
    evaluation = engine.evaluate(window)

    assert evaluation.phase is WyckoffPhase.DISTRIBUTION
    assert evaluation.signal.trigger == "utad"
    assert evaluation.bias is WyckoffBias.BEARISH
    assert evaluation.confidence >= 0.55
    assert "UTAD" in " ".join(evaluation.signal.notes)


def test_trend_detection_prefers_markup_in_strong_rally() -> None:
    candles: list[WyckoffCandle] = []
    price = 100.0
    for _ in range(22):
        open_price = price
        close_price = price + 0.5
        high = close_price + 0.3
        low = open_price - 0.3
        candles.append(
            WyckoffCandle(
                open=open_price,
                high=high,
                low=low,
                close=close_price,
                volume=950.0,
            )
        )
        price += 0.45
    window = WyckoffWindow(candles=candles, average_daily_range=2.1)

    engine = DynamicWyckoffEngine()
    evaluation = engine.evaluate(window)

    assert evaluation.phase is WyckoffPhase.MARKUP
    assert evaluation.bias is WyckoffBias.BULLISH
    assert evaluation.signal.trigger == "trend_continuation"
    assert evaluation.confidence >= 0.5


def test_low_conviction_range_returns_neutral_bias() -> None:
    candles: list[WyckoffCandle] = []
    for _ in range(10):
        candles.append(
            WyckoffCandle(
                open=100.0,
                high=100.2,
                low=99.8,
                close=100.05,
                volume=400.0,
            )
        )
    window = WyckoffWindow(candles=candles, average_daily_range=2.5)

    engine = DynamicWyckoffEngine()
    evaluation = engine.evaluate(window)

    assert evaluation.bias is WyckoffBias.NEUTRAL
    assert evaluation.confidence < 0.4
    assert any("confidence" in note.lower() for note in evaluation.signal.notes)
