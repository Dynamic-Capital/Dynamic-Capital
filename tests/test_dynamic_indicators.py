"""Tests for the dynamic indicators presets."""

from __future__ import annotations

from dynamic_indicators import (
    DEFAULT_INDICATOR_SPECS,
    IndicatorDefinition,
    create_dynamic_indicators,
)


def test_create_dynamic_indicators_with_defaults() -> None:
    orchestrator = create_dynamic_indicators()
    definitions = orchestrator.definitions

    expected_keys = {spec["key"] for spec in DEFAULT_INDICATOR_SPECS}
    assert set(definitions) == expected_keys

    national = definitions["dynamic_national_statistics"]
    assert national.title == "Dynamic National Statistics"
    assert national.description == "Latest data sourced directly from official sources."

    calendar = definitions["dynamic_economic_calendar"]
    assert calendar.metadata["update_frequency"] == "24/7"

    commodities = definitions["dynamic_commodities"]
    assert commodities.metadata["segments"] == (
        "energy",
        "metals",
        "agricultural",
        "livestock",
        "industrial",
    )


def test_create_dynamic_indicators_accepts_overrides() -> None:
    override = {
        "key": "dynamic_stocks",
        "title": "Dynamic Stocks Overview",
        "description": "Updated equities coverage.",
        "category": "equities",
        "target": 0.9,
        "warning": 0.7,
        "critical": 0.5,
    }

    custom_definition = IndicatorDefinition(
        key="dynamic_liquidity",
        title="Dynamic Liquidity",
        description="Monitors cross-asset liquidity conditions.",
        category="risk",
        target=0.88,
        warning=0.63,
        critical=0.42,
    )

    orchestrator = create_dynamic_indicators(definitions=(override, custom_definition))
    definitions = orchestrator.definitions

    assert definitions["dynamic_stocks"].title == "Dynamic Stocks Overview"
    assert "dynamic_liquidity" in definitions
    assert definitions["dynamic_liquidity"].target == 0.88
