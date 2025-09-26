"""Composable orchestration primitives for Dynamic Capital workflows."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
import time
from typing import (
    Any,
    Callable,
    Dict,
    Iterable,
    Iterator,
    Literal,
    Mapping,
    Optional,
    Protocol,
    Sequence,
    Tuple,
)


StepStatus = Literal["pending", "running", "completed", "skipped", "failed"]
ObserverEvent = Literal["before_step", "after_step", "step_skipped", "step_failed"]


class StepHandler(Protocol):
    """Callable signature required for orchestration steps."""

    def __call__(self, context: "OrchestrationContext") -> "StepResult | None":
        """Execute a step and optionally return a :class:`StepResult`."""


class OrchestrationObserver(Protocol):
    """Hook invoked around step execution events."""

    def __call__(
        self,
        event: ObserverEvent,
        step: "OrchestrationStep",
        context: "OrchestrationContext",
        result: "StepResult | None",
    ) -> None:
        """Receive lifecycle notifications for orchestration steps."""


class OrchestrationError(RuntimeError):
    """Raised when orchestration plans are invalid or execution fails."""


@dataclass(slots=True)
class StepResult:
    """Outcome returned by a single orchestration step."""

    status: StepStatus = "completed"
    outputs: Mapping[str, Any] = field(default_factory=dict)
    artifacts: Mapping[str, Any] = field(default_factory=dict)
    notes: Tuple[str, ...] = field(default_factory=tuple)
    metrics: Mapping[str, float] = field(default_factory=dict)

    @classmethod
    def success(
        cls,
        *,
        outputs: Optional[Mapping[str, Any]] = None,
        artifacts: Optional[Mapping[str, Any]] = None,
        notes: Optional[Iterable[str]] = None,
        metrics: Optional[Mapping[str, float]] = None,
    ) -> "StepResult":
        """Create a successful result with optional metadata."""

        return cls(
            status="completed",
            outputs=dict(outputs or {}),
            artifacts=dict(artifacts or {}),
            notes=tuple(notes or ()),
            metrics=dict(metrics or {}),
        )

    @classmethod
    def failure(
        cls,
        *,
        notes: Optional[Iterable[str]] = None,
        outputs: Optional[Mapping[str, Any]] = None,
        artifacts: Optional[Mapping[str, Any]] = None,
        metrics: Optional[Mapping[str, float]] = None,
    ) -> "StepResult":
        """Create a failed step result."""

        return cls(
            status="failed",
            outputs=dict(outputs or {}),
            artifacts=dict(artifacts or {}),
            notes=tuple(notes or ()),
            metrics=dict(metrics or {}),
        )

    @classmethod
    def skipped(
        cls,
        *,
        notes: Optional[Iterable[str]] = None,
    ) -> "StepResult":
        """Create a skipped step result."""

        return cls(status="skipped", outputs={}, artifacts={}, notes=tuple(notes or ()))


@dataclass(slots=True)
class OrchestrationContext:
    """Mutable context shared across orchestration steps."""

    state: Dict[str, Any] = field(default_factory=dict)
    artifacts: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def update_state(self, values: Mapping[str, Any]) -> None:
        """Merge step outputs into the shared state."""

        self.state.update(values)

    def attach_artifacts(self, values: Mapping[str, Any]) -> None:
        """Store generated artifacts for later inspection."""

        self.artifacts.update(values)

    def attach_artifact(self, name: str, value: Any) -> None:
        """Attach a single artifact entry."""

        self.artifacts[name] = value

    def get(self, key: str, default: Any = None) -> Any:
        """Return a value from the state mapping."""

        return self.state.get(key, default)

    def __contains__(self, key: str) -> bool:  # pragma: no cover - convenience
        return key in self.state


@dataclass(slots=True)
class OrchestrationStep:
    """Single unit of work within an orchestration plan."""

    name: str
    summary: str
    handler: Optional[StepHandler] = None
    depends_on: Sequence[str] = ()
    inputs: Sequence[str] = ()
    provides: Sequence[str] = ()
    tags: Sequence[str] = ()

    def __post_init__(self) -> None:
        if not self.name:
            raise ValueError("step name must be a non-empty string")
        self.depends_on = tuple(dict.fromkeys(self.depends_on))
        self.inputs = tuple(dict.fromkeys(self.inputs))
        self.provides = tuple(dict.fromkeys(self.provides))
        self.tags = tuple(dict.fromkeys(self.tags))


@dataclass(slots=True)
class StepExecution:
    """Record describing the execution of a step."""

    name: str
    status: StepStatus
    outputs: Dict[str, Any]
    artifacts: Dict[str, Any]
    notes: Tuple[str, ...]
    metrics: Dict[str, float]
    duration: float
    error: Optional[str] = None


@dataclass(slots=True)
class OrchestrationPlan:
    """Ordered collection of orchestration steps with dependency awareness."""

    steps: Sequence[OrchestrationStep]
    name: str = "orchestration_plan"
    summary: Optional[str] = None
    _index: Dict[str, OrchestrationStep] = field(init=False, repr=False)
    _ordered_steps: Tuple[OrchestrationStep, ...] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.steps = tuple(self.steps)
        self._index: Dict[str, OrchestrationStep] = {step.name: step for step in self.steps}
        if len(self._index) != len(self.steps):
            duplicates = self._find_duplicates(step.name for step in self.steps)
            raise OrchestrationError(
                f"duplicate step names detected: {', '.join(sorted(duplicates))}"
            )
        missing = {
            dependency
            for step in self.steps
            for dependency in step.depends_on
            if dependency not in self._index
        }
        if missing:
            raise OrchestrationError(
                f"missing dependencies referenced in plan: {', '.join(sorted(missing))}"
            )
        self._ordered_steps = self._resolve_order()

    @staticmethod
    def _find_duplicates(names: Iterable[str]) -> set[str]:
        seen: set[str] = set()
        duplicates: set[str] = set()
        for name in names:
            if name in seen:
                duplicates.add(name)
            else:
                seen.add(name)
        return duplicates

    def _resolve_order(self) -> Tuple[OrchestrationStep, ...]:
        indegree: Dict[str, int] = {step.name: 0 for step in self.steps}
        adjacency: Dict[str, list[str]] = {step.name: [] for step in self.steps}
        for step in self.steps:
            for dependency in step.depends_on:
                indegree[step.name] += 1
                adjacency[dependency].append(step.name)
        queue: deque[str] = deque(
            step.name for step in self.steps if indegree[step.name] == 0
        )
        order: list[OrchestrationStep] = []
        while queue:
            name = queue.popleft()
            order.append(self._index[name])
            for child in adjacency[name]:
                indegree[child] -= 1
                if indegree[child] == 0:
                    queue.append(child)
        if len(order) != len(self.steps):
            blocked = [name for name, degree in indegree.items() if degree > 0]
            raise OrchestrationError(
                "dependency cycle detected in orchestration plan: "
                + ", ".join(sorted(blocked))
            )
        return tuple(order)

    def __iter__(self) -> Iterator[OrchestrationStep]:  # pragma: no cover - passthrough
        return iter(self._ordered_steps)

    def ordered_steps(self) -> Tuple[OrchestrationStep, ...]:
        """Return the steps in a dependency-safe order."""

        return self._ordered_steps

    def get(self, name: str) -> OrchestrationStep:
        """Return a step by name."""

        try:
            return self._index[name]
        except KeyError as error:
            raise OrchestrationError(f"step '{name}' not found in plan") from error

    def __contains__(self, name: str) -> bool:  # pragma: no cover - convenience
        return name in self._index


@dataclass(slots=True)
class OrchestrationExecution:
    """Aggregate execution output for an orchestration plan."""

    plan: OrchestrationPlan
    context: OrchestrationContext
    timeline: Tuple[StepExecution, ...]
    status: StepStatus

    def failures(self) -> Tuple[StepExecution, ...]:
        """Return the list of failed step executions."""

        return tuple(step for step in self.timeline if step.status == "failed")

    def skipped(self) -> Tuple[StepExecution, ...]:
        """Return the list of skipped step executions."""

        return tuple(step for step in self.timeline if step.status == "skipped")


def execute_plan(
    plan: OrchestrationPlan,
    context: Optional[OrchestrationContext] = None,
    *,
    strict: bool = True,
    observers: Optional[Iterable[OrchestrationObserver]] = None,
) -> OrchestrationExecution:
    """Execute steps in the provided plan and return an execution summary."""

    ctx = context or OrchestrationContext()
    observer_list = tuple(observers or ())
    timeline: list[StepExecution] = []
    statuses: Dict[str, StepStatus] = {step.name: "pending" for step in plan.ordered_steps()}

    for step in plan.ordered_steps():
        dependencies = step.depends_on
        unsatisfied = [name for name in dependencies if statuses.get(name) != "completed"]
        if unsatisfied:
            if strict:
                raise OrchestrationError(
                    f"step '{step.name}' cannot run because dependencies failed: "
                    + ", ".join(unsatisfied)
                )
            result = StepResult.skipped(
                notes=(
                    "skipped because dependencies were not completed",
                    f"unsatisfied: {', '.join(unsatisfied)}",
                )
            )
            exec_record = StepExecution(
                name=step.name,
                status=result.status,
                outputs={},
                artifacts={},
                notes=result.notes,
                metrics={},
                duration=0.0,
                error=None,
            )
            timeline.append(exec_record)
            statuses[step.name] = result.status
            for observer in observer_list:
                observer("step_skipped", step, ctx, result)
            continue

        for observer in observer_list:
            observer("before_step", step, ctx, None)

        start = time.perf_counter()
        try:
            raw_result = step.handler(ctx) if step.handler else None
        except Exception as exc:  # pragma: no cover - exercised via tests
            duration = time.perf_counter() - start
            result = StepResult.failure(notes=(f"exception: {exc!r}",))
            exec_record = StepExecution(
                name=step.name,
                status=result.status,
                outputs={},
                artifacts={},
                notes=result.notes,
                metrics={},
                duration=duration,
                error=repr(exc),
            )
            timeline.append(exec_record)
            statuses[step.name] = result.status
            for observer in observer_list:
                observer("step_failed", step, ctx, result)
            if strict:
                return OrchestrationExecution(
                    plan=plan,
                    context=ctx,
                    timeline=tuple(timeline),
                    status="failed",
                )
            continue

        result = raw_result or StepResult.success()
        if result.status not in {"completed", "skipped", "failed", "running", "pending"}:
            raise OrchestrationError(
                f"step '{step.name}' returned invalid status '{result.status}'"
            )

        duration = time.perf_counter() - start
        outputs = dict(result.outputs)
        artifacts = dict(result.artifacts)
        notes = tuple(result.notes)
        metrics = dict(result.metrics)

        if result.status == "completed":
            ctx.update_state(outputs)
            if artifacts:
                ctx.attach_artifacts(artifacts)
        elif result.status == "failed" and strict:
            exec_record = StepExecution(
                name=step.name,
                status=result.status,
                outputs=outputs,
                artifacts=artifacts,
                notes=notes,
                metrics=metrics,
                duration=duration,
                error=None,
            )
            timeline.append(exec_record)
            statuses[step.name] = result.status
            for observer in observer_list:
                observer("step_failed", step, ctx, result)
            return OrchestrationExecution(
                plan=plan,
                context=ctx,
                timeline=tuple(timeline),
                status="failed",
            )

        exec_record = StepExecution(
            name=step.name,
            status=result.status,
            outputs=outputs,
            artifacts=artifacts,
            notes=notes,
            metrics=metrics,
            duration=duration,
            error=None,
        )
        timeline.append(exec_record)
        statuses[step.name] = result.status

        event = "step_failed" if result.status == "failed" else "after_step"
        for observer in observer_list:
            observer(event, step, ctx, result)

    status: StepStatus = "completed"
    if any(record.status == "failed" for record in timeline):
        status = "failed"
    elif any(record.status == "skipped" for record in timeline):
        status = "skipped"

    return OrchestrationExecution(
        plan=plan,
        context=ctx,
        timeline=tuple(timeline),
        status=status,
    )


class OrchestrationBuilder:
    """Helper for building orchestration plans fluently."""

    def __init__(self, name: str, *, summary: Optional[str] = None) -> None:
        self.name = name
        self.summary = summary
        self._steps: list[OrchestrationStep] = []

    def add_step(
        self,
        name: str,
        summary: str,
        *,
        handler: Optional[StepHandler] = None,
        depends_on: Sequence[str] = (),
        inputs: Sequence[str] = (),
        provides: Sequence[str] = (),
        tags: Sequence[str] = (),
    ) -> OrchestrationStep:
        """Append a new step definition and return it for further inspection."""

        step = OrchestrationStep(
            name=name,
            summary=summary,
            handler=handler,
            depends_on=depends_on,
            inputs=inputs,
            provides=provides,
            tags=tags,
        )
        self._steps.append(step)
        return step

    def extend(self, steps: Iterable[OrchestrationStep]) -> None:
        """Extend the builder with externally defined steps."""

        self._steps.extend(steps)

    def build(self) -> OrchestrationPlan:
        """Produce an :class:`OrchestrationPlan` from the registered steps."""

        return OrchestrationPlan(tuple(self._steps), name=self.name, summary=self.summary)


__all__ = [
    "ObserverEvent",
    "OrchestrationBuilder",
    "OrchestrationContext",
    "OrchestrationError",
    "OrchestrationExecution",
    "OrchestrationObserver",
    "OrchestrationPlan",
    "OrchestrationStep",
    "StepExecution",
    "StepHandler",
    "StepResult",
    "StepStatus",
    "execute_plan",
]
