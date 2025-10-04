"""Dynamic Calculation Engine for orchestrating metric synthesis."""

from __future__ import annotations

import ast
import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from types import CodeType
from typing import (
    Callable,
    Dict,
    Iterable,
    Mapping,
    MutableMapping,
    Sequence,
)

__all__ = [
    "CalculationVariable",
    "CalculationMetric",
    "CalculationResult",
    "DynamicCalculationEngine",
]


_ALLOWED_NODES: tuple[type[ast.AST], ...] = (
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.BoolOp,
    ast.Compare,
    ast.Call,
    ast.IfExp,
    ast.Name,
    ast.Load,
    ast.Constant,
    ast.Tuple,
    ast.List,
    ast.Dict,
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.Pow,
    ast.Mod,
    ast.FloorDiv,
    ast.USub,
    ast.UAdd,
    ast.And,
    ast.Or,
    ast.Not,
    ast.Eq,
    ast.NotEq,
    ast.Lt,
    ast.LtE,
    ast.Gt,
    ast.GtE,
)

_ALLOWED_FUNCTIONS: Dict[str, Callable[..., float]] = {
    "abs": abs,
    "max": max,
    "min": min,
    "round": round,
    "sum": sum,
}

for _name in dir(math):
    if _name.startswith("_"):
        continue
    _value = getattr(math, _name)
    if callable(_value):
        _ALLOWED_FUNCTIONS[_name] = _value

_ALLOWED_CALLABLES = frozenset(_ALLOWED_FUNCTIONS)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


def _normalise_key(value: str) -> str:
    cleaned = value.strip().lower().replace(" ", "_")
    if not cleaned:
        raise ValueError("identifier must not be empty")
    return cleaned


def _normalise_text(value: str) -> str:
    return value.strip()


