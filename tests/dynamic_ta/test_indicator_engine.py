from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dynamic_indicators.engine import (
    DynamicIndicators,
    IndicatorDefinition,
    IndicatorReading,
)


def _timestamp(hour: int) -> datetime:
    return datetime(2024, 6, 1, hour=hour, tzinfo=timezone.utc)


def test_snapshot_computes_weighted_values_and_notes() -> None:
    indicators = DynamicIndicators(
        history=10,
        definitions=(
            IndicatorDefinition(
                key="momentum",
                title="Momentum Index",
                target=0.7,
                warning=0.55,
                critical=0.35,
                orientation="higher",
            ),
        ),
    )

    indicators.ingest(
        IndicatorReading(
            "momentum",
            value=0.65,
            confidence=0.8,
            sample_size=5,
            timestamp=_timestamp(8),
            notes=("Breakout forming",),
        )
    )
    indicators.ingest(
        {
            "indicator": "momentum",
            "value": 0.72,
            "confidence": 0.9,
            "sample_size": 3,
            "timestamp": _timestamp(9),
            "notes": ("Volume expansion",),
        }
    )

    snapshot = indicators.snapshot("momentum")

    assert snapshot.value == pytest.approx(0.677142857, rel=1e-6)
    assert snapshot.change == pytest.approx(0.07, rel=1e-6)
    assert snapshot.trend == pytest.approx(0.07, rel=1e-6)
    assert snapshot.confidence == pytest.approx(0.85, rel=1e-6)
    assert snapshot.status == "watch"
    assert snapshot.notes[0] == "Volume expansion"
    assert "Momentum Index is watch" in snapshot.summary
    assert snapshot.metadata["reading_count"] == 2
    assert snapshot.as_dict()["key"] == "momentum"


def test_overview_segments_indicators_by_status() -> None:
    indicators = DynamicIndicators(
        definitions=(
            IndicatorDefinition(
                key="momentum",
                title="Momentum Index",
                target=0.7,
                warning=0.55,
                critical=0.35,
                orientation="higher",
            ),
            IndicatorDefinition(
                key="drawdown",
                title="Drawdown Risk",
                target=0.2,
                warning=0.3,
                critical=0.5,
                orientation="lower",
                weight=2.0,
            ),
        ),
    )

    indicators.ingest(
        (
            IndicatorReading("momentum", value=0.6, confidence=0.7, timestamp=_timestamp(10)),
            IndicatorReading("momentum", value=0.58, confidence=0.6, timestamp=_timestamp(11)),
            IndicatorReading("drawdown", value=0.19, confidence=0.8, timestamp=_timestamp(10)),
            IndicatorReading("drawdown", value=0.17, confidence=0.9, timestamp=_timestamp(11)),
        )
    )

    overview = indicators.overview()

    assert overview.indicator_count == 2
    assert overview.healthy == ("Drawdown Risk",)
    assert overview.watch == ("Momentum Index",)
    assert overview.at_risk == ()
    assert overview.insufficient == ()
    assert 0.0 < overview.overall_health <= 1.0
    assert overview.average_confidence == pytest.approx((0.7 + 0.6 + 0.8 + 0.9) / 4, rel=1e-6)
    assert overview.alerts
    assert "Momentum Index" in overview.alerts[0]
    assert overview.narrative.startswith("Tracking 2 indicators")

    payload = overview.as_dict()
    assert payload["indicator_count"] == 2
    assert "healthy" in payload


def test_ingest_rejects_unknown_indicators() -> None:
    indicators = DynamicIndicators()

    with pytest.raises(KeyError):
        indicators.ingest(IndicatorReading("momentum", value=0.5))

    registered = indicators.register(
        IndicatorDefinition(
            key="momentum",
            title="Momentum",
            target=0.5,
        )
    )
    assert registered.key == "momentum"

    ingested = indicators.ingest(
        IndicatorReading("momentum", value=0.5, confidence=0.4, timestamp=_timestamp(12))
    )
    assert len(ingested) == 1
