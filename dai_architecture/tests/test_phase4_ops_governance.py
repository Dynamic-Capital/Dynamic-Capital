"""Tests for Build Phase 4 orchestration features."""

from __future__ import annotations

import pathlib
import sys
from typing import Any, Mapping

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dai_architecture import (  # noqa: E402 - configured sys.path above
    AuditTrailLogger,
    BaselineValidator,
    DataResidencyPolicy,
    GovernanceError,
    L0ContextManager,
    ObservabilityCollector,
    Phase4Router,
    SafetyHarness,
    SafetyViolation,
    TaskBus,
    TaskEnvelope,
    ConstraintSet,
)
from dai_architecture.core_adapters import BaseCoreAdapter, CoreDecision


class _DummyAdapter(BaseCoreAdapter):
    def __init__(
        self,
        name: str,
        *,
        action: str,
        confidence: float,
        score: float,
        data_zones: tuple[str, ...] = ("global",),
    ) -> None:
        super().__init__(name=name, data_zones=data_zones)
        self._action = action
        self._confidence = confidence
        self._score = score

    def score_task(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> float:
        return self._score

    def run(self, envelope: TaskEnvelope, context: Mapping[str, Any]) -> CoreDecision:
        rationale = "Governed decision rationale"
        return CoreDecision(action=self._action, confidence=self._confidence, rationale=rationale)


def _make_envelope(zone: str | None = None, *, intent: str = "accumulate") -> TaskEnvelope:
    context: dict[str, Any] = {
        "market": {"direction": "bullish", "momentum": 0.6},
        "confidence_hint": 0.6,
        "volatility": 0.3,
        "drawdown": 0.05,
    }
    if zone:
        context["governance"] = {"data_zone": zone}
    constraints = ConstraintSet(min_confidence=0.4)
    return TaskEnvelope(task_id="task-phase4", intent=intent, context=context, constraints=constraints)


def test_phase4_router_enforces_data_locality() -> None:
    adapters = (
        _DummyAdapter("us_adapter", action="BUY", confidence=0.7, score=0.9, data_zones=("us",)),
        _DummyAdapter("eu_adapter", action="BUY", confidence=0.72, score=0.8, data_zones=("eu",)),
    )
    bus = TaskBus()
    validator = BaselineValidator()
    audit = AuditTrailLogger(validator)
    observability = ObservabilityCollector()
    policy = DataResidencyPolicy()
    router = Phase4Router(
        adapters=adapters,
        validator=validator,
        context_manager=L0ContextManager(),
        bus=bus,
        audit_logger=audit,
        observability=observability,
        residency_policy=policy,
    )

    bus.publish_task(_make_envelope("eu"))
    result = router.process_next()
    assert result is not None
    assert result.payload["action"] == "BUY"
    assert audit.entries[0]["adapter"] == "eu_adapter"
    assert all(event["adapter"] == "eu_adapter" for event in observability.events if event["status"] == "completed")


def test_phase4_router_records_audit_and_summary() -> None:
    adapter = _DummyAdapter("global", action="BUY", confidence=0.65, score=1.0)
    bus = TaskBus()
    validator = BaselineValidator()
    audit = AuditTrailLogger(validator)
    observability = ObservabilityCollector()
    router = Phase4Router(
        adapters=(adapter,),
        validator=validator,
        context_manager=L0ContextManager(),
        bus=bus,
        audit_logger=audit,
        observability=observability,
    )

    bus.publish_task(_make_envelope())
    result = router.process_next()
    assert result is not None
    assert len(audit.entries) == 1
    exported = audit.export()
    assert exported[0]["task_id"] == "task-phase4"
    summary = observability.summary()
    assert summary["count"] == 1
    assert summary["failures"] == 0
    assert pytest.approx(summary["avg_confidence"], rel=1e-3) == 0.65


def test_phase4_router_applies_safety_harness() -> None:
    banned_adapter = _DummyAdapter("risk_adapter", action="SELL", confidence=0.7, score=0.95)
    safe_adapter = _DummyAdapter("safe_adapter", action="HOLD", confidence=0.6, score=0.9)
    bus = TaskBus()
    validator = BaselineValidator()
    audit = AuditTrailLogger(validator)
    observability = ObservabilityCollector()
    safety = SafetyHarness(banned_actions=("SELL",))
    router = Phase4Router(
        adapters=(banned_adapter, safe_adapter),
        validator=validator,
        context_manager=L0ContextManager(),
        bus=bus,
        audit_logger=audit,
        observability=observability,
        safety_harness=safety,
    )

    bus.publish_task(_make_envelope())
    result = router.process_next()
    assert result is not None
    assert result.payload["action"] == "HOLD"
    assert audit.entries[0]["adapter"] == "safe_adapter"
    assert observability.failure_count == 1


def test_phase4_router_raises_when_no_zone_available() -> None:
    adapters = (
        _DummyAdapter("us_adapter", action="BUY", confidence=0.7, score=0.9, data_zones=("us",)),
    )
    bus = TaskBus()
    validator = BaselineValidator()
    router = Phase4Router(
        adapters=adapters,
        validator=validator,
        context_manager=L0ContextManager(),
        bus=bus,
    )
    bus.publish_task(_make_envelope("eu"))
    with pytest.raises(GovernanceError):
        router.process_next()


def test_safety_harness_handles_non_numeric_risk() -> None:
    adapter = _DummyAdapter("mixed", action="HOLD", confidence=0.5, score=1.0)
    bus = TaskBus()
    validator = BaselineValidator()
    audit = AuditTrailLogger(validator)
    observability = ObservabilityCollector()
    safety = SafetyHarness(max_drawdown=0.2, max_volatility=0.5)
    router = Phase4Router(
        adapters=(adapter,),
        validator=validator,
        context_manager=L0ContextManager(),
        bus=bus,
        audit_logger=audit,
        observability=observability,
        safety_harness=safety,
    )

    envelope = _make_envelope()
    envelope.context["drawdown"] = "not-a-number"
    envelope.context["volatility"] = None
    bus.publish_task(envelope)
    assert router.process_next() is not None


def test_observability_drops_timer_on_failures() -> None:
    adapter = _DummyAdapter("unstable", action="SELL", confidence=0.7, score=1.0)
    bus = TaskBus()
    validator = BaselineValidator()
    audit = AuditTrailLogger(validator)
    observability = ObservabilityCollector()
    safety = SafetyHarness(banned_actions=("SELL",))
    router = Phase4Router(
        adapters=(adapter,),
        validator=validator,
        context_manager=L0ContextManager(),
        bus=bus,
        audit_logger=audit,
        observability=observability,
        safety_harness=safety,
    )

    bus.publish_task(_make_envelope())
    with pytest.raises(SafetyViolation):
        router.process_next()
    assert not observability._starts  # type: ignore[attr-defined]


def test_residency_policy_respects_overrides_with_supports_fallback() -> None:
    adapter = _DummyAdapter(
        "regional",
        action="BUY",
        confidence=0.6,
        score=0.8,
        data_zones=("eu",),
    )
    policy = DataResidencyPolicy(adapter_overrides={"regional": ()})
    envelope = _make_envelope("EU")
    allowed = policy.filter_adapters(envelope, (adapter,))
    assert allowed == [adapter]
