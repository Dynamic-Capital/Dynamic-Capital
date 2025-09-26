"""Dynamic multi-LLM orchestration for multi-horizon trading protocols."""

from __future__ import annotations

import json
import math
import textwrap
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence, Tuple, TYPE_CHECKING

from .multi_llm import LLMConfig, LLMRun, collect_strings, parse_json_response

try:  # pragma: no cover - optional dependency graph handled lazily in tests
    from .optimization_workflow import optimize_trading_stack
except Exception:  # pragma: no cover - allow importing when optimisation stack unavailable
    optimize_trading_stack = None  # type: ignore[assignment]

if TYPE_CHECKING:  # pragma: no cover - import cycles avoided at runtime
    from collections.abc import Callable

    from .backtesting import BacktestResult
    from .optimization_workflow import OptimizationPlan
    from .realtime import BrokerConnector, HealthMonitor, StateStore
    from .trade_logic import MarketSnapshot, RiskParameters, TradeConfig, TradeLogic
    from .trade_logic import PerformanceMetrics  # noqa: F401  # re-export for typing
    from .grok_advisor import TradeAdvisor


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


def _round_float(value: Any, *, precision: int = 6) -> Any:
    if isinstance(value, float):
        if math.isnan(value):
            return "nan"
        if math.isinf(value):
            return "inf" if value > 0 else "-inf"
        return round(value, precision)
    return value


def _summarise_dataclass(instance: Any) -> Dict[str, Any]:
    if instance is None or not hasattr(instance, "__dataclass_fields__"):
        return {}
    return {key: _round_float(value) for key, value in asdict(instance).items()}


def _summarise_performance(metrics: Any) -> Dict[str, Any]:
    if metrics is None or not hasattr(metrics, "__dataclass_fields__"):
        return {}
    summary = {
        "total_trades": getattr(metrics, "total_trades", 0),
        "wins": getattr(metrics, "wins", 0),
        "losses": getattr(metrics, "losses", 0),
        "hit_rate": _round_float(getattr(metrics, "hit_rate", 0.0), precision=4),
        "profit_factor": _round_float(getattr(metrics, "profit_factor", 0.0), precision=4),
        "max_drawdown_pct": _round_float(getattr(metrics, "max_drawdown_pct", 0.0), precision=3),
    }
    return summary


def _summarise_backtest(result: Any) -> Dict[str, Any]:
    if result is None:
        return {}
    summary = {
        "ending_equity": _round_float(getattr(result, "ending_equity", 0.0), precision=2),
        "decisions": len(getattr(result, "decisions", []) or []),
        "trades": len(getattr(result, "trades", []) or []),
    }
    performance = getattr(result, "performance", None)
    perf_summary = _summarise_performance(performance)
    if perf_summary:
        summary["performance"] = perf_summary
    return summary


def _summarise_trade_logic(trade_logic: Any) -> Dict[str, Any]:
    if trade_logic is None:
        return {}
    payload: Dict[str, Any] = {}
    config = getattr(trade_logic, "config", None)
    config_summary = _summarise_dataclass(config)
    if config_summary:
        payload["config"] = config_summary
    risk = getattr(trade_logic, "risk", None)
    params = getattr(risk, "params", None) if risk else None
    risk_summary = _summarise_dataclass(params)
    if risk_summary:
        payload["risk_parameters"] = risk_summary
    metrics = None
    if risk:
        metrics_fn = getattr(risk, "metrics", None)
        if callable(metrics_fn):
            try:
                metrics = metrics_fn()
            except Exception:  # pragma: no cover - guard against external risk implementations
                metrics = None
    perf_summary = _summarise_performance(metrics)
    if perf_summary:
        payload["risk_metrics"] = perf_summary
    adr_tracker = getattr(trade_logic, "adr_tracker", None)
    if adr_tracker is not None:
        payload["adr"] = {
            "period": getattr(adr_tracker, "period", None),
            "value": _round_float(getattr(adr_tracker, "value", None)),
        }
    smc = getattr(trade_logic, "smc", None)
    payload["smc"] = {
        "enabled": bool(smc),
        "structure_threshold_pips": _round_float(getattr(config, "smc_structure_threshold_pips", None)),
        "liquidity_weight": _round_float(getattr(config, "smc_liquidity_weight", None)),
    }
    return payload


