from __future__ import annotations

import math

import pytest

from dynamic_btmm import (
    BTMMConfig,
    BTMMInputs,
    DynamicBTMMEngine,
)


def _inputs(**overrides: object) -> BTMMInputs:
    base = {
        "mid_price": 100.0,
        "mm_bid": 99.6,
        "mm_ask": 100.4,
        "predicted_fair_value": 101.2,
        "predicted_volatility": 0.25,
        "signal_strength": 0.8,
        "orderbook_imbalance": 0.35,
        "mm_inventory_estimate": 2_500.0,
        "mm_liquidity": 5_000.0,
        "available_liquidity": 3_800.0,
        "our_inventory": 1_000.0,
        "inventory_limit": 10_000.0,
        "max_position": 8_000.0,
        "max_trade_size": 2_000.0,
        "latency_ms": 35.0,
        "risk_appetite": 0.7,
    }
    base.update(overrides)
    return BTMMInputs(**base)  # type: ignore[arg-type]


def test_engine_recommends_buy_when_edge_positive() -> None:
    engine = DynamicBTMMEngine()
    decision = engine.evaluate(_inputs())

    assert decision.should_trade is True
    assert decision.best_opportunity is not None
    assert decision.best_opportunity.side == "buy"
    assert decision.best_opportunity.size > 0
    assert decision.best_opportunity.expected_value > 0
    assert decision.notes[0].startswith("Execute opportunistic BUY")
    payload = decision.as_dict()
    assert payload["should_trade"] is True
    assert payload["best_opportunity"]["side"] == "buy"


def test_high_volatility_and_inventory_bias_pause_trading() -> None:
    engine = DynamicBTMMEngine()
    decision = engine.evaluate(
        _inputs(
            predicted_volatility=1.1,
            our_inventory=7_600.0,
            orderbook_imbalance=-0.4,
            signal_strength=0.3,
            risk_appetite=0.2,
        )
    )

    assert decision.should_trade is False
    assert decision.best_opportunity is None or decision.best_opportunity.size == 0
    assert decision.notes[0].startswith("Stand down")
    assert decision.risk_score >= 0.6


def test_sizing_respects_position_limits() -> None:
    engine = DynamicBTMMEngine(BTMMConfig(max_position_fraction=0.8))
    decision = engine.evaluate(
        _inputs(
            our_inventory=7_900.0,
            max_position=8_000.0,
            max_trade_size=1_500.0,
            predicted_fair_value=102.0,
        )
    )

    best = decision.best_opportunity
    assert best is not None
    assert best.side == "buy"
    assert best.size <= 80.0  # 100 position room * 0.8 fraction
    assert math.isclose(best.size, 80.0, rel_tol=1e-5) or best.size == pytest.approx(80.0)


def test_negative_edge_records_watchlist_note() -> None:
    engine = DynamicBTMMEngine()
    decision = engine.evaluate(
        _inputs(
            predicted_fair_value=101.5,
            signal_strength=0.4,
            orderbook_imbalance=0.2,
        )
    )

    sell = next(op for op in decision.opportunities if op.side == "sell")
    assert sell.adjusted_edge_bps <= 0
    assert any("watchlist" in note.lower() for note in sell.rationale)


def test_risk_throttle_reduces_positioning_when_exposure_high() -> None:
    config = BTMMConfig(
        risk_throttle_threshold=0.3,
        risk_throttle_strength=0.9,
        max_risk_score=0.95,
    )
    engine = DynamicBTMMEngine(config)
    decision = engine.evaluate(
        _inputs(
            our_inventory=7_000.0,
            predicted_volatility=1.4,
            available_liquidity=2_000.0,
            mm_liquidity=3_000.0,
            risk_appetite=0.9,
            orderbook_imbalance=0.6,
            signal_strength=0.95,
            predicted_fair_value=102.0,
        )
    )

    best = decision.best_opportunity
    assert best is not None
    assert best.size > 0
    assert any("throttle" in note.lower() for note in best.rationale)
    assert any("throttle" in note.lower() for note in decision.notes)
