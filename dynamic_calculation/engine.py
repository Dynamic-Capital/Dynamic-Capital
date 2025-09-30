"""Adaptive calculation engine for orchestrating strategic metrics."""

from __future__ import annotations

import ast
import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from math import isfinite
from types import CodeType, MappingProxyType
from typing import Callable, Dict, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "CalculationSignal",
    "CalculationFormula",
    "CalculationResult",
    "DynamicCalculationEngine",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_float(value: object, *, name: str) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError(f"{name} must be a real number") from exc
    if not isfinite(number):
        raise ValueError(f"{name} must be finite")
    return number


def _normalise_identifier(value: str, *, name: str) -> str:
    if not isinstance(value, str):  # pragma: no cover - defensive guard
        raise TypeError(f"{name} must be a string")
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{name} must not be empty")
    if not cleaned.replace("_", "").replace("-", "").isalnum():
        raise ValueError(f"{name} must contain only alphanumeric characters, hyphens, or underscores")
    return cleaned.replace("-", "_").lower()


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


_SAFE_FUNCTIONS: Dict[str, Callable[..., float]] = {
    name: getattr(math, name)
    for name in (
        "fabs",
        "sqrt",
        "log",
        "log10",
        "log2",
        "exp",
        "sin",
        "cos",
        "tan",
        "asin",
        "acos",
        "atan",
        "atan2",
        "sinh",
        "cosh",
        "tanh",
        "asinh",
        "acosh",
        "atanh",
        "floor",
        "ceil",
        "trunc",
        "copysign",
        "hypot",
        "fsum",
        "prod",
    )
    if hasattr(math, name)
}
_SAFE_CONSTANTS: Dict[str, float] = {
    "pi": math.pi,
    "tau": math.tau,
    "e": math.e,
    "phi": (1 + math.sqrt(5)) / 2,
}
_SAFE_HELPERS: Dict[str, Callable[..., float]] = {
    "abs": abs,
    "min": min,
    "max": max,
    "round": round,
}
_SAFE_GLOBALS: Dict[str, object] = {
    **_SAFE_FUNCTIONS,
    **_SAFE_CONSTANTS,
    **_SAFE_HELPERS,
}
_ALLOWED_NODE_TYPES: tuple[type[ast.AST], ...] = (
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.BoolOp,
    ast.Compare,
    ast.IfExp,
    ast.Call,
    ast.Name,
    ast.Constant,
    ast.Tuple,
)
_ALLOWED_BINOP_TYPES = (
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.FloorDiv,
    ast.Mod,
    ast.Pow,
)
_ALLOWED_UNARYOP_TYPES = (ast.UAdd, ast.USub, ast.Not)
_ALLOWED_CMPOP_TYPES = (
    ast.Eq,
    ast.NotEq,
    ast.Lt,
    ast.LtE,
    ast.Gt,
    ast.GtE,
)
_ALLOWED_BOOLOP_TYPES = (ast.And, ast.Or)


