"""Back to Breakeven calculator orchestrating dynamic multi-LLM insights."""

from __future__ import annotations

import math
import textwrap
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence

from .multi_llm import LLMConfig, LLMRun, collect_strings, parse_json_response, serialise_runs


@dataclass(slots=True)
class AccountSnapshot:
    """Represents the trading account attempting to return to breakeven."""

    current_balance: float
    target_balance: float
    peak_balance: Optional[float] = None
    risk_per_trade_pct: float = 0.01
    win_rate: float = 0.5
    average_rr: float = 1.5
    max_trades_per_day: int = 3
    trading_days_per_week: int = 5

    def deficit(self) -> float:
        """Capital required to reach the breakeven target."""

        return max(self.target_balance - self.current_balance, 0.0)

    def reference_balance(self) -> float:
        """Baseline used when computing drawdown percentages."""

        reference_candidates = [self.target_balance, self.current_balance]
        if self.peak_balance is not None:
            reference_candidates.append(self.peak_balance)
        reference = max(reference_candidates)
        return reference if reference > 0 else 1.0

    def drawdown_pct(self) -> float:
        """Percentage drawdown relative to the most conservative reference balance."""

        reference = self.reference_balance()
        if reference <= 0:
            return 0.0
        return max(reference - self.current_balance, 0.0) / reference

    def risk_amount(self) -> float:
        """Dollar risk allocated to a single trade at the current balance."""

        return max(self.current_balance * max(self.risk_per_trade_pct, 0.0), 0.0)

    def expectancy_per_trade(self) -> float:
        """Expected dollar gain per trade using the supplied statistics."""

        risk_amount = self.risk_amount()
        win_rate = min(max(self.win_rate, 0.0), 0.999)
        reward_risk = max(self.average_rr, 0.0)
        expectancy_r_multiple = (win_rate * reward_risk) - (1 - win_rate)
        return risk_amount * expectancy_r_multiple

    def trades_per_week(self) -> int:
        """Maximum number of trades allowed per week based on constraints."""

        total = self.max_trades_per_day * self.trading_days_per_week
        return max(total, 1)


@dataclass(slots=True)
class BreakevenRequest:
    """Input payload describing the breakeven recovery problem."""

    account: AccountSnapshot
    objectives: Sequence[str] = field(default_factory=tuple)
    constraints: Sequence[str] = field(default_factory=tuple)
    strengths: Sequence[str] = field(default_factory=tuple)
    support_channels: Sequence[str] = field(default_factory=tuple)
    narrative: str = ""
    capital_injections: Sequence[float] = field(default_factory=tuple)


@dataclass(slots=True)
class BreakevenPhase:
    """Single phase of the breakeven roadmap."""

    name: str
    objective: str
    target_balance: Optional[float] = None
    trade_count: Optional[int] = None
    risk_per_trade_pct: Optional[float] = None
    checkpoints: list[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"name": self.name, "objective": self.objective}
        if self.target_balance is not None:
            payload["target_balance"] = self.target_balance
        if self.trade_count is not None:
            payload["trade_count"] = self.trade_count
        if self.risk_per_trade_pct is not None:
            payload["risk_per_trade_pct"] = self.risk_per_trade_pct
        if self.checkpoints:
            payload["checkpoints"] = list(self.checkpoints)
        return payload


@dataclass(slots=True)
class BreakevenPlan:
    """Structured output returned by :class:`BackToBreakevenCalculator`."""

    severity: str
    deficit: float
    drawdown_pct: float
    expected_trades: int
    expected_weeks: float
    expectancy_per_trade: float
    phases: list[BreakevenPhase]
    risk_adjustments: list[str]
    execution_focus: list[str]
    daily_game_plan: Optional[str]
    mindset_notes: list[str]
    support_actions: list[str]
    metadata: Dict[str, Any]
    runs: Sequence[LLMRun]
    raw_response: Optional[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "severity": self.severity,
            "deficit": self.deficit,
            "drawdown_pct": self.drawdown_pct,
            "expected_trades": self.expected_trades,
            "expected_weeks": self.expected_weeks,
            "expectancy_per_trade": self.expectancy_per_trade,
            "risk_adjustments": list(self.risk_adjustments),
            "execution_focus": list(self.execution_focus),
            "daily_game_plan": self.daily_game_plan,
            "mindset_notes": list(self.mindset_notes),
            "support_actions": list(self.support_actions),
            "phases": [phase.to_dict() for phase in self.phases],
            "metadata": self.metadata,
        }


