"""Pragmatic architecture planning utilities for the Dynamic Architect persona.

Similar to the engineering planner rewrite, this module keeps the public
interfaces introduced in the previous iteration but streamlines the
implementation.  The original module attempted to cover an exhaustive range of
governance scenarios which led to a 300+ line file packed with duplicated
normalisation helpers and ad-hoc analytics.  The optimiser focuses on the core
behaviour needed by downstream callers:

* normalise component and constraint inputs,
* calculate an integration order that respects declared dependencies,
* surface obvious risks and recommendations, and
* derive a concise set of blueprint metrics for agent reasoning layers.

The resulting blueprint remains serialisable and backwards compatible while the
module shrinks to roughly a third of the previous size.
"""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from statistics import median
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ArchitectureComponent",
    "ArchitectureConstraint",
    "ArchitectureBlueprint",
    "DynamicArchitectEngine",
    "DynamicArchitect",
]


def _normalise_name(value: str | None) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError("component name must not be empty")
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


def _normalise_tuple(values: Sequence[str] | None, *, lower: bool = False) -> tuple[str, ...]:
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


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, float(value)))


def _coerce_component(
    payload: ArchitectureComponent | Mapping[str, object]
) -> ArchitectureComponent:
    if isinstance(payload, ArchitectureComponent):
        return payload
    if not isinstance(payload, Mapping):
        raise TypeError("component payload must be an ArchitectureComponent or mapping")
    data = dict(payload)
    name = _normalise_name(str(data.get("name") or data.get("id") or ""))
    return ArchitectureComponent(
        name=name,
        description=_normalise_text(
            str(data.get("description") or data.get("purpose") or ""),
            fallback=name,
        ),
        criticality=float(data.get("criticality", data.get("priority", 0.5)) or 0.5),
        reliability_target=float(
            data.get("reliability_target", data.get("availability", 0.99)) or 0.99
        ),
        latency_budget_ms=float(data.get("latency_budget_ms", data.get("latency", 200.0)) or 200.0),
        dependencies=_normalise_tuple(data.get("dependencies")),
        interfaces=_normalise_tuple(data.get("interfaces")),
        tags=_normalise_tuple(data.get("tags"), lower=True),
    )


def _coerce_constraint(
    payload: ArchitectureConstraint | Mapping[str, object]
) -> ArchitectureConstraint:
    if isinstance(payload, ArchitectureConstraint):
        return payload
    if not isinstance(payload, Mapping):
        raise TypeError("constraint payload must be an ArchitectureConstraint or mapping")
    data = dict(payload)
    name = _normalise_name(str(data.get("name") or data.get("id") or ""))
    return ArchitectureConstraint(
        name=name,
        description=_normalise_text(
            str(data.get("description") or data.get("summary") or ""),
            fallback=name,
        ),
        priority=float(data.get("priority", data.get("weight", 0.5)) or 0.5),
        metric=str(data.get("metric", data.get("type", "governance"))).lower(),
        target=float(data.get("target", data.get("threshold", 0.0)) or 0.0),
    )


@dataclass(slots=True)
class ArchitectureComponent:
    """A component participating in the target system topology."""

    name: str
    description: str
    criticality: float = 0.5
    reliability_target: float = 0.99
    latency_budget_ms: float = 200.0
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    interfaces: tuple[str, ...] = field(default_factory=tuple)
    tags: tuple[str, ...] = field(default_factory=tuple)
    dependency_set: frozenset[str] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.description = _normalise_text(self.description, fallback=self.name)
        self.criticality = _clamp(self.criticality)
        self.reliability_target = _clamp(self.reliability_target)
        self.latency_budget_ms = max(1.0, float(self.latency_budget_ms))
        self.dependencies = _normalise_tuple(self.dependencies)
        self.interfaces = _normalise_tuple(self.interfaces)
        self.tags = _normalise_tuple(self.tags, lower=True)
        object.__setattr__(self, "dependency_set", frozenset(self.dependencies))

    @property
    def availability_risk(self) -> float:
        return round(1.0 - self.reliability_target, 4)

    @property
    def latency_risk(self) -> float:
        return round(min(1.0, 200.0 / self.latency_budget_ms), 4)