def _summarise_optimization_plan(plan: Any) -> Dict[str, Any]:
    if plan is None:
        return {}
    summary: Dict[str, Any] = {}
    base_config = getattr(plan, "base_config", None)
    tuned_config = getattr(plan, "tuned_config", None)
    best_config = getattr(plan, "best_config", None)
    if base_config:
        summary["base_config"] = _summarise_dataclass(base_config)
    if tuned_config:
        summary["tuned_config"] = _summarise_dataclass(tuned_config)
    if best_config:
        summary["best_config"] = _summarise_dataclass(best_config)
    backtest = getattr(plan, "backtest_result", None)
    backtest_summary = _summarise_backtest(backtest)
    if backtest_summary:
        summary["backtest"] = backtest_summary
    insights = getattr(plan, "insights", None)
    insights_summary = _summarise_dataclass(insights)
    if insights_summary:
        summary["insights"] = insights_summary
    history = getattr(plan, "history", None)
    if history is not None:
        summary["search_iterations"] = len(history)
    realtime = getattr(plan, "realtime_executor", None)
    summary["realtime_ready"] = realtime is not None
    return summary


def _compose_context(
    base_context: Optional[Mapping[str, Any]],
    trade_logic: Any,
    optimization_plan: Any,
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    context: Dict[str, Any] = dict(base_context or {})
    trade_logic_summary = _summarise_trade_logic(trade_logic)
    optimization_summary = _summarise_optimization_plan(optimization_plan)
    if trade_logic_summary:
        context["trade_logic"] = trade_logic_summary
    if optimization_summary:
        context["optimization"] = optimization_summary
    return context, trade_logic_summary, optimization_summary


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

    def generate_protocol(
        self,
        *,
        context: Optional[Mapping[str, Any]] = None,
        trade_logic: "TradeLogic" | None = None,
        optimization_plan: "OptimizationPlan" | None = None,
    ) -> ProtocolDraft:
        """Generate an integrated protocol across strategy horizons."""

        composed_context, trade_logic_summary, optimization_summary = _compose_context(
            context,
            trade_logic,
            optimization_plan,
        )
        context_payload = json.dumps(
            composed_context,
            indent=2,
            sort_keys=True,
            default=str,
        )
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
        annotations: Dict[str, Any] = {
            "horizons": HORIZON_KEYS,
            "categories": CATEGORY_KEYS,
        }
        if context:
            annotations["context_supplied"] = True
        if trade_logic_summary:
            annotations["trade_logic"] = trade_logic_summary
        if optimization_summary:
            annotations["optimization"] = optimization_summary
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

    def optimize_and_generate(
        self,
        snapshots: Sequence["MarketSnapshot"],
        search_space: Mapping[str, Iterable],
        *,
        base_config: "TradeConfig" | None = None,
        risk_parameters: "RiskParameters" | None = None,
        scoring: "Callable[[BacktestResult], float]" | None = None,
        initial_equity: float = 10_000.0,
        broker: "BrokerConnector" | None = None,
        state_store: "StateStore" | None = None,
        health_monitor: "HealthMonitor" | None = None,
        advisor: "TradeAdvisor" | None = None,
        context: Optional[Mapping[str, Any]] = None,
    ) -> ProtocolDraft:
        """Run optimisation workflow before generating the protocol."""

        if optimize_trading_stack is None:  # pragma: no cover - handled in production environments
            raise RuntimeError("optimize_trading_stack is unavailable in this environment")

        plan = optimize_trading_stack(
            snapshots,
            search_space,
            base_config=base_config,
            risk_parameters=risk_parameters,
            scoring=scoring,
            initial_equity=initial_equity,
            broker=broker,
            state_store=state_store,
            health_monitor=health_monitor,
            advisor=advisor,
        )

        trade_logic = getattr(plan, "trade_logic", None)
        return self.generate_protocol(
            context=context,
            trade_logic=trade_logic,
            optimization_plan=plan,
        )

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

