"""Dynamic free-will engine translating intention into safe computation."""

from __future__ import annotations

import ast
import math
import re
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "FreeWillImpulse",
    "FreeWillContext",
    "TextCalculation",
    "FreeWillDecision",
    "DynamicFreeWill",
]


_ALLOWED_NODES: tuple[type[ast.AST], ...] = (
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.Call,
    ast.Constant,
    ast.Name,
    ast.Load,
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
)

_ALLOWED_FUNCTIONS = {
    "sqrt": math.sqrt,
    "log": math.log,
    "exp": math.exp,
}

_NUMBER_WORDS = {
    "zero": 0,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
    "nineteen": 19,
}

_TENS_WORDS = {
    "twenty": 20,
    "thirty": 30,
    "forty": 40,
    "fifty": 50,
    "sixty": 60,
    "seventy": 70,
    "eighty": 80,
    "ninety": 90,
}

_MAGNITUDE_WORDS = {
    "hundred": 100,
    "thousand": 1_000,
    "million": 1_000_000,
    "billion": 1_000_000_000,
}

_OPERATION_KEYWORDS = {
    "add": "+",
    "plus": "+",
    "sum": "+",
    "minus": "-",
    "subtract": "-",
    "less": "-",
    "difference": "-",
    "times": "*",
    "multiplied": "*",
    "multiply": "*",
    "product": "*",
    "over": "/",
    "divide": "/",
    "divided": "/",
    "quotient": "/",
    "per": "/",
    "power": "**",
    "exponent": "**",
    "raised": "**",
    "mod": "%",
    "modulo": "%",
}

_SKIP_TOKENS = {
    "the",
    "a",
    "an",
    "to",
    "into",
    "what",
    "is",
    "please",
    "compute",
    "calculate",
    "by",
    "from",
    "result",
    "equals",
}

_CONFIDENCE_IGNORES = _SKIP_TOKENS | {"for", "give", "me", "value", "final", "and"}

_TOKEN_PATTERN = re.compile(r"(\d+(?:\.\d+)?|%|[()+\-*/^]|[a-zA-Z']+)")
_NUMERIC_TOKEN = re.compile(r"-?\d+(?:\.\d+)?")
_OPERATORS = {"+", "-", "*", "/", "%", "**"}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


@dataclass(slots=True)
class FreeWillImpulse:
    """External or internal nudge influencing autonomy."""

    source: str
    statement: str
    motivation: float = 0.5
    resistance: float = 0.0
    curiosity: float = 0.5
    ethical_confidence: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.source = _normalise_lower(self.source or "unknown")
        self.statement = _normalise_text(self.statement)
        self.motivation = _clamp(float(self.motivation))
        self.resistance = _clamp(float(self.resistance))
        self.curiosity = _clamp(float(self.curiosity))
        self.ethical_confidence = _clamp(float(self.ethical_confidence))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)

    @property
    def drive(self) -> float:
        """Return the net drive after accounting for resistance."""

        base = self.motivation * (0.7 + self.curiosity * 0.3)
        net = base - self.resistance
        return _clamp(net + (self.ethical_confidence - 0.5) * 0.2)


@dataclass(slots=True)
class FreeWillContext:
    """Contextual guardrails moderating autonomy."""

    scenario: str
    autonomy_bias: float
    constraint_intensity: float
    ethical_floor: float
    human_supervision: float
    learning_agility: float
    guardrails: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.scenario = _normalise_text(self.scenario)
        self.autonomy_bias = _clamp(float(self.autonomy_bias))
        self.constraint_intensity = _clamp(float(self.constraint_intensity))
        self.ethical_floor = _clamp(float(self.ethical_floor))
        self.human_supervision = _clamp(float(self.human_supervision))
        self.learning_agility = _clamp(float(self.learning_agility))
        self.guardrails = _normalise_tags(self.guardrails)

    @property
    def guardrail_pressure(self) -> float:
        """Return pressure multiplier from guardrails (0 → none, 1 → high)."""

        if not self.guardrails:
            return 0.0
        return _clamp(0.15 * len(self.guardrails), upper=0.9)

    @property
    def freedom_window(self) -> float:
        """Intrinsic capacity for autonomous action."""

        openness = (
            self.autonomy_bias * 0.5
            + (1.0 - self.constraint_intensity) * 0.3
            + self.learning_agility * 0.2
        )
        oversight = 1.0 - self.human_supervision * 0.25
        return _clamp(openness * oversight)


