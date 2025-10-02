"""Tests for bridging Dynamic Blood insights with the Dynamic Capital Token."""

from __future__ import annotations

from datetime import datetime, timezone

from dynamic_blood import BloodContext, BloodSample, DynamicBlood


def _make_sample() -> BloodSample:
    return BloodSample(
        rbc_count=4.8,
        wbc_count=6.2,
        platelet_count=250.0,
        hemoglobin=14.0,
        hematocrit=0.42,
        plasma_volume=3.3,
        lactate=1.1,
        ferritin=55.0,
        timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc),
        tags=("baseline",),
    )


def _token_summary() -> dict[str, object]:
    return {
        "price": 1.85,
        "effective_plan": {"final_mint": 1250.0},
        "allocation_total": 1100.0,
        "allocation_residual": 150.0,
        "notes": ["Treasury rebalance scheduled"],
    }


def test_capital_alignment_combines_blood_and_token_state() -> None:
    engine = DynamicBlood(window=8)
    engine.ingest(_make_sample())

    context = BloodContext(
        hydration_level=0.72,
        stress_index=0.38,
        altitude_meters=1200.0,
        recent_activity=0.4,
    )

    synthesis = engine.synthesise_capital_alignment(
        _token_summary(),
        context=context,
        ai_base_dim=8,
    )

    assert synthesis.token_price == 1.85
    assert synthesis.minted_supply == 1250.0
    assert synthesis.allocation_total == 1100.0
    assert synthesis.residual_supply == 150.0

    ai_layers = synthesis.as_dict()["models"]["dynamic_ai"]
    assert ai_layers, "dynamic AI layers should be generated"
    assert ai_layers[0]["units"] > 0

    assert "DCT" in synthesis.narrative
    assert "Dynamic AI" in synthesis.narrative
