"""Tests for the dynamic_dimensions package."""

from __future__ import annotations

from pytest import approx, raises

from dynamic_dimensions import DimensionAxis, DynamicDimensionEngine


def test_axis_normalisation_and_validation() -> None:
    axis = DimensionAxis(key="  Clarity  ", label="  Strategic Clarity  ", weight=2.5)
    assert axis.key == "clarity"
    assert axis.label == "Strategic Clarity"
    assert axis.weight == 2.5

    with raises(ValueError):
        DimensionAxis(key="focus", label="", weight=1.0)

    with raises(ValueError):
        DimensionAxis(key="flow", label="Flow", weight=0)


def test_engine_profiles_and_momentum() -> None:
    axes = [
        DimensionAxis("Clarity", "Clarity", weight=2.0),
        DimensionAxis("Focus", "Focus", weight=1.0),
        DimensionAxis("Flow", "Flow", weight=1.0),
    ]
    engine = DynamicDimensionEngine(axes, window=5)

    first_profile = engine.ingest({"clarity": 0.6, "focus": 0.4, "flow": 0.5})
    assert first_profile.sample_size == 1
    assert first_profile.composite == approx(0.525)
    assert first_profile.momentum == approx(0.0)
    assert first_profile.volatility == approx(0.0)

    second_profile = engine.ingest({"clarity": 0.9, "focus": 0.8, "flow": 0.7})
    assert second_profile.sample_size == 2
    assert second_profile.composite == approx(0.675)
    assert second_profile.momentum == approx(0.3)
    assert second_profile.volatility == approx(0.15)

    axis_scores = dict(second_profile.axis_scores)
    assert axis_scores == {
        "clarity": approx(0.75),
        "focus": approx(0.6),
        "flow": approx(0.6),
    }

    top_axes = second_profile.top_axes()
    assert top_axes[0][0] == "clarity"
    assert top_axes[0][1] == approx(0.75)


def test_unknown_dimension_rejected() -> None:
    engine = DynamicDimensionEngine([DimensionAxis("impact", "Impact")])
    with raises(KeyError):
        engine.ingest({"unknown": 0.5})


def test_category_scores_and_rankings() -> None:
    axes = [
        DimensionAxis("strategy", "Strategy", weight=2.0, category="mind"),
        DimensionAxis("wellness", "Wellness", weight=1.0, category="body"),
        DimensionAxis("creativity", "Creativity", weight=1.0, category="mind"),
    ]
    engine = DynamicDimensionEngine(axes, window=3)

    engine.ingest({"strategy": 0.5, "wellness": 0.7, "creativity": 0.6})
    profile = engine.ingest({"strategy": 0.9, "wellness": 0.8, "creativity": 0.4})

    assert profile.sample_size == 2
    category_scores = dict(profile.category_scores)
    assert category_scores["mind"] == approx((0.7 * 2.0 + 0.5 * 1.0) / (2.0 + 1.0))
    assert category_scores["body"] == approx(0.75)

    top_categories = profile.top_categories()
    assert top_categories[0][0] == "body"
    assert top_categories[0][1] == approx(0.75)
