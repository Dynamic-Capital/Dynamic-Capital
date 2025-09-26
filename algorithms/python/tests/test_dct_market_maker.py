"""Tests for the DCT market maker model."""

from __future__ import annotations

import math

import pytest

from algorithms.python.dct_market_maker import (
    DCTMarketMakerInputs,
    DCTMarketMakerModel,
)


def _build_inputs(**overrides: float) -> DCTMarketMakerInputs:
    base = {
        "mid_price": 1.05,
        "inventory": 5_000.0,
        "target_inventory": 5_000.0,
        "inventory_limit": 10_000.0,
        "volatility": 0.18,
        "ton_reference_price": 1.02,
        "onchain_depth": 18_000.0,
        "offchain_depth": 12_000.0,
        "recent_volume": 3_500.0,
        "buy_pressure": 0.4,
        "sell_pressure": 0.4,
        "treasury_support": 0.25,
        "basis_adjustment": 0.0,
    }
    base.update(overrides)
    return DCTMarketMakerInputs(**base)


def test_balanced_inventory_generates_symmetric_quotes() -> None:
    model = DCTMarketMakerModel()
    inputs = _build_inputs()

    quote = model.generate_quote(inputs)

    assert quote.bid_price < quote.ask_price
    assert quote.spread_bps >= model.min_spread_bps
    assert math.isclose(quote.inventory_ratio, 0.0, abs_tol=1e-6)
    assert not quote.rebalance_required
    assert quote.bid_size == pytest.approx(quote.ask_size, rel=0.05)


def test_inventory_overweight_skews_quotes_and_flags_rebalance() -> None:
    model = DCTMarketMakerModel()
    balanced_quote = model.generate_quote(_build_inputs())

    overweight_inputs = _build_inputs(inventory=9_500.0)
    overweight_quote = model.generate_quote(overweight_inputs)

    assert overweight_quote.rebalance_required
    assert overweight_quote.bid_price < balanced_quote.bid_price
    assert overweight_quote.fair_value < balanced_quote.fair_value
    assert overweight_quote.inventory_ratio > 0
    assert any("Inventory outside" in note for note in overweight_quote.notes)


def test_buy_pressure_increases_ask_size_and_shifts_fair_value() -> None:
    model = DCTMarketMakerModel()
    neutral_quote = model.generate_quote(_build_inputs())

    demand_quote = model.generate_quote(
        _build_inputs(buy_pressure=0.85, sell_pressure=0.1)
    )

    assert demand_quote.ask_size > demand_quote.bid_size
    assert demand_quote.fair_value > neutral_quote.fair_value


def test_liquidity_constrains_quote_size() -> None:
    model = DCTMarketMakerModel()
    deep_liquidity = model.generate_quote(_build_inputs())
    shallow_quote = model.generate_quote(
        _build_inputs(
            onchain_depth=0.0,
            offchain_depth=0.0,
            recent_volume=0.0,
        )
    )

    assert shallow_quote.bid_size < deep_liquidity.bid_size
    assert shallow_quote.ask_size < deep_liquidity.ask_size
    assert shallow_quote.bid_size >= model.min_quote_size * 0.25


def test_treasury_support_tightens_spread_and_records_note() -> None:
    model = DCTMarketMakerModel()
    baseline = model.generate_quote(_build_inputs(treasury_support=0.0))
    supported = model.generate_quote(_build_inputs(treasury_support=0.9))

    assert supported.spread_bps < baseline.spread_bps
    assert any("Treasury support" in note for note in supported.notes)
    summary = model.summarise_notes(supported)
    assert summary.startswith("• ")