class _ExpressionValidator(ast.NodeVisitor):
    """AST validator ensuring only safe constructs are present."""

    def __init__(self) -> None:
        self.names: set[str] = set()

    def visit(self, node: ast.AST) -> None:  # type: ignore[override]
        if not isinstance(node, _ALLOWED_NODE_TYPES):  # pragma: no cover - defensive guard
            raise ValueError(f"unsupported expression node: {node.__class__.__name__}")
        super().visit(node)

    def visit_BinOp(self, node: ast.BinOp) -> None:
        if not isinstance(node.op, _ALLOWED_BINOP_TYPES):
            raise ValueError(f"binary operator {node.op.__class__.__name__} is not permitted")
        self.generic_visit(node)

    def visit_UnaryOp(self, node: ast.UnaryOp) -> None:
        if not isinstance(node.op, _ALLOWED_UNARYOP_TYPES):
            raise ValueError(f"unary operator {node.op.__class__.__name__} is not permitted")
        self.generic_visit(node)

    def visit_BoolOp(self, node: ast.BoolOp) -> None:
        if not isinstance(node.op, _ALLOWED_BOOLOP_TYPES):
            raise ValueError(f"boolean operator {node.op.__class__.__name__} is not permitted")
        self.generic_visit(node)

    def visit_Compare(self, node: ast.Compare) -> None:
        for operator in node.ops:
            if not isinstance(operator, _ALLOWED_CMPOP_TYPES):
                raise ValueError(f"comparison operator {operator.__class__.__name__} is not permitted")
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        if not isinstance(node.func, ast.Name):
            raise ValueError("only direct function calls are permitted")
        if node.func.id not in _SAFE_GLOBALS:
            raise ValueError(f"function {node.func.id!r} is not allowed")
        if node.keywords:
            raise ValueError("keyword arguments are not supported in expressions")
        self.generic_visit(node)

    def visit_Name(self, node: ast.Name) -> None:
        self.names.add(node.id)

    def visit_Tuple(self, node: ast.Tuple) -> None:
        if any(isinstance(elt, ast.Starred) for elt in node.elts):
            raise ValueError("starred expressions are not supported in tuples")
        self.generic_visit(node)


def _compile_expression(expression: str) -> tuple[CodeType, tuple[str, ...]]:
    try:
        parsed = ast.parse(expression, mode="eval")
    except SyntaxError as exc:  # pragma: no cover - defensive guard
        raise ValueError("expression contains invalid syntax") from exc
    validator = _ExpressionValidator()
    validator.visit(parsed)
    variable_names = tuple(
        sorted(name for name in validator.names if name not in _SAFE_GLOBALS)
    )
    code = compile(parsed, "<calculation>", "eval")
    return code, variable_names


@dataclass(slots=True)
class CalculationSignal:
    """Discrete input feeding the calculation engine."""

    name: str
    value: float
    weight: float = 1.0
    description: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name, name="name")
        self.value = _coerce_float(self.value, name="value")
        self.weight = max(_coerce_float(self.weight, name="weight"), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.description = _normalise_optional_text(self.description)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)

    @property
    def weighted_value(self) -> float:
        return self.value * self.weight

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "value": self.value,
            "weight": self.weight,
            "description": self.description,
            "tags": list(self.tags),
            "metadata": dict(self.metadata) if self.metadata is not None else None,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass(slots=True)
class CalculationFormula:
    """Declarative formula defining a derived metric."""

    name: str
    expression: str
    description: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None
    _code: CodeType = field(init=False, repr=False)
    _variables: tuple[str, ...] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name, name="name")
        if not isinstance(self.expression, str):  # pragma: no cover - defensive guard
            raise TypeError("expression must be a string")
        expression = self.expression.strip()
        if not expression:
            raise ValueError("expression must not be empty")
        self.expression = expression
        self.description = _normalise_optional_text(self.description)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)
        self._code, self._variables = _compile_expression(self.expression)

    @property
    def variables(self) -> tuple[str, ...]:
        return self._variables

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "expression": self.expression,
            "description": self.description,
            "tags": list(self.tags),
            "variables": list(self.variables),
            "metadata": dict(self.metadata) if self.metadata is not None else None,
        }


@dataclass(slots=True)
class CalculationResult:
    """Resolved output for a formula evaluation."""

    name: str
    expression: str
    value: float
    variables: Mapping[str, float]
    weighted_contributions: Mapping[str, float]
    missing_variables: tuple[str, ...]
    metadata: Mapping[str, object] | None = None

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "expression": self.expression,
            "value": self.value,
            "variables": dict(self.variables),
            "weighted_contributions": dict(self.weighted_contributions),
            "missing_variables": list(self.missing_variables),
            "metadata": dict(self.metadata) if self.metadata is not None else None,
        }