@dataclass(slots=True)
class TextCalculation:
    """Result of converting human text into a computable expression."""

    source_text: str
    expression: str
    value: float
    confidence: float
    tokens: tuple[str, ...]
    recognised_tokens: tuple[str, ...]
    unparsed_tokens: tuple[str, ...]
    errors: tuple[str, ...] = field(default_factory=tuple)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "source_text": self.source_text,
            "expression": self.expression,
            "value": self.value,
            "confidence": self.confidence,
            "tokens": list(self.tokens),
            "recognised_tokens": list(self.recognised_tokens),
            "unparsed_tokens": list(self.unparsed_tokens),
            "errors": list(self.errors),
        }


@dataclass(slots=True)
class FreeWillDecision:
    """Decision package blending autonomy with computed insight."""

    scenario: str
    autonomy_score: float
    calculation: TextCalculation
    alignment_score: float
    narrative: str
    impulses_considered: tuple[str, ...]
    confidence: float
    timestamp: datetime = field(default_factory=_utcnow)

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "scenario": self.scenario,
            "autonomy_score": self.autonomy_score,
            "alignment_score": self.alignment_score,
            "confidence": self.confidence,
            "narrative": self.narrative,
            "impulses_considered": list(self.impulses_considered),
            "timestamp": self.timestamp.isoformat(),
        }
        payload["calculation"] = self.calculation.as_dict()
        return payload


