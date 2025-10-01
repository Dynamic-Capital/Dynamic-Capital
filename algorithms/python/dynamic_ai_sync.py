"""Dynamic AI orchestration utilities for synchronising algorithm outputs."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field, is_dataclass
from datetime import UTC, date, datetime
from time import perf_counter
from typing import Any, Callable, Dict, Iterable, Mapping, Optional, Sequence, Tuple

from typing_extensions import Literal

from dynamic.intelligence.ai_apps import (
    ExecutionAgent,
    ResearchAgent,
    RiskAgent,
    get_default_execution_agent,
    get_default_research_agent,
    get_default_risk_agent,
)
from dynamic.trading.algo.trading_core import (
    DynamicTradingAlgo,
    TradeExecutionResult,
    normalise_symbol,
)

try:  # pragma: no cover - optional dependency for treasury actions
    from dynamic.platform.token.treasury import DynamicTreasuryAlgo, TreasuryEvent
except Exception:  # pragma: no cover - keep alignment logic usable without treasury module
    DynamicTreasuryAlgo = None  # type: ignore[assignment]
    TreasuryEvent = None  # type: ignore[assignment]

from .multi_llm import LLMConfig, LLMRun, collect_strings, parse_json_response, serialise_runs

AlgorithmStatus = Literal["success", "error"]


def _normalise_value(value: Any) -> Any:
    """Best-effort conversion of arbitrary values into JSON-friendly types."""

    if value is None:
        return None
    if hasattr(value, "to_dict"):
        try:
            candidate = value.to_dict()
        except Exception:
            candidate = value
        else:
            return _normalise_value(candidate)
    if is_dataclass(value):
        return _normalise_value(asdict(value))
    if isinstance(value, Mapping):
        return {str(key): _normalise_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_normalise_value(item) for item in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _coerce_payload(value: Any) -> Dict[str, Any]:
    """Convert sync outputs into a mapping suitable for serialisation."""

    if value is None:
        return {}
    normalised = _normalise_value(value)
    if isinstance(normalised, Mapping):
        return dict(normalised)
    return {"value": normalised}


def _json_default(value: Any) -> Any:
    """JSON serialisation fallback aware of dataclasses and datetimes."""

    normalised = _normalise_value(value)
    if isinstance(normalised, (str, int, float, bool)) or normalised is None:
        return normalised
    if isinstance(normalised, list):
        return normalised
    if isinstance(normalised, Mapping):
        return dict(normalised)
    return str(normalised)


def _flatten_strings(value: Any) -> list[str]:
    """Extract string representations from heterogeneous containers."""

    results: list[str] = []
    if value is None:
        return results
    if isinstance(value, Mapping):
        for item in value.values():
            results.extend(_flatten_strings(item))
        return results
    if isinstance(value, (list, tuple, set)):
        for item in value:
            results.extend(_flatten_strings(item))
        return results
    text = str(value).strip()
    if text:
        results.append(text)
    return results


def _first_mapping(context: Mapping[str, Any], *keys: str) -> Mapping[str, Any]:
    for key in keys:
        value = context.get(key)
        if isinstance(value, Mapping):
            return value
    return {}


def _safe_float(value: Any) -> Optional[float]:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if numeric != numeric:  # NaN guard
        return None
    return numeric


def _extract_agent_candidate(candidate: Any) -> Any:
    if isinstance(candidate, Mapping):
        for key in ("agent", "instance", "value"):
            if key in candidate:
                return candidate[key]
        for key in ("factory", "callable", "builder", "provider"):
            if key in candidate:
                return candidate[key]
    return candidate


def _is_agent_like(candidate: Any) -> bool:
    run_method = getattr(candidate, "run", None)
    return callable(run_method)


def _resolve_agent_candidate(
    candidate: Any,
    *,
    expected_type: type[Any],
    default_factory: Callable[[], Any],
) -> Any:
    candidate = _extract_agent_candidate(candidate)
    if isinstance(candidate, expected_type):
        return candidate
    if _is_agent_like(candidate):
        return candidate
    if callable(candidate):
        try:
            produced = candidate()
        except Exception:
            produced = None
        else:
            produced = _extract_agent_candidate(produced)
            if isinstance(produced, expected_type) or _is_agent_like(produced):
                return produced
    return default_factory()


def _resolve_instrument(
    trader: Any,
    symbol: str,
    helper: Optional[DynamicTradingAlgo] = None,
) -> Tuple[str, Any | None, Optional[Callable[[float, Any], float]], Optional[DynamicTradingAlgo]]:
    """Resolve canonical symbol/profile and a lot clamp helper."""

    canonical_symbol = symbol
    profile = None
    clamp_fn: Optional[Callable[[float, Any], float]] = None

    resolver = getattr(trader, "_resolve_symbol", None)
    if callable(resolver):
        try:
            resolved_symbol, resolved_profile = resolver(symbol)
        except Exception:
            resolved_symbol, resolved_profile = symbol, None
        else:
            canonical_symbol, profile = resolved_symbol, resolved_profile

    clamp_candidate = getattr(trader, "_clamp_lot", None)
    if callable(clamp_candidate):
        clamp_fn = clamp_candidate

    helper_algo = helper
    if profile is None or clamp_fn is None:
        helper_algo = helper_algo or DynamicTradingAlgo()
        try:
            resolved_symbol, resolved_profile = helper_algo._resolve_symbol(symbol)
        except Exception:
            resolved_symbol, resolved_profile = canonical_symbol, profile
        else:
            canonical_symbol, profile = resolved_symbol, resolved_profile
        if clamp_fn is None:
            clamp_fn = helper_algo._clamp_lot

    return canonical_symbol, profile, clamp_fn, helper_algo


def run_dynamic_agent_cycle(context: Mapping[str, Any]) -> Dict[str, Any]:
    """Execute the research → execution → risk persona chain."""

    base_context: Dict[str, Any] = dict(context or {})

    start_candidates: Mapping[str, Any] | None = None
    provided_start_agents = base_context.get("dynamic_start_agents") or base_context.get("start_agents")
    if callable(provided_start_agents):
        try:
            provided_start_agents = provided_start_agents()
        except Exception:
            provided_start_agents = None
    if isinstance(provided_start_agents, Mapping):
        start_candidates = provided_start_agents

    research_candidate = base_context.get("research_agent")
    if research_candidate is None and start_candidates is not None:
        research_candidate = start_candidates.get("research")
    research_agent = _resolve_agent_candidate(
        research_candidate,
        expected_type=ResearchAgent,
        default_factory=get_default_research_agent,
    )

    execution_candidate = base_context.get("execution_agent")
    if execution_candidate is None and start_candidates is not None:
        execution_candidate = start_candidates.get("execution")
    execution_agent = _resolve_agent_candidate(
        execution_candidate,
        expected_type=ExecutionAgent,
        default_factory=get_default_execution_agent,
    )

    risk_candidate = base_context.get("risk_agent")
    if risk_candidate is None and start_candidates is not None:
        risk_candidate = start_candidates.get("risk")
    risk_agent = _resolve_agent_candidate(
        risk_candidate,
        expected_type=RiskAgent,
        default_factory=get_default_risk_agent,
    )

    research_payload = dict(_first_mapping(base_context, "research_payload", "research", "analysis_payload"))
    research_result = research_agent.run(research_payload)
    research_dict = research_result.to_dict()

    market_payload = dict(_first_mapping(base_context, "market_payload", "market", "signal_payload"))
    execution_result = execution_agent.run({"market": market_payload, "analysis": research_dict.get("analysis", {})})
    execution_dict = execution_result.to_dict()

    risk_section = _first_mapping(base_context, "risk_payload", "risk")
    risk_payload: Dict[str, Any] = {
        "signal": execution_result.signal,
        "risk_context": risk_section.get("risk_context") or base_context.get("risk_context"),
        "risk_parameters": risk_section.get("risk_parameters") or base_context.get("risk_parameters"),
        "account_state": risk_section.get("account_state") or base_context.get("account_state"),
        "market_state": risk_section.get("market_state") or base_context.get("market_state"),
    }

    risk_result = risk_agent.run(risk_payload)
    risk_dict = risk_result.to_dict()

    adjusted_signal = risk_dict.get("adjusted_signal", {})
    decision_payload: Dict[str, Any] = {
        "action": adjusted_signal.get("action", execution_dict["signal"]["action"]),
        "confidence": adjusted_signal.get("confidence", execution_dict["signal"].get("confidence")),
        "rationale": risk_result.rationale or execution_result.rationale,
        "hedge_decisions": risk_dict.get("hedge_decisions", []),
    }
    if sizing := risk_dict.get("sizing"):
        decision_payload["sizing"] = sizing
    if escalations := risk_dict.get("escalations"):
        decision_payload["escalations"] = escalations

    return {
        "agents": {
            "research": research_dict,
            "execution": execution_dict,
            "risk": risk_dict,
        },
        "decision": decision_payload,
    }


def _coerce_symbol(value: Any, default: str = "XAUUSD") -> str:
    return normalise_symbol(value or default)


def _coerce_lot(value: Any, default: float = 0.1) -> float:
    try:
        lot = float(value)
    except (TypeError, ValueError):
        return default
    return lot if lot > 0 else default


def _select_trade_signal(agent_cycle: Mapping[str, Any]) -> Mapping[str, Any]:
    decision = agent_cycle.get("decision")
    if isinstance(decision, Mapping) and decision.get("action"):
        return dict(decision)

    agents = agent_cycle.get("agents")
    if isinstance(agents, Mapping):
        execution = agents.get("execution")
        if isinstance(execution, Mapping):
            signal = execution.get("signal")
            if isinstance(signal, Mapping) and signal.get("action"):
                return dict(signal)
    return {"action": "NEUTRAL", "confidence": 0.0}


def _ensure_trade_algo(candidate: Any) -> DynamicTradingAlgo:
    if isinstance(candidate, DynamicTradingAlgo):
        return candidate
    if hasattr(candidate, "execute_trade"):
        return candidate  # type: ignore[return-value]
    return DynamicTradingAlgo()


def _clean_sequence(items: Iterable[Any]) -> list[Any]:
    cleaned: list[Any] = []
    for item in items:
        if item is None:
            continue
        if isinstance(item, str):
            text = item.strip()
            if not text:
                continue
            cleaned.append(text)
            continue
        if isinstance(item, Mapping):
            nested = _clean_mapping(item)
            if nested:
                cleaned.append(nested)
            continue
        if isinstance(item, float) and item != item:  # NaN guard
            continue
        cleaned.append(item)
    return cleaned


def _clean_mapping(payload: Mapping[str, Any]) -> Dict[str, Any]:
    cleaned: Dict[str, Any] = {}
    for key, value in payload.items():
        if value is None:
            continue
        if isinstance(value, float) and value != value:  # NaN guard
            continue
        if key == "loss_covered":
            numeric = _safe_float(value)
            if numeric is None or numeric == 0:
                continue
        if isinstance(value, str):
            text = value.strip()
            if not text:
                continue
            cleaned[key] = text
            continue
        if isinstance(value, Mapping):
            nested = _clean_mapping(value)
            if nested:
                cleaned[key] = nested
            continue
        if isinstance(value, (list, tuple, set)):
            nested_sequence = _clean_sequence(value)
            if nested_sequence:
                cleaned[key] = nested_sequence
            continue
        cleaned[key] = value
    return cleaned


def _apply_treasury_updates(
    trade: TradeExecutionResult,
    treasury_candidate: Any,
) -> Mapping[str, Any] | None:
    treasury = _extract_agent_candidate(treasury_candidate)

    if isinstance(treasury, type) or (
        callable(treasury) and not hasattr(treasury, "update_from_trade")
    ):
        try:
            produced = treasury()
        except Exception:  # pragma: no cover - constructor guard
            treasury = None
        else:
            treasury = _extract_agent_candidate(produced)

    if treasury is None and DynamicTreasuryAlgo is not None:
        try:
            treasury = DynamicTreasuryAlgo()
        except Exception:  # pragma: no cover - constructor guard
            treasury = None

    if treasury is None or not hasattr(treasury, "update_from_trade"):
        return None

    try:
        event = treasury.update_from_trade(trade)
    except Exception:  # pragma: no cover - downstream failures should not abort sync
        return None

    if event is None:
        return None

    normalised = _coerce_payload(event)
    if not normalised and TreasuryEvent is not None and isinstance(event, TreasuryEvent):
        normalised = asdict(event)

    if not normalised:
        return None

    cleaned = _clean_mapping(normalised)
    if cleaned:
        return cleaned

    return None


def _summarise_optimisation(
    agent_cycle: Mapping[str, Any],
    trade_payload: Mapping[str, Any],
    hedges: Sequence[Mapping[str, Any]] | None = None,
) -> Dict[str, Any]:
    agents = agent_cycle.get("agents") if isinstance(agent_cycle, Mapping) else {}
    risk_agent = agents.get("risk") if isinstance(agents, Mapping) else {}

    escalations: Sequence[str] = ()
    hedge_count = 0
    risk_notes: list[str] = []

    if isinstance(risk_agent, Mapping):
        raw_escalations = risk_agent.get("escalations")
        if isinstance(raw_escalations, Sequence) and not isinstance(raw_escalations, (str, bytes)):
            escalations = tuple(str(item) for item in raw_escalations if str(item))
        hedge_decisions = risk_agent.get("hedge_decisions")
        if isinstance(hedge_decisions, Sequence):
            hedge_count = len(tuple(hedge_decisions))
        adjusted_signal = risk_agent.get("adjusted_signal")
        if isinstance(adjusted_signal, Mapping):
            notes = adjusted_signal.get("risk_notes")
            if isinstance(notes, Sequence) and not isinstance(notes, (str, bytes)):
                risk_notes = [str(note) for note in notes if str(note)]

    status = trade_payload.get("status") if isinstance(trade_payload, Mapping) else None
    decision = agent_cycle.get("decision") if isinstance(agent_cycle, Mapping) else {}
    confidence = decision.get("confidence") if isinstance(decision, Mapping) else None

    executed = 0
    if hedges:
        executed = sum(
            1
            for hedge in hedges
            if isinstance(hedge, Mapping)
            and str(hedge.get("status", "")).lower() == "executed"
        )

    return {
        "status": status,
        "confidence": confidence,
        "risk_flags": tuple(escalations),
        "hedges_recommended": hedge_count,
        "risk_notes": tuple(risk_notes),
        "hedges_executed": executed,
    }


def run_dynamic_algo_alignment(context: Mapping[str, Any]) -> Dict[str, Any]:
    """Bridge Dynamic AI personas with the Dynamic Algo executor."""

    base_context: Dict[str, Any] = dict(context or {})
    provided_cycle = base_context.get("agent_cycle")
    if isinstance(provided_cycle, Mapping) and provided_cycle.get("decision"):
        agent_cycle = dict(provided_cycle)
    else:
        agent_cycle = run_dynamic_agent_cycle(base_context)

    symbol = _coerce_symbol(
        base_context.get("symbol")
        or base_context.get("market_symbol")
        or base_context.get("instrument"),
    )
    lot = _coerce_lot(base_context.get("lot") or base_context.get("order_size"))
    requested_lot = lot

    trade_signal = _select_trade_signal(agent_cycle)
    trader = _ensure_trade_algo(
        base_context.get("trader")
        or base_context.get("trade_algo")
        or base_context.get("executor"),
    )

    helper_algo: Optional[DynamicTradingAlgo] = None

    auto_sizing_enabled = bool(
        base_context.get("apply_risk_sizing") or base_context.get("apply_sizing")
    )

    sizing_candidate: Any | None = None
    sizing_payload: Mapping[str, Any] = {}
    apply_sizing = False
    if isinstance(trade_signal, Mapping):
        sizing_candidate = trade_signal.get("sizing")
        if sizing_candidate is not None:
            if is_dataclass(sizing_candidate):
                apply_sizing = True
            elif hasattr(sizing_candidate, "to_dict"):
                apply_sizing = True
            elif hasattr(sizing_candidate, "notional") and hasattr(
                sizing_candidate, "leverage"
            ):
                apply_sizing = True
            elif isinstance(sizing_candidate, Mapping):
                if "lot" in sizing_candidate or sizing_candidate.get("apply") is True:
                    apply_sizing = True
                elif auto_sizing_enabled:
                    apply_sizing = True
    if apply_sizing and sizing_candidate is not None:
        sizing_payload = _coerce_payload(sizing_candidate)

    applied_sizing: Dict[str, Any] | None = None
    if sizing_payload:
        notional = _safe_float(sizing_payload.get("notional"))
        leverage = _safe_float(sizing_payload.get("leverage")) or 1.0
        if notional and notional > 0:
            resolved_symbol, profile, clamp_fn, helper_algo = _resolve_instrument(
                trader, symbol, helper=helper_algo
            )
            if profile is not None:
                reference_price = getattr(profile, "reference_price", 0.0) or 0.0
                tick_size = getattr(profile, "tick_size", 0.0) or 0.0
                reference = reference_price if reference_price > 0 else tick_size
                if reference <= 0:
                    reference = 1.0
                exposure = notional * max(leverage, 1.0)
                raw_lot = exposure / reference
                adjusted_lot = raw_lot
                if clamp_fn is not None:
                    try:
                        adjusted_lot = clamp_fn(adjusted_lot, profile)
                    except Exception:
                        adjusted_lot = raw_lot
                lot = adjusted_lot
                applied_sizing = {
                    "notional": notional,
                    "leverage": max(leverage, 1.0),
                    "exposure": round(exposure, 6),
                    "lot": adjusted_lot,
                    "symbol": resolved_symbol,
                }
                if sizing_payload.get("notes"):
                    applied_sizing["notes"] = sizing_payload["notes"]
                applied_sizing["requested_lot"] = requested_lot
                if sizing_payload.keys() - {
                    "notional",
                    "leverage",
                    "notes",
                }:
                    applied_sizing["source"] = {
                        key: sizing_payload[key]
                        for key in sizing_payload
                        if key not in {"notional", "leverage", "notes"}
                    }

    trade_result = trader.execute_trade(trade_signal, lot=lot, symbol=symbol)
    trade_payload = _coerce_payload(trade_result)
    trade_payload.setdefault("symbol", symbol)
    trade_payload.setdefault("lot", lot)
    trade_payload.setdefault("message", getattr(trade_result, "message", ""))
    trade_payload["status"] = "executed" if getattr(trade_result, "ok", False) else "skipped"
    symbol = trade_payload.get("symbol", symbol)
    if applied_sizing:
        trade_payload["applied_sizing"] = applied_sizing
        trade_payload.setdefault("requested_lot", requested_lot)

    hedge_records: list[Dict[str, Any]] = []
    decision_section = agent_cycle.get("decision") if isinstance(agent_cycle, Mapping) else {}
    hedge_collection = ()
    if isinstance(decision_section, Mapping):
        hedge_collection = decision_section.get("hedge_decisions") or ()
    if not hedge_collection:
        agents_section = agent_cycle.get("agents") if isinstance(agent_cycle, Mapping) else {}
        if isinstance(agents_section, Mapping):
            risk_section = agents_section.get("risk")
            if isinstance(risk_section, Mapping):
                hedge_collection = risk_section.get("hedge_decisions") or ()

    for raw_decision in hedge_collection or ():
        decision_payload = _coerce_payload(raw_decision)
        if not decision_payload:
            continue
        action = str(decision_payload.get("action", "")).upper()
        hedge_symbol = decision_payload.get("hedge_symbol") or decision_payload.get("symbol")
        side = str(decision_payload.get("side", "")).upper() or "LONG_HEDGE"
        quantity = _safe_float(
            decision_payload.get("quantity")
            or decision_payload.get("lot")
            or decision_payload.get("qty")
        )
        if not hedge_symbol or quantity is None:
            continue

        close = action == "CLOSE"
        record: Dict[str, Any] = {
            "decision": decision_payload,
            "request": {
                "symbol": hedge_symbol,
                "lot": quantity,
                "side": side,
                "close": close,
            },
        }

        execute_hedge = getattr(trader, "execute_hedge", None)
        if not callable(execute_hedge):
            record["status"] = "unsupported"
            hedge_records.append(record)
            continue

        resolved_symbol, profile, clamp_fn, helper_algo = _resolve_instrument(
            trader, str(hedge_symbol), helper=helper_algo
        )
        adjusted_quantity = quantity
        if clamp_fn is not None and profile is not None:
            try:
                adjusted_quantity = clamp_fn(quantity, profile)
            except Exception:
                adjusted_quantity = quantity

        try:
            hedge_result = execute_hedge(
                symbol=resolved_symbol,
                lot=adjusted_quantity,
                side=side,
                close=close,
            )
        except Exception as exc:  # pragma: no cover - defensive guard
            record["status"] = "error"
            record["error"] = str(exc)
        else:
            result_payload = _coerce_payload(hedge_result)
            result_payload.setdefault("symbol", resolved_symbol)
            result_payload.setdefault("lot", adjusted_quantity)
            status = "executed" if getattr(hedge_result, "ok", False) else "skipped"
            result_payload.setdefault("status", status)
            record["result"] = result_payload
            record["status"] = status

        hedge_records.append(record)

    if hedge_records:
        trade_payload["hedges"] = hedge_records

    treasury_event = _apply_treasury_updates(trade_result, base_context.get("treasury"))
    optimisation = _summarise_optimisation(agent_cycle, trade_payload, hedge_records)

    return {
        "symbol": symbol,
        "lot": lot,
        "requested_lot": requested_lot,
        "agents": agent_cycle.get("agents", {}),
        "decision": agent_cycle.get("decision", {}),
        "trade": trade_payload,
        "hedges": hedge_records,
        "treasury_event": treasury_event,
        "optimisation": optimisation,
    }


@dataclass(slots=True)
class AlgorithmSyncResult:
    """Outcome of a single algorithm synchronisation routine."""

    name: str
    status: AlgorithmStatus
    payload: Dict[str, Any]
    metadata: Dict[str, Any]
    description: Optional[str] = None
    tags: tuple[str, ...] = ()
    notes: tuple[str, ...] = ()
    error: Optional[str] = None
    duration_seconds: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Return a JSON-friendly representation of the result."""

        payload: Dict[str, Any] = {
            "name": self.name,
            "status": self.status,
            "payload": dict(self.payload),
            "metadata": dict(self.metadata),
            "tags": list(self.tags),
            "notes": list(self.notes),
            "duration_seconds": self.duration_seconds,
        }
        if self.description:
            payload["description"] = self.description
        if self.error:
            payload["error"] = self.error
        return payload


