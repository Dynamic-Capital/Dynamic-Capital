"""Blueprint generator for Dynamic Capital's dynamic programming persona."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
import heapq
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = ["DPState", "DPBlueprint", "DynamicProgrammingEngine"]


def _normalise_identifier(value: str | None) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError("identifier must not be empty")
    return text


def _normalise_text(value: str | None, *, fallback: str | None = None) -> str:
    text = (value or "").strip()
    if text:
        return text
    if fallback is not None:
        fallback_text = (fallback or "").strip()
        if fallback_text:
            return fallback_text
    raise ValueError("text value must not be empty")


def _normalise_sequence(
    values: Sequence[str] | None, *, lower: bool = False
) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for item in values:
        candidate = item.strip()
        if not candidate:
            continue
        candidate = candidate.lower() if lower else candidate
        if candidate not in seen:
            seen.add(candidate)
            normalised.append(candidate)
    return tuple(normalised)


def _normalise_dependencies(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    dependencies: list[str] = []
    seen: set[str] = set()
    for item in values:
        identifier = _normalise_identifier(item)
        if identifier not in seen:
            seen.add(identifier)
            dependencies.append(identifier)
    return tuple(dependencies)


def _coerce_state(payload: DPState | Mapping[str, object]) -> DPState:
    if isinstance(payload, DPState):
        return payload
    if not isinstance(payload, Mapping):
        raise TypeError("state payload must be a DPState or mapping")
    data = dict(payload)
    identifier = _normalise_identifier(
        str(data.get("identifier") or data.get("id") or data.get("name") or "")
    )
    return DPState(
        identifier=identifier,
        goal=_normalise_text(
            str(data.get("goal") or data.get("description") or ""),
            fallback=identifier,
        ),
        definition=_normalise_text(
            str(data.get("definition") or data.get("state") or ""),
            fallback=identifier,
        ),
        transition=str(data.get("transition") or data.get("recurrence") or "").strip(),
        dependencies=_normalise_dependencies(data.get("dependencies")),
        dimensions=_normalise_sequence(data.get("dimensions")),
        complexity=float(data.get("complexity", 1.0) or 1.0),
        is_base_case=bool(
            data.get("is_base_case")
            or data.get("base")
            or str(data.get("type", "")).strip().lower() == "base"
        ),
        tags=_normalise_sequence(data.get("tags"), lower=True),
    )


@dataclass(slots=True)
class DPState:
    """Description of a single dynamic programming state."""

    identifier: str
    goal: str
    definition: str
    transition: str = ""
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    dimensions: tuple[str, ...] = field(default_factory=tuple)
    complexity: float = 1.0
    is_base_case: bool = False
    tags: tuple[str, ...] = field(default_factory=tuple)
    dependency_set: frozenset[str] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.goal = _normalise_text(self.goal, fallback=self.identifier)
        self.definition = _normalise_text(self.definition, fallback=self.goal)
        self.transition = self.transition.strip()
        self.dependencies = _normalise_dependencies(self.dependencies)
        self.dimensions = _normalise_sequence(self.dimensions)
        self.complexity = max(0.0, float(self.complexity))
        self.is_base_case = bool(self.is_base_case or not self.dependencies)
        self.tags = _normalise_sequence(self.tags, lower=True)
        object.__setattr__(self, "dependency_set", frozenset(self.dependencies))

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "identifier": self.identifier,
            "goal": self.goal,
            "definition": self.definition,
            "transition": self.transition,
            "dependencies": list(self.dependencies),
            "dimensions": list(self.dimensions),
            "complexity": self.complexity,
            "is_base_case": self.is_base_case,
            "tags": list(self.tags),
        }


@dataclass(slots=True)
class DPBlueprint:
    """Structured plan returned by :class:`DynamicProgrammingEngine`."""

    name: str
    target: str
    evaluation_order: tuple[str, ...]
    base_states: tuple[str, ...]
    transition_states: tuple[str, ...]
    layers: tuple[tuple[str, ...], ...]
    notes: dict[str, object]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "target": self.target,
            "evaluation_order": list(self.evaluation_order),
            "base_states": list(self.base_states),
            "transition_states": list(self.transition_states),
            "layers": [list(layer) for layer in self.layers],
            "notes": dict(self.notes),
            "narrative": self.narrative,
        }


class DynamicProgrammingEngine:
    """Transform DP states into an execution blueprint."""

    def plan(
        self,
        states: Iterable[DPState | Mapping[str, object]],
        *,
        target: str | None = None,
        name: str | None = None,
        objective: str | None = None,
    ) -> DPBlueprint:
        normalised = self._normalise_states(states)
        if not normalised:
            raise ValueError("no states provided")

        if target is None:
            target_identifier = next(iter(normalised))
        else:
            target_identifier = _normalise_identifier(target)
        if target_identifier not in normalised:
            raise KeyError(f"unknown target state '{target_identifier}'")

        order = self._topological_order(normalised)
        layers = self._compute_layers(normalised)
        base_set = {
            identifier for identifier, state in normalised.items() if state.is_base_case
        }
        base_states = tuple(identifier for identifier in order if identifier in base_set)
        transition_states = tuple(
            identifier for identifier in order if identifier not in base_set
        )

        notes = {
            "state_count": len(normalised),
            "base_state_count": len(base_states),
            "transition_state_count": len(transition_states),
            "max_dependency_depth": self._max_depth(normalised),
            "layer_count": len(layers),
            "estimated_complexity": round(
                sum(state.complexity for state in normalised.values()), 4
            ),
            "requires_memoization": bool(transition_states),
            "target": target_identifier,
        }

        focus = objective or normalised[target_identifier].goal
        blueprint_name = name or f"{focus} plan"
        narrative = (
            f"Blueprint for {focus} covering {len(order)} state(s). "
            f"{len(base_states)} base case(s), {len(transition_states)} transition state(s). "
            f"Longest dependency chain spans {notes['max_dependency_depth']} layer(s)."
        )

        return DPBlueprint(
            name=blueprint_name,
            target=target_identifier,
            evaluation_order=tuple(order),
            base_states=base_states,
            transition_states=transition_states,
            layers=layers,
            notes=notes,
            narrative=narrative,
        )

    # ------------------------------------------------------------------ helpers
    def _normalise_states(
        self, states: Iterable[DPState | Mapping[str, object]]
    ) -> dict[str, DPState]:
        mapping: dict[str, DPState] = {}
        for payload in states:
            state = _coerce_state(payload)
            if state.identifier in mapping:
                raise ValueError(f"duplicate state identifier '{state.identifier}'")
            mapping[state.identifier] = state
        self._validate_dependencies(mapping)
        return mapping

    def _validate_dependencies(self, states: Mapping[str, DPState]) -> None:
        for state in states.values():
            missing = state.dependency_set.difference(states.keys())
            if missing:
                missing_str = ", ".join(sorted(missing))
                raise KeyError(
                    f"state '{state.identifier}' references unknown dependencies: {missing_str}"
                )

    def _topological_order(self, states: Mapping[str, DPState]) -> tuple[str, ...]:
        indegree: dict[str, int] = {key: len(state.dependencies) for key, state in states.items()}
        adjacency: dict[str, list[str]] = defaultdict(list)
        for identifier, state in states.items():
            for dependency in state.dependencies:
                adjacency[dependency].append(identifier)
        heap: list[str] = [identifier for identifier, degree in indegree.items() if degree == 0]
        heapq.heapify(heap)
        order: list[str] = []
        while heap:
            current = heapq.heappop(heap)
            order.append(current)
            for neighbour in adjacency.get(current, ()):  # pragma: no branch - defensive
                indegree[neighbour] -= 1
                if indegree[neighbour] == 0:
                    heapq.heappush(heap, neighbour)
        if len(order) != len(states):
            raise ValueError("cyclic dependency detected between states")
        return tuple(order)

    def _compute_layers(self, states: Mapping[str, DPState]) -> tuple[tuple[str, ...], ...]:
        indegree: dict[str, int] = {key: len(state.dependencies) for key, state in states.items()}
        adjacency: dict[str, list[str]] = defaultdict(list)
        for identifier, state in states.items():
            for dependency in state.dependencies:
                adjacency[dependency].append(identifier)
        layer: list[str] = sorted([key for key, degree in indegree.items() if degree == 0])
        layers: list[tuple[str, ...]] = []
        visited: set[str] = set()
        while layer:
            layers.append(tuple(layer))
            next_layer: list[str] = []
            for identifier in layer:
                if identifier in visited:  # pragma: no cover - defensive guard
                    continue
                visited.add(identifier)
                for neighbour in adjacency.get(identifier, ()):  # pragma: no branch
                    indegree[neighbour] -= 1
                    if indegree[neighbour] == 0:
                        next_layer.append(neighbour)
            layer = sorted(next_layer)
        if len(visited) != len(states):  # pragma: no cover - guard against cycles
            raise ValueError("unable to compute layers due to cyclic dependency")
        return tuple(layers)

    def _max_depth(self, states: Mapping[str, DPState]) -> int:
        memo: dict[str, int] = {}

        def depth(identifier: str) -> int:
            if identifier in memo:
                return memo[identifier]
            state = states[identifier]
            if not state.dependencies:
                memo[identifier] = 1
                return 1
            value = 1 + max(depth(dep) for dep in state.dependencies)
            memo[identifier] = value
            return value

        return max(depth(identifier) for identifier in states)
