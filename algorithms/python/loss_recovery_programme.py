"""Loss Recovery Programme planner for rehabilitating trading drawdowns.

This module provides a structured methodology for traders who need to recover
from material drawdowns without abandoning risk discipline.  It analyses the
current account state, classifies the severity of the drawdown, and generates a
phase-based recovery roadmap with actionable steps.  The implementation mirrors
the mentoring playbooks used inside Dynamic Capital by providing granular risk
adjustments, behavioural checkpoints, and timeline estimates.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Iterable, List, Sequence


@dataclass(slots=True)
class AccountState:
    """Snapshot of the trading account prior to launching recovery."""

    balance: float
    peak_balance: float
    risk_per_trade: float
    win_rate: float
    average_rr: float
    consecutive_losses: int = 0
    days_in_drawdown: int = 0
    recent_loss_sizes: Sequence[float] | None = None

    def drawdown_amount(self) -> float:
        """Absolute capital shortfall relative to the account peak."""

        return max(self.peak_balance - self.balance, 0.0)

    def drawdown_pct(self) -> float:
        """Percentage drawdown relative to the all-time equity peak."""

        if self.peak_balance <= 0:
            return 0.0
        return self.drawdown_amount() / self.peak_balance


@dataclass(slots=True)
class LossRecoveryConfig:
    """Configuration flags that tailor the recovery programme."""

    buffer_pct: float = 0.02
    min_risk_per_trade: float = 0.0025
    max_risk_per_trade: float = 0.02
    max_trades_per_week: int = 18
    expectancy_floor: float = 0.08
    capital_injection: float = 0.0

    def constrain_risk(self, value: float) -> float:
        return min(self.max_risk_per_trade, max(self.min_risk_per_trade, value))


@dataclass(slots=True)
class RecoveryStep:
    """Single phase of the recovery programme."""

    phase: str
    objective: str
    target_balance: float
    risk_per_trade: float
    expected_trades: int
    max_trades: int
    routines: List[str] = field(default_factory=list)


@dataclass(slots=True)
class RecoveryPlan:
    """Compiled plan returned by the loss recovery programme."""

    severity: str
    drawdown_amount: float
    drawdown_pct: float
    target_balance: float
    expectancy_used: float
    steps: List[RecoveryStep]
    expected_trades: int
    expected_duration_weeks: float
    notes: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Convenience helper for serialising the plan."""

        return {
            "severity": self.severity,
            "drawdown_amount": self.drawdown_amount,
            "drawdown_pct": self.drawdown_pct,
            "target_balance": self.target_balance,
            "expectancy_used": self.expectancy_used,
            "expected_trades": self.expected_trades,
            "expected_duration_weeks": self.expected_duration_weeks,
            "notes": list(self.notes),
            "steps": [
                {
                    "phase": step.phase,
                    "objective": step.objective,
                    "target_balance": step.target_balance,
                    "risk_per_trade": step.risk_per_trade,
                    "expected_trades": step.expected_trades,
                    "max_trades": step.max_trades,
                    "routines": list(step.routines),
                }
                for step in self.steps
            ],
        }


