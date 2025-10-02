from __future__ import annotations

from algorithms.python.wyckoff_strategy import (
    DynamicWyckoffStrategy,
    PriceBar,
    WyckoffConfig,
)


def sample_bars() -> list[PriceBar]:
    return [
        PriceBar(open=100.0, high=101.2, low=99.5, close=100.8, volume=1100.0),
        PriceBar(open=100.8, high=101.5, low=99.7, close=100.2, volume=900.0),
        PriceBar(open=100.2, high=101.8, low=99.1, close=101.3, volume=1500.0),
        PriceBar(open=101.3, high=101.9, low=100.1, close=101.0, volume=1400.0),
        PriceBar(open=101.0, high=101.6, low=98.9, close=100.4, volume=2200.0),
        PriceBar(open=100.4, high=101.7, low=99.3, close=101.1, volume=1600.0),
        PriceBar(open=101.1, high=102.0, low=100.5, close=101.8, volume=1800.0),
        PriceBar(open=101.8, high=102.2, low=100.8, close=101.5, volume=1400.0),
        PriceBar(open=101.5, high=102.4, low=100.6, close=102.1, volume=1700.0),
        PriceBar(open=102.1, high=102.6, low=100.9, close=102.3, volume=1300.0),
    ]


def test_dynamic_wyckoff_strategy_flags_accumulation():
    bars = sample_bars()
    config = WyckoffConfig(
        range_low=99.0,
        range_high=102.5,
        support_level=99.0,
        breakout_price=102.0,
        entry_threshold=0.1,
        exit_threshold=0.0,
        volatility_factor=0.6,
        volume_spike_ratio=1.2,
    )
    strategy = DynamicWyckoffStrategy(config=config)

    metrics = strategy.evaluate(
        bars,
        account_risk=1000.0,
        entry_price=101.0,
        stop_loss=99.0,
    )

    assert metrics.buying_pressure > metrics.selling_pressure
    assert metrics.phase == "accumulation"
    assert metrics.spring_strength is not None and metrics.spring_strength > 0
    assert metrics.target_price > config.breakout_price
    assert metrics.entry_signal is True
    assert metrics.exit_signal is False
    assert metrics.position_size > 0
    assert metrics.wyckoff_entry_score > 0
