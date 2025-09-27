from __future__ import annotations

import pytest

from algorithms.python.market_psychology import (
    MarketPsychologyConsensusProvider,
    MarketPsychologyEngine,
    MarketPsychologySyncJob,
    PsychologySample,
)
from algorithms.python.supabase_sync import SupabaseTableWriter
from algorithms.python.trading_psychology_elements import Element, ElementProfile, ElementSignal


def _profile(signals: list[ElementSignal]) -> ElementProfile:
    return ElementProfile(signals=signals)


def _signal(
    element: Element,
    score: float,
    level: str,
    reasons: list[str] | None = None,
    recommendations: list[str] | None = None,
) -> ElementSignal:
    return ElementSignal(
        element=element,
        score=score,
        level=level,
        reasons=reasons or [],
        recommendations=recommendations or [],
    )


def test_engine_builds_weighted_consensus_with_deduped_reasons():
    engine = MarketPsychologyEngine()
    samples = [
        PsychologySample(
            symbol="ES",
            profile=_profile(
                [
                    _signal(
                        Element.FIRE,
                        6.0,
                        "elevated",
                        ["Heat building", "Pause"],
                        ["Reduce size"],
                    ),
                    _signal(Element.WATER, 3.0, "stable", ["Stay calm"], ["Journal"]),
                    _signal(Element.WIND, 1.0, "stable"),
                    _signal(Element.EARTH, 2.0, "building", ["Grounded"], ["Keep rituals"]),
                    _signal(Element.LIGHTNING, 0.0, "stable"),
                    _signal(Element.LIGHT, 3.0, "building", ["Clarity"], ["Share plan"]),
                    _signal(Element.DARKNESS, 1.0, "stable", ["Fatigue"], ["Rest"]),
                ]
            ),
            weight=1.0,
        ),
        PsychologySample(
            symbol="ES",
            profile=_profile(
                [
                    _signal(
                        Element.FIRE,
                        2.0,
                        "stable",
                        ["Heat building", "Tilt"],
                        ["Reduce size", "Pause"],
                    ),
                    _signal(
                        Element.WATER,
                        7.0,
                        "critical",
                        ["Stress spiking"],
                        ["Breathwork", "Journal"],
                    ),
                    _signal(Element.WIND, 3.0, "elevated", ["Chop"], ["Stay nimble"]),
                    _signal(Element.EARTH, 4.0, "peak", ["Grounded"], ["Keep rituals"]),
                    _signal(Element.LIGHTNING, 1.5, "elevated", ["News shock"], ["Guard"]),
                    _signal(Element.LIGHT, 5.0, "peak", ["Confidence"], ["Share plan"]),
                    _signal(Element.DARKNESS, 2.5, "elevated", ["Fatigue"], ["Rest"]),
                ]
            ),
            weight=2.0,
        ),
    ]

    snapshots = engine.run(samples)
    assert len(snapshots) == 1
    snapshot = snapshots[0]
    assert snapshot.symbol == "ES"
    assert snapshot.cohort_size == 2
    assert snapshot.dominant.element is Element.WATER
    assert snapshot.dominant.level == "critical"
    expected_water_score = (3.0 * 1.0 + 7.0 * 2.0) / 3.0
    assert snapshot.dominant.score == pytest.approx(expected_water_score, rel=1e-5)

    fire_consensus = next(item for item in snapshot.consensus if item.element is Element.FIRE)
    assert fire_consensus.reasons == ["Heat building", "Pause", "Tilt"]
    assert fire_consensus.recommendations == ["Reduce size", "Pause"]

    second = snapshot.consensus[1]
    assert snapshot.confidence_gap == pytest.approx(
        snapshot.dominant.score - second.score, rel=1e-5
    )

    total_positive = sum(max(entry.score, 0.0) for entry in snapshot.consensus)
    assert snapshot.consensus_ratio == pytest.approx(
        snapshot.dominant.score / total_positive, rel=1e-5
    )

    row = snapshot.to_row()
    assert row["dominantElement"] == "water"
    assert row["cohortSize"] == 2
    assert isinstance(row["breakdown"], list)
    assert row["breakdown"][0]["element"] == "water"


def test_provider_and_sync_job_bridge_to_writer():
    engine = MarketPsychologyEngine()
    sample = PsychologySample(
        symbol="NQ",
        profile=_profile(
            [
                _signal(Element.FIRE, 1.0, "stable"),
                _signal(Element.WATER, 2.0, "stable"),
                _signal(Element.WIND, 0.5, "stable"),
                _signal(Element.EARTH, 4.0, "building", ["Discipline"], ["Keep rituals"]),
                _signal(Element.LIGHTNING, 0.0, "stable"),
                _signal(Element.LIGHT, 5.0, "peak", ["Momentum"], ["Document wins"]),
                _signal(Element.DARKNESS, 0.0, "stable"),
            ]
        ),
    )
    provider = MarketPsychologyConsensusProvider(samples=[sample], engine=engine)
    snapshot = provider.fetch()[0]

    captured: dict[str, object] = {}

    class DummyWriter(SupabaseTableWriter):
        def __init__(self):  # pragma: no cover - simple wiring
            super().__init__(table="psychology", conflict_column="symbol")

        def upsert(self, rows):  # type: ignore[override]
            nonlocal captured
            captured = rows[0]
            return len(rows)

    writer = DummyWriter()

    job = MarketPsychologySyncJob(provider=provider, writer=writer)
    count = job.run()

    assert count == 1
    assert captured["symbol"] == "NQ"
    assert captured["dominantElement"] == snapshot.dominant.element.value
    assert captured["breakdown"][0]["element"] == snapshot.dominant.element.value
