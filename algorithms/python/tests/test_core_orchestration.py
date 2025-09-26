from __future__ import annotations

from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.core_orchestration import (
    OrchestrationBuilder,
    OrchestrationContext,
    OrchestrationError,
    OrchestrationPlan,
    OrchestrationStep,
    StepResult,
    execute_plan,
)


def test_plan_orders_steps_via_dependencies() -> None:
    ingest = OrchestrationStep(name="ingest", summary="load raw data")
    transform = OrchestrationStep(
        name="transform",
        summary="prepare features",
        depends_on=("ingest",),
    )
    plan = OrchestrationPlan([transform, ingest])

    assert [step.name for step in plan.ordered_steps()] == ["ingest", "transform"]


def test_plan_validation_rejects_missing_dependencies() -> None:
    with pytest.raises(OrchestrationError):
        OrchestrationPlan(
            [
                OrchestrationStep(
                    name="train",
                    summary="train model",
                    depends_on=("does-not-exist",),
                )
            ]
        )


def test_plan_validation_rejects_duplicate_names() -> None:
    with pytest.raises(OrchestrationError):
        OrchestrationPlan(
            [
                OrchestrationStep(name="prep", summary="first"),
                OrchestrationStep(name="prep", summary="second"),
            ]
        )


def test_execute_plan_updates_context_and_notifies_observers() -> None:
    events: list[tuple[str, str, str | None]] = []

    def observer(event: str, step: OrchestrationStep, context: OrchestrationContext, result: StepResult | None) -> None:
        events.append((event, step.name, None if result is None else result.status))

    def ingest_handler(context: OrchestrationContext) -> StepResult:
        return StepResult.success(outputs={"ingested": True})

    def train_handler(context: OrchestrationContext) -> StepResult:
        assert context.get("ingested") is True
        return StepResult.success(
            outputs={"model": "ready"},
            artifacts={"model_path": "/tmp/model.pkl"},
            notes=["trained with defaults"],
        )

    plan = OrchestrationPlan(
        [
            OrchestrationStep(name="ingest", summary="load", handler=ingest_handler),
            OrchestrationStep(name="train", summary="train", handler=train_handler, depends_on=("ingest",)),
        ]
    )
    execution = execute_plan(plan, observers=[observer])

    assert execution.status == "completed"
    assert execution.context.get("model") == "ready"
    assert execution.context.artifacts["model_path"] == "/tmp/model.pkl"
    assert ("before_step", "ingest", None) in events
    assert ("after_step", "ingest", "completed") in events
    assert ("after_step", "train", "completed") in events


def test_execute_plan_handles_failures_and_skips_dependents() -> None:
    def failing_handler(context: OrchestrationContext) -> StepResult:
        raise RuntimeError("boom")

    def downstream_handler(context: OrchestrationContext) -> StepResult:
        return StepResult.success(outputs={"value": 1})

    plan = OrchestrationPlan(
        [
            OrchestrationStep(name="fetch", summary="upstream", handler=failing_handler),
            OrchestrationStep(
                name="compute",
                summary="depends",
                handler=downstream_handler,
                depends_on=("fetch",),
            ),
        ]
    )

    execution = execute_plan(plan, strict=False)

    statuses = {record.name: record.status for record in execution.timeline}
    assert statuses["fetch"] == "failed"
    assert statuses["compute"] == "skipped"
    assert execution.status == "failed"
    assert execution.failures() and execution.failures()[0].name == "fetch"


def test_builder_constructs_valid_plan() -> None:
    builder = OrchestrationBuilder("demo", summary="demo orchestration")

    def prepare(context: OrchestrationContext) -> StepResult:
        return StepResult.success(outputs={"prepared": True})

    def execute(context: OrchestrationContext) -> StepResult:
        assert context.get("prepared") is True
        return StepResult.success(outputs={"executed": True})

    builder.add_step("prepare", "prep", handler=prepare)
    builder.add_step("execute", "run", handler=execute, depends_on=("prepare",))

    plan = builder.build()
    execution = execute_plan(plan)

    assert execution.status == "completed"
    assert execution.context.get("executed") is True
