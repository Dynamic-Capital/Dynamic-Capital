"""Tests for the DynamicSEOAlgo utilities."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_algo import DynamicSEOAlgo  # noqa: E402


def test_dynamic_seo_algo_builds_location_sensitive_plan() -> None:
    algo = DynamicSEOAlgo(max_keyword_variations=8)
    plan = algo.build_plan(
        brand="Dynamic Capital",
        product="AI Trading Desk",
        audience="hedge funds",
        value_props=[
            "execution co-pilot",
            "risk-aware signal routing",
            "real-time treasury telemetry",
        ],
        base_keywords=["ai trading signals", "forex automation"],
        geo={
            "city": "Singapore",
            "region": "Singapore",
            "country": "Singapore",
            "country_code": "sg",
            "latitude": 1.3521,
            "longitude": 103.8198,
            "timezone": "Asia/Singapore",
        },
        tone="institutional",
        canonical_base="https://dynamic.capital",
    )

    assert "Singapore" in plan.title
    assert plan.slug == "ai-trading-desk-singapore"
    assert plan.canonical_url == "https://dynamic.capital/ai-trading-desk-singapore"
    assert any("Singapore" in keyword for keyword in plan.keywords)
    assert plan.open_graph["locale"] == "en_SG"
    assert plan.schema_org["@type"] == "LocalBusiness"
    assert plan.schema_org["address"]["addressLocality"] == "Singapore"
    assert plan.schema_org["geo"]["latitude"] == 1.3521


def test_dynamic_seo_algo_handles_missing_geo() -> None:
    algo = DynamicSEOAlgo(max_keyword_variations=5)
    plan = algo.build_plan(
        brand="Dynamic Capital",
        product="AI Strategy Lab",
        base_keywords=["ai strategy"],
        value_props=["institutional playbooks"],
        tone="analytical",
    )

    assert plan.slug == "ai-strategy-lab"
    assert plan.canonical_url == "/ai-strategy-lab"
    assert "solutions" in plan.keywords[-1]
    assert plan.schema_org["@type"] == "Organization"
    assert plan.open_graph["locale"] == "en_US"
