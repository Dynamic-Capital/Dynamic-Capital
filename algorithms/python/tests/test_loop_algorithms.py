"""Tests for orchestration plan looping utilities."""

from __future__ import annotations

from typing import Iterable

from algorithms.python.core_orchestration import (
    OrchestrationBuilder,
    OrchestrationContext,
    OrchestrationPlan,
    StepResult,
)
from algorithms.python.loop_algorithms import (
    LoopExecutionSummary,
    LoopRun,
    run_plan_loop,
)


def _build_counter_plan() -> OrchestrationPlan:
    builder = OrchestrationBuilder("counter_plan")

    def _increment(context: OrchestrationContext) -> StepResult:
        current = int(context.state.get("count", 0))
        return StepResult.success(outputs={"count": current + 1})

    builder.add_step(
        name="increment",
        summary="increase counter",
        handler=_increment,
    )
    return builder.build()


def _build_unstable_plan(*, fail_on: Iterable[int]) -> OrchestrationPlan:
    failure_iterations = set(fail_on)
    builder = OrchestrationBuilder("unstable_plan")

    def _maybe_fail(context: OrchestrationContext) -> StepResult:
        iteration = int(context.metadata.get("loop_iteration", 0)) + 1
        context.metadata["loop_iteration"] = iteration
        if iteration in failure_iterations:
            return StepResult.failure(notes=("forced failure",))
        return StepResult.success()

    builder.add_step(
        name="unstable_step",
        summary="conditionally fails",
        handler=_maybe_fail,
    )
    return builder.build()


def test_run_plan_loop_increments_state_and_applies_stop_condition() -> None:
    plan = _build_counter_plan()
    context = OrchestrationContext(metadata={})

    summary = run_plan_loop(
        plan,
        iterations=5,
        context=context,
        stop_condition=lambda iteration, execution: execution.context.get("count", 0) >= 2,
    )

    assert isinstance(summary, LoopExecutionSummary)
    assert summary.iterations() == 2
    assert summary.status == "completed"
    assert context.get("count") == 2
    assert all(isinstance(run, LoopRun) for run in summary.runs)


def test_run_plan_loop_breaks_on_failure_when_requested() -> None:
    plan = _build_unstable_plan(fail_on=(1,))
    context = OrchestrationContext(metadata={})
    summary = run_plan_loop(plan, iterations=3, context=context, break_on_failure=True)

    assert summary.status == "failed"
    assert summary.iterations() == 1
    assert summary.failures()


def test_run_plan_loop_allows_continuation_after_failure() -> None:
    plan = _build_unstable_plan(fail_on=(1,))
    context = OrchestrationContext(metadata={})

    summary = run_plan_loop(
        plan,
        iterations=3,
        context=context,
        break_on_failure=False,
    )

    assert summary.iterations() == 3
    # First iteration fails, remaining ones succeed.
    statuses = [run.execution.status for run in summary.runs]
    assert statuses[0] == "failed"
    assert statuses[1:] == ["completed", "completed"]


def test_run_plan_loop_requires_positive_iterations() -> None:
    plan = _build_counter_plan()
    try:
        run_plan_loop(plan, iterations=0)
    except ValueError as exc:  # pragma: no cover - exercised via assertion
        assert "iterations" in str(exc)
    else:  # pragma: no cover - defensive
        raise AssertionError("expected ValueError when iterations <= 0")

