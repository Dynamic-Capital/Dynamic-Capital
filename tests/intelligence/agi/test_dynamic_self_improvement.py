from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any, Dict, List

import pytest

from dynamic.intelligence.agi import DynamicAGIModel, DynamicSelfImprovement
from dynamic.intelligence.ai_apps.core import AISignal, PreparedMarketContext
from dynamic.intelligence.ai_apps.risk import PositionSizing
from dynamic_metacognition import DynamicMetacognition, MetaSignal, ReflectionContext
from dynamic_self_awareness import AwarenessContext, DynamicSelfAwareness, SelfAwarenessSignal
from dynamic.intelligence.agi.telemetry import AGIImprovementRepository


class _StubFusion:
    def __init__(self, ctx: PreparedMarketContext) -> None:
        self._context = ctx

    def prepare_context(self, market_data):  # type: ignore[override]
        return self._context

    def composite_diagnostics(self, context):  # type: ignore[override]
        return {"composite": 0.5}

    def consensus_matrix(self, context):  # type: ignore[override]
        return {"BUY": 0.7, "SELL": 0.3}

    def generate_signal(self, market_data, *, context=None):  # type: ignore[override]
        return AISignal(action="BUY", confidence=0.6, reasoning="stub")

    def mm_parameters(self, market_payload, treasury_payload, inventory):  # type: ignore[override]
        return {"skew": 0.1, "inventory": inventory}


class _StubAnalysis:
    def analyse(self, research):  # type: ignore[override]
        payload = dict(research)
        payload.setdefault("insight", "stubbed")
        return payload


class _StubRiskManager:
    def enforce(self, signal, context):  # type: ignore[override]
        payload = dict(signal)
        payload.setdefault("confidence", 0.6)
        payload.setdefault("notes", [])
        return payload

    def sizing(self, context, *, confidence, volatility):  # type: ignore[override]
        return PositionSizing(notional=1.0, leverage=1.0, notes="stub sizing")


class _MemoryWriter:
    def __init__(self) -> None:
        self.rows: List[Dict[str, Any]] = []

    def upsert(self, rows):  # type: ignore[override]
        serialised: List[Dict[str, Any]] = []
        for row in rows:
            payload: Dict[str, Any] = {}
            for key, value in row.items():
                if isinstance(value, datetime):
                    payload[key] = value.isoformat()
                else:
                    payload[key] = value
            serialised.append(payload)
        self.rows.extend(serialised)
        return len(serialised)


def _prepared_context() -> PreparedMarketContext:
    return PreparedMarketContext(
        source_signal="ALERT",
        resolved_signal="BUY",
        momentum=0.4,
        trend="up",
        sentiment_value=0.2,
        composite_scores=(0.2, 0.4, 0.1),
        composite_trimmed_mean=0.3,
        indicator_panel=(("rsi", 55.0), ("macd", 0.12)),
        volatility=0.15,
        news_topics=("macro",),
        alignment=0.6,
        data_quality=0.9,
        risk_score=0.2,
        drawdown=0.05,
        base_confidence=0.55,
        support_level=100.0,
        resistance_level=110.0,
        human_bias=None,
        human_weight=None,
        circuit_breaker=False,
    )


def test_evaluate_accumulates_improvement_plan() -> None:
    context = _prepared_context()
    manager = DynamicSelfImprovement(history=5)
    model = DynamicAGIModel(
        fusion=_StubFusion(context),
        analysis=_StubAnalysis(),
        risk_manager=_StubRiskManager(),
        self_improvement=manager,
    )

    result_one = model.evaluate(
        market_data={"price": 100.0},
        performance={"pnl": -2.5},
        feedback_notes=["Needs tighter risk controls"],
    )
    assert result_one.improvement is not None
    assert result_one.improvement["summary"]["sessions_considered"] == 1

    result_two = model.evaluate(
        market_data={"price": 102.0},
        performance={"pnl": 3.0},
    )

    assert result_two.improvement is not None
    metrics = result_two.improvement["metrics"]
    assert pytest.approx(metrics["pnl"], rel=1e-3) == 0.25
    assert "feedback_sentiment" in metrics
    assert result_two.improvement["summary"]["sessions_considered"] == 2
    assert "pnl" in result_two.improvement["focus"]


