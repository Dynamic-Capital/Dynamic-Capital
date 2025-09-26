"""Dynamic multi-LLM learning workflow for trading sessions."""

from __future__ import annotations

import json
import textwrap
from dataclasses import dataclass, field
from typing import Any, Dict, Mapping, Optional, Sequence

from .multi_llm import LLMConfig, LLMRun, collect_strings, parse_json_response, serialise_runs
from .trade_journal_engine import TradeRecord


@dataclass(slots=True)
class LearningAlgorithmRequest:
    """Input payload used by :class:`DynamicLearningEngine`."""

    session_date: str
    session_theme: str
    market_overview: str
    trade_summary: str
    trades: Sequence[TradeRecord] = field(default_factory=tuple)
    objectives: Sequence[str] = field(default_factory=tuple)
    performance_metrics: Mapping[str, Any] = field(default_factory=dict)
    psychology_notes: Sequence[str] = field(default_factory=tuple)
    risk_parameters: Mapping[str, Any] = field(default_factory=dict)
    environment: Mapping[str, Any] = field(default_factory=dict)
    journal_focus: Sequence[str] = field(default_factory=tuple)
    open_questions: Sequence[str] = field(default_factory=tuple)


@dataclass(slots=True)
class LearningAlgorithmReport:
    """Structured outputs from :class:`DynamicLearningEngine`."""

    trade_output: list[str]
    market_output: list[str]
    trade_psychology_output: list[str]
    trade_analysis_output: list[str]
    risk_and_money_management_output: list[str]
    trade_journal_output: str
    metadata: Dict[str, Any]
    runs: Sequence[LLMRun]
    raw_response: Optional[str]