def _normalise_sequence(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for value in values:
        cleaned = value.strip()
        if not cleaned:
            continue
        key = cleaned.lower().replace(" ", "_")
        if key not in seen:
            seen.add(key)
            normalised.append(key)
    return tuple(normalised)


def _normalise_tags(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        cleaned = value.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


@dataclass(slots=True)
class CalculationVariable:
    """Represents a value that can be consumed by metric expressions."""

    key: str
    value: float
    description: str = ""
    weight: float = 1.0
    confidence: float = 1.0
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.key = _normalise_key(self.key)
        self.value = float(self.value)
        self.description = _normalise_text(self.description)
        self.weight = max(float(self.weight), 0.0)
        self.confidence = _clamp(float(self.confidence))
        self.tags = _normalise_tags(self.tags)


@dataclass(slots=True)
class CalculationMetric:
    """Declarative description of a metric to be computed."""

    key: str
    expression: str
    description: str = ""
    inputs: tuple[str, ...] = field(default_factory=tuple)
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    tags: tuple[str, ...] = field(default_factory=tuple)
    lower_bound: float | None = None
    upper_bound: float | None = None

    def __post_init__(self) -> None:
        self.key = _normalise_key(self.key)
        expression = self.expression.strip()
        if not expression:
            raise ValueError("expression must not be empty")
        self.expression = expression
        self.description = _normalise_text(self.description)
        self.inputs = _normalise_sequence(self.inputs)
        self.dependencies = _normalise_sequence(self.dependencies)
        self.tags = _normalise_tags(self.tags)
        if self.lower_bound is not None:
            self.lower_bound = float(self.lower_bound)
        if self.upper_bound is not None:
            self.upper_bound = float(self.upper_bound)
        if (
            self.lower_bound is not None
            and self.upper_bound is not None
            and self.lower_bound > self.upper_bound
        ):
            raise ValueError("lower bound must not exceed upper bound")


@dataclass(slots=True)
class CalculationResult:
    """Computed metric with provenance metadata."""

    key: str
    value: float
    expression: str
    inputs: Mapping[str, float]
    dependencies: Mapping[str, float]
    confidence: float
    generated_at: datetime = field(default_factory=_utcnow)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "key": self.key,
            "value": self.value,
            "expression": self.expression,
            "inputs": dict(self.inputs),
            "dependencies": dict(self.dependencies),
            "confidence": self.confidence,
            "generated_at": self.generated_at.isoformat(),
        }


class DynamicCalculationEngine:
    """Evaluates declarative metrics on top of registered variables."""

    def __init__(
        self,
        *,
        variables: Sequence[CalculationVariable | Mapping[str, object]] | None = None,
        metrics: Sequence[CalculationMetric | Mapping[str, object]] | None = None,
        constants: Mapping[str, float] | None = None,
    ) -> None:
        self._variables: Dict[str, CalculationVariable] = {}
        self._metrics: Dict[str, CalculationMetric] = {}
        defaults = {"pi": math.pi, "tau": math.tau, "e": math.e}
        self._constants: Dict[str, float] = {
            _normalise_key(key): float(value)
            for key, value in {**defaults, **(constants or {})}.items()
        }
        self._compiled: Dict[str, CodeType] = {}
        if variables:
            for variable in variables:
                self.register_variable(variable)
        if metrics:
            for metric in metrics:
                self.register_metric(metric)

    # ------------------------------------------------------------------
    # Mutation helpers
    # ------------------------------------------------------------------
    def register_variable(
        self, variable: CalculationVariable | Mapping[str, object]
    ) -> CalculationVariable:
        record = self._coerce_variable(variable)
        self._variables[record.key] = record
        return record

    def register_metric(
        self, metric: CalculationMetric | Mapping[str, object]
    ) -> CalculationMetric:
        record = self._coerce_metric(metric)
        self._metrics[record.key] = record
        self._compiled.pop(record.key, None)
        return record

    def update_variable(
        self,
        key: str,
        *,
        value: float | None = None,
        confidence: float | None = None,
        weight: float | None = None,
        description: str | None = None,
        tags: Sequence[str] | None = None,
    ) -> CalculationVariable:
        identifier = _normalise_key(key)
        if identifier not in self._variables:
            raise KeyError(f"variable {identifier!r} is not registered")
        record = self._variables[identifier]
        if value is not None:
            record.value = float(value)
        if confidence is not None:
            record.confidence = _clamp(float(confidence))
        if weight is not None:
            record.weight = max(float(weight), 0.0)
        if description is not None:
            record.description = _normalise_text(description)
        if tags is not None:
            record.tags = _normalise_tags(tags)
        return record

    def remove_variable(self, key: str) -> None:
        identifier = _normalise_key(key)
        self._variables.pop(identifier, None)

    def remove_metric(self, key: str) -> None:
        identifier = _normalise_key(key)
        self._metrics.pop(identifier, None)
        self._compiled.pop(identifier, None)

    # ------------------------------------------------------------------
    # Evaluation
    # ------------------------------------------------------------------
    def evaluate(
        self,
        metric_key: str,
        *,
        overrides: Mapping[str, float] | None = None,
    ) -> CalculationResult:
        identifier = _normalise_key(metric_key)
        cache: Dict[str, CalculationResult] = {}
        stack: set[str] = set()
        return self._evaluate(identifier, overrides or {}, cache, stack)

    def evaluate_many(
        self,
        metric_keys: Iterable[str],
        *,
        overrides: Mapping[str, float] | None = None,
    ) -> dict[str, CalculationResult]:
        cache: Dict[str, CalculationResult] = {}
        stack: set[str] = set()
        resolved: Dict[str, CalculationResult] = {}
        for key in metric_keys:
            identifier = _normalise_key(key)
            resolved[identifier] = self._evaluate(identifier, overrides or {}, cache, stack)
        return resolved

    def snapshot(self) -> Mapping[str, object]:
        return {
            "variables": {key: var for key, var in self._variables.items()},
            "metrics": {key: metric for key, metric in self._metrics.items()},
            "constants": dict(self._constants),
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _evaluate(
        self,
        metric_key: str,
        overrides: Mapping[str, float],
        cache: Dict[str, CalculationResult],
        stack: set[str],
    ) -> CalculationResult:
        if metric_key in cache:
            return cache[metric_key]
        if metric_key in stack:
            raise RuntimeError(f"detected cyclic dependency on metric {metric_key!r}")
        if metric_key not in self._metrics:
            raise KeyError(f"metric {metric_key!r} is not registered")
        stack.add(metric_key)
        metric = self._metrics[metric_key]

        dependency_results: Dict[str, CalculationResult] = {}
        for dependency in metric.dependencies:
            dependency_results[dependency] = self._evaluate(
                dependency, overrides, cache, stack
            )

        environment: Dict[str, float | Callable[..., float]] = {}
        environment.update(self._constants)
        environment.update(_ALLOWED_FUNCTIONS)
        dependency_values = {key: result.value for key, result in dependency_results.items()}
        environment.update(dependency_values)

        inputs: Dict[str, float] = {}
        expected_weight = 0.0
        accumulated_weight = 0.0
        for variable_key in metric.inputs:
            expected_weight += self._variable_weight(variable_key)
            value, weight = self._resolve_input(variable_key, overrides)
            inputs[variable_key] = value
            environment[variable_key] = value
            accumulated_weight += weight

        compiled = self._compile_metric(metric)
        raw_value = eval(compiled, {"__builtins__": {}}, environment)
        if isinstance(raw_value, bool):
            value = 1.0 if raw_value else 0.0
        else:
            value = float(raw_value)

        if metric.lower_bound is not None and value < metric.lower_bound:
            value = metric.lower_bound
        if metric.upper_bound is not None and value > metric.upper_bound:
            value = metric.upper_bound

        dependency_confidence = (
            fmean(result.confidence for result in dependency_results.values())
            if dependency_results
            else 1.0
        )
        base_confidence = 1.0 if expected_weight == 0 else _clamp(accumulated_weight / expected_weight)
        confidence = _clamp(min(base_confidence, dependency_confidence))

        result = CalculationResult(
            key=metric.key,
            value=value,
            expression=metric.expression,
            inputs=inputs,
            dependencies=dependency_values,
            confidence=confidence,
        )
        cache[metric_key] = result
        stack.remove(metric_key)
        return result

    def _variable_weight(self, key: str) -> float:
        identifier = _normalise_key(key)
        record = self._variables.get(identifier)
        if record is None:
            return 1.0
        return max(record.weight, 0.0)

    def _resolve_input(
        self, key: str, overrides: Mapping[str, float]
    ) -> tuple[float, float]:
        identifier = _normalise_key(key)
        if identifier in overrides:
            return float(overrides[identifier]), self._variable_weight(identifier)
        if identifier not in self._variables:
            raise KeyError(f"variable {identifier!r} is not registered and no override was provided")
        record = self._variables[identifier]
        return record.value, record.weight * record.confidence

    def _coerce_variable(
        self, payload: CalculationVariable | Mapping[str, object]
    ) -> CalculationVariable:
        if isinstance(payload, CalculationVariable):
            return payload
        if not isinstance(payload, Mapping):
            raise TypeError("variable payload must be a CalculationVariable or mapping")
        data = dict(payload)
        key = _normalise_key(str(data.get("key") or data.get("name") or ""))
        if "value" not in data:
            raise ValueError("variable payload must include a value")
        description = str(data.get("description") or "")
        tags = data.get("tags")
        tags_seq: Sequence[str] | None = None
        if isinstance(tags, Sequence) and not isinstance(tags, (str, bytes)):
            tags_seq = [str(item) for item in tags]
        return CalculationVariable(
            key=key,
            value=float(data["value"]),
            description=description,
            weight=float(data.get("weight", 1.0)),
            confidence=float(data.get("confidence", 1.0)),
            tags=tuple(tags_seq or ()),
        )

    def _coerce_metric(
        self, payload: CalculationMetric | Mapping[str, object]
    ) -> CalculationMetric:
        if isinstance(payload, CalculationMetric):
            return payload
        if not isinstance(payload, Mapping):
            raise TypeError("metric payload must be a CalculationMetric or mapping")
        data = dict(payload)
        key = _normalise_key(str(data.get("key") or data.get("name") or ""))
        expression = str(data.get("expression") or data.get("formula") or "")
        description = str(data.get("description") or "")
        inputs_raw = data.get("inputs")
        dependencies_raw = data.get("dependencies")
        tags_raw = data.get("tags")
        lower = data.get("lower_bound")
        upper = data.get("upper_bound")

        def _as_sequence(value: object | None) -> Sequence[str] | None:
            if value is None:
                return None
            if isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
                return [str(item) for item in value]
            return [str(value)]

        return CalculationMetric(
            key=key,
            expression=expression,
            description=description,
            inputs=tuple(_as_sequence(inputs_raw) or ()),
            dependencies=tuple(_as_sequence(dependencies_raw) or ()),
            tags=tuple(_as_sequence(tags_raw) or ()),
            lower_bound=None if lower is None else float(lower),
            upper_bound=None if upper is None else float(upper),
        )

    def _compile_metric(self, metric: CalculationMetric) -> CodeType:
        cached = self._compiled.get(metric.key)
        if cached is not None:
            return cached
        allowed_names = set(metric.inputs) | set(metric.dependencies) | set(
            self._constants
        )
        compiled = self._validate_expression(metric.expression, allowed_names)
        self._compiled[metric.key] = compiled
        return compiled

    def _validate_expression(self, expression: str, allowed_names: set[str]) -> CodeType:
        try:
            tree = ast.parse(expression, mode="eval")
        except SyntaxError as exc:  # pragma: no cover - surfaced to caller
            raise ValueError(f"invalid expression: {expression!r}") from exc

        for node in ast.walk(tree):
            if not isinstance(node, _ALLOWED_NODES):
                raise ValueError(
                    f"expression contains unsupported node {node.__class__.__name__}"
                )
            if isinstance(node, ast.Call):
                if not isinstance(node.func, ast.Name):
                    raise ValueError("only direct function calls are supported")
                if node.func.id not in _ALLOWED_CALLABLES:
                    raise ValueError(f"call to unsupported function {node.func.id!r}")
            elif isinstance(node, ast.Attribute):
                raise ValueError("attribute access is not supported")
            elif isinstance(node, ast.Name):
                if (
                    node.id not in allowed_names
                    and node.id not in _ALLOWED_CALLABLES
                ):
                    raise ValueError(f"unknown symbol {node.id!r} in expression")
        return compile(tree, filename="<calculation_metric>", mode="eval")
