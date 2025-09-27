from datetime import datetime, timedelta

import pytest

from dynamic_tag import DynamicTagEngine, TagContext, TagSignal


def _dt(hours: int = 0) -> datetime:
    base = datetime(2024, 1, 1, 12, 0)
    return base + timedelta(hours=hours)


def test_tag_signal_normalisation() -> None:
    signal = TagSignal(
        tag="  Growth  ",
        source="  Intelligence  ",
        intensity=1.4,
        momentum=-0.2,
        confidence=1.3,
        volume=-5,
        timestamp=datetime(2024, 1, 1, 8, 30),
        related_tags=(" Focus ", "focus"),
        metadata={"owner": " Tag Ops "},
    )

    assert signal.tag == "growth"
    assert signal.source == "intelligence"
    assert 0.0 <= signal.intensity <= 1.0
    assert 0.0 <= signal.momentum <= 1.0
    assert 0.0 <= signal.confidence <= 1.0
    assert signal.volume == 0.0
    assert signal.timestamp.tzinfo is not None
    assert signal.related_tags == ("focus",)
    assert signal.metadata == {"owner": " Tag Ops "}
    assert 0.0 <= signal.quality <= 1.0


def test_generate_prioritises_focus_tags() -> None:
    engine = DynamicTagEngine(history_limit=6, half_life_hours=24.0)
    engine.prime(
        [
            TagSignal(
                tag="Growth",
                source="Product",
                intensity=0.9,
                momentum=0.85,
                confidence=0.8,
                volume=40,
                timestamp=_dt(hours=-2),
            ),
            TagSignal(
                tag="Liquidity",
                source="Research",
                intensity=0.75,
                momentum=0.6,
                confidence=0.7,
                volume=30,
                timestamp=_dt(hours=-8),
            ),
            TagSignal(
                tag="Legacy",
                source="Product",
                intensity=0.6,
                momentum=0.55,
                confidence=0.65,
                volume=20,
                timestamp=_dt(hours=-1),
            ),
            TagSignal(
                tag="Momentum",
                source="Spam",
                intensity=0.9,
                momentum=0.9,
                confidence=0.9,
                volume=80,
                timestamp=_dt(hours=-1),
            ),
        ]
    )

    context = TagContext(
        focus_tags=("Growth", "Liquidity"),
        avoid_tags=("Legacy",),
        preferred_sources=("Product",),
        blocked_sources=("Spam",),
        highlight_limit=2,
        recency_bias=0.7,
        minimum_confidence=0.6,
        anchor_time=_dt(hours=0),
    )

    digest = engine.generate(context, sample_size=5)
    highlights = digest.top_tags()

    assert highlights[0] == "growth"
    assert "liquidity" in highlights
    assert "legacy" not in highlights
    assert digest.metrics["focus_coverage"] > 0.0
    assert digest.metrics["available_signals"] <= 5
    assert digest.metrics["effective_signals"] == pytest.approx(2.0)


def test_generate_handles_empty_history() -> None:
    engine = DynamicTagEngine()
    context = TagContext(highlight_limit=1)

    digest = engine.generate(context)

    assert digest.top_tags() == ()
    assert digest.metrics["history_size"] == 0.0
    assert digest.metrics["mean_confidence"] == 0.0
