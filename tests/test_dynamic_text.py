from datetime import datetime

import pytest

from dynamic_text import DynamicTextEngine, TextContext, TextFragment


def test_text_fragment_normalisation() -> None:
    fragment = TextFragment(
        channel="  Email  ",
        content="  Lead update for liquidity partners  ",
        voice="  Empathetic strategist  ",
        clarity=1.4,
        warmth=-0.3,
        boldness=1.7,
        novelty=-0.4,
        tempo=1.8,
        emphasis=1.2,
        weight=-2.0,
        timestamp=datetime(2024, 1, 1, 8, 30),
        intents=(" Welcome  ", "welcome"),
        tags=(" Liquidity  ", ""),
        metadata={"owner": " Comms Guild "},
    )

    assert fragment.channel == "email"
    assert fragment.content == "Lead update for liquidity partners"
    assert fragment.voice == "Empathetic strategist"
    assert 0.0 <= fragment.clarity <= 1.0
    assert 0.0 <= fragment.warmth <= 1.0
    assert 0.0 <= fragment.boldness <= 1.0
    assert 0.0 <= fragment.novelty <= 1.0
    assert 0.0 <= fragment.tempo <= 1.0
    assert 0.0 <= fragment.emphasis <= 1.0
    assert fragment.weight == 0.0
    assert fragment.timestamp.tzinfo is not None
    assert fragment.intents == ("welcome",)
    assert fragment.tags == ("liquidity",)
    assert fragment.metadata == {"owner": " Comms Guild "}
    assert 0.0 <= fragment.signal_strength <= 1.0
    assert isinstance(fragment.is_priority, bool)


def test_compose_generates_digest_with_metrics() -> None:
    engine = DynamicTextEngine(history_limit=5)
    engine.prime(
        [
            TextFragment(
                channel="email",
                content="Alpha launch debrief",
                voice="Strategic",
                clarity=0.9,
                warmth=0.7,
                boldness=0.6,
                novelty=0.65,
                tempo=0.7,
                emphasis=0.85,
                tags=("liquidity", "partners"),
            ),
            TextFragment(
                channel="email",
                content="Liquidity partner outreach",
                voice="Empathetic",
                clarity=0.8,
                warmth=0.8,
                boldness=0.55,
                novelty=0.6,
                tempo=0.75,
                emphasis=0.8,
                tags=("liquidity", "priority"),
            ),
            TextFragment(
                channel="sms",
                content="Ops checkpoint",
                voice="Direct",
                clarity=0.7,
                warmth=0.4,
                boldness=0.5,
                novelty=0.5,
                tempo=0.9,
                emphasis=0.4,
                tags=("operations",),
            ),
        ]
    )

    context = TextContext(
        initiative="Treasury partner cadence",
        audience="Growth desk",
        channel="email",
        urgency=0.7,
        personalization=0.6,
        risk_appetite=0.55,
        emphasis_tags=("liquidity",),
        guardrail_tags=("legacy",),
        highlight_limit=2,
    )

    digest = engine.compose(context, sample_size=4)

    fragments = digest.top_fragments()
    assert len(fragments) == 2
    assert all(fragment.channel == "email" for fragment in fragments)
    assert digest.metrics["history_size"] >= len(fragments)
    assert 0.0 <= digest.metrics["mean_signal_strength"] <= 1.0
    assert digest.metrics["available_fragments"] <= 4
    payload = digest.as_payload()
    assert payload["initiative"] == context.initiative
    assert len(payload["fragments"]) == 2


def test_guardrail_penalty_affects_ranking() -> None:
    engine = DynamicTextEngine(history_limit=3)
    safe_fragment = TextFragment(
        channel="email",
        content="Priority partner follow-up",
        voice="Warm",
        clarity=0.8,
        warmth=0.85,
        boldness=0.5,
        novelty=0.6,
        tempo=0.6,
        emphasis=0.9,
        tags=("priority",),
    )
    guard_fragment = TextFragment(
        channel="email",
        content="Legacy program recap",
        voice="Warm",
        clarity=0.8,
        warmth=0.85,
        boldness=0.5,
        novelty=0.6,
        tempo=0.6,
        emphasis=0.9,
        tags=("legacy",),
    )

    engine.ingest(safe_fragment)
    engine.ingest(guard_fragment)

    context = TextContext(
        initiative="Partner uplift",
        audience="Executive guild",
        channel="email",
        urgency=0.5,
        personalization=0.4,
        risk_appetite=0.5,
        emphasis_tags=("priority",),
        guardrail_tags=("legacy",),
        highlight_limit=1,
    )

    digest = engine.compose(context)

    top_fragment = digest.top_fragments()[0]
    assert top_fragment is safe_fragment
    assert guard_fragment not in digest.top_fragments()

    with pytest.raises(ValueError):
        TextContext(
            initiative="Invalid",
            audience="Test",
            channel="email",
            urgency=0.5,
            personalization=0.5,
            risk_appetite=0.5,
            highlight_limit=0,
        )
