from algorithms.python.trading_psychology_elements import (
    Element,
    PsychologyTelemetry,
    score_elements,
)


def _get_signal(profile, element: Element):
    return next(signal for signal in profile.signals if signal.element is element)


def test_fire_dominates_when_risk_is_overheated():
    telemetry = PsychologyTelemetry(
        rsi=82.0,
        trades_planned=3,
        trades_executed=9,
        drawdown_pct=12.0,
        account_balance_delta_pct=-5.0,
        consecutive_losses=4,
        stress_index=0.7,
        emotional_volatility=0.6,
    )

    profile = score_elements(telemetry)

    assert profile.dominant.element is Element.FIRE
    fire_signal = _get_signal(profile, Element.FIRE)
    assert fire_signal.level == "critical"
    assert any("drawdown" in reason.lower() for reason in fire_signal.reasons)
    assert "cooldown" in " ".join(fire_signal.recommendations).lower()


def test_earth_and_light_reward_disciplined_execution():
    telemetry = PsychologyTelemetry(
        trades_planned=4,
        trades_executed=4,
        drawdown_pct=2.0,
        account_balance_delta_pct=3.0,
        consecutive_wins=4,
        discipline_index=0.8,
        journaling_rate=0.9,
        focus_index=0.7,
        conviction_index=0.75,
        fatigue_index=0.2,
        emotional_volatility=0.2,
    )

    profile = score_elements(telemetry)

    earth = _get_signal(profile, Element.EARTH)
    light = _get_signal(profile, Element.LIGHT)

    assert earth.level == "peak"
    assert light.level == "peak"
    assert profile.dominant.element in {Element.EARTH, Element.LIGHT}


def test_water_flare_when_emotions_run_hot():
    telemetry = PsychologyTelemetry(
        stress_index=0.9,
        emotional_volatility=0.8,
        consecutive_losses=2,
        focus_index=0.3,
    )

    profile = score_elements(telemetry)

    assert profile.dominant.element is Element.WATER
    water_signal = _get_signal(profile, Element.WATER)
    assert water_signal.level == "elevated"
    assert any("mindfulness" in rec.lower() for rec in water_signal.recommendations)
    assert len(profile.signals) == len(Element)
