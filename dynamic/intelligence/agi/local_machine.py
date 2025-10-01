"""Bridge Dynamic AGI improvement plans into local machine automation tasks."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, MutableMapping, Sequence

from dynamic_local_machine import (
    DynamicLocalMachineEngine,
    LocalMachinePlan,
    LocalMachineTask,
)

from .model import AGIOutput
from .self_improvement import ImprovementPlan

__all__ = [
    "AGILocalMachineTaskConfig",
    "build_local_machine_plan_from_improvement",
    "build_local_machine_plan_from_output",
]


def _slugify(value: str) -> str:
    text = "".join(ch.lower() if ch.isalnum() else "-" for ch in value).strip("-")
    if not text:
        return "task"
    while "--" in text:
        text = text.replace("--", "-")
    return text


def _normalise_actions(actions: Sequence[object] | None) -> tuple[str, ...]:
    if not actions:
        return ()
    normalised: list[str] = []
    for raw in actions:
        text = str(raw).strip()
        if text:
            normalised.append(text)
    return tuple(normalised)


def _normalise_roadmap(
    roadmap: Sequence[Mapping[str, object]] | None,
) -> tuple[MutableMapping[str, Any], ...]:
    if not roadmap:
        return ()
    steps: list[MutableMapping[str, Any]] = []
    for payload in roadmap:
        if not isinstance(payload, Mapping):
            continue
        steps.append(dict(payload))
    return tuple(steps)


@dataclass(slots=True)
class AGILocalMachineTaskConfig:
    """Configuration for materialising AGI improvement plans into tasks."""

    default_command: tuple[str, ...] = ("echo", "{description}")
    default_estimated_duration: float = 1.0
    default_cpu_cost: float = 0.5
    default_memory_cost: float = 0.25
    working_directory: str | None = None
    environment: Mapping[str, str] = field(default_factory=dict)
    action_commands: Mapping[str, Sequence[str]] = field(default_factory=dict)
    category_commands: Mapping[str, Sequence[str]] = field(default_factory=dict)
    sequential_dependencies: bool = True

    def command_for_action(self, action: str) -> tuple[str, ...]:
        key = action.lower()
        for alias, command in self.action_commands.items():
            if key == alias.lower():
                return tuple(str(segment) for segment in command)
        return self._render_default_command(description=action, action=action)

    def command_for_category(
        self, category: str | None, *, description: str
    ) -> tuple[str, ...]:
        if category:
            key = category.lower()
            for alias, command in self.category_commands.items():
                if key == alias.lower():
                    return tuple(str(segment) for segment in command)
        return self._render_default_command(
            description=description, category=category or ""
        )

    def build_task(
        self,
        *,
        identifier: str,
        command: Sequence[str],
        description: str,
        dependencies: Sequence[str] = (),
        extra_environment: Mapping[str, Any] | None = None,
    ) -> LocalMachineTask:
        environment: dict[str, str] = dict(self.environment)
        if extra_environment:
            for key, value in extra_environment.items():
                if value is None:
                    continue
                environment[str(key)] = str(value)
        return LocalMachineTask(
            identifier=identifier,
            command=tuple(str(segment) for segment in command),
            description=description,
            working_directory=self.working_directory,
            environment=environment,
            estimated_duration=self.default_estimated_duration,
            cpu_cost=self.default_cpu_cost,
            memory_cost=self.default_memory_cost,
            dependencies=tuple(dependencies),
        )

    def _render_default_command(
        self,
        *,
        description: str,
        action: str | None = None,
        category: str | None = None,
    ) -> tuple[str, ...]:
        context = {
            "description": description,
            "action": action or "",
            "category": category or "",
        }
        return tuple(str(segment).format(**context) for segment in self.default_command)


def build_local_machine_plan_from_improvement(
    improvement: ImprovementPlan | Mapping[str, Any],
    *,
    engine: DynamicLocalMachineEngine | None = None,
    config: AGILocalMachineTaskConfig | None = None,
) -> LocalMachinePlan:
    """Convert an improvement plan into a local machine execution blueprint."""

    engine = engine or DynamicLocalMachineEngine()
    config = config or AGILocalMachineTaskConfig()

    if isinstance(improvement, ImprovementPlan):
        payload = improvement.to_dict()
    else:
        payload = dict(improvement)

    actions = _normalise_actions(payload.get("actions"))
    roadmap = _normalise_roadmap(payload.get("roadmap"))

    tasks: list[LocalMachineTask] = []
    previous_identifier: str | None = None

    for index, action in enumerate(actions, start=1):
        identifier = f"agi-action-{index:02d}-{_slugify(action)}"
        description = f"Dynamic AGI action: {action}"
        dependencies = (
            (previous_identifier,)
            if config.sequential_dependencies and previous_identifier
            else ()
        )
        task = config.build_task(
            identifier=identifier,
            command=config.command_for_action(action),
            description=description,
            dependencies=dependencies,
            extra_environment={
                "AGI_ACTION": action,
            },
        )
        tasks.append(task)
        if config.sequential_dependencies:
            previous_identifier = identifier

    for index, step in enumerate(roadmap, start=1):
        category = (
            str(step.get("category", "")) if step.get("category") is not None else ""
        )
        description = str(
            step.get("description")
            or step.get("intent")
            or category
            or f"Roadmap step {index}"
        )
        identifier = f"agi-roadmap-{index:02d}-{_slugify(category or description)}"
        dependencies = (
            (previous_identifier,)
            if config.sequential_dependencies and previous_identifier
            else ()
        )
        extra_environment: dict[str, Any] = {
            "AGI_CATEGORY": category,
            "AGI_INTENT": step.get("intent"),
            "AGI_FOCUS_METRIC": step.get("focus_metric"),
        }
        habits = step.get("suggested_habits")
        if habits:
            extra_environment["AGI_SUGGESTED_HABITS"] = " | ".join(
                str(habit) for habit in habits
            )
        task = config.build_task(
            identifier=identifier,
            command=config.command_for_category(category, description=description),
            description=f"Dynamic AGI roadmap: {description}",
            dependencies=dependencies,
            extra_environment=extra_environment,
        )
        tasks.append(task)
        if config.sequential_dependencies:
            previous_identifier = identifier

    if not tasks:
        raise ValueError(
            "improvement plan does not contain any actions or roadmap steps"
        )

    return engine.build_plan(tasks)


def build_local_machine_plan_from_output(
    output: AGIOutput,
    *,
    engine: DynamicLocalMachineEngine | None = None,
    config: AGILocalMachineTaskConfig | None = None,
) -> LocalMachinePlan:
    """Convenience helper that accepts an ``AGIOutput`` instance."""

    if output.improvement is None:
        raise ValueError("AGI output does not include an improvement plan")
    return build_local_machine_plan_from_improvement(
        output.improvement,
        engine=engine,
        config=config,
    )
