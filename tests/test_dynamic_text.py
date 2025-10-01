from datetime import datetime

import pytest

from dynamic_text import DynamicTextEngine, TextContext, TextFragment


def test_text_fragment_normalisation() -> None:
    fragment = TextFragment(
        channel="  Email  ",
        content="  Lead update for liquidity partners  ",
        voice="  Empathetic strategist  ",
        language="  PlainText  ",
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
    assert fragment.language == "plaintext"
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
    assert digest.metrics["language_match_rate"] == pytest.approx(1.0)
    assert digest.metrics["history_language_coverage"] == pytest.approx(1.0)
    payload = digest.as_payload()
    assert payload["initiative"] == context.initiative
    assert len(payload["fragments"]) == 2
    assert all(item["language"] == "plaintext" for item in payload["fragments"])
    assert digest.metrics["python_fragment_ratio"] == pytest.approx(0.0)
    assert digest.metrics["language_focus_score"] == pytest.approx(1.0)


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


def test_language_preferences_prioritise_python() -> None:
    engine = DynamicTextEngine(history_limit=5)
    python_fragment = TextFragment(
        channel="docs",
        content="Refine pipeline orchestration",
        voice="Technical",
        language="python",
        clarity=0.92,
        warmth=0.45,
        boldness=0.62,
        novelty=0.7,
        tempo=0.55,
        emphasis=0.7,
        tags=("automation",),
    )
    typescript_fragment = TextFragment(
        channel="docs",
        content="Update client SDK helpers",
        voice="Technical",
        language="typescript",
        clarity=0.88,
        warmth=0.5,
        boldness=0.58,
        novelty=0.65,
        tempo=0.5,
        emphasis=0.68,
        tags=("sdk",),
    )
    sql_fragment = TextFragment(
        channel="docs",
        content="Refresh reporting materialised view",
        voice="Technical",
        language="sql",
        clarity=0.86,
        warmth=0.35,
        boldness=0.52,
        novelty=0.58,
        tempo=0.48,
        emphasis=0.55,
        tags=("analytics",),
    )
    engine.prime([python_fragment, typescript_fragment, sql_fragment])

    context = TextContext(
        initiative="Cross-runtime enablement",
        audience="Engineering guild",
        channel="docs",
        urgency=0.6,
        personalization=0.45,
        risk_appetite=0.4,
        preferred_languages=("python", "typescript"),
        highlight_limit=2,
    )

    digest = engine.compose(context, sample_size=3)
    fragments = digest.top_fragments()

    assert fragments[0] is python_fragment
    assert all(
        fragment.language in ("python", "typescript") for fragment in fragments
    )
    assert digest.metrics["language_match_rate"] == pytest.approx(1.0)
    assert digest.metrics["history_language_coverage"] == pytest.approx(2 / 3, rel=1e-3)
    assert digest.metrics["python_fragment_ratio"] == pytest.approx(1 / 3, rel=1e-3)
    assert digest.metrics["language_focus_score"] == pytest.approx(1.0)


def test_python_metrics_account_for_eviction() -> None:
    engine = DynamicTextEngine(history_limit=2)
    python_fragment = TextFragment(
        channel="docs",
        content="Add async worker",
        voice="Technical",
        language="python",
        clarity=0.9,
        warmth=0.4,
        boldness=0.55,
        novelty=0.65,
        tempo=0.5,
        emphasis=0.6,
    )
    plaintext_fragment = TextFragment(
        channel="docs",
        content="Rewrite onboarding guide",
        voice="Informative",
        language="plaintext",
        clarity=0.75,
        warmth=0.6,
        boldness=0.45,
        novelty=0.5,
        tempo=0.55,
        emphasis=0.55,
    )
    python_follow_up = TextFragment(
        channel="docs",
        content="Tighten pipeline validators",
        voice="Technical",
        language="python",
        clarity=0.88,
        warmth=0.42,
        boldness=0.6,
        novelty=0.68,
        tempo=0.52,
        emphasis=0.62,
    )

    engine.ingest(python_fragment)
    engine.ingest(plaintext_fragment)

    context = TextContext(
        initiative="Runtime alignment",
        audience="Platform guild",
        channel="docs",
        urgency=0.6,
        personalization=0.55,
        risk_appetite=0.5,
        preferred_languages=("python", "plaintext"),
        highlight_limit=2,
    )

    digest = engine.compose(context)
    assert digest.metrics["python_fragment_ratio"] == pytest.approx(0.5)
    assert digest.metrics["python_signal_strength"] == pytest.approx(
        python_fragment.signal_strength
    )

    engine.ingest(python_follow_up)
    digest = engine.compose(context)
    assert digest.metrics["python_fragment_ratio"] == pytest.approx(0.5)
    assert digest.metrics["python_signal_strength"] == pytest.approx(
        python_follow_up.signal_strength
    )