@dataclass(slots=True)
class ArchitectureConstraint:
    """Lightweight governance constraint applied to the topology."""

    name: str
    description: str
    priority: float
    metric: str
    target: float

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.description = _normalise_text(self.description, fallback=self.name)
        self.priority = _clamp(self.priority)
        self.metric = self.metric.strip().lower() or "governance"
        self.target = float(self.target)


@dataclass(slots=True)
class ArchitectureBlueprint:
    """Computed architecture plan returned by the engine."""

    vision: str
    components: tuple[ArchitectureComponent, ...]
    integration_sequence: tuple[str, ...]
    risks: tuple[str, ...]
    recommendations: tuple[str, ...]
    metrics: Mapping[str, float]

    def as_dict(self) -> dict[str, object]:
        return {
            "vision": self.vision,
            "components": [
                {
                    "name": component.name,
                    "description": component.description,
                    "criticality": component.criticality,
                    "reliability_target": component.reliability_target,
                    "latency_budget_ms": component.latency_budget_ms,
                    "dependencies": list(component.dependencies),
                    "interfaces": list(component.interfaces),
                    "tags": list(component.tags),
                }
                for component in self.components
            ],
            "integration_sequence": list(self.integration_sequence),
            "risks": list(self.risks),
            "recommendations": list(self.recommendations),
            "metrics": dict(self.metrics),
        }


