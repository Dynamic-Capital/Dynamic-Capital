"""Integration tests covering the Build Phase 1 pipeline."""

from __future__ import annotations

import pathlib
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dai_architecture import (
    BaselineValidator,
    ChatCPT2Adapter,
    ConstraintSet,
    DolphinAdapter,
    GrokAdapter,
    L0ContextManager,
    MinimalRouter,
    ResultEnvelope,
    TaskBus,
    TaskEnvelope,
    TaskValidationError,
)


def _make_envelope(task_id: str, *, intent: str = "accumulate", momentum: float = 0.55) -> TaskEnvelope:
    context = {
        "market": {
            "direction": "bullish" if momentum >= 0.5 else "bearish",
            "momentum": momentum,
        },
        "confidence_hint": momentum,
        "momentum": momentum,
        "recency": 0.8,
        "volatility": 0.32,
        "treasury_health": 0.72,
        "drawdown": 0.06,
        "direction": "bullish" if momentum >= 0.5 else "bearish",
    }
    constraints = ConstraintSet(min_confidence=0.4)
    return TaskEnvelope(task_id=task_id, intent=intent, context=context, constraints=constraints)


def test_task_bus_round_trip() -> None:
    bus = TaskBus()
    envelope = _make_envelope("task-1")
    bus.publish_task(envelope)
    assert bus.pending_tasks == 1
    fetched = bus.dequeue_task()
    assert fetched is envelope
    assert bus.dequeue_task() is None


def test_router_produces_valid_result() -> None:
    bus = TaskBus()
    validator = BaselineValidator()
    context_manager = L0ContextManager()
    router = MinimalRouter(
        adapters=(ChatCPT2Adapter(), GrokAdapter(), DolphinAdapter()),
        validator=validator,
        context_manager=context_manager,
        bus=bus,
    )

    envelope = _make_envelope("task-42", momentum=0.65)
    bus.publish_task(envelope)
    result = router.process_next()
    assert isinstance(result, ResultEnvelope)
    assert result.payload["action"] in {"BUY", "HOLD"}
    assert result.payload["confidence"] >= 0.4 - 1e-3
    assert bus.pending_results == 1
    stored = bus.dequeue_result()
    assert stored == result
    context_snapshot = context_manager.get("task-42")
    assert context_snapshot["last_adapter"].startswith("core")
    assert context_snapshot["confidence"] >= 0.4


def test_validator_blocks_invalid_payload() -> None:
    validator = BaselineValidator()
    envelope = _make_envelope("task-99")
    bad = TaskEnvelope(
        task_id=envelope.task_id,
        intent=envelope.intent,
        context={"market": {"direction": "bullish"}},
        constraints=ConstraintSet(min_confidence=0.6),
    )
    validator.validate_task(bad)
    result = ResultEnvelope(
        task_id=envelope.task_id,
        status="completed",
        payload={"action": "BUY", "confidence": 0.5, "rationale": "too short"},
    )
    with pytest.raises(TaskValidationError):
        validator.validate_result(result, bad.constraints)