class BackToBreakevenCalculator:
    """Coordinator that combines analytics with specialist LLM perspectives."""

    def __init__(
        self,
        *,
        diagnostics: LLMConfig,
        playbook: LLMConfig,
        coach: Optional[LLMConfig] = None,
    ) -> None:
        self.diagnostics = diagnostics
        self.playbook = playbook
        self.coach = coach

    def generate_plan(self, request: BreakevenRequest) -> BreakevenPlan:
        """Return a breakeven recovery plan for the supplied request."""

        metrics = self._compute_metrics(request)
        severity = self._classify_severity(metrics["drawdown_pct"])
        context_note = self._build_context_summary(request, severity, metrics)

        runs: list[LLMRun] = []

        diagnostics_prompt = self._build_diagnostics_prompt(request, severity, metrics, context_note)
        diagnostics_run = self.diagnostics.run(diagnostics_prompt)
        runs.append(diagnostics_run)
        diagnostics_payload = parse_json_response(diagnostics_run.response, fallback_key="analysis") or {}

        phases = self._normalise_phases(diagnostics_payload.get("phases"))
        if not phases:
            phases = self._fallback_phases(request, severity, metrics)

        risk_adjustments = list(collect_strings(diagnostics_payload.get("risk_adjustments"), diagnostics_payload.get("risk_management")))
        execution_focus = list(collect_strings(diagnostics_payload.get("execution_focus"), diagnostics_payload.get("focus")))
        mindset_notes = list(collect_strings(diagnostics_payload.get("mindset"), diagnostics_payload.get("analysis")))
        support_actions = list(collect_strings(diagnostics_payload.get("support_actions")))

        playbook_prompt = self._build_playbook_prompt(
            request,
            severity,
            metrics,
            phases,
            risk_adjustments,
            execution_focus,
            context_note,
        )
        playbook_run = self.playbook.run(playbook_prompt)
        runs.append(playbook_run)
        playbook_payload = parse_json_response(playbook_run.response, fallback_key="guidance") or {}

        daily_game_plan = self._coerce_text(playbook_payload.get("daily_game_plan") or playbook_payload.get("guidance"))
        mindset_notes.extend(collect_strings(playbook_payload.get("mindset")))
        support_actions.extend(collect_strings(playbook_payload.get("support_actions")))
        additional_risk = collect_strings(playbook_payload.get("risk_adjustments"), playbook_payload.get("risk"))
        if additional_risk:
            risk_adjustments.extend(additional_risk)
        additional_focus = collect_strings(playbook_payload.get("execution_focus"))
        if additional_focus:
            execution_focus.extend(additional_focus)

        coach_payload: Dict[str, Any] | None = None
        if self.coach is not None:
            coach_prompt = self._build_coach_prompt(request, severity, metrics, execution_focus, context_note)
            coach_run = self.coach.run(coach_prompt)
            runs.append(coach_run)
            coach_payload = parse_json_response(coach_run.response, fallback_key="message") or {}
            mindset_notes.extend(collect_strings(coach_payload.get("mindset"), coach_payload.get("message")))
            support_actions.extend(collect_strings(coach_payload.get("support_actions")))

        support_actions.extend(
            f"Engage support channel: {channel}" for channel in request.support_channels if str(channel).strip()
        )

        risk_adjustments = list(dict.fromkeys(item for item in risk_adjustments if item))
        execution_focus = list(dict.fromkeys(item for item in execution_focus if item))
        mindset_notes = list(dict.fromkeys(item for item in mindset_notes if item))
        support_actions = list(dict.fromkeys(item for item in support_actions if item))

        raw_response = serialise_runs(runs)

        metadata = {
            "severity": severity,
            "metrics": metrics,
            "objectives": list(request.objectives),
            "constraints": list(request.constraints),
            "strengths": list(request.strengths),
            "support_channels": list(request.support_channels),
            "context_note": context_note,
            "diagnostics_payload": diagnostics_payload,
            "playbook_payload": playbook_payload,
        }
        if coach_payload is not None:
            metadata["coach_payload"] = coach_payload

        plan = BreakevenPlan(
            severity=severity,
            deficit=metrics["deficit"],
            drawdown_pct=metrics["drawdown_pct"],
            expected_trades=metrics["expected_trades"],
            expected_weeks=metrics["expected_weeks"],
            expectancy_per_trade=metrics["expectancy"],
            phases=phases,
            risk_adjustments=risk_adjustments,
            execution_focus=execution_focus,
            daily_game_plan=daily_game_plan,
            mindset_notes=mindset_notes,
            support_actions=support_actions,
            metadata=metadata,
            runs=runs,
            raw_response=raw_response,
        )
        return plan

    def _compute_metrics(self, request: BreakevenRequest) -> Dict[str, Any]:
        account = request.account
        capital_injection_total = sum(value for value in request.capital_injections if value and value > 0)
        deficit = max(account.deficit() - capital_injection_total, 0.0)
        expectancy = account.expectancy_per_trade()
        fallback_gain = max(account.risk_amount() * max(account.average_rr, 1.0) * 0.25, 1.0)
        using_expectancy_fallback = False
        per_trade_gain = expectancy
        if per_trade_gain <= 0:
            per_trade_gain = fallback_gain
            using_expectancy_fallback = True
        expected_trades = math.ceil(deficit / per_trade_gain) if deficit > 0 else 0
        trades_per_week = account.trades_per_week()
        expected_weeks = (expected_trades / trades_per_week) if trades_per_week else float("inf")
        return {
            "deficit": deficit,
            "drawdown_pct": account.drawdown_pct(),
            "expectancy": expectancy,
            "expected_trades": expected_trades,
            "expected_weeks": round(expected_weeks, 2),
            "trades_per_week": trades_per_week,
            "capital_injection_total": capital_injection_total,
            "using_expectancy_fallback": using_expectancy_fallback,
            "fallback_gain": fallback_gain,
            "per_trade_gain_used": per_trade_gain,
        }

    def _classify_severity(self, drawdown_pct: float) -> str:
        if drawdown_pct < 0.07:
            return "mild"
        if drawdown_pct < 0.18:
            return "moderate"
        return "severe"

    def _build_context_summary(
        self,
        request: BreakevenRequest,
        severity: str,
        metrics: Mapping[str, Any],
    ) -> str:
        account = request.account
        objectives = "\n".join(f"- {item}" for item in request.objectives) or "- Stabilise equity curve discipline"
        constraints = "\n".join(f"- {item}" for item in request.constraints) or "- None specified"
        strengths = "\n".join(f"- {item}" for item in request.strengths) or "- Not documented"
        capital_note = (
            f"Planned capital injections: ${metrics['capital_injection_total']:,.2f}\n"
            if metrics["capital_injection_total"]
            else ""
        )
        narrative_block = (
            f"Narrative: {request.narrative.strip()}\n"
            if request.narrative.strip()
            else ""
        )
        summary = textwrap.dedent(
            f"""
            Account snapshot ({severity} drawdown):
            - Current balance: ${account.current_balance:,.2f}
            - Target breakeven balance: ${account.target_balance:,.2f}
            - Peak balance reference: ${account.reference_balance():,.2f}
            - Deficit to breakeven: ${metrics['deficit']:,.2f}
            - Weekly trade capacity: {account.trades_per_week()} trades
            - Expected trades required: {metrics['expected_trades']}
            - Expected weeks (at capacity): {metrics['expected_weeks']}
            - Expectancy per trade: ${metrics['per_trade_gain_used']:,.2f} (raw: ${metrics['expectancy']:,.2f})
            {capital_note}{narrative_block}
            Objectives:\n{objectives}
            Constraints:\n{constraints}
            Strengths:\n{strengths}
            Support channels: {', '.join(request.support_channels) or 'None documented'}
            """
        ).strip()
        return summary

    def _build_diagnostics_prompt(
        self,
        request: BreakevenRequest,
        severity: str,
        metrics: Mapping[str, Any],
        context_note: str,
    ) -> str:
        instructions = textwrap.dedent(
            """
            You are an institutional risk manager. Design a "back to breakeven" roadmap
            that protects capital while rebuilding confidence. Respond with JSON containing:
              - "phases": list of objects with keys {"name", "objective", "target_balance", "trade_count", "risk_per_trade_pct", "checkpoints"}
              - "risk_adjustments": list of risk mitigation actions
              - "execution_focus": list of tactical priorities
              - "mindset": list of coaching reminders
              - "support_actions": optional accountability actions
              - "confidence": number between 0 and 1
            Keep recommendations realistic for a {severity} drawdown.
            Context dossier:
            """
        ).strip()
        return f"{instructions}\n\n{context_note}"

    def _build_playbook_prompt(
        self,
        request: BreakevenRequest,
        severity: str,
        metrics: Mapping[str, Any],
        phases: Sequence[BreakevenPhase],
        risk_adjustments: Sequence[str],
        execution_focus: Sequence[str],
        context_note: str,
    ) -> str:
        phase_lines = "\n".join(
            f"- {phase.name}: {phase.objective} (target ${phase.target_balance:,.2f} | trades {phase.trade_count})"
            if phase.target_balance is not None
            else f"- {phase.name}: {phase.objective}"
            for phase in phases
        ) or "- Diagnostics model did not propose explicit phases"
        risk_lines = "\n".join(f"- {item}" for item in risk_adjustments) or "- Maintain core risk discipline"
        focus_lines = "\n".join(f"- {item}" for item in execution_focus) or "- Focus on A+ setups"
        instructions = textwrap.dedent(
            """
            You are the trading floor operator translating diagnostics into a daily operating plan.
            Provide JSON with:
              - "daily_game_plan": concise paragraph describing daily workflow
              - "mindset": list of reinforcement bullets
              - "support_actions": accountability or review rituals
              - "risk_adjustments": optional refinements to risk settings
              - "execution_focus": optional refinements to tactical focus
            Ensure guidance is actionable for the upcoming sessions.
            """
        ).strip()
        return textwrap.dedent(
            f"""
            {instructions}

            Context recap:
            {context_note}

            Diagnostics phases:
            {phase_lines}

            Risk adjustments:
            {risk_lines}

            Execution focus:
            {focus_lines}
            """
        ).strip()

    def _build_coach_prompt(
        self,
        request: BreakevenRequest,
        severity: str,
        metrics: Mapping[str, Any],
        execution_focus: Sequence[str],
        context_note: str,
    ) -> str:
        focus_line = ", ".join(execution_focus) or "process discipline"
        instructions = textwrap.dedent(
            """
            You are a performance coach. Provide a short motivational reinforcement for the trader.
            Respond in JSON with keys:
              - "mindset": list of <=3 encouragement bullets
              - "message": optional concise paragraph
              - "support_actions": optional accountability nudges
            Stay specific to the breakeven journey.
            """
        ).strip()
        return textwrap.dedent(
            f"""
            {instructions}

            Context summary:
            {context_note}

            Current execution focus: {focus_line}
            """
        ).strip()

    def _normalise_phases(self, payload: Any) -> list[BreakevenPhase]:
        if payload is None:
            return []
        if isinstance(payload, Mapping):
            # Some models may wrap the list in a dictionary
            if "phases" in payload and isinstance(payload["phases"], Iterable):
                payload = payload["phases"]
            else:
                payload = [payload]
        if isinstance(payload, (str, bytes)):
            payload = [payload]
        if not isinstance(payload, Iterable):
            return []

        phases: list[BreakevenPhase] = []
        for item in payload:
            if isinstance(item, Mapping):
                name = self._coerce_text(item.get("name") or item.get("phase") or item.get("title")) or "Phase"
                objective = self._coerce_text(item.get("objective") or item.get("focus") or item.get("summary") or name)
                target_balance = self._coerce_float(item.get("target_balance") or item.get("target"))
                trade_count = self._coerce_int(item.get("trade_count") or item.get("trades"))
                risk_pct = self._coerce_float(
                    item.get("risk_per_trade_pct")
                    or item.get("risk_pct")
                    or item.get("risk")
                )
                checkpoints = list(
                    collect_strings(
                        item.get("checkpoints"),
                        item.get("actions"),
                        item.get("notes"),
                        item.get("milestones"),
                    )
                )
                phases.append(
                    BreakevenPhase(
                        name=name,
                        objective=objective,
                        target_balance=target_balance,
                        trade_count=trade_count,
                        risk_per_trade_pct=risk_pct,
                        checkpoints=checkpoints,
                    )
                )
            else:
                text = self._coerce_text(item)
                if text:
                    phases.append(BreakevenPhase(name=text, objective=text))
        return phases

    def _fallback_phases(
        self,
        request: BreakevenRequest,
        severity: str,
        metrics: Mapping[str, Any],
    ) -> list[BreakevenPhase]:
        deficit = metrics.get("deficit", 0.0)
        expected_trades = max(metrics.get("expected_trades", 0), 1)
        current = request.account.current_balance
        ratios_by_severity = {
            "mild": (0.4, 0.85, 1.02),
            "moderate": (0.35, 0.75, 1.05),
            "severe": (0.25, 0.6, 1.05),
        }
        ratios = ratios_by_severity.get(severity, ratios_by_severity["moderate"])
        phase_templates = {
            "mild": (
                ("Stabilise execution", "Stop losses and reset daily routines"),
                ("Rebuild rhythm", "Focus on highest expectancy setups"),
                ("Buffer creation", "Add a profit cushion before scaling risk"),
            ),
            "moderate": (
                ("Capital preservation", "Cut sizing and halt discretionary add-ons"),
                ("Edge restoration", "Run controlled reps of core strategies"),
                ("Acceleration buffer", "Reintroduce size once variance normalises"),
            ),
            "severe": (
                ("Circuit breaker", "Operate at minimum size while rebuilding confidence"),
                ("Process rehab", "Codify playbook adherence and monitoring"),
                ("Expansion buffer", "Scale sizing after sustaining green weeks"),
            ),
        }
        templates = phase_templates.get(severity, phase_templates["moderate"])
        checkpoints_library = (
            ("Daily post-trade review", "Maintain scorecard metrics"),
            ("Bi-weekly performance debrief", "Secure accountability sign-off"),
            ("Pre-session visualisation", "Rehearse top setups"),
        )

        phases: list[BreakevenPhase] = []
        cumulative = current
        trades_remaining = expected_trades
        for idx, (ratio, template) in enumerate(zip(ratios, templates)):
            target_balance = current + deficit * ratio
            trade_allocation = max(round(trades_remaining / (len(ratios) - idx)), 1) if deficit > 0 else 0
            trades_remaining = max(trades_remaining - trade_allocation, 0)
            checkpoints = list({checkpoints_library[idx % len(checkpoints_library)][0], checkpoints_library[idx % len(checkpoints_library)][1]})
            phases.append(
                BreakevenPhase(
                    name=template[0],
                    objective=template[1],
                    target_balance=round(target_balance, 2),
                    trade_count=trade_allocation,
                    risk_per_trade_pct=round(request.account.risk_per_trade_pct * (0.6 if idx == 0 else 1.0), 4),
                    checkpoints=checkpoints,
                )
            )
            cumulative = target_balance
        return phases

    def _coerce_text(self, value: Any) -> str:
        if value is None:
            return ""
        if isinstance(value, str):
            return value.strip()
        return str(value).strip()

    def _coerce_float(self, value: Any) -> Optional[float]:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            text = self._coerce_text(value)
            if not text:
                return None
            try:
                return float(text)
            except ValueError:
                return None

    def _coerce_int(self, value: Any) -> Optional[int]:
        if value is None:
            return None
        try:
            return int(float(value))
        except (TypeError, ValueError):
            text = self._coerce_text(value)
            if not text:
                return None
            try:
                return int(float(text))
            except ValueError:
                return None


__all__ = [
    "AccountSnapshot",
    "BreakevenRequest",
    "BreakevenPhase",
    "BreakevenPlan",
    "BackToBreakevenCalculator",
]
