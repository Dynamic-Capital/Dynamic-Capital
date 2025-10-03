"""Dynamic expression evaluation primitives."""

from __future__ import annotations

import ast
import math
from collections import deque
from dataclasses import dataclass, field
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ExpressionElement",
    "ExpressionContext",
    "ExpressionDigest",
    "DynamicExpressions",
    "MissingVariablesError",
]


# ---------------------------------------------------------------------------
# evaluation helpers


_ALLOWED_AST_NODES: tuple[type[ast.AST], ...] = (
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.Pow,
    ast.Mod,
    ast.FloorDiv,
    ast.USub,
    ast.UAdd,
    ast.Call,
    ast.Name,
    ast.Load,
    ast.Constant,
    ast.Compare,
    ast.Eq,
    ast.NotEq,
    ast.Gt,
    ast.GtE,
    ast.Lt,
    ast.LtE,
    ast.And,
    ast.Or,
    ast.BoolOp,
)

_ALLOWED_FUNCTIONS: dict[str, object] = {
    name: getattr(math, name)
    for name in (
        "acos",
        "acosh",
        "asin",
        "asinh",
        "atan",
        "atan2",
        "atanh",
        "ceil",
        "cos",
        "cosh",
        "degrees",
        "erf",
        "erfc",
        "exp",
        "expm1",
        "fabs",
        "floor",
        "fmod",
        "frexp",
        "gamma",
        "hypot",
        "ldexp",
        "lgamma",
        "log",
        "log10",
        "log1p",
        "log2",
        "pow",
        "prod",
        "radians",
        "sin",
        "sinh",
        "sqrt",
        "tan",
        "tanh",
        "trunc",
    )
}
_ALLOWED_CONSTANTS: dict[str, float] = {
    "pi": math.pi,
    "e": math.e,
    "tau": getattr(math, "tau", math.pi * 2),
}
_ALLOWED_GLOBALS: dict[str, object] = {**_ALLOWED_FUNCTIONS, **_ALLOWED_CONSTANTS}


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_float_mapping(values: Mapping[str, float] | None) -> Mapping[str, float]:
    if values is None:
        return {}
    if not isinstance(values, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("values must be a mapping")
    coerced: dict[str, float] = {}
    for key, value in values.items():
        cleaned = _normalise_text(str(key))
        coerced[cleaned] = float(value)
    return coerced


def _coerce_metadata(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _extract_identifiers(tree: ast.AST) -> tuple[str, ...]:
    identifiers: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            if node.id not in _ALLOWED_GLOBALS:
                identifiers.add(node.id)
    return tuple(sorted(identifiers))


def _validate_ast(tree: ast.AST) -> None:
    for node in ast.walk(tree):
        if not isinstance(node, _ALLOWED_AST_NODES):
            raise ValueError(f"unsupported syntax: {node.__class__.__name__}")
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in _ALLOWED_FUNCTIONS:
                raise ValueError("only basic math functions are supported")
        if isinstance(node, ast.Name):
            if isinstance(node.ctx, ast.Store):  # pragma: no cover - defensive guard
                raise ValueError("assignment is not supported")


def _compile_expression(expression: str) -> tuple[ast.AST, object, tuple[str, ...]]:
    tree = ast.parse(expression, mode="eval")
    _validate_ast(tree)
    compiled = compile(tree, "<dynamic-expression>", "eval")
    identifiers = _extract_identifiers(tree)
    return tree, compiled, identifiers


def _safe_evaluate(compiled: object, variables: Mapping[str, float]) -> float:
    env: dict[str, object] = {**_ALLOWED_GLOBALS, **variables}
    return float(eval(compiled, {"__builtins__": {}}, env))


def _round_value(value: float, precision: int) -> float:
    return float(f"{value:.{precision}f}") if precision >= 0 else value


# ---------------------------------------------------------------------------
# dataclasses


class MissingVariablesError(KeyError):
    """Raised when an expression cannot be evaluated due to missing symbols."""

    def __init__(self, element: str, missing: Sequence[str]) -> None:
        missing_symbols = tuple(sorted(missing))
        super().__init__(
            f"missing variables for {element}: {', '.join(missing_symbols)}"
        )
        self.element = element
        self.missing: tuple[str, ...] = missing_symbols


@dataclass(slots=True)
class ExpressionElement:
    """Single mathematical expression managed by the system."""

    name: str
    expression: str
    description: str
    weight: float = 1.0
    tags: tuple[str, ...] = field(default_factory=tuple)
    baselines: Mapping[str, float] | None = None
    metadata: Mapping[str, object] | None = None
    dependencies: tuple[str, ...] = field(init=False)
    _compiled: object = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.expression = _normalise_text(self.expression)
        _, compiled, dependencies = _compile_expression(self.expression)
        self._compiled = compiled
        self.dependencies = dependencies
        self.description = _normalise_text(self.description)
        self.weight = max(float(self.weight), 0.0)
        self.tags = _normalise_tags(self.tags)
        self.baselines = _coerce_float_mapping(self.baselines)
        self.metadata = _coerce_metadata(self.metadata)

    def _prepare_environment(
        self, variables: Mapping[str, float]
    ) -> dict[str, float]:
        env: dict[str, float] = dict(self.baselines or {})
        for key, value in variables.items():
            env[_normalise_text(str(key))] = float(value)
        return env

    def evaluate(self, variables: Mapping[str, float]) -> float:
        value, _ = self.evaluate_with_env(variables)
        return value

    def evaluate_with_env(
        self, variables: Mapping[str, float]
    ) -> tuple[float, Mapping[str, float]]:
        env = self._prepare_environment(variables)
        missing = tuple(symbol for symbol in self.dependencies if symbol not in env)
        if missing:
            raise MissingVariablesError(self.name, missing)
        return _safe_evaluate(self._compiled, env), env


@dataclass(slots=True)
class ExpressionContext:
    """Context for evaluating a collection of expressions."""

    scenario: str
    variables: Mapping[str, float]
    emphasis_tags: tuple[str, ...] = field(default_factory=tuple)
    guardrail_tags: tuple[str, ...] = field(default_factory=tuple)
    sensitivity: float = 0.0
    highlight_limit: int = 3
    precision: int = 4

    def __post_init__(self) -> None:
        self.scenario = _normalise_text(self.scenario)
        self.variables = _coerce_float_mapping(self.variables)
        self.emphasis_tags = _normalise_tags(self.emphasis_tags)
        self.guardrail_tags = _normalise_tags(self.guardrail_tags)
        self.sensitivity = _clamp(float(self.sensitivity))
        limit = int(self.highlight_limit)
        if limit <= 0:
            raise ValueError("highlight_limit must be positive")
        self.highlight_limit = limit
        precision = int(self.precision)
        if precision < 0:
            raise ValueError("precision must be non-negative")
        self.precision = precision


@dataclass(slots=True)
class ExpressionDigest:
    """Synthesised evaluation results for expression orchestration."""

    highlights: tuple[tuple[str, float], ...]
    mean_value: float
    min_value: float
    max_value: float
    sensitivity_flags: tuple[str, ...]
    missing_variables: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "highlights": list(self.highlights),
            "mean_value": self.mean_value,
            "min_value": self.min_value,
            "max_value": self.max_value,
            "sensitivity_flags": list(self.sensitivity_flags),
            "missing_variables": list(self.missing_variables),
            "narrative": self.narrative,
        }


# ---------------------------------------------------------------------------
# dynamic orchestrator


class DynamicExpressions:
    """Aggregate expressions and produce an actionable digest."""

    def __init__(self, *, history: int | None = 32) -> None:
        if history is not None:
            if not isinstance(history, int):
                raise TypeError("history must be an integer or None")
            if history <= 0:
                raise ValueError("history must be positive")

        self._expressions: Deque[ExpressionElement] = deque(maxlen=history)
        self._history: int | None = history

    def __len__(self) -> int:
        return len(self._expressions)

    def capture(self, element: ExpressionElement | Mapping[str, object]) -> ExpressionElement:
        resolved = self._coerce_element(element)
        self._expressions.append(resolved)
        return resolved

    def extend(self, elements: Iterable[ExpressionElement | Mapping[str, object]]) -> None:
        resolved_elements = tuple(self._coerce_element(element) for element in elements)
        if resolved_elements:
            self._expressions.extend(resolved_elements)

    def reset(self) -> None:
        self._expressions.clear()

    def _coerce_element(
        self, element: ExpressionElement | Mapping[str, object]
    ) -> ExpressionElement:
        if isinstance(element, ExpressionElement):
            return element
        if isinstance(element, Mapping):
            payload: MutableMapping[str, object] = dict(element)
            return ExpressionElement(**payload)  # type: ignore[arg-type]
        raise TypeError("element must be ExpressionElement or mapping")

    def _score_element(
        self, element: ExpressionElement, emphasis: set[str], guardrails: set[str]
    ) -> float:
        score = element.weight
        if emphasis and emphasis.intersection(element.tags):
            score += 0.25
        if guardrails and guardrails.intersection(element.tags):
            score -= 0.15
        score += min(len(element.dependencies), 5) * 0.05
        return score

    def _probe_sensitivity(
        self,
        element: ExpressionElement,
        env: Mapping[str, float],
        baseline: float,
        intensity: float,
    ) -> str | None:
        if not element.dependencies:
            return None
        slopes: list[float] = []
        for symbol in element.dependencies:
            base_value = env[symbol]
            step = abs(base_value) * 0.1
            if step == 0:
                step = 0.1
            step *= max(intensity, 0.05)
            forward_env = dict(env)
            forward_env[symbol] = base_value + step
            backward_env = dict(env)
            backward_env[symbol] = base_value - step
            try:
                forward = _safe_evaluate(element._compiled, forward_env)
                backward = _safe_evaluate(element._compiled, backward_env)
            except Exception:  # pragma: no cover - defensive guard
                continue
            derivative = abs(forward - backward) / (2 * step)
            slopes.append(derivative)
        if not slopes:
            return None
        average_slope = fmean(slopes)
        threshold = max(1.0, abs(baseline) * 0.1)
        if average_slope > threshold:
            return (
                f"{element.name} responds sharply to {', '.join(element.dependencies)} "
                f"with average slope {average_slope:.2f}."
            )
        return None

    def generate_digest(
        self, context: ExpressionContext, *, limit: int | None = None
    ) -> ExpressionDigest:
        if not self._expressions:
            raise RuntimeError("no expressions captured")

        highlight_limit = context.highlight_limit if limit is None else int(limit)
        if highlight_limit <= 0:
            raise ValueError("limit must be positive")

        emphasis = set(context.emphasis_tags)
        guardrails = set(context.guardrail_tags)

        evaluations: list[
            tuple[ExpressionElement, float, Mapping[str, float]]
        ] = []
        missing: dict[str, set[str]] = {}

        for element in self._expressions:
            try:
                value, env = element.evaluate_with_env(context.variables)
            except MissingVariablesError as error:
                missing[element.name] = set(error.missing)
                continue
            evaluations.append((element, value, env))

        if not evaluations:
            missing_summary = ", ".join(
                f"{name}: {', '.join(sorted(symbols))}"
                for name, symbols in sorted(missing.items())
            )
            raise RuntimeError(
                "unable to evaluate expressions; missing variables -> " + missing_summary
            )

        scored = sorted(
            evaluations,
            key=lambda item: self._score_element(item[0], emphasis, guardrails),
            reverse=True,
        )
        highlight_slice = scored[:highlight_limit]
        highlights = tuple(
            (element.name, _round_value(value, context.precision))
            for element, value, _ in highlight_slice
        )

        values = [value for _, value, _ in evaluations]
        mean_value = _round_value(fmean(values), context.precision)
        min_value = _round_value(min(values), context.precision)
        max_value = _round_value(max(values), context.precision)

        sensitivity_flags: list[str] = []
        if context.sensitivity > 0:
            for element, value, env in highlight_slice:
                flag = self._probe_sensitivity(
                    element, env, value, context.sensitivity
                )
                if flag:
                    sensitivity_flags.append(flag)

        missing_variables = sorted({symbol for symbols in missing.values() for symbol in symbols})

        narrative_parts = [
            f"Dynamic expression sweep for {context.scenario}.",
            f"Evaluated {len(evaluations)} expressions with highlight limit {highlight_limit}.",
            f"Mean value {mean_value:.{context.precision}f} (range {min_value:.{context.precision}f} to {max_value:.{context.precision}f}).",
        ]
        if missing_variables:
            narrative_parts.append(
                "Pending inputs: " + ", ".join(missing_variables) + "."
            )
        if sensitivity_flags:
            narrative_parts.append("Sensitivity alerts active.")
        if emphasis:
            narrative_parts.append(
                "Emphasis tags prioritised: " + ", ".join(sorted(emphasis)) + "."
            )
        if guardrails:
            narrative_parts.append(
                "Guardrail tags monitored: " + ", ".join(sorted(guardrails)) + "."
            )

        narrative = " ".join(narrative_parts)

        return ExpressionDigest(
            highlights=highlights,
            mean_value=mean_value,
            min_value=min_value,
            max_value=max_value,
            sensitivity_flags=tuple(sensitivity_flags),
            missing_variables=tuple(missing_variables),
            narrative=narrative,
        )
