"""Dynamic AI orchestration utilities for synchronising algorithm outputs."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field, is_dataclass
from datetime import UTC, date, datetime
from time import perf_counter
from typing import Any, Callable, Dict, Mapping, Optional, Sequence

from typing_extensions import Literal

from dynamic_ai import ExecutionAgent, ResearchAgent, RiskAgent

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


def run_dynamic_agent_cycle(context: Mapping[str, Any]) -> Dict[str, Any]:
    """Execute the research → execution → risk persona chain."""

    base_context: Dict[str, Any] = dict(context or {})

    research_agent = base_context.get("research_agent")
    if not isinstance(research_agent, ResearchAgent):
        research_agent = ResearchAgent()

    execution_agent = base_context.get("execution_agent")
    if not isinstance(execution_agent, ExecutionAgent):
        execution_agent = ExecutionAgent()

    risk_agent = base_context.get("risk_agent")
    if not isinstance(risk_agent, RiskAgent):
        risk_agent = RiskAgent()

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
    tags=("dynamic_ai", "agents"),
    notes=("Includes fused signal, guardrails, and hedge directives.",),
)


__all__ = [
    "dynamic_agent_cycle_adapter",
    "AlgorithmSyncAdapter",
    "AlgorithmSyncResult",
    "DynamicAISummary",
    "DynamicAISyncReport",
    "DynamicAISynchroniser",
    "run_dynamic_agent_cycle",
]

