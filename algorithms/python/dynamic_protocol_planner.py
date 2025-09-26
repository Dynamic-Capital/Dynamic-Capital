"""Dynamic multi-LLM orchestration for multi-horizon trading protocols."""

from __future__ import annotations

import json
import textwrap
from dataclasses import dataclass, field
from typing import Any, Dict, Mapping, Optional, Sequence

from .multi_llm import LLMConfig, LLMRun, collect_strings, parse_json_response


HORIZON_KEYS: tuple[str, ...] = ("yearly", "quarterly", "monthly", "weekly", "daily")

CATEGORY_KEYS: tuple[str, ...] = (
    "setting_goals",
    "objectives",
    "daily_tasks",
    "market_outlook",
    "market_analysis",
    "trade_plan",
    "risk_and_money_management",
    "trading_psychology",
    "trade_journaling",
    "backtesting",
    "review",
)

HORIZON_ALIASES: Dict[str, str] = {
    "annual": "yearly",
    "year": "yearly",
    "annually": "yearly",
    "yr": "yearly",
    "3 month": "quarterly",
    "quarter": "quarterly",
    "quarterly": "quarterly",
    "q": "quarterly",
    "monthly": "monthly",
    "month": "monthly",
    "mo": "monthly",
    "weekly": "weekly",
    "week": "weekly",
    "wk": "weekly",
    "daily": "daily",
    "day": "daily",
}

CATEGORY_ALIASES: Dict[str, str] = {
    "setting goal": "setting_goals",
    "setting goals": "setting_goals",
    "goals": "setting_goals",
    "strategic goals": "setting_goals",
    "objective": "objectives",
    "objectives": "objectives",
    "daily task": "daily_tasks",
    "daily tasks": "daily_tasks",
    "tasks": "daily_tasks",
    "market outlook": "market_outlook",
    "market view": "market_outlook",
    "outlook": "market_outlook",
    "market analysis": "market_analysis",
    "analysis": "market_analysis",
    "trade plan": "trade_plan",
    "trade-plan": "trade_plan",
    "risk": "risk_and_money_management",
    "risk & money management": "risk_and_money_management",
    "risk and money management": "risk_and_money_management",
    "money management": "risk_and_money_management",
    "trading psychology": "trading_psychology",
    "psychology": "trading_psychology",
    "mindset": "trading_psychology",
    "journaling": "trade_journaling",
    "trade journaling": "trade_journaling",
    "journal": "trade_journaling",
    "backtesting": "backtesting",
    "back-testing": "backtesting",
    "review": "review",
    "retrospective": "review",
}


def _normalise_key(value: str) -> str:
    return value.strip().lower().replace("_", " ")


def _normalise_horizon(value: str) -> Optional[str]:
    key = _normalise_key(value)
    if key in HORIZON_KEYS:
        return key
    return HORIZON_ALIASES.get(key)


def _normalise_category(value: str) -> Optional[str]:
    key = _normalise_key(value)
    if key in CATEGORY_KEYS:
        return key
    return CATEGORY_ALIASES.get(key)


def _initial_plan() -> Dict[str, Dict[str, list[str]]]:
    return {horizon: {category: [] for category in CATEGORY_KEYS} for horizon in HORIZON_KEYS}


def _ingest_items(container: list[str], *items: Any) -> None:
    container.extend(collect_strings(*items))


def _ingest_horizon_payload(
    plan: Dict[str, Dict[str, list[str]]],
    horizon: str,
    payload: Mapping[str, Any],
) -> None:
    for raw_category, value in payload.items():
        category = _normalise_category(str(raw_category))
        if not category:
            if isinstance(value, Mapping):
                _reduce_payload(plan, value)
            continue
        if isinstance(value, Mapping):
            # Allow nested structures like {"items": [...]}
            nested_sequences: list[Any] = []
            for nested_value in value.values():
                if isinstance(nested_value, Mapping):
                    _reduce_payload(plan, {raw_category: nested_value})
                else:
                    nested_sequences.append(nested_value)
            if nested_sequences:
                _ingest_items(plan[horizon][category], *nested_sequences)
        else:
            _ingest_items(plan[horizon][category], value)


