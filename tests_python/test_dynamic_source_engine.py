from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_source import engine as source_engine


@pytest.fixture()
def fixed_time(monkeypatch: pytest.MonkeyPatch) -> datetime:
    moment = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(source_engine, "_utcnow", lambda: moment)
    return moment


def _make_signal(**overrides: object) -> source_engine.SourceSignal:
    defaults: dict[str, object] = {
        "source": "Atlas Sentinel",
        "channel": "telemetry",
        "payload": "anomaly detected",
        "confidence": 0.9,
        "impact": 0.8,
        "latency_ms": 12.0,
    }
    defaults.update(overrides)
    return source_engine.SourceSignal(**defaults)


def test_snapshot_aggregates_metrics(fixed_time: datetime) -> None:
    engine = source_engine.DynamicSourceEngine(
        sources=[
            source_engine.SourceDescriptor(
                name="Atlas Sentinel",
                domain="orbital",
                reliability=0.8,
                criticality=0.6,
                freshness_sla_minutes=60,
            )
        ],
        stale_after_minutes=180,
    )

    engine.ingest_signals(
        [
            _make_signal(timestamp=fixed_time - timedelta(minutes=5)),
            _make_signal(
                confidence=0.75,
                impact=0.6,
                latency_ms=35.0,
                timestamp=fixed_time - timedelta(minutes=45),
            ),
        ]
    )

    snapshot = engine.snapshot("atlas sentinel", horizon_minutes=120)

    freshness_minutes = (5.0, 45.0)
    latency_penalties = (1.0, min(1.0, 200.0 / (35.0 + 1.0)))
    freshness_penalties = tuple(
        1.0 if minutes <= 1.0 else max(0.0, 1.0 - minutes / 180.0) for minutes in freshness_minutes
    )
    expected_scores = tuple(
        min(
            1.0,
            max(
                0.0,
                conf * 0.5 + impact * 0.35 + latency * 0.1 + freshness * 0.05,
            ),
        )
        for conf, impact, latency, freshness in zip(
            (0.9, 0.75), (0.8, 0.6), latency_penalties, freshness_penalties
        )
    )

    assert snapshot.metrics["total_signals"] == pytest.approx(2.0)
    assert snapshot.metrics["avg_confidence"] == pytest.approx((0.9 + 0.75) / 2)
    assert snapshot.metrics["avg_impact"] == pytest.approx((0.8 + 0.6) / 2)
    assert snapshot.metrics["avg_latency_ms"] == pytest.approx((12.0 + 35.0) / 2)
    assert snapshot.reliability_score == pytest.approx(sum(expected_scores) / 2)
    assert [insight.score for insight in snapshot.evaluations] == pytest.approx(expected_scores)
    assert [insight.freshness_minutes for insight in snapshot.evaluations] == pytest.approx(
        [5.0, 45.0]
    )

    freshness_penalty = min(freshness_minutes)
    expected_freshness = max(0.0, min(1.0, 1.0 - freshness_penalty / 60.0))
    assert snapshot.freshness_score == pytest.approx(expected_freshness)

    posture = min(1.0, max(0.0, 0.8 * 0.6 + 0.6 * 0.4))
    readiness = posture * 0.5 + snapshot.reliability_score * 0.35 + snapshot.freshness_score * 0.15
    readiness = min(1.0, max(0.0, readiness))
    assert snapshot.readiness_score == pytest.approx(readiness)


def test_export_state_uses_shared_reference_time(
    fixed_time: datetime, monkeypatch: pytest.MonkeyPatch
) -> None:
    original_now = source_engine._utcnow
    tracker: list[datetime] = []

    def tracked_now() -> datetime:
        moment = original_now()
        tracker.append(moment)
        return moment

    monkeypatch.setattr(source_engine, "_utcnow", tracked_now)

    engine = source_engine.DynamicSourceEngine(
        sources=[
            source_engine.SourceDescriptor(
                name="Atlas Sentinel",
                domain="orbital",
                reliability=0.5,
                criticality=0.5,
            )
        ]
    )
    engine.record_signal(
        _make_signal(timestamp=fixed_time - timedelta(minutes=10))
    )

    state = engine.export_state(horizon_minutes=120)

    assert (
        state["sources"]["Atlas Sentinel"]["metrics"]["total_signals"] == pytest.approx(1.0)
    )
    # One call when pruning stale signals, one to evaluate the snapshot horizon,
    # one during the aggregated scoring, and one for the exported metadata timestamp.
    assert len(tracker) == 4

