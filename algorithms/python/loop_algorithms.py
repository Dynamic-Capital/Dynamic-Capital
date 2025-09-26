"""Utilities for executing orchestration plans in feedback loops."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional, Protocol, Sequence, Tuple

from .core_orchestration import (
    OrchestrationContext,
    OrchestrationExecution,
    OrchestrationObserver,
    OrchestrationPlan,
    StepStatus,
    execute_plan,
)


class StopCondition(Protocol):
    """Callable signature used for loop termination."""

    def __call__(self, iteration: int, execution: OrchestrationExecution) -> bool:
        """Return ``True`` to halt the loop after the provided iteration."""


@dataclass(slots=True)
class LoopRun:
    """Represents a single iteration of a looping orchestration plan."""

    iteration: int
    execution: OrchestrationExecution


@dataclass(slots=True)
class LoopExecutionSummary:
    """Aggregate details for executing an orchestration plan in a loop."""

    plan: OrchestrationPlan
    runs: Tuple[LoopRun, ...]
    context: OrchestrationContext
    status: StepStatus

    def iterations(self) -> int:
        """Return the number of completed iterations."""

        return len(self.runs)

    def failures(self) -> Tuple[LoopRun, ...]:
        """Return iterations that ended in failure."""

        return tuple(run for run in self.runs if run.execution.status == "failed")


def run_plan_loop(
    plan: OrchestrationPlan,
    *,
    iterations: int,
    context: Optional[OrchestrationContext] = None,
    strict: bool = True,
    observers: Optional[Iterable[OrchestrationObserver]] = None,
    break_on_failure: bool = True,
    stop_condition: Optional[StopCondition] = None,
) -> LoopExecutionSummary:
    """Execute an orchestration plan repeatedly until completion or stop."""

    if iterations <= 0:
        raise ValueError("iterations must be a positive integer")

    ctx = context or OrchestrationContext()
    observer_list: Sequence[OrchestrationObserver] = tuple(observers or ())
    runs: list[LoopRun] = []
    status: StepStatus = "completed"

    for index in range(1, iterations + 1):
        execution = execute_plan(
            plan,
            context=ctx,
            strict=strict,
            observers=observer_list,
        )
        run = LoopRun(iteration=index, execution=execution)
        runs.append(run)

        if execution.status == "failed":
            status = "failed"
            if break_on_failure:
                break
        else:
            status = execution.status

        if stop_condition and stop_condition(index, execution):
            break

    if runs and status != "failed":
        status = runs[-1].execution.status

    return LoopExecutionSummary(
        plan=plan,
        runs=tuple(runs),
        context=ctx,
        status=status,
    )


__all__ = ["LoopExecutionSummary", "LoopRun", "StopCondition", "run_plan_loop"]

