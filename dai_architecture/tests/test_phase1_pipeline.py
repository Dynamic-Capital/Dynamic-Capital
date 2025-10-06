"""Integration tests covering the Build Phase 1 pipeline."""

from __future__ import annotations

import pathlib
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dai_architecture import (  # noqa: E402 - configured sys.path above
    BaselineValidator,
    ConstraintSet,
    L0ContextManager,
    MinimalRouter,
    ResultEnvelope,
    TaskBus,
    TaskEnvelope,
    TaskValidationError,
    build_phase1_mesh,
)
from dai_architecture.core_adapters import PHASE1_CORE_CLASSES


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


def test_phase1_mesh_contains_eleven_adapters() -> None:
    assert len(PHASE1_CORE_CLASSES) == 11
    assert {adapter.__name__ for adapter in PHASE1_CORE_CLASSES} == {
        "ChatCPT2Adapter",
        "GrokAdapter",
        "DolphinAdapter",
        "OllamaAdapter",
        "KimiK2Adapter",
        "DeepSeekV3Adapter",
        "DeepSeekR1Adapter",
        "Qwen3Adapter",
        "MiniMaxM1Adapter",
        "ZhipuAdapter",
        "HunyuanAdapter",
    }

    mesh = build_phase1_mesh()
    assert len(mesh) == 11
    names = {adapter.name for adapter in mesh}
    assert names == {
        "core1_chatcpt2",
        "core2_grok",
        "core3_dolphin",
        "core4_ollama",
        "core5_kimi_k2",
        "core6_deepseek_v3",
        "core7_deepseek_r1",
        "core8_qwen3",
        "core9_minimax_m1",
        "core10_zhipu",
        "core11_hunyuan",
    }


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
        adapters=build_phase1_mesh(),
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