def _reduce_payload(plan: Dict[str, Dict[str, list[str]]], payload: Mapping[str, Any]) -> None:
    for key, value in payload.items():
        horizon = _normalise_horizon(str(key))
        category = _normalise_category(str(key)) if horizon is None else None

        if horizon and isinstance(value, Mapping):
            _ingest_horizon_payload(plan, horizon, value)
        elif category and isinstance(value, Mapping):
            for raw_key, nested in value.items():
                normalised_horizon = _normalise_horizon(str(raw_key))
                if normalised_horizon:
                    _ingest_items(plan[normalised_horizon][category], nested)
                    continue
                nested_category = _normalise_category(str(raw_key))
                if nested_category and isinstance(nested, Mapping):
                    for inner_horizon, inner_value in nested.items():
                        inner_norm = _normalise_horizon(str(inner_horizon))
                        if not inner_norm:
                            continue
                        _ingest_items(plan[inner_norm][nested_category], inner_value)
                    continue
                if isinstance(nested, Mapping):
                    _reduce_payload(plan, nested)
                else:
                    for horizon_key in HORIZON_KEYS:
                        _ingest_items(plan[horizon_key][category], nested)
        elif isinstance(value, Mapping):
            _reduce_payload(plan, value)
        elif horizon:
            _ingest_items(plan[horizon]["review"], value)


def _deduplicate_plan(plan: Dict[str, Dict[str, list[str]]]) -> Dict[str, Dict[str, list[str]]]:
    for horizon in HORIZON_KEYS:
        for category in CATEGORY_KEYS:
            unique: list[str] = []
            seen: set[str] = set()
            for item in plan[horizon][category]:
                text = item.strip()
                if not text:
                    continue
                if text in seen:
                    continue
                seen.add(text)
                unique.append(text)
            plan[horizon][category] = unique
    return plan


