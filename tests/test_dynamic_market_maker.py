"""Runtime helpers for the DCT market maker service."""

from __future__ import annotations

import math

import pytest

from dynamic.trading.algo import (
    DCTMarketMakerInputs,
    DCTMarketMakerModel,
    DCTMarketMakerQuote,
    DCTMarketMakerService,
    coerce_market_inputs,
)


def _sample_state(**overrides: float) -> dict[str, float]:
    state = {
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
    state.update(overrides)
    return state


def test_coerce_market_inputs_filters_unknown_keys() -> None:
    inputs = coerce_market_inputs(_sample_state(unknown_field=42.0))
    assert isinstance(inputs, DCTMarketMakerInputs)
    assert not hasattr(inputs, "unknown_field")


def test_coerce_market_inputs_requires_core_fields() -> None:
    incomplete = _sample_state()
    incomplete.pop("mid_price")
    with pytest.raises(KeyError):
        coerce_market_inputs(incomplete)


def test_service_quote_matches_underlying_model() -> None:
    mapping = _sample_state()
    service = DCTMarketMakerService()

    direct_inputs = DCTMarketMakerInputs(**mapping)
    direct_quote = DCTMarketMakerModel().generate_quote(direct_inputs)

    service_quote = service.quote(mapping)

    assert math.isclose(service_quote.bid_price, direct_quote.bid_price, rel_tol=1e-9)
    assert math.isclose(service_quote.ask_price, direct_quote.ask_price, rel_tol=1e-9)
    assert math.isclose(service_quote.fair_value, direct_quote.fair_value, rel_tol=1e-9)


def test_service_quote_allows_overrides() -> None:
    service = DCTMarketMakerService()
    mapping = _sample_state()
    inputs = coerce_market_inputs(mapping)
    updated = service.build_inputs(inputs, inventory=8_500.0)

    assert isinstance(updated, DCTMarketMakerInputs)
    assert inputs.inventory == pytest.approx(5_000.0)
    assert updated.inventory == pytest.approx(8_500.0)
    assert updated is not inputs

    quote = service.quote(mapping, buy_pressure=0.9, sell_pressure=0.1)
    assert isinstance(quote, DCTMarketMakerQuote)
    assert quote.ask_size > quote.bid_size


def test_service_note_summary_returns_bullets() -> None:
    service = DCTMarketMakerService()
    quote = service.quote(_sample_state(treasury_support=0.9))
    summary = service.note_summary(quote)
    assert summary.startswith("• ")
