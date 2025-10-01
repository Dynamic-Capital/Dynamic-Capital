"""Tests for the Dynamic Capital psychology aggregation helper."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import pytest

from typing import Mapping

sys.path.append(str(Path(__file__).resolve().parents[1]))

from algorithms.python.trading_psychology_elements import (
    Element,
    ElementProfile,
    ElementSignal,
    PsychologyTelemetry,
)
from dynamic.trading.algo.dynamic_psychology import DynamicPsychologyAlgo


def _dt(offset_minutes: int = 0) -> datetime:
    return datetime(2025, 1, 1, tzinfo=timezone.utc) + timedelta(minutes=offset_minutes)


def _profile_from_scores(scores: Mapping[Element, tuple[float, str]]):
    signals: list[ElementSignal] = []
    for element in Element:
        score, level = scores.get(element, (0.0, "stable"))
        signals.append(
            ElementSignal(
                element=element,
                score=score,
                level=level,
                reasons=(
                    ["Process discipline is anchoring execution."]
                    if element == Element.EARTH and score > 0
                    else []
                ),
                recommendations=(
                    ["Keep reinforcing daily routines to bank consistency."]
                    if element == Element.EARTH and score > 0
                    else []
                ),
            )
        )
    return ElementProfile(signals=signals)


def test_snapshot_aggregates_psychology_signals() -> None:
    algo = DynamicPsychologyAlgo()

    high_readiness = PsychologyTelemetry(
        discipline_index=0.8,
        journaling_rate=0.8,
        focus_index=0.7,
        account_balance_delta_pct=2.0,
        trades_planned=2,
        trades_executed=2,
        conviction_index=0.7,
        fatigue_index=0.2,
        consecutive_wins=3,
        emotional_volatility=0.2,
    )
    stressed_state = PsychologyTelemetry(
        trades_planned=1,
        trades_executed=4,
        drawdown_pct=8.0,
        account_balance_delta_pct=-4.0,
        stress_index=0.8,
        emotional_volatility=0.7,
        consecutive_losses=4,
        focus_index=0.3,
        fatigue_index=0.8,
        discipline_index=0.2,
        market_volatility=0.8,
        news_shock=True,
    )

    algo.record("alice", telemetry=high_readiness, timestamp=_dt())
    algo.record("alice", telemetry=stressed_state, timestamp=_dt(5), weight=2.0)

    snapshot = algo.snapshot("ALICE")

    assert snapshot.trader_id == "ALICE"
    assert snapshot.sample_count == 2
    assert snapshot.dominant_element == "fire"
    assert snapshot.dominant_score == pytest.approx(5.4, rel=1e-3)
    assert snapshot.dominant_level == "critical"
    assert snapshot.last_sample_at == _dt(5)
    assert snapshot.readiness_score < snapshot.caution_score
    assert snapshot.recovery_score > snapshot.readiness_score
    assert snapshot.stability_index < 0

    state = algo.psychology_state("alice")
    assert state["trader_id"] == "ALICE"
    assert state["sample_count"] == 2
    assert state["dominant_element"] == "fire"
    assert state["last_sample_at"] == _dt(5).isoformat()
    assert state["readiness_score"] == pytest.approx(snapshot.readiness_score)
    assert state["caution_score"] == pytest.approx(snapshot.caution_score)
    assert state["elements"][0]["element"] == "fire"


def test_window_size_limits_history() -> None:
    algo = DynamicPsychologyAlgo(window_size=2)
    base = {
        "discipline_index": 0.6,
        "focus_index": 0.6,
        "trades_planned": 1,
        "trades_executed": 1,
    }

    algo.record("bob", telemetry=PsychologyTelemetry(**base), timestamp=_dt())
    algo.record("bob", telemetry=PsychologyTelemetry(**base), timestamp=_dt(1))
    algo.record("bob", telemetry=PsychologyTelemetry(**base), timestamp=_dt(2))

    snapshot = algo.snapshot("bob")

    assert snapshot.sample_count == 2
    assert len(tuple(algo.entries("bob"))) == 2


def test_record_accepts_profile_payload() -> None:
    algo = DynamicPsychologyAlgo()
    scores = {
        Element.EARTH: (6.0, "building"),
        Element.FIRE: (2.0, "stable"),
        Element.LIGHT: (3.0, "nascent"),
    }
    profile = _profile_from_scores(scores)

    entry = algo.record("carol", profile=profile, weight=2.0, timestamp=_dt(), notes="manual")

    assert entry.trader_id == "CAROL"
    assert entry.weight == pytest.approx(2.0)
    assert entry.telemetry is None

    snapshot = algo.snapshot("carol")
    assert snapshot.sample_count == 1
    assert snapshot.dominant_element == "earth"
    assert snapshot.readiness_score > snapshot.caution_score

    algo.clear("carol")
    assert algo.snapshot("carol").sample_count == 0