@dataclass(slots=True)
class AlgorithmSyncAdapter:
    """Adapter that executes an algorithm sync callable with shared context."""

    name: str
    runner: Callable[[Mapping[str, Any]], Any]
    description: Optional[str] = None
    metadata: Mapping[str, Any] = field(default_factory=dict)
    tags: Sequence[str] = ()
    notes: Sequence[str] = ()

    def execute(self, context: Mapping[str, Any]) -> AlgorithmSyncResult:
        """Run the sync callable and capture metadata for orchestration."""

        started = perf_counter()
        try:
            output = self.runner(context)
        except Exception as exc:
            duration = perf_counter() - started
            return AlgorithmSyncResult(
                name=self.name,
                status="error",
                payload={},
                metadata=dict(self.metadata),
                description=self.description,
                tags=tuple(self.tags),
                notes=tuple(self.notes),
                error=str(exc),
                duration_seconds=duration,
            )

        duration = perf_counter() - started
        return AlgorithmSyncResult(
            name=self.name,
            status="success",
            payload=_coerce_payload(output),
            metadata=dict(self.metadata),
            description=self.description,
            tags=tuple(self.tags),
            notes=tuple(self.notes),
            duration_seconds=duration,
        )


@dataclass(slots=True)
class DynamicAISummary:
    """Consolidated summary derived from Dynamic AI reasoning."""

    summary: Optional[str]
    actions: list[str]
    risks: list[str]
    opportunities: list[str]
    recommendations: list[str]
    alerts: list[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "summary": self.summary,
            "actions": list(self.actions),
            "risks": list(self.risks),
            "opportunities": list(self.opportunities),
            "recommendations": list(self.recommendations),
            "alerts": list(self.alerts),
        }


