from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from algorithms.python.jobs.trading_psychology_job import TradingPsychologySyncJob
from algorithms.python.trading_psychology import (
    PsychologyObservation,
    TradingPsychologyModel,
)


class FakeWriter:
    def __init__(self) -> None:
        self.rows = []

    def upsert(self, rows):  # pragma: no cover - behaviour tested via assertions
        self.rows = list(rows)
        return len(self.rows)


class StubInsights:
    def __init__(self, narrative: str) -> None:
        self.narrative = narrative
        self.calls = 0

    def generate(self, score):  # pragma: no cover - simple stub
        self.calls += 1
        return {"score": score, "narrative": self.narrative, "insights": [self.narrative]}


@pytest.fixture
def observation_series():
    base = datetime(2024, 5, 10, 12, tzinfo=timezone.utc)
    return [
        PsychologyObservation(
            timestamp=base - timedelta(days=2),
            plan_adherence=0.6,
            risk_compliance=0.5,
            recovery_rate=0.4,
            emotional_stability=0.6,
            focus_quality=0.7,
            distraction_events=4,
            routine_adherence=0.5,
        ),
        PsychologyObservation(
            timestamp=base - timedelta(days=1),
            plan_adherence=0.8,
            risk_compliance=0.75,
            recovery_rate=0.6,
            emotional_stability=0.7,
            focus_quality=0.65,
            distraction_events=3,
            routine_adherence=0.7,
        ),
        PsychologyObservation(
            timestamp=base,
            plan_adherence=0.9,
            risk_compliance=0.85,
            recovery_rate=0.8,
            emotional_stability=0.9,
            focus_quality=0.8,
            distraction_events=1,
            routine_adherence=0.8,
        ),
    ]


def test_trading_psychology_model_scoring_deterministic(observation_series):
    model = TradingPsychologyModel(observations=observation_series, recency_decay=0.8)
    score = model.evaluate()

    assert score.state == "caution"
    assert score.discipline == pytest.approx(0.7570, abs=1e-4)
    assert score.resilience == pytest.approx(0.6926, abs=1e-4)
    assert score.focus == pytest.approx(0.6587, abs=1e-4)
    assert score.consistency == pytest.approx(0.7385, abs=1e-4)
    assert score.composite == pytest.approx(0.7126, abs=1e-4)


def test_trading_psychology_model_applies_window_decay():
    base = datetime(2024, 5, 1, tzinfo=timezone.utc)
    observations = []
    for index in range(10):
        observations.append(
            PsychologyObservation(
                timestamp=base + timedelta(days=index),
                plan_adherence=0.9 if index >= 5 else 0.3,
                risk_compliance=0.9 if index >= 5 else 0.3,
                recovery_rate=0.85 if index >= 5 else 0.35,
                emotional_stability=0.9 if index >= 5 else 0.4,
                focus_quality=0.88 if index >= 5 else 0.4,
                distraction_events=1 if index >= 5 else 6,
                routine_adherence=0.92 if index >= 5 else 0.35,
            )
        )
    model = TradingPsychologyModel(observations=observations, window=5, recency_decay=0.7)
    score = model.evaluate()

    assert score.state == "ready"
    assert score.composite > 0.8


def test_trading_psychology_state_transitions(observation_series):
    model = TradingPsychologyModel(
        observations=observation_series,
        recency_decay=0.8,
        readiness_thresholds={"ready": 0.7, "monitor": 0.6},
    )
    score = model.evaluate(force=True)
    assert score.state == "ready"

    degraded = [
        PsychologyObservation(
            timestamp=obs.timestamp,
            plan_adherence=obs.plan_adherence * 0.92,
            risk_compliance=obs.risk_compliance * 0.92,
            recovery_rate=obs.recovery_rate * 0.92,
            emotional_stability=obs.emotional_stability * 0.92,
            focus_quality=obs.focus_quality * 0.92,
            distraction_events=obs.distraction_events + 1,
            routine_adherence=obs.routine_adherence * 0.92,
        )
        for obs in observation_series
    ]
    downgraded_model = TradingPsychologyModel(
        observations=degraded,
        recency_decay=0.8,
        readiness_thresholds={"ready": 0.7, "monitor": 0.6},
    )
    downgraded_score = downgraded_model.evaluate()
    assert downgraded_score.state == "caution"

    stressed = [
        PsychologyObservation(
            timestamp=obs.timestamp,
            plan_adherence=0.2,
            risk_compliance=0.2,
            recovery_rate=0.2,
            emotional_stability=0.3,
            focus_quality=0.3,
            distraction_events=6,
            routine_adherence=0.2,
        )
        for obs in observation_series
    ]
    stressed_model = TradingPsychologyModel(
        observations=stressed,
        recency_decay=0.8,
        readiness_thresholds={"ready": 0.7, "monitor": 0.6},
    )
    stressed_score = stressed_model.evaluate()
    assert stressed_score.state == "recovery"


def test_trading_psychology_job_payload_structure(observation_series):
    model = TradingPsychologyModel(observations=observation_series, recency_decay=0.8)
    writer = FakeWriter()
    insights = StubInsights("Maintain focus blocks around macro events.")

    job = TradingPsychologySyncJob(
        model=model,
        writer=writer,
        insights=insights,
        source_model="psychology-v1",
        source_run="batch-42",
    )

    count = job.run()

    assert count == 1
    assert len(writer.rows) == 1
    payload = writer.rows[0]
    assert payload["capturedAt"] == observation_series[-1].timestamp
    assert payload["state"] == model.evaluate().state
    assert "narrative" in payload and payload["narrative"].startswith("Maintain")
    assert payload["sourceModel"] == "psychology-v1"
    assert payload["sourceRun"] == "batch-42"
