"""Planning primitives for local workstation automation workflows.

The Dynamic Local Machine Engine models a small collection of automation
instructions (commands to run on the developer's workstation) and turns them
into an ordered execution plan.  While it is intentionally lightweight, the
engine focuses on a few helpful guarantees:

* normalise task descriptions and their dependencies so they are predictable to
  consume programmatically,
* expose a dependency-aware ordering that avoids running commands until their
  prerequisites have completed, and
* surface resource diagnostics (CPU and memory estimates) so automations can be
  scheduled without overwhelming the host machine.

The module is designed to be self-contained and free from heavyweight runtime
requirements so it can be imported inside automation scripts, notebooks, or
interactive REPL sessions without penalty.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from heapq import heappop, heappush
from types import MappingProxyType
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "LocalMachineTask",
    "LocalMachinePlan",
    "DynamicLocalMachineEngine",
    "DynamicLocalMachine",
]


def _normalise_identifier(value: str | None) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError("task identifier must not be empty")
    return text


def _normalise_description(value: str | None, *, fallback: str) -> str:
    text = (value or "").strip()
    if text:
        return text
    fallback_text = fallback.strip()
    if fallback_text:
        return fallback_text
    raise ValueError("task description must not be empty")


def _normalise_command(command: Sequence[str] | Sequence[object] | str | None) -> tuple[str, ...]:
    if command is None:
        raise ValueError("command must not be None")
    if isinstance(command, str):
        parts = [segment for segment in command.strip().split() if segment]
    else:
        parts = []
        for segment in command:
            if segment is None:
                continue
            text = str(segment).strip()
            if text:
                parts.append(text)
    if not parts:
        raise ValueError("command must contain at least one non-empty segment")
    return tuple(parts)


def _normalise_dependencies(
    values: Sequence[str] | Iterable[str] | str | None,
) -> tuple[str, ...]:
    if values is None:
        return ()

    if isinstance(values, str):
        # Accept both comma-delimited and whitespace-delimited strings.
        candidates = [
            segment.strip()
            for part in values.split(",")
            for segment in part.split()
            if segment.strip()
        ]
    else:
        candidates = []
        for item in values:
            if item is None:
                continue
            text = str(item).strip()
            if text:
                candidates.append(text)

    if not candidates:
        return ()

    normalised: list[str] = []
    seen: set[str] = set()
    for item in candidates:
        identifier = _normalise_identifier(item)
        if identifier not in seen:
            seen.add(identifier)
            normalised.append(identifier)
    return tuple(normalised)


def _normalise_environment(
    values: Mapping[str, object] | Sequence[tuple[str, object]] | None,
) -> tuple[tuple[str, str], ...]:
    if not values:
        return ()
    items: Iterable[tuple[str, object]]
    if isinstance(values, Mapping):
        items = values.items()
    else:
        items = values
    normalised: list[tuple[str, str]] = []
    seen: set[str] = set()
    for key, raw_value in items:
        name = str(key).strip()
        if not name or name in seen:
            continue
        value = "" if raw_value is None else str(raw_value)
        normalised.append((name, value))
        seen.add(name)
    normalised.sort(key=lambda item: item[0])
    return tuple(normalised)


def _coerce_float(data: Mapping[str, object], *keys: str, default: float) -> float:
    for key in keys:
        if key in data:
            value = data[key]
            if value is None:
                continue
            try:
                return float(value)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"could not convert {key!r} to float") from exc
    return float(default)


@dataclass(slots=True)
class LocalMachineTask:
    """Immutable representation of a local machine automation step."""

    identifier: str
    command: tuple[str, ...]
    description: str
    working_directory: str | None = None
    environment: tuple[tuple[str, str], ...] = field(default_factory=tuple)
    estimated_duration: float = 1.0
    cpu_cost: float = 1.0
    memory_cost: float = 0.25
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    dependency_set: frozenset[str] = field(init=False, repr=False)
    _environment_view: Mapping[str, str] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.command = _normalise_command(self.command)
        self.description = _normalise_description(self.description, fallback=self.identifier)
        self.working_directory = (self.working_directory or "").strip() or None
        self.environment = _normalise_environment(self.environment)
        self.estimated_duration = max(0.0, float(self.estimated_duration))
        self.cpu_cost = max(0.0, float(self.cpu_cost))
        self.memory_cost = max(0.0, float(self.memory_cost))
        self.dependencies = _normalise_dependencies(self.dependencies)
        object.__setattr__(self, "dependency_set", frozenset(self.dependencies))
        object.__setattr__(
            self,
            "_environment_view",
            MappingProxyType(dict(self.environment)),
        )

    @property
    def command_line(self) -> str:
        """Return the command as a shell-safe string."""

        return " ".join(self.command)

    def environment_mapping(self) -> Mapping[str, str]:
        """Expose the environment variables as a read-only mapping."""

        return self._environment_view


@dataclass(slots=True)
class LocalMachinePlan:
    """Execution blueprint for a collection of local machine tasks."""

    tasks: tuple[LocalMachineTask, ...]
    total_estimated_duration: float
    resource_warnings: tuple[str, ...]
    blocked_tasks: tuple[str, ...]
    cycles: tuple[tuple[str, ...], ...]

    def to_dict(self) -> dict[str, object]:
        """Serialise the plan into a JSON-compatible dictionary."""

        return {
            "tasks": [
                {
                    "identifier": task.identifier,
                    "command": list(task.command),
                    "description": task.description,
                    "working_directory": task.working_directory,
                    "environment": dict(task.environment),
                    "estimated_duration": task.estimated_duration,
                    "cpu_cost": task.cpu_cost,
                    "memory_cost": task.memory_cost,
                    "dependencies": list(task.dependencies),
                }
                for task in self.tasks
            ],
            "total_estimated_duration": self.total_estimated_duration,
            "resource_warnings": list(self.resource_warnings),
            "blocked_tasks": list(self.blocked_tasks),
            "cycles": [list(cycle) for cycle in self.cycles],
        }


class DynamicLocalMachineEngine:
    """Plan and diagnose local machine automation tasks."""

    def __init__(
        self,
        *,
        cpu_capacity: float | None = None,
        memory_capacity: float | None = None,
    ) -> None:
        self.cpu_capacity = float(cpu_capacity) if cpu_capacity is not None else 4.0
        self.memory_capacity = float(memory_capacity) if memory_capacity is not None else 8.0
        if self.cpu_capacity <= 0:
            raise ValueError("cpu_capacity must be positive")
        if self.memory_capacity <= 0:
            raise ValueError("memory_capacity must be positive")

    def build_plan(
        self,
        tasks: Iterable[LocalMachineTask | Mapping[str, object]],
    ) -> LocalMachinePlan:
        """Normalise the provided tasks and produce an execution plan."""

        catalogue = self._coerce_tasks(tasks)
        order, blocked, cycles = self._topological_order(catalogue)
        warnings = self._diagnose_resources(order)
        total_duration = sum(task.estimated_duration for task in order)
        return LocalMachinePlan(
            tasks=tuple(order),
            total_estimated_duration=total_duration,
            resource_warnings=tuple(warnings),
            blocked_tasks=tuple(blocked),
            cycles=tuple(tuple(cycle) for cycle in cycles),
        )

    def _coerce_tasks(
        self,
        tasks: Iterable[LocalMachineTask | Mapping[str, object]]
        | Mapping[str, LocalMachineTask | Mapping[str, object]],
    ) -> MutableMapping[str, LocalMachineTask]:
        catalogue: MutableMapping[str, LocalMachineTask] = {}

        if isinstance(tasks, Mapping):
            iterable: Iterable[LocalMachineTask | Mapping[str, object]] = tasks.values()
        else:
            iterable = tasks

        for payload in iterable:
            task = self._coerce_task(payload)
            if task.identifier in catalogue:
                raise ValueError(
                    f"duplicate task identifier detected: {task.identifier!r}"
                )
            catalogue[task.identifier] = task
        if not catalogue:
            raise ValueError("no tasks provided")
        return catalogue

    def _coerce_task(
        self,
        payload: LocalMachineTask | Mapping[str, object],
    ) -> LocalMachineTask:
        if isinstance(payload, LocalMachineTask):
            return payload
        if not isinstance(payload, Mapping):
            raise TypeError("task payload must be a LocalMachineTask or mapping")
        data = dict(payload)
        identifier = _normalise_identifier(str(data.get("identifier") or data.get("id") or ""))
        command = data.get("command")
        if command is None:
            command = data.get("cmd")
        return LocalMachineTask(
            identifier=identifier,
            command=_normalise_command(command),
            description=_normalise_description(
                str(data.get("description") or data.get("name") or ""),
                fallback=identifier,
            ),
            working_directory=str(data.get("working_directory") or data.get("cwd") or "").strip() or None,
            environment=_normalise_environment(data.get("environment") or data.get("env")),
            estimated_duration=_coerce_float(
                data,
                "estimated_duration",
                "duration",
                default=1.0,
            ),
            cpu_cost=_coerce_float(data, "cpu_cost", "cpu", default=1.0),
            memory_cost=_coerce_float(data, "memory_cost", "memory", default=0.25),
            dependencies=_normalise_dependencies(
                data.get("dependencies")
                or data.get("depends_on")
                or data.get("requires")
            ),
        )

    def _topological_order(
        self,
        catalogue: Mapping[str, LocalMachineTask],
    ) -> tuple[list[LocalMachineTask], list[str], list[tuple[str, ...]]]:
        dependents: MutableMapping[str, set[str]] = {identifier: set() for identifier in catalogue}
        in_degree: MutableMapping[str, int] = {identifier: 0 for identifier in catalogue}
        blocked: set[str] = set()
        known_identifiers = set(catalogue)

        for task in catalogue.values():
            missing = task.dependency_set - known_identifiers
            if missing:
                blocked.add(task.identifier)
            for dependency in task.dependencies:
                if dependency not in known_identifiers:
                    continue
                dependents[dependency].add(task.identifier)
            in_degree[task.identifier] = sum(
                1 for dependency in task.dependencies if dependency in known_identifiers
            )

        queue: list[tuple[tuple[float, float, str], LocalMachineTask]] = []
        for identifier, degree in in_degree.items():
            if degree == 0 and identifier not in blocked:
                task = catalogue[identifier]
                heappush(queue, (self._priority_tuple(task), task))
        ordered: list[LocalMachineTask] = []
        scheduled: set[str] = set()

        while queue:
            _, current = heappop(queue)
            if current.identifier in scheduled:
                continue
            scheduled.add(current.identifier)
            ordered.append(current)
            for successor_id in sorted(dependents[current.identifier]):
                in_degree[successor_id] -= 1
                if in_degree[successor_id] == 0 and successor_id not in blocked:
                    heappush(queue, (self._priority_tuple(catalogue[successor_id]), catalogue[successor_id]))

        remaining = [
            identifier
            for identifier, degree in in_degree.items()
            if degree > 0 and identifier not in scheduled
        ]
        cycles = self._detect_cycles(catalogue, remaining)
        blocked.update(remaining)
        return ordered, sorted(blocked), cycles

    def _priority_tuple(self, task: LocalMachineTask) -> tuple[float, float, str]:
        """Return a heap-friendly priority tuple for deterministic scheduling."""

        return (-task.cpu_cost, -task.memory_cost, task.identifier)

    def _detect_cycles(
        self,
        catalogue: Mapping[str, LocalMachineTask],
        candidates: Sequence[str],
    ) -> list[tuple[str, ...]]:
        if not candidates:
            return []

        index = 0
        indices: dict[str, int] = {}
        low_links: dict[str, int] = {}
        on_stack: set[str] = set()
        stack: list[str] = []
        cycles: list[tuple[str, ...]] = []

        def strong_connect(node: str) -> None:
            nonlocal index
            indices[node] = index
            low_links[node] = index
            index += 1
            stack.append(node)
            on_stack.add(node)

            task = catalogue.get(node)
            if task:
                for dependency in task.dependencies:
                    if dependency not in catalogue:
                        continue
                    if dependency not in indices:
                        strong_connect(dependency)
                        low_links[node] = min(low_links[node], low_links[dependency])
                    elif dependency in on_stack:
                        low_links[node] = min(low_links[node], indices[dependency])

            if low_links[node] == indices[node]:
                component: list[str] = []
                while True:
                    candidate = stack.pop()
                    on_stack.remove(candidate)
                    component.append(candidate)
                    if candidate == node:
                        break
                component_tuple = tuple(sorted(component))
                if len(component_tuple) > 1:
                    cycles.append(component_tuple)
                elif task and task.identifier in task.dependency_set:
                    cycles.append(component_tuple)

        for identifier in candidates:
            if identifier not in indices and identifier in catalogue:
                strong_connect(identifier)

        cycles.sort()
        return cycles

    def _diagnose_resources(self, tasks: Sequence[LocalMachineTask]) -> list[str]:
        warnings: list[str] = []
        if not tasks:
            return warnings

        peak_cpu = max(task.cpu_cost for task in tasks)
        peak_memory = max(task.memory_cost for task in tasks)
        total_cpu = sum(task.cpu_cost for task in tasks)
        total_memory = sum(task.memory_cost for task in tasks)

        if peak_cpu > self.cpu_capacity:
            warnings.append(
                f"peak cpu requirement {peak_cpu:.2f} exceeds capacity {self.cpu_capacity:.2f}"
            )
        if peak_memory > self.memory_capacity:
            warnings.append(
                f"peak memory requirement {peak_memory:.2f} exceeds capacity {self.memory_capacity:.2f}"
            )
        if total_cpu > self.cpu_capacity * len(tasks):
            warnings.append(
                "cumulative cpu requirement is high relative to available capacity"
            )
        if total_memory > self.memory_capacity * len(tasks):
            warnings.append(
                "cumulative memory requirement is high relative to available capacity"
            )
        return warnings


class DynamicLocalMachine(DynamicLocalMachineEngine):
    """Backwards compatible alias for the engine."""

    pass
