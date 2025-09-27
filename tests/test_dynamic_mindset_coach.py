from __future__ import annotations

from datetime import datetime

from dynamic_mindset import MindsetCoach, MindsetContext, MindsetSignal


def test_mindset_signal_normalisation() -> None:
    naive_timestamp = datetime(2025, 1, 1, 9, 30, 0)
    signal = MindsetSignal(
        category=" Focus ",
        description="  Need clarity  ",
        intensity=8,
        weight=-3.5,
        timestamp=naive_timestamp,
    )

    assert signal.category == "focus"
    assert signal.description == "Need clarity"
    assert signal.intensity == 5
    assert signal.weight == 0.0
    assert signal.timestamp.tzinfo is not None


def test_build_plan_defensive_bias_with_signals() -> None:
    coach = MindsetCoach()
    coach.extend(
        [
            {"category": "fear", "description": "Large miss yesterday", "intensity": 4, "weight": 1.2},
            {"category": "focus", "description": "Struggling to concentrate", "intensity": 3},
            {"category": "tilt", "description": "Impulsive re-entry", "intensity": 2},
        ]
    )

    context = MindsetContext(
        session_energy=0.35,
        focus_drift=0.65,
        recent_drawdown=1.4,
        market_volatility=0.85,
        sleep_hours=4.0,
        wins_in_row=0,
        losses_in_row=3,
        is_macro_day=True,
        journaling_complete=False,
    )

    plan = coach.build_plan(context)

    assert plan.risk_posture == "defensive"
    assert plan.should_reduce_risk is True
    assert any("half risk" in step for step in plan.in_session)
    assert any("visualization" in step for step in plan.pre_session)
    assert "Message accountability partner" in " ".join(plan.post_session)
    assert any("present trade" in affirmation for affirmation in plan.affirmations)


def test_confident_state_defaults() -> None:
    coach = MindsetCoach()
    context = MindsetContext(
        session_energy=0.92,
        focus_drift=0.08,
        recent_drawdown=0.2,
        market_volatility=0.35,
        sleep_hours=7.5,
        wins_in_row=3,
        losses_in_row=0,
        journaling_complete=True,
    )

    plan = coach.build_plan(context)

    assert plan.risk_posture == "assertive"
    assert plan.focus_score >= 0.75
    assert plan.affirmations == ("Today I trade the plan, not the emotion.",)
