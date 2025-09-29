"""Operations & governance orchestration components for Build Phase 4."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Iterable, List, Mapping, MutableMapping, Sequence, Tuple

from ..core_adapters import BaseCoreAdapter, CoreDecision
from ..io_bus.message_bus import TaskBus
from ..io_bus.schema import ResultEnvelope, TaskEnvelope
from ..memory.l0_context import L0ContextManager
from .router import MinimalRouter
from .validator import BaselineValidator, TaskValidationError


class GovernanceError(TaskValidationError):
    """Raised when governance policies block adapter execution."""


class SafetyViolation(TaskValidationError):
    """Raised when a decision breaches safety guardrails."""


@dataclass(slots=True)
class AuditTrailLogger:
    """Collects audit entries for downstream governance review."""

    validator: BaselineValidator
    entries: List[MutableMapping[str, Any]] = field(default_factory=list)

    def record(
        self,
        *,
        envelope: TaskEnvelope,
        decision: CoreDecision,
        adapter: BaseCoreAdapter,
        context_snapshot: Mapping[str, Any],
    ) -> None:
        """Persist an audit entry after successful orchestration."""

        entry: MutableMapping[str, Any] = {
            "task_id": envelope.task_id,
            "decision": decision.action,
            "confidence": round(decision.confidence, 4),
            "adapter": adapter.name,
            "data_zone": context_snapshot.get("governance", {}).get("data_zone")
            if isinstance(context_snapshot.get("governance"), Mapping)
            else context_snapshot.get("data_residency", "global"),
            "context_snapshot": dict(context_snapshot),
            "rationale": decision.rationale,
        }
        self.validator.validate_audit_trail([entry])
        self.entries.append(entry)

    def export(self) -> List[MutableMapping[str, Any]]:
        """Return accumulated audit entries."""

        return [dict(entry) for entry in self.entries]


@dataclass(slots=True)
class ObservabilityCollector:
    """Tracks orchestration events for latency and confidence monitoring."""

    _starts: MutableMapping[str, float] = field(default_factory=dict)
    events: List[MutableMapping[str, Any]] = field(default_factory=list)

    def start(self, task_id: str) -> None:
        self._starts[task_id] = time.perf_counter()

    def record_success(
        self,
        task_id: str,
        *,
        adapter: BaseCoreAdapter,
        decision: CoreDecision,
    ) -> None:
        started = self._starts.pop(task_id, None)
        latency_ms = ((time.perf_counter() - started) * 1000.0) if started else None
        entry: MutableMapping[str, Any] = {
            "task_id": task_id,
            "adapter": adapter.name,
            "status": "completed",
            "latency_ms": latency_ms,
            "confidence": decision.confidence,
        }
        self.events.append(entry)

    def record_failure(
        self,
        task_id: str,
        *,
        adapter: BaseCoreAdapter,
        reason: str,
    ) -> None:
        started = self._starts.pop(task_id, None)
        latency_ms = ((time.perf_counter() - started) * 1000.0) if started else None
        entry: MutableMapping[str, Any] = {
            "task_id": task_id,
            "adapter": adapter.name,
            "status": "failed",
            "latency_ms": latency_ms,
            "reason": reason,
        }
        self.events.append(entry)

    def summary(self) -> MutableMapping[str, Any]:
        """Return aggregate metrics for completed events."""

        completed = [event for event in self.events if event.get("status") == "completed"]
        if not completed:
            return {"count": 0, "avg_latency_ms": 0.0, "avg_confidence": 0.0, "failures": self.failure_count}
        latencies = [event.get("latency_ms") for event in completed if event.get("latency_ms") is not None]
        average_latency = sum(latencies) / len(latencies) if latencies else 0.0
        average_confidence = sum(event.get("confidence", 0.0) for event in completed) / len(completed)
        return {
            "count": len(completed),
            "avg_latency_ms": round(average_latency, 3),
            "avg_confidence": round(average_confidence, 3),
            "failures": self.failure_count,
        }

    @property
    def failure_count(self) -> int:
        return sum(1 for event in self.events if event.get("status") == "failed")


@dataclass(slots=True)
class DataResidencyPolicy:
    """Filters adapters so decisions respect data locality policies."""

    default_zone: str = "global"
    adapter_overrides: Mapping[str, Sequence[str]] = field(default_factory=dict)

    def _adapter_zones(self, adapter: BaseCoreAdapter) -> Tuple[str, ...]:
        override = self.adapter_overrides.get(adapter.name)
        if override:
            return tuple(zone.lower() for zone in override)
        return adapter.data_zones

    def filter_adapters(
        self, envelope: TaskEnvelope, adapters: Iterable[BaseCoreAdapter]
    ) -> List[BaseCoreAdapter]:
        zone = self._resolve_zone(envelope)
        allowed: List[BaseCoreAdapter] = []
        for adapter in adapters:
            zones = self._adapter_zones(adapter)
            if zones:
                if zone in zones or "global" in zones:
                    allowed.append(adapter)
                    continue
            if adapter.supports_zone(zone):
                allowed.append(adapter)
        if not allowed:
            raise GovernanceError(f"No adapters available for data zone '{zone}'")
        return allowed

    def _resolve_zone(self, envelope: TaskEnvelope) -> str:
        governance = envelope.context.get("governance")
        if isinstance(governance, Mapping):
            zone = governance.get("data_zone")
            if isinstance(zone, str) and zone.strip():
                return zone.lower()
        zone = envelope.context.get("data_residency")
        if isinstance(zone, str) and zone.strip():
            return zone.lower()
        return self.default_zone


@dataclass(slots=True)
class SafetyHarness:
    """Enforces guardrails before results are accepted."""

    banned_actions: Sequence[str] = field(default_factory=tuple)
    max_drawdown: float | None = None
    max_volatility: float | None = None
    _banned_cache: set[str] = field(init=False, repr=False, default_factory=set)

    def __post_init__(self) -> None:
        self._banned_cache = {item.upper() for item in self.banned_actions}

    def enforce(self, envelope: TaskEnvelope, decision: CoreDecision) -> None:
        action = decision.action.upper()
        if action in self._banned_cache:
            raise SafetyViolation(f"Action '{action}' blocked by safety policy")
        drawdown = self._safe_float(envelope.context.get("drawdown", 0.0))
        if self.max_drawdown is not None and drawdown > self.max_drawdown:
            raise SafetyViolation(
                f"Drawdown {drawdown:.2f} exceeds maximum {self.max_drawdown:.2f}"
            )
        volatility = self._safe_float(envelope.context.get("volatility", 0.0))
        if self.max_volatility is not None and volatility > self.max_volatility:
            raise SafetyViolation(
                f"Volatility {volatility:.2f} exceeds maximum {self.max_volatility:.2f}"
            )

    @staticmethod
    def _safe_float(value: Any) -> float:
        try:
            return float(value or 0.0)
        except (TypeError, ValueError):
            return 0.0


class Phase4Router(MinimalRouter):
    """Extends the minimal router with ops, audit, and governance controls."""

    def __init__(
        self,
        *,
        adapters: Iterable[BaseCoreAdapter],
        validator: BaselineValidator,
        context_manager: L0ContextManager,
        bus: TaskBus,
        audit_logger: AuditTrailLogger | None = None,
        observability: ObservabilityCollector | None = None,
        residency_policy: DataResidencyPolicy | None = None,
        safety_harness: SafetyHarness | None = None,
    ) -> None:
        super().__init__(
            adapters=adapters,
            validator=validator,
            context_manager=context_manager,
            bus=bus,
        )
        self.audit_logger = audit_logger or AuditTrailLogger(validator=validator)
        self.observability = observability or ObservabilityCollector()
        self.residency_policy = residency_policy or DataResidencyPolicy()
        self.safety_harness = safety_harness or SafetyHarness()

    def process_next(self) -> ResultEnvelope | None:  # type: ignore[override]
        envelope = self.bus.dequeue_task()
        if not envelope:
            return None
        self.validator.validate_task(envelope)
        context = self.context_manager.prepare(envelope)
        self.observability.start(envelope.task_id)

        filtered = self.residency_policy.filter_adapters(envelope, self._adapters)
        ranked = self._rank_with_candidates(envelope, context, filtered)

        adapter, decision = self._attempt_execution(ranked, envelope, context)

        result = ResultEnvelope(
            task_id=envelope.task_id,
            status="completed",
            payload=decision.as_payload(),
        )
        self.validator.validate_result(result, envelope.constraints)
        self.bus.publish_result(result)
        self.context_manager.update(
            envelope.task_id,
            last_adapter=adapter.name,
            confidence=decision.confidence,
            last_action=decision.action,
        )
        self.audit_logger.record(
            envelope=envelope,
            decision=decision,
            adapter=adapter,
            context_snapshot=context,
        )
        self.observability.record_success(envelope.task_id, adapter=adapter, decision=decision)
        return result

    def _rank_with_candidates(
        self,
        envelope: TaskEnvelope,
        context: Mapping[str, Any],
        candidates: Sequence[BaseCoreAdapter],
    ) -> List[BaseCoreAdapter]:
        return super()._rank_adapters_for(envelope, context, candidates)

    def _attempt_execution(
        self,
        ranked: Sequence[BaseCoreAdapter],
        envelope: TaskEnvelope,
        context: Mapping[str, Any],
    ) -> Tuple[BaseCoreAdapter, CoreDecision]:
        failures: List[str] = []
        for adapter in ranked:
            try:
                decision = adapter.run(envelope, context)
                self.safety_harness.enforce(envelope, decision)
                return adapter, decision
            except SafetyViolation as exc:
                failures.append(str(exc))
                self.observability.record_failure(
                    envelope.task_id,
                    adapter=adapter,
                    reason=str(exc),
                )
            except Exception as exc:  # pragma: no cover - defensive guard
                failures.append(f"{adapter.name} raised: {exc}")
                self.observability.record_failure(
                    envelope.task_id,
                    adapter=adapter,
                    reason="exception",
                )
        message = "+ ".join(failures) if failures else "no adapters executed"
        raise SafetyViolation(f"All adapters failed safety checks: {message}")