@dataclass(slots=True)
class DynamicLearningEngine:
    """Coordinates specialised LLMs to synthesise trading session learnings."""

    analysis: LLMConfig
    trade: LLMConfig
    market: LLMConfig
    psychology: LLMConfig
    risk: LLMConfig
    journal: Optional[LLMConfig] = None
    max_objectives: int = 8
    max_focus_points: int = 8
    max_trades: int = 10

    def generate(self, request: LearningAlgorithmRequest) -> LearningAlgorithmReport:
        """Return a multi-faceted learning report for the supplied session."""

        runs: list[LLMRun] = []
        focus_trades = list(request.trades[: self.max_trades])
        metadata: Dict[str, Any] = {
            "session_date": request.session_date,
            "trade_count": len(request.trades),
            "objectives_count": len(request.objectives),
            "psychology_note_count": len(request.psychology_notes),
            "risk_parameter_keys": sorted(request.risk_parameters.keys()),
            "environment": dict(request.environment),
            "trades_in_prompt": [trade.to_prompt_payload() for trade in focus_trades],
        }

        analysis_prompt = self._build_analysis_prompt(request, focus_trades)
        analysis_run = self.analysis.run(analysis_prompt)
        runs.append(analysis_run)
        analysis_payload = parse_json_response(analysis_run.response, fallback_key="analysis") or {}
        metadata["analysis_payload"] = analysis_payload
        analysis_summary = self._resolve_text(
            analysis_payload,
            "summary",
            "analysis",
            default=request.trade_summary,
        )

        trade_prompt = self._build_trade_prompt(request, analysis_payload, focus_trades)
        trade_run = self.trade.run(trade_prompt)
        runs.append(trade_run)
        trade_payload = parse_json_response(trade_run.response, fallback_key="trade") or {}
        metadata["trade_payload"] = trade_payload
        trade_output = self._collect_section(
            trade_payload,
            ("summary", "narrative", "trade"),
            ("focus", "actions", "playbook_updates", "recommendations"),
        )

        market_prompt = self._build_market_prompt(request, analysis_payload, trade_payload)
        market_run = self.market.run(market_prompt)
        runs.append(market_run)
        market_payload = parse_json_response(market_run.response, fallback_key="market") or {}
        metadata["market_payload"] = market_payload
        market_output = self._collect_section(
            market_payload,
            ("summary", "narrative", "market"),
            ("scenarios", "watchlist", "macro_signals", "market_notes"),
        )

        psychology_prompt = self._build_psychology_prompt(request, analysis_payload, trade_payload)
        psychology_run = self.psychology.run(psychology_prompt)
        runs.append(psychology_run)
        psychology_payload = parse_json_response(psychology_run.response, fallback_key="psychology") or {}
        metadata["psychology_payload"] = psychology_payload
        psychology_output = self._collect_section(
            psychology_payload,
            ("summary", "narrative", "psychology"),
            ("mindset_resets", "psychology_focus", "mental_models", "rituals"),
        )

        risk_prompt = self._build_risk_prompt(request, analysis_payload, trade_payload)
        risk_run = self.risk.run(risk_prompt)
        runs.append(risk_run)
        risk_payload = parse_json_response(risk_run.response, fallback_key="risk") or {}
        metadata["risk_payload"] = risk_payload
        risk_output = self._collect_section(
            risk_payload,
            ("summary", "narrative", "risk"),
            ("guardrails", "capital_allocation", "risk_actions", "money_management"),
        )

        journal_text = ""
        journal_payload: Dict[str, Any] = {}
        if self.journal:
            journal_prompt = self._build_journal_prompt(
                request,
                analysis_payload,
                trade_payload,
                market_payload,
                psychology_payload,
                risk_payload,
            )
            journal_run = self.journal.run(journal_prompt)
            runs.append(journal_run)
            journal_payload = parse_json_response(journal_run.response, fallback_key="journal") or {}
            metadata["journal_payload"] = journal_payload
            journal_text = self._resolve_text(
                journal_payload,
                "journal_entry",
                "summary",
                "narrative",
                "journal",
                default=analysis_summary,
            )
            if not journal_text:
                journal_lines = collect_strings(
                    journal_payload.get("highlights"),
                    journal_payload.get("next_steps"),
                    journal_payload.get("questions"),
                )
                journal_text = "\n".join(journal_lines)
        else:
            journal_text = self._assemble_fallback_journal(
                analysis_summary,
                trade_output,
                market_output,
                psychology_output,
                risk_output,
            )

        analysis_section = self._collect_section(
            analysis_payload,
            ("summary", "analysis"),
            ("analytical_highlights", "structural_lessons", "market_drivers", "risk_callouts"),
        )

        raw_response = serialise_runs(runs)
        metadata["journal_text_preview"] = journal_text[:200]

        return LearningAlgorithmReport(
            trade_output=list(trade_output),
            market_output=list(market_output),
            trade_psychology_output=list(psychology_output),
            trade_analysis_output=list(analysis_section),
            risk_and_money_management_output=list(risk_output),
            trade_journal_output=journal_text,
            metadata=metadata,
            runs=runs,
            raw_response=raw_response,
        )

    # ------------------------------------------------------------------
    # Prompt builders
    # ------------------------------------------------------------------

    def _build_analysis_prompt(
        self,
        request: LearningAlgorithmRequest,
        trades: Sequence[TradeRecord],
    ) -> str:
        objectives_block = self._format_bullets(request.objectives[: self.max_objectives])
        psychology_block = self._format_bullets(request.psychology_notes[: self.max_focus_points])
        questions_block = self._format_bullets(request.open_questions[: self.max_focus_points])
        trades_json = json.dumps(
            [trade.to_prompt_payload() for trade in trades], indent=2, sort_keys=True
        )
        metrics_json = self._format_json(request.performance_metrics)
        risk_json = self._format_json(request.risk_parameters)

        prompt = textwrap.dedent(
            f"""
            You are the lead execution analyst for a collaborative multi-LLM trading desk.
            Evaluate the session context and extract the most important analytical takeaways.

            Session date: {request.session_date}
            Session theme: {request.session_theme}

            Market overview:
            {request.market_overview}

            Trade summary:
            {request.trade_summary}

            Objectives:
            {objectives_block or "  (none provided)"}

            Trades:
            {trades_json}

            Performance metrics:
            {metrics_json}

            Risk parameters:
            {risk_json}

            Psychology notes:
            {psychology_block or "  (none provided)"}

            Open questions:
            {questions_block or "  (none provided)"}

            Respond with strict JSON containing:
            - summary: concise 2-3 sentence overview of execution quality
            - analytical_highlights: array of key observations
            - structural_lessons: array of lessons for the playbook
            - market_drivers: array describing dominant flows or catalysts
            - risk_callouts: array of notable risk considerations
            """
        ).strip()
        return prompt

    def _build_trade_prompt(
        self,
        request: LearningAlgorithmRequest,
        analysis_payload: Mapping[str, Any],
        trades: Sequence[TradeRecord],
    ) -> str:
        analysis_json = self._format_json(analysis_payload)
        trades_json = json.dumps(
            [trade.to_prompt_payload() for trade in trades], indent=2, sort_keys=True
        )
        objectives_block = self._format_bullets(request.objectives[: self.max_objectives])

        prompt = textwrap.dedent(
            f"""
            You are a senior trade architect collaborating with an analysis LLM.
            Use the analytical findings to refine trade execution guidance and learning focus.

            Session date: {request.session_date}
            Session theme: {request.session_theme}

            Objectives:
            {objectives_block or "  (none provided)"}

            Analyst findings:
            {analysis_json}

            Trades for review:
            {trades_json}

            Provide JSON with keys:
            - summary: overarching trade takeaways
            - focus: array of focus areas for skill development
            - actions: array of execution adjustments or drills
            - playbook_updates: array of playbook changes to make
            - recommendations: optional array of tactical suggestions
            """
        ).strip()
        return prompt

    def _build_market_prompt(
        self,
        request: LearningAlgorithmRequest,
        analysis_payload: Mapping[str, Any],
        trade_payload: Mapping[str, Any],
    ) -> str:
        analysis_json = self._format_json(analysis_payload)
        trade_json = self._format_json(trade_payload)
        environment_json = self._format_json(request.environment)

        prompt = textwrap.dedent(
            f"""
            You are the market intelligence specialist in a multi-LLM workflow.
            Blend analyst and trade architect outputs to shape forward-looking market guidance.

            Market overview baseline:
            {request.market_overview}

            Analyst perspective:
            {analysis_json}

            Trade architect adjustments:
            {trade_json}

            Desk environment:
            {environment_json}

            Return JSON with:
            - summary: market stance and key narrative
            - scenarios: array of scenario plans or triggers
            - watchlist: array of assets or levels to monitor
            - macro_signals: array of macro or flow drivers to track
            - market_notes: optional additional context
            """
        ).strip()
        return prompt

    def _build_psychology_prompt(
        self,
        request: LearningAlgorithmRequest,
        analysis_payload: Mapping[str, Any],
        trade_payload: Mapping[str, Any],
    ) -> str:
        psychology_block = self._format_bullets(request.psychology_notes[: self.max_focus_points])
        analysis_json = self._format_json(analysis_payload)
        trade_json = self._format_json(trade_payload)

        prompt = textwrap.dedent(
            f"""
            You are the trading psychologist supporting the desk.
            Pair the analytical findings with current mindset notes to design reinforcement rituals.

            Session date: {request.session_date}

            Baseline psychology notes:
            {psychology_block or "  (none provided)"}

            Analytical context:
            {analysis_json}

            Trade adjustments:
            {trade_json}

            Respond with JSON containing:
            - summary: framing of psychological focus
            - mindset_resets: array of resets or recovery actions
            - psychology_focus: array of priorities to reinforce
            - mental_models: array of decision models or prompts
            - rituals: optional array of routines to schedule
            """
        ).strip()
        return prompt

    def _build_risk_prompt(
        self,
        request: LearningAlgorithmRequest,
        analysis_payload: Mapping[str, Any],
        trade_payload: Mapping[str, Any],
    ) -> str:
        analysis_json = self._format_json(analysis_payload)
        trade_json = self._format_json(trade_payload)
        risk_json = self._format_json(request.risk_parameters)

        prompt = textwrap.dedent(
            f"""
            You are the risk and money management strategist.
            Ingest the analysis and trade adjustments to tune guardrails for the upcoming sessions.

            Risk parameters:
            {risk_json}

            Analytical insight:
            {analysis_json}

            Execution adjustments:
            {trade_json}

            Deliver JSON with keys:
            - summary: risk posture statement
            - guardrails: array of risk guardrails or rules
            - capital_allocation: array detailing position sizing or capital flows
            - risk_actions: array of immediate actions to take
            - money_management: optional array of money management tweaks
            """
        ).strip()
        return prompt

    def _build_journal_prompt(
        self,
        request: LearningAlgorithmRequest,
        analysis_payload: Mapping[str, Any],
        trade_payload: Mapping[str, Any],
        market_payload: Mapping[str, Any],
        psychology_payload: Mapping[str, Any],
        risk_payload: Mapping[str, Any],
    ) -> str:
        analysis_json = self._format_json(analysis_payload)
        trade_json = self._format_json(trade_payload)
        market_json = self._format_json(market_payload)
        psychology_json = self._format_json(psychology_payload)
        risk_json = self._format_json(risk_payload)
        journal_focus = self._format_bullets(request.journal_focus[: self.max_focus_points])

        prompt = textwrap.dedent(
            f"""
            You are the journaling orchestrator closing the learning loop.
            Integrate the specialist outputs into a cohesive trade journal entry with concrete follow-ups.

            Session date: {request.session_date}
            Session theme: {request.session_theme}

            Journal focus prompts:
            {journal_focus or "  (none provided)"}

            Analytical highlights:
            {analysis_json}

            Trade architect focus:
            {trade_json}

            Market intelligence:
            {market_json}

            Psychology plan:
            {psychology_json}

            Risk framework:
            {risk_json}

            Respond with JSON containing:
            - summary: 2-3 sentence journal narrative
            - journal_entry: optional expanded journal entry text
            - highlights: array of key wins or misses
            - next_steps: array of actionable follow-ups
            - questions: array of reflection prompts
            """
        ).strip()
        return prompt

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    @staticmethod
    def _format_bullets(items: Sequence[Any], prefix: str = "  - ") -> str:
        strings = [str(item).strip() for item in items if str(item).strip()]
        if not strings:
            return ""
        return "\n".join(f"{prefix}{text}" for text in strings)

    @staticmethod
    def _format_json(payload: Mapping[str, Any] | Sequence[Any] | Any) -> str:
        if isinstance(payload, Mapping):
            data = dict(payload)
        elif isinstance(payload, Sequence) and not isinstance(payload, (str, bytes, bytearray)):
            data = list(payload)
        else:
            data = payload
        if not data:
            return "  (none provided)"
        try:
            return json.dumps(data, indent=2, sort_keys=True)
        except TypeError:
            return str(data)

    @staticmethod
    def _resolve_text(
        payload: Mapping[str, Any],
        *keys: str,
        default: Any = "",
    ) -> str:
        for key in keys:
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        if isinstance(default, str):
            return default.strip()
        return str(default)

    @staticmethod
    def _collect_section(
        payload: Mapping[str, Any],
        summary_keys: Sequence[str],
        list_keys: Sequence[str],
    ) -> list[str]:
        summary = DynamicLearningEngine._resolve_text(payload, *summary_keys, default="")
        bullets = collect_strings(*(payload.get(key) for key in list_keys))
        if summary:
            return [summary, *bullets]
        return list(bullets)

    @staticmethod
    def _assemble_fallback_journal(
        analysis_summary: str,
        trade_output: Sequence[str],
        market_output: Sequence[str],
        psychology_output: Sequence[str],
        risk_output: Sequence[str],
    ) -> str:
        parts: list[str] = []
        if analysis_summary:
            parts.append(analysis_summary)
        if trade_output:
            parts.append("Trade focus:\n" + "\n".join(f"- {line}" for line in trade_output))
        if market_output:
            parts.append("Market plan:\n" + "\n".join(f"- {line}" for line in market_output))
        if psychology_output:
            parts.append("Mindset plan:\n" + "\n".join(f"- {line}" for line in psychology_output))
        if risk_output:
            parts.append("Risk guardrails:\n" + "\n".join(f"- {line}" for line in risk_output))
        return "\n\n".join(parts).strip()


__all__ = [
    "DynamicLearningEngine",
    "LearningAlgorithmReport",
    "LearningAlgorithmRequest",
]