@dataclass(slots=True)
class ProtocolDraft:
    """Structured representation of a multi-horizon trading protocol."""

    plan: Dict[str, Dict[str, list[str]]]
    runs: Sequence[LLMRun] = field(default_factory=tuple)
    annotations: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Return a serialisable view of the protocol."""

        output: Dict[str, Dict[str, list[str]]] = {}
        for horizon in HORIZON_KEYS:
            categories = {
                category: entries
                for category, entries in self.plan.get(horizon, {}).items()
                if entries
            }
            if categories:
                output[horizon] = categories
        if self.annotations:
            output["annotations"] = dict(self.annotations)
        return output


@dataclass(slots=True)
class DynamicProtocolPlanner:
    """Coordinates multiple LLMs to generate a multi-horizon trading protocol."""

    architect: LLMConfig
    risk: Optional[LLMConfig] = None
    psychology: Optional[LLMConfig] = None
    review: Optional[LLMConfig] = None

    def generate_protocol(self, *, context: Optional[Mapping[str, Any]] = None) -> ProtocolDraft:
        """Generate an integrated protocol across strategy horizons."""

        context_payload = json.dumps(context or {}, indent=2, sort_keys=True, default=str)
        plan = _initial_plan()
        runs: list[LLMRun] = []

        architect_prompt = self._build_architect_prompt(context_payload)
        architect_run = self.architect.run(architect_prompt)
        runs.append(architect_run)
        architect_payload = parse_json_response(architect_run.response, fallback_key="narrative")
        if isinstance(architect_payload, Mapping):
            _reduce_payload(plan, architect_payload)

        if self.risk:
            risk_prompt = self._build_risk_prompt(context_payload, plan)
            risk_run = self.risk.run(risk_prompt)
            runs.append(risk_run)
            risk_payload = parse_json_response(risk_run.response, fallback_key="risk_notes")
            if isinstance(risk_payload, Mapping):
                _reduce_payload(plan, risk_payload)

        if self.psychology:
            psychology_prompt = self._build_psychology_prompt(context_payload, plan)
            psychology_run = self.psychology.run(psychology_prompt)
            runs.append(psychology_run)
            psychology_payload = parse_json_response(psychology_run.response, fallback_key="psychology_notes")
            if isinstance(psychology_payload, Mapping):
                _reduce_payload(plan, psychology_payload)

        if self.review:
            review_prompt = self._build_review_prompt(context_payload, plan)
            review_run = self.review.run(review_prompt)
            runs.append(review_run)
            review_payload = parse_json_response(review_run.response, fallback_key="review_notes")
            if isinstance(review_payload, Mapping):
                _reduce_payload(plan, review_payload)

        cleaned = _deduplicate_plan(plan)
        annotations = {"horizons": HORIZON_KEYS, "categories": CATEGORY_KEYS}
        return ProtocolDraft(plan=cleaned, runs=runs, annotations=annotations)

    def _build_architect_prompt(self, context_payload: str) -> str:
        categories = ", ".join(CATEGORY_KEYS)
        horizons = ", ".join(HORIZON_KEYS)
        return textwrap.dedent(
            f"""
            Design an integrated trading protocol spanning the following horizons: {horizons}.
            For each horizon, supply structured guidance for these categories: {categories}.
            Respond with a single JSON object using the schema:
              {{
                "protocol": {{
                  "<horizon>": {{
                    "<category>": ["bullet", "points"]
                  }}
                }},
                "meta": {{"notes": "optional"}}
              }}
            Keep items concise and actionable.
            Context for this run:
            {context_payload}
            """
        ).strip()

    def _build_risk_prompt(self, context_payload: str, plan: Mapping[str, Mapping[str, Sequence[str]]]) -> str:
        plan_payload = json.dumps(plan, indent=2, sort_keys=True, default=str)
        return textwrap.dedent(
            f"""
            You are the risk and capital management LLM working with an ensemble.
            Review the draft protocol below and enhance only the risk_and_money_management
            and review categories across all horizons. Return JSON shaped as:
              {{
                "risk_overrides": {{
                  "risk_and_money_management": {{"<horizon>": ["bullet"]}},
                  "review": {{"<horizon>": ["item"]}}
                }}
              }}
            Draft protocol:
            {plan_payload}
            Context:
            {context_payload}
            """
        ).strip()

    def _build_psychology_prompt(self, context_payload: str, plan: Mapping[str, Mapping[str, Sequence[str]]]) -> str:
        plan_payload = json.dumps(plan, indent=2, sort_keys=True, default=str)
        return textwrap.dedent(
            f"""
            You are the trading psychology specialist model in a multi-agent workflow.
            Strengthen the trading_psychology and daily_tasks categories without repeating
            existing wording. Provide JSON in the form:
              {{
                "psychology": {{
                  "trading_psychology": {{"<horizon>": ["habits"]}},
                  "daily_tasks": {{"<horizon>": ["micro goal"]}}
                }}
              }}
            Current protocol:
            {plan_payload}
            Context:
            {context_payload}
            """
        ).strip()

    def _build_review_prompt(self, context_payload: str, plan: Mapping[str, Mapping[str, Sequence[str]]]) -> str:
        plan_payload = json.dumps(plan, indent=2, sort_keys=True, default=str)
        return textwrap.dedent(
            f"""
            You are the audit model responsible for ensuring the protocol is reviewable.
            Add any missing cadence checks to the review and trade_journaling categories.
            Reply with JSON of the form:
              {{
                "audit": {{
                  "review": {{"<horizon>": ["checkpoint"]}},
                  "trade_journaling": {{"<horizon>": ["note"]}}
                }}
              }}
            Current protocol:
            {plan_payload}
            Context:
            {context_payload}
            """
        ).strip()


__all__ = [
    "CATEGORY_KEYS",
    "DynamicProtocolPlanner",
    "HORIZON_KEYS",
    "ProtocolDraft",
]