@dataclass(slots=True)
class DynamicAISyncReport:
    """Aggregate view of Dynamic AI aligned synchronisation outputs."""

    generated_at: datetime
    results: tuple[AlgorithmSyncResult, ...]
    prompt_payload: Dict[str, Any]
    prompt: str
    llm_runs: tuple[LLMRun, ...]
    llm_payloads: Dict[str, Dict[str, Any]]
    summary: Optional[DynamicAISummary]

    def to_dict(self) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            "generated_at": self.generated_at.isoformat(),
            "results": [result.to_dict() for result in self.results],
            "prompt_payload": dict(self.prompt_payload),
            "prompt": self.prompt,
            "llm_payloads": {name: dict(payload) for name, payload in self.llm_payloads.items()},
        }
        if self.summary is not None:
            data["summary"] = self.summary.to_dict()
        return data

    @property
    def status_counts(self) -> Dict[str, int]:
        counts: Dict[str, int] = {"success": 0, "error": 0}
        for result in self.results:
            counts[result.status] = counts.get(result.status, 0) + 1
        return counts

    @property
    def raw_llm_responses(self) -> Optional[str]:
        if not self.llm_runs:
            return None
        return serialise_runs(self.llm_runs)


class DynamicAISynchroniser:
    """Coordinates multiple sync routines and summarises them via Dynamic AI."""

    summary_keys: tuple[str, ...] = ("summary", "narrative", "analysis", "commentary")
    action_keys: tuple[str, ...] = ("actions", "next_steps", "action_items", "tasks")
    risk_keys: tuple[str, ...] = ("risks", "threats", "issues", "concerns")
    opportunity_keys: tuple[str, ...] = ("opportunities", "edge", "strengths", "upside")
    recommendation_keys: tuple[str, ...] = ("recommendations", "playbook", "advice", "guidance")
    alert_keys: tuple[str, ...] = ("alerts", "warnings", "watch", "flags")

    def __init__(
        self,
        algorithms: Sequence[AlgorithmSyncAdapter],
        *,
        llm_configs: Sequence[LLMConfig] | None = None,
        prompt_instructions: Optional[str] = None,
        llm_fallback_key: str = "summary",
    ) -> None:
        self.algorithms = tuple(algorithms)
        self.llm_configs = tuple(llm_configs or ())
        self.prompt_instructions = prompt_instructions
        self.llm_fallback_key = llm_fallback_key

    def sync_all(
        self,
        *,
        context: Optional[Mapping[str, Any]] = None,
        notes: Optional[Sequence[str]] = None,
    ) -> DynamicAISyncReport:
        """Run every registered sync adapter and summarise via Dynamic AI."""

        generated_at = datetime.now(tz=UTC)
        base_context: Dict[str, Any] = dict(context or {})
        collected_notes = tuple(collect_strings(notes) if notes else ())

        results: list[AlgorithmSyncResult] = []
        for adapter in self.algorithms:
            adapter_context = dict(base_context)
            result = adapter.execute(adapter_context)
            results.append(result)

        prompt_payload = self._build_prompt_payload(
            results,
            context=base_context,
            notes=collected_notes,
            generated_at=generated_at,
        )
        prompt = self._build_prompt(prompt_payload)
        llm_runs, llm_payloads, summary = self._summarise(prompt)

        return DynamicAISyncReport(
            generated_at=generated_at,
            results=tuple(results),
            prompt_payload=prompt_payload,
            prompt=prompt,
            llm_runs=llm_runs,
            llm_payloads=llm_payloads,
            summary=summary,
        )

    def _build_prompt_payload(
        self,
        results: Sequence[AlgorithmSyncResult],
        *,
        context: Mapping[str, Any],
        notes: Sequence[str],
        generated_at: datetime,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "generated_at": generated_at.isoformat(),
            "algorithms": [result.to_dict() for result in results],
        }
        if context:
            payload["context"] = dict(context)
        if notes:
            payload["notes"] = list(notes)
        return payload

    def _build_prompt(self, payload: Mapping[str, Any]) -> str:
        instructions = self.prompt_instructions or (
            "You are the Dynamic AI orchestration layer aligning trading algorithms "
            "with live automation. Return a compact JSON object containing: "
            '"summary", "actions", "risks", "opportunities", "recommendations", and "alerts".'
        )
        payload_json = json.dumps(payload, indent=2, sort_keys=True, default=_json_default)
        return (
            f"{instructions}\n\n"
            f"Review the synchronisation telemetry and respond with JSON only.\n"
            f"Telemetry:\n{payload_json}"
        )

    def _summarise(
        self,
        prompt: str,
    ) -> tuple[tuple[LLMRun, ...], Dict[str, Dict[str, Any]], Optional[DynamicAISummary]]:
        if not self.llm_configs:
            return tuple(), {}, None

        runs: list[LLMRun] = []
        payloads: Dict[str, Dict[str, Any]] = {}
        parsed_payloads: list[Mapping[str, Any]] = []

        for config in self.llm_configs:
            run = config.run(prompt)
            runs.append(run)
            parsed = parse_json_response(run.response, fallback_key=self.llm_fallback_key)
            if parsed:
                payloads[config.name] = dict(parsed)
                parsed_payloads.append(parsed)

        summary = self._derive_summary(parsed_payloads) if parsed_payloads else None
        return tuple(runs), payloads, summary

    def _derive_summary(self, payloads: Sequence[Mapping[str, Any]]) -> DynamicAISummary:
        summary_text: Optional[str] = None
        actions: list[str] = []
        risks: list[str] = []
        opportunities: list[str] = []
        recommendations: list[str] = []
        alerts: list[str] = []

        for payload in payloads:
            if summary_text is None:
                for key in self.summary_keys + (self.llm_fallback_key,):
                    candidate = payload.get(key)
                    for text in _flatten_strings(candidate):
                        summary_text = text
                        break
                    if summary_text:
                        break

            for key in self.action_keys:
                actions.extend(_flatten_strings(payload.get(key)))
            for key in self.risk_keys:
                risks.extend(_flatten_strings(payload.get(key)))
            for key in self.opportunity_keys:
                opportunities.extend(_flatten_strings(payload.get(key)))
            for key in self.recommendation_keys:
                recommendations.extend(_flatten_strings(payload.get(key)))
            for key in self.alert_keys:
                alerts.extend(_flatten_strings(payload.get(key)))

        return DynamicAISummary(
            summary=summary_text,
            actions=collect_strings(actions),
            risks=collect_strings(risks),
            opportunities=collect_strings(opportunities),
            recommendations=collect_strings(recommendations),
            alerts=collect_strings(alerts),
        )