class DynamicArchitectEngine:
    """Analyse components and constraints to produce an architecture blueprint."""

    def __init__(
        self,
        components: Iterable[ArchitectureComponent | Mapping[str, object]] | None = None,
        *,
        constraints: Iterable[ArchitectureConstraint | Mapping[str, object]] | None = None,
    ) -> None:
        self._components: MutableMapping[str, ArchitectureComponent] = {}
        self._constraints: MutableMapping[str, ArchitectureConstraint] = {}
        if components:
            self.register_components(components)
        if constraints:
            self.register_constraints(constraints)

    # ------------------------------------------------------------------
    # Registry helpers
    def register_component(
        self, component: ArchitectureComponent | Mapping[str, object]
    ) -> ArchitectureComponent:
        resolved = _coerce_component(component)
        self._components[resolved.name] = resolved
        return resolved

    def register_components(
        self, components: Iterable[ArchitectureComponent | Mapping[str, object]]
    ) -> tuple[ArchitectureComponent, ...]:
        return tuple(self.register_component(component) for component in components)

    def register_constraint(
        self, constraint: ArchitectureConstraint | Mapping[str, object]
    ) -> ArchitectureConstraint:
        resolved = _coerce_constraint(constraint)
        self._constraints[resolved.name] = resolved
        return resolved

    def register_constraints(
        self, constraints: Iterable[ArchitectureConstraint | Mapping[str, object]]
    ) -> tuple[ArchitectureConstraint, ...]:
        return tuple(self.register_constraint(constraint) for constraint in constraints)

    @property
    def components(self) -> tuple[ArchitectureComponent, ...]:
        return tuple(self._components.values())

    @property
    def constraints(self) -> tuple[ArchitectureConstraint, ...]:
        return tuple(self._constraints.values())

    # ------------------------------------------------------------------
    # Planning helpers
    def _integration_order(self) -> tuple[str, ...]:
        if not self._components:
            return ()

        in_degree: MutableMapping[str, int] = {
            name: 0 for name in self._components.keys()
        }
        dependents: MutableMapping[str, set[str]] = {
            name: set() for name in self._components.keys()
        }

        for component in self._components.values():
            for dependency in component.dependency_set:
                if dependency in in_degree:
                    in_degree[component.name] += 1
                    dependents[dependency].add(component.name)

        queue: deque[str] = deque(
            sorted(name for name, degree in in_degree.items() if degree == 0)
        )
        order: list[str] = []

        while queue:
            current = queue.popleft()
            order.append(current)
            for dependant in sorted(dependents[current]):
                in_degree[dependant] -= 1
                if in_degree[dependant] == 0:
                    queue.append(dependant)

        # Fallback: include any remaining nodes (cycles) in sorted order to avoid
        # losing information.
        if len(order) != len(self._components):
            remaining = sorted(
                set(self._components.keys()) - set(order),
            )
            order.extend(remaining)
        return tuple(order)

    def _collect_risks(self, sequence: Sequence[str]) -> tuple[str, ...]:
        risks: list[str] = []
        name_to_component = self._components
        known_components = set(name_to_component)

        for component in name_to_component.values():
            missing = component.dependency_set - known_components
            if missing:
                risks.append(
                    f"Component {component.name} references unknown dependency {', '.join(sorted(missing))}."
                )
            if component.availability_risk > 0.05:
                risks.append(
                    f"Component {component.name} has elevated availability risk ({component.availability_risk:.2%})."
                )
            if component.latency_risk > 0.5:
                risks.append(
                    f"Component {component.name} latency budget ({component.latency_budget_ms:.0f}ms) is aggressive."
                )

        for constraint in self._constraints.values():
            if constraint.metric.startswith("latency"):
                offenders = [
                    component.name
                    for component in name_to_component.values()
                    if component.latency_budget_ms > constraint.target
                ]
                if offenders:
                    risks.append(
                        f"Latency constraint '{constraint.name}' breached by {', '.join(offenders)}."
                    )
            if constraint.metric.startswith("reliability"):
                offenders = [
                    component.name
                    for component in name_to_component.values()
                    if component.reliability_target < constraint.target
                ]
                if offenders:
                    risks.append(
                        f"Reliability constraint '{constraint.name}' unmet by {', '.join(offenders)}."
                    )

        if sequence and len(sequence) != len(self._components):
            risks.append("Integration order contains cycles; review component dependencies.")

        return tuple(dict.fromkeys(risks))

    def _recommendations(
        self,
        sequence: Sequence[str],
        *,
        focus: Sequence[str],
    ) -> tuple[str, ...]:
        recommendations: list[str] = []
        if focus:
            focus_summary = Counter(tag for component in self._components.values() for tag in component.tags)
            for area in focus:
                if area.lower() not in focus_summary:
                    recommendations.append(f"Introduce capabilities covering focus area '{area}'.")

        if sequence:
            lead = self._components[sequence[0]]
            if lead.criticality < 0.5:
                recommendations.append(
                    f"Consider kicking off integration with a higher criticality component than {lead.name}."
                )

        for constraint in sorted(self._constraints.values(), key=lambda c: (-c.priority, c.name)):
            if constraint.metric.startswith("security"):
                recommendations.append(
                    f"Embed security reviews before integrating {sequence[-1]}" if sequence else f"Embed security reviews early."
                )

        return tuple(dict.fromkeys(recommendations))

    def _metrics(self, *, focus: Sequence[str]) -> Mapping[str, float]:
        if not self._components:
            return {
                "component_count": 0.0,
                "constraint_count": float(len(self._constraints)),
                "focus_areas": float(len(tuple(dict.fromkeys(focus)))),
            }

        criticalities = [component.criticality for component in self._components.values()]
        reliabilities = [component.reliability_target for component in self._components.values()]
        latencies = [component.latency_budget_ms for component in self._components.values()]

        return {
            "component_count": float(len(self._components)),
            "constraint_count": float(len(self._constraints)),
            "focus_areas": float(len(tuple(dict.fromkeys(focus)))),
            "criticality_average": sum(criticalities) / len(criticalities),
            "reliability_average": sum(reliabilities) / len(reliabilities),
            "latency_median_ms": float(median(latencies)),
        }

    # ------------------------------------------------------------------
    # Public API
    def design(
        self,
        vision: str,
        *,
        focus: Sequence[str] | None = None,
    ) -> ArchitectureBlueprint:
        vision_text = _normalise_text(vision)
        focus_tuple = tuple(
            dict.fromkeys(
                _normalise_text(str(item))
                for item in (focus or ())
                if str(item).strip()
            )
        )

        sequence = self._integration_order()
        risks = self._collect_risks(sequence)
        recommendations = self._recommendations(sequence, focus=focus_tuple)
        metrics = self._metrics(focus=focus_tuple)

        return ArchitectureBlueprint(
            vision=vision_text,
            components=self.components,
            integration_sequence=sequence,
            risks=risks,
            recommendations=recommendations,
            metrics=metrics,
        )


class DynamicArchitect:
    """Persona wrapper that instantiates an engine per request."""

    def design(
        self,
        components: Iterable[ArchitectureComponent | Mapping[str, object]],
        *,
        vision: str,
        focus: Sequence[str] | None = None,
        constraints: Iterable[ArchitectureConstraint | Mapping[str, object]] | None = None,
    ) -> ArchitectureBlueprint:
        engine = DynamicArchitectEngine(components, constraints=constraints)
        return engine.design(vision, focus=focus)