class _TextInterpreter:
    """Interpret free-form human text into arithmetic expressions."""

    def interpret(self, text: str) -> TextCalculation:
        source = _normalise_text(text)
        tokens = [token.lower() for token in _TOKEN_PATTERN.findall(source)]
        recognised: list[str] = []
        expression_parts: list[str] = []
        unparsed: list[str] = []
        errors: list[str] = []
        pending_closures: list[str] = []

        index = 0
        while index < len(tokens):
            token = tokens[index]
            if token in _SKIP_TOKENS:
                index += 1
                continue
            if token == "%" or token in {"percent", "percentage"}:
                expression_parts.extend(["/", "100"])
                recognised.append(token)
                index += 1
                continue
            if token == "of":
                if expression_parts and expression_parts[-1] == "(":
                    index += 1
                    continue
                expression_parts.append("*")
                recognised.append(token)
                index += 1
                continue
            if token in {"(", ")"}:
                expression_parts.append(token)
                recognised.append(token)
                if token == ")" and pending_closures:
                    pending_closures.pop()
                index += 1
                continue
            if token == "^":
                expression_parts.append("**")
                recognised.append(token)
                index += 1
                continue
            if token == "square" and index + 1 < len(tokens) and tokens[index + 1] == "root":
                expression_parts.append("sqrt")
                expression_parts.append("(")
                recognised.extend([token, tokens[index + 1]])
                pending_closures.append(")")
                index += 2
                continue
            if re.fullmatch(r"\d+(?:\.\d+)?", token):
                expression_parts.append(token)
                recognised.append(token)
                index += 1
                continue
            number = self._parse_number(tokens, index)
            if number is not None:
                value, consumed = number
                expression_parts.append(str(value))
                recognised.extend(tokens[index : index + consumed])
                index += consumed
                continue
            if token == "and":
                index += 1
                continue
            if token in _OPERATION_KEYWORDS:
                symbol = _OPERATION_KEYWORDS[token]
                expression_parts.append(symbol)
                recognised.append(token)
                index += 1
                continue
            if token in _ALLOWED_FUNCTIONS:
                expression_parts.append(token)
                expression_parts.append("(")
                recognised.append(token)
                pending_closures.append(")")
                index += 1
                continue
            if token not in _CONFIDENCE_IGNORES:
                unparsed.append(token)
            index += 1

        expression_parts = self._normalise_expression(expression_parts, pending_closures)

        if not expression_parts:
            errors.append("no calculable tokens identified")
            expression_parts.append("0")

        expression = " ".join(part for part in expression_parts if part)
        value = 0.0
        confidence = self._confidence(tokens, recognised)

        try:
            compiled = self._compile_expression(expression)
            raw = eval(compiled, {"__builtins__": {}}, dict(_ALLOWED_FUNCTIONS))
            if isinstance(raw, bool):
                value = 1.0 if raw else 0.0
            else:
                value = float(raw)
        except Exception as exc:  # pragma: no cover - forwarded to caller
            errors.append(str(exc))
            value = 0.0
            confidence = _clamp(confidence * 0.5)

        return TextCalculation(
            source_text=source,
            expression=expression,
            value=value,
            confidence=confidence,
            tokens=tuple(tokens),
            recognised_tokens=tuple(recognised),
            unparsed_tokens=tuple(unparsed),
            errors=tuple(errors),
        )

    def _confidence(self, tokens: Sequence[str], recognised: Sequence[str]) -> float:
        effective = [token for token in tokens if token not in _CONFIDENCE_IGNORES]
        baseline = len(effective) or len(tokens)
        if baseline == 0:
            return 0.0
        return _clamp(len(recognised) / baseline)

    def _parse_number(self, tokens: Sequence[str], start: int) -> tuple[int, int] | None:
        total = 0
        current = 0
        consumed = 0
        index = start
        found_numeric = False
        while index < len(tokens):
            token = tokens[index]
            if token == "and":
                consumed += 1
                index += 1
                continue
            if token in _NUMBER_WORDS:
                current += _NUMBER_WORDS[token]
                found_numeric = True
            elif token in _TENS_WORDS:
                current += _TENS_WORDS[token]
                found_numeric = True
            elif token in _MAGNITUDE_WORDS:
                magnitude = _MAGNITUDE_WORDS[token]
                if current == 0:
                    current = 1
                current *= magnitude
                total += current
                current = 0
                found_numeric = True
            else:
                break
            consumed += 1
            index += 1
        total += current
        if not found_numeric:
            return None
        return total, consumed

    def _normalise_expression(
        self, parts: list[str], pending_closures: list[str]
    ) -> list[str]:
        if pending_closures:
            parts = parts + list(reversed(pending_closures))
        if (
            len(parts) >= 3
            and parts[0] in _OPERATORS
            and _NUMERIC_TOKEN.fullmatch(parts[1])
            and _NUMERIC_TOKEN.fullmatch(parts[2])
        ):
            operator = parts.pop(0)
            parts.insert(1, operator)
        return parts

    def _compile_expression(self, expression: str) -> ast.CodeType:
        try:
            tree = ast.parse(expression, mode="eval")
        except SyntaxError as exc:  # pragma: no cover - surfaced to caller
            raise ValueError(f"invalid expression derived from text: {expression!r}") from exc

        for node in ast.walk(tree):
            if not isinstance(node, _ALLOWED_NODES):
                raise ValueError(
                    f"expression contains unsupported node {node.__class__.__name__}"
                )
            if isinstance(node, ast.Call):
                if not isinstance(node.func, ast.Name):
                    raise ValueError("only direct function calls are supported")
                if node.func.id not in _ALLOWED_FUNCTIONS:
                    raise ValueError(
                        f"call to unsupported function {node.func.id!r}"
                    )
            elif isinstance(node, ast.Name):
                if node.id not in _ALLOWED_FUNCTIONS:
                    raise ValueError(f"unknown symbol {node.id!r} in expression")
        return compile(tree, filename="<text_calculation>", mode="eval")