dynamic_agent_cycle_adapter = AlgorithmSyncAdapter(
    name="dynamic_agent_cycle",
    runner=run_dynamic_agent_cycle,
    description="Run the Dynamic AI research → execution → risk agents",
    metadata={"agents": ("research", "execution", "risk")},
    tags=("dynamic.intelligence.ai_apps", "agents"),
    notes=("Includes fused signal, guardrails, and hedge directives.",),
)


dynamic_algo_sync_adapter = AlgorithmSyncAdapter(
    name="dynamic_algo_alignment",
    runner=run_dynamic_algo_alignment,
    description="Align Dynamic AI persona outputs with Dynamic Algo execution",
    metadata={"chain": ("research", "execution", "risk", "trading")},
    tags=("dynamic.intelligence.ai_apps", "dynamic.trading.algo", "execution"),
    notes=("Runs the persona cycle, executes via paper trading, and surfaces optimisation cues.",),
)


__all__ = [
    "dynamic_agent_cycle_adapter",
    "dynamic_algo_sync_adapter",
    "AlgorithmSyncAdapter",
    "AlgorithmSyncResult",
    "DynamicAISummary",
    "DynamicAISyncReport",
    "DynamicAISynchroniser",
    "run_dynamic_algo_alignment",
    "run_dynamic_agent_cycle",
]