def test_self_improvement_introspection_reports_in_plan() -> None:
    awareness = DynamicSelfAwareness()
    awareness.capture(
        SelfAwarenessSignal(
            channel="thought",
            observation="Monitoring execution cadence",
            clarity=0.7,
            alignment=0.6,
            agitation=0.2,
            action_bias=0.4,
        )
    )
    metacognition = DynamicMetacognition()
    metacognition.capture(
        MetaSignal(
            domain="learning",
            insight="Need faster evaluation loop",
            impact=0.6,
            stability=0.5,
            friction=0.3,
        )
    )

    manager = DynamicSelfImprovement(
        history=3,
        self_awareness=awareness,
        metacognition=metacognition,
    )

    snapshot = manager.record_session(
        output={"signal": {"action": "BUY"}},
        performance={"pnl": -1.0},
        introspection_inputs={
            "awareness": AwarenessContext(
                situation="Executing strategy",
                emotion_label="focused",
                cognitive_noise=0.2,
                bodily_tension=0.3,
                readiness_for_action=0.8,
                value_alignment_target=0.7,
            ),
            "reflection": ReflectionContext(
                learning_goal="Improve trade review cadence",
                time_available=0.5,
                cognitive_load=0.3,
                emotion_state="calm",
                support_available=0.6,
            ),
        },
    )

    assert snapshot.awareness_report is not None
    assert snapshot.metacognition_report is not None

    plan = manager.generate_plan()
    assert "self_awareness" in plan.introspection
    assert "metacognition" in plan.introspection
    assert plan.metrics["pnl"] == -1.0


def test_record_session_filters_non_finite_metrics() -> None:
    manager = DynamicSelfImprovement(history=2)

    snapshot = manager.record_session(
        output={"signal": "ok"},
        performance={
            "valid": 1.25,
            "bad_nan": float("nan"),
            "bad_inf": float("inf"),
            "bad_ninf": float("-inf"),
        },
    )

    assert set(snapshot.performance) == {"valid"}

    plan = manager.generate_plan()

    assert plan.metrics["valid"] == pytest.approx(1.25)
    assert all(key == "valid" for key in plan.metrics)
    assert all(math.isfinite(value) for value in plan.metrics.values())


def test_model_persists_improvement_history_and_reload() -> None:
    context = _prepared_context()
    manager = DynamicSelfImprovement(history=3)
    writer = _MemoryWriter()
    repository = AGIImprovementRepository(
        writer=writer,
        clock=lambda: datetime(2025, 9, 21, tzinfo=timezone.utc),
    )
    model = DynamicAGIModel(
        fusion=_StubFusion(context),
        analysis=_StubAnalysis(),
        risk_manager=_StubRiskManager(),
        self_improvement=manager,
        improvement_repository=repository,
    )

    result = model.evaluate(
        market_data={"price": 99.5},
        performance={"pnl": -1.2},
    )

    assert result.improvement is not None
    assert writer.rows
    record = writer.rows[-1]
    assert record["model_version"] == result.version
    assert "model_version_info" in record
    assert record["plan_generated_at"] == "2025-09-21T00:00:00+00:00"
    assert record["snapshot"]["performance"]["pnl"] == pytest.approx(-1.2)
    assert record["improvement_plan"]["metrics"]["pnl"] == pytest.approx(-1.2)

    restored = DynamicSelfImprovement.from_dict(
        AGIImprovementRepository.history_payload([record])
    )
    assert restored.snapshot_count == 1
    replay_plan = restored.generate_plan()
    assert replay_plan.metrics["pnl"] == pytest.approx(-1.2)