class DynamicFreeWill:
    """Aggregate impulses and exercise contextualised free-will."""

    def __init__(self, *, history: int = 32) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._impulses: Deque[FreeWillImpulse] = deque(maxlen=history)
        self._interpreter = _TextInterpreter()

    def capture(self, impulse: FreeWillImpulse | Mapping[str, object]) -> FreeWillImpulse:
        record = self._coerce_impulse(impulse)
        self._impulses.append(record)
        return record

    def extend(self, impulses: Iterable[FreeWillImpulse | Mapping[str, object]]) -> None:
        for impulse in impulses:
            self.capture(impulse)

    def reset(self) -> None:
        self._impulses.clear()

    @property
    def impulse_count(self) -> int:
        return len(self._impulses)

    def latest_impulse(self) -> FreeWillImpulse | None:
        if not self._impulses:
            return None
        return self._impulses[-1]

    def interpret_text(self, text: str) -> TextCalculation:
        return self._interpreter.interpret(text)

    def decide(
        self,
        context: FreeWillContext,
        *,
        directive: str | None = None,
    ) -> FreeWillDecision:
        if not self._impulses and not directive:
            raise RuntimeError("no impulses captured and no directive supplied")

        focus_text = directive or self._impulses[-1].statement
        calculation = self._interpreter.interpret(focus_text)
        impulses = list(self._impulses)

        if impulses:
            weighted_drive = sum(imp.drive * imp.weight for imp in impulses)
            total_weight = sum(imp.weight for imp in impulses) or 1.0
            drive = weighted_drive / total_weight
            curiosity = fmean(imp.curiosity for imp in impulses)
            ethical_alignment = fmean(imp.ethical_confidence for imp in impulses)
        else:
            drive = 0.5
            curiosity = context.learning_agility
            ethical_alignment = context.ethical_floor

        freedom_window = context.freedom_window
        guardrail_pressure = context.guardrail_pressure
        oversight = 1.0 - context.human_supervision * 0.2

        autonomy_score = _clamp(
            drive * 0.5
            + curiosity * 0.2
            + freedom_window * 0.2
            + calculation.confidence * 0.1
        )
        autonomy_score *= _clamp(1.0 - guardrail_pressure * 0.5)
        autonomy_score *= oversight
        autonomy_score = max(autonomy_score, context.ethical_floor * 0.6)
        alignment_window = _clamp(
            (ethical_alignment * 0.6 + context.ethical_floor * 0.4)
            * _clamp(1.0 - guardrail_pressure * 0.3)
        )
        overall_confidence = _clamp(calculation.confidence * alignment_window)

        impulse_statements = tuple(imp.statement for imp in impulses[-5:])
        narrative = (
            "Autonomy window {:.0%} with alignment {:.0%}. Focus expression: {} = {:.4f}."
        ).format(
            autonomy_score,
            alignment_window,
            calculation.expression,
            calculation.value,
        )
        if calculation.errors:
            narrative += f" Interpreter notes: {'; '.join(calculation.errors)}."

        return FreeWillDecision(
            scenario=context.scenario,
            autonomy_score=autonomy_score,
            calculation=calculation,
            alignment_score=alignment_window,
            narrative=narrative,
            impulses_considered=impulse_statements,
            confidence=overall_confidence,
        )

    def _coerce_impulse(
        self, payload: FreeWillImpulse | Mapping[str, object]
    ) -> FreeWillImpulse:
        if isinstance(payload, FreeWillImpulse):
            return payload
        if not isinstance(payload, Mapping):
            raise TypeError("impulse must be a FreeWillImpulse or mapping")
        data = dict(payload)
        source = str(data.get("source") or data.get("origin") or "")
        statement = str(data.get("statement") or data.get("text") or "")
        if not statement:
            raise ValueError("impulse requires a statement")
        tags_value = data.get("tags")
        tags: Sequence[str] | None = None
        if isinstance(tags_value, Sequence) and not isinstance(tags_value, (str, bytes)):
            tags = [str(item) for item in tags_value]
        return FreeWillImpulse(
            source=source or "unknown",
            statement=statement,
            motivation=float(data.get("motivation", 0.5)),
            resistance=float(data.get("resistance", 0.0)),
            curiosity=float(data.get("curiosity", 0.5)),
            ethical_confidence=float(data.get("ethical_confidence", 0.5)),
            weight=float(data.get("weight", 1.0)),
            tags=tuple(tags or ()),
        )