class LossRecoveryProgramme:
    """Planner that maps out a progressive loss recovery journey."""

    _PHASE_LIBRARY: dict[str, Sequence[tuple[str, float, float, str, Sequence[str]]]] = {
        "mild": (
            (
                "Stabilise capital",
                0.6,
                0.4,
                "Stop the bleed with smaller sizing and only A+ setups.",
                (
                    "Run post-trade review before market open.",
                    "Trade the daily playbook only when confidence score ≥ 7/10.",
                    "Cap trades to the first three high-quality opportunities.",
                ),
            ),
            (
                "Rebuild core edge",
                1.0,
                0.4,
                "Return to baseline execution while protecting equity curve stability.",
                (
                    "Reintroduce core setups with full pre-trade checklist.",
                    "Journal emotional state after each session.",
                ),
            ),
            (
                "Acceleration buffer",
                1.1,
                0.2,
                "Add a small performance buffer before scaling beyond the prior peak.",
                (
                    "Increase risk only after two consecutive winning weeks.",
                    "Allocate 30 minutes weekly to scenario rehearsal.",
                ),
            ),
        ),
        "moderate": (
            (
                "Circuit breaker",
                0.4,
                0.35,
                "Reset discipline with reduced exposure and strict trade limits.",
                (
                    "Cease discretionary add-ons until win rate stabilises.",
                    "Daily metrics review with accountability partner.",
                ),
            ),
            (
                "Rebuild core edge",
                0.7,
                0.35,
                "Gradually scale executions while monitoring variance tightly.",
                (
                    "Conduct end-of-week statistical review.",
                    "Limit trade frequency to quality over quantity.",
                ),
            ),
            (
                "Controlled scaling",
                0.9,
                0.2,
                "Move back towards standard sizing with volatility filters applied.",
                (
                    "Re-enable risk overlays once variance normalises.",
                    "Schedule midpoint review after every 10 trades.",
                ),
            ),
            (
                "Acceleration buffer",
                1.05,
                0.1,
                "Lock in a profit buffer before taking expansionary risk.",
                (
                    "Only add size after recording two positive expectancy fortnights.",
                ),
            ),
        ),
        "severe": (
            (
                "Capital preservation",
                0.25,
                0.3,
                "Enter damage-control mode with minimum risk and focus on process.",
                (
                    "Suspend new strategy experiments.",
                    "Complete deep-dive root cause analysis of losses.",
                ),
            ),
            (
                "Skill recalibration",
                0.4,
                0.25,
                "Rebuild confidence with simulated rehearsals and limited live exposure.",
                (
                    "Split schedule between sim practice and selective live trades.",
                    "Pre-commit to daily shutdown time to avoid revenge trading.",
                ),
            ),
            (
                "Rebuild core edge",
                0.6,
                0.25,
                "Reintroduce proven playbooks with conservative trade counts.",
                (
                    "Restore automation tooling gradually after validation.",
                    "Audit execution metrics with mentor twice per week.",
                ),
            ),
            (
                "Progressive scaling",
                0.85,
                0.15,
                "Expand exposure in line with restored confidence and equity growth.",
                (
                    "Unlock additional setups once error rate < 3% over rolling 30 trades.",
                ),
            ),
            (
                "Acceleration buffer",
                1.0,
                0.05,
                "Capture a small overshoot to rebuild psychological safety net.",
                (
                    "Channel surplus gains into contingency reserve.",
                ),
            ),
        ),
    }

    def __init__(self, config: LossRecoveryConfig | None = None) -> None:
        self.config = config or LossRecoveryConfig()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def build_plan(self, account: AccountState) -> RecoveryPlan:
        """Construct a step-by-step recovery plan for the provided account."""

        drawdown = account.drawdown_amount()
        drawdown_pct = account.drawdown_pct()

        if drawdown <= 0:
            return RecoveryPlan(
                severity="stable",
                drawdown_amount=0.0,
                drawdown_pct=0.0,
                target_balance=account.balance,
                expectancy_used=0.0,
                steps=[],
                expected_trades=0,
                expected_duration_weeks=0.0,
                notes=["No loss recovery required; account is at or above the peak."],
            )

        severity = self._classify_severity(drawdown_pct, account)
        phase_template = self._PHASE_LIBRARY[severity]

        target_balance = max(account.peak_balance, account.balance) * (1 + self.config.buffer_pct)
        starting_equity = account.balance + self.config.capital_injection
        remaining_gap = max(target_balance - starting_equity, 0.0)

        expectancy = self._expectancy(account.win_rate, account.average_rr)
        expectancy_used = self._normalise_expectancy(expectancy)
        plan_notes: List[str] = [
            f"Classified drawdown as {severity} ({drawdown_pct:.1%}).",
            f"Recovery target set at {target_balance:,.2f} to include a {self.config.buffer_pct:.1%} buffer.",
        ]
        if expectancy_used != expectancy:
            plan_notes.append(
                "Expectancy adjusted to the configured floor to avoid non-viable recovery timelines."
            )

        steps: List[RecoveryStep] = []
        expected_trades_total = 0
        equity_pointer = starting_equity

        for index, (phase, risk_mult, fraction, objective, routines) in enumerate(phase_template):
            if remaining_gap <= 0:
                break

            step_gap = remaining_gap * fraction if index < len(phase_template) - 1 else remaining_gap
            step_start_equity = equity_pointer
            equity_pointer += step_gap
            remaining_gap -= step_gap

            risk = self.config.constrain_risk(account.risk_per_trade * risk_mult)
            expected_trade_gain = self._expected_trade_gain(step_start_equity, risk, expectancy_used)
            expected_trades = self._estimate_trades(step_gap, expected_trade_gain)
            max_trades = max(expected_trades, math.ceil(expected_trades * 1.4))

            steps.append(
                RecoveryStep(
                    phase=phase,
                    objective=objective,
                    target_balance=round(equity_pointer, 2),
                    risk_per_trade=round(risk, 5),
                    expected_trades=expected_trades,
                    max_trades=max_trades,
                    routines=list(routines),
                )
            )
            expected_trades_total += expected_trades

        expected_duration_weeks = (
            expected_trades_total / self.config.max_trades_per_week if self.config.max_trades_per_week else 0.0
        )

        if account.recent_loss_sizes:
            loss_avg = sum(abs(value) for value in account.recent_loss_sizes) / max(
                len(account.recent_loss_sizes), 1
            )
            plan_notes.append(
                f"Average recent loss size observed at {loss_avg:,.2f}; ensure new risk caps respect this baseline."
            )

        return RecoveryPlan(
            severity=severity,
            drawdown_amount=drawdown,
            drawdown_pct=drawdown_pct,
            target_balance=round(target_balance, 2),
            expectancy_used=expectancy_used,
            steps=steps,
            expected_trades=expected_trades_total,
            expected_duration_weeks=round(expected_duration_weeks, 2),
            notes=plan_notes,
        )

    def progress_update(self, plan: RecoveryPlan, realised_pnl: Iterable[float]) -> dict:
        """Track progress against the plan given a sequence of realised PnL values."""

        total_pnl = sum(realised_pnl)
        projected_balance = plan.target_balance - (plan.drawdown_amount - total_pnl)
        completed_steps = [
            step.phase for step in plan.steps if projected_balance >= step.target_balance and total_pnl >= 0
        ]
        remaining_steps = [step.phase for step in plan.steps if step.phase not in completed_steps]

        return {
            "projected_balance": projected_balance,
            "total_pnl": total_pnl,
            "completed_steps": completed_steps,
            "remaining_steps": remaining_steps,
            "on_track": total_pnl >= 0 and (projected_balance >= plan.target_balance or not remaining_steps),
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _classify_severity(self, drawdown_pct: float, account: AccountState) -> str:
        if drawdown_pct >= 0.2 or account.consecutive_losses >= 6 or account.days_in_drawdown >= 45:
            return "severe"
        if drawdown_pct >= 0.1 or account.consecutive_losses >= 4 or account.days_in_drawdown >= 25:
            return "moderate"
        return "mild"

    def _expectancy(self, win_rate: float, average_rr: float) -> float:
        win_rate_clamped = min(max(win_rate, 0.0), 1.0)
        return win_rate_clamped * max(average_rr, 0.0) - (1 - win_rate_clamped)

    def _normalise_expectancy(self, expectancy: float) -> float:
        if expectancy <= 0:
            return self.config.expectancy_floor
        return max(expectancy, self.config.expectancy_floor)

    def _expected_trade_gain(self, balance: float, risk_per_trade: float, expectancy: float) -> float:
        equity = max(balance, 1.0)
        expected_gain = equity * risk_per_trade * expectancy
        floor = equity * self.config.min_risk_per_trade * self.config.expectancy_floor
        return max(expected_gain, floor, 1.0)

    def _estimate_trades(self, target_gap: float, expected_trade_gain: float) -> int:
        if expected_trade_gain <= 0:
            return 0
        trades = math.ceil(target_gap / expected_trade_gain)
        return max(trades, 1)


__all__ = [
    "AccountState",
    "LossRecoveryConfig",
    "LossRecoveryProgramme",
    "RecoveryPlan",
    "RecoveryStep",
]