class DynamicCalculationEngine:
    """Manage signals and synthesise derived metrics from declarative formulas."""

    def __init__(
        self,
        *,
        allow_partial: bool = False,
        functions: Mapping[str, Callable[..., float]] | None = None,
    ) -> None:
        self.allow_partial = bool(allow_partial)
        registry: Dict[str, object] = dict(_SAFE_GLOBALS)
        if functions:
            for name, func in functions.items():
                identifier = _normalise_identifier(name, name="function name")
                if not callable(func):  # pragma: no cover - defensive guard
                    raise TypeError(f"function {name!r} must be callable")
                registry[identifier] = func
        self._functions = MappingProxyType(registry)
        self._signals: Dict[str, CalculationSignal] = {}
        self._formulas: Dict[str, CalculationFormula] = {}

    @property
    def signals(self) -> Mapping[str, CalculationSignal]:
        return MappingProxyType(self._signals)

    @property
    def formulas(self) -> Mapping[str, CalculationFormula]:
        return MappingProxyType(self._formulas)

    def register(self, signal: CalculationSignal) -> None:
        self._signals[signal.name] = signal

    def register_many(self, signals: Iterable[CalculationSignal]) -> None:
        for signal in signals:
            self.register(signal)

    def forget(self, name: str) -> None:
        identifier = _normalise_identifier(name, name="name")
        self._signals.pop(identifier, None)

    def define(self, formula: CalculationFormula) -> None:
        self._formulas[formula.name] = formula

    def define_many(self, formulas: Iterable[CalculationFormula]) -> None:
        for formula in formulas:
            self.define(formula)

    def retract(self, name: str) -> None:
        identifier = _normalise_identifier(name, name="name")
        self._formulas.pop(identifier, None)

    def evaluate(
        self,
        name: str,
        *,
        overrides: Mapping[str, float] | None = None,
    ) -> CalculationResult:
        identifier = _normalise_identifier(name, name="name")
        formula = self._formulas.get(identifier)
        if formula is None:
            raise KeyError(f"formula {identifier!r} is not registered")
        resolved_values: Dict[str, float] = {
            signal_name: signal.value for signal_name, signal in self._signals.items()
        }
        weights: Dict[str, float] = {
            signal_name: signal.weight for signal_name, signal in self._signals.items()
        }
        if overrides:
            for key, value in overrides.items():
                override_name = _normalise_identifier(key, name="override name")
                resolved_values[override_name] = _coerce_float(value, name=f"override {key}")
                if override_name not in weights:
                    weights[override_name] = 1.0
        missing: list[str] = []
        for variable in formula.variables:
            if variable not in resolved_values:
                if self.allow_partial:
                    resolved_values.setdefault(variable, 0.0)
                    weights.setdefault(variable, 0.0)
                    missing.append(variable)
                else:
                    raise KeyError(f"variable {variable!r} is missing for formula {formula.name!r}")
        context: Dict[str, object] = dict(self._functions)
        context.update(resolved_values)
        value = eval(formula._code, {"__builtins__": {}}, context)
        numeric = _coerce_float(value, name=f"result of {formula.name}")
        variables_snapshot = {
            variable: resolved_values[variable]
            for variable in formula.variables
            if variable in resolved_values
        }
        weighted_snapshot = {
            variable: variables_snapshot.get(variable, 0.0) * weights.get(variable, 0.0)
            for variable in formula.variables
            if variable in resolved_values
        }
        return CalculationResult(
            name=formula.name,
            expression=formula.expression,
            value=numeric,
            variables=MappingProxyType(variables_snapshot),
            weighted_contributions=MappingProxyType(weighted_snapshot),
            missing_variables=tuple(sorted(missing)),
            metadata=formula.metadata,
        )

    def evaluate_all(self, *, overrides: Mapping[str, float] | None = None) -> tuple[CalculationResult, ...]:
        results: list[CalculationResult] = []
        for name in sorted(self._formulas):
            results.append(self.evaluate(name, overrides=overrides))
        return tuple(results)

