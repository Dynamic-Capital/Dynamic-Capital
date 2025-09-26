from __future__ import annotations

import math
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.loss_recovery_programme import (
    AccountState,
    LossRecoveryConfig,
    LossRecoveryProgramme,
)


@pytest.fixture()
def programme() -> LossRecoveryProgramme:
    return LossRecoveryProgramme()


def test_mild_drawdown_generates_three_phase_plan(programme: LossRecoveryProgramme) -> None:
    account = AccountState(
        balance=93_000,
        peak_balance=100_000,
        risk_per_trade=0.01,
        win_rate=0.48,
        average_rr=1.7,
        consecutive_losses=2,
        days_in_drawdown=14,
    )

    plan = programme.build_plan(account)

    assert plan.severity == "mild"
    assert len(plan.steps) == 3
    first_step = plan.steps[0]
    assert math.isclose(first_step.risk_per_trade, 0.006, rel_tol=1e-3)
    assert first_step.expected_trades >= 1
    assert plan.expected_trades == sum(step.expected_trades for step in plan.steps)
    assert plan.expected_duration_weeks > 0


def test_severe_drawdown_clamps_risk_and_adds_additional_phases(programme: LossRecoveryProgramme) -> None:
    config = LossRecoveryConfig(min_risk_per_trade=0.002, max_risk_per_trade=0.015, capital_injection=5_000)
    programme_custom = LossRecoveryProgramme(config)
    account = AccountState(
        balance=60_000,
        peak_balance=100_000,
        risk_per_trade=0.006,
        win_rate=0.43,
        average_rr=1.9,
        consecutive_losses=7,
        days_in_drawdown=52,
    )

    plan = programme_custom.build_plan(account)

    assert plan.severity == "severe"
    assert len(plan.steps) >= 4
    assert plan.steps[0].risk_per_trade == pytest.approx(config.min_risk_per_trade, rel=1e-3)
    assert plan.expected_trades > plan.steps[0].expected_trades
    assert plan.target_balance > account.peak_balance


def test_negative_expectancy_is_lifted_to_floor(programme: LossRecoveryProgramme) -> None:
    account = AccountState(
        balance=45_000,
        peak_balance=60_000,
        risk_per_trade=0.008,
        win_rate=0.35,
        average_rr=1.0,
        consecutive_losses=3,
        days_in_drawdown=20,
    )

    plan = programme.build_plan(account)

    assert plan.expectancy_used == programme.config.expectancy_floor
    assert any("Expectancy adjusted" in note for note in plan.notes)
    assert plan.expected_trades >= len(plan.steps)


def test_progress_update_tracks_completed_steps(programme: LossRecoveryProgramme) -> None:
    account = AccountState(
        balance=80_000,
        peak_balance=100_000,
        risk_per_trade=0.01,
        win_rate=0.5,
        average_rr=1.6,
    )

    plan = programme.build_plan(account)
    first_step = plan.steps[0]

    update = programme.progress_update(plan, realised_pnl=[plan.drawdown_amount])

    assert first_step.phase in update["completed_steps"]
    assert update["on_track"] is True
