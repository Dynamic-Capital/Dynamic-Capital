"""Dynamic validation engine with adaptive severity weighting."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from types import MappingProxyType
from typing import Any, Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "DynamicValidator",
    "ValidationContext",
    "ValidationIssue",
    "ValidationOutcome",
    "ValidationRule",
]

Payload = Mapping[str, object]
ValidationCallable = Callable[[Payload, "ValidationContext"], object]
GuardCallable = Callable[[Payload, "ValidationContext"], bool]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_identifier(value: str) -> str:
    cleaned = "-".join(value.strip().lower().split())
    if not cleaned:
        raise ValueError("identifier must not be empty")
    return cleaned


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    if isinstance(tags, str):
        iterable: Iterable[str] = [tags]
    else:
        iterable = tags
    seen: set[str] = set()
    normalised: list[str] = []
    for tag in iterable:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _ensure_mapping(mapping: Mapping[str, object] | None) -> MutableMapping[str, object]:
    if mapping is None:
        return {}
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _freeze_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object]:
    if not mapping:
        return MappingProxyType({})
    if isinstance(mapping, MappingProxyType):
        return mapping
    return MappingProxyType(dict(mapping))


def _normalise_overrides(overrides: Mapping[str, Any] | None) -> Mapping[str, float]:
    if not overrides:
        return MappingProxyType({})
    if not isinstance(overrides, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("overrides must be a mapping")
    normalised: dict[str, float] = {}
    for key, raw in overrides.items():
        name = _normalise_identifier(str(key))
        multiplier = max(float(raw), 0.0)
        normalised[name] = multiplier
    return MappingProxyType(normalised)


def _coerce_timestamp(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class ValidationRule:
    """Declarative rule applied to an input payload."""

    name: str
    description: str
    check: ValidationCallable
    severity: float = 0.5
    weight: float = 1.0
    tags: tuple[str, ...] = field(default_factory=tuple)
    guard: GuardCallable | None = None
    message: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(str(self.name))
        self.description = _normalise_text(str(self.description))
        if not callable(self.check):  # pragma: no cover - defensive guard
            raise TypeError("check must be callable")
        if self.guard is not None and not callable(self.guard):
            raise TypeError("guard must be callable")
        self.severity = _clamp01(float(self.severity))
        self.weight = max(float(self.weight), 0.0)
        self.tags = _normalise_tags(self.tags)
        self.message = _normalise_optional_text(self.message) or self.description
        self.metadata = _freeze_mapping(self.metadata)

    def applies(self, payload: Payload, context: "ValidationContext") -> bool:
        if self.guard is None:
            return True
        return bool(self.guard(payload, context))

    def evaluate(self, payload: Payload, context: "ValidationContext") -> "ValidationIssue" | None:
        result = self.check(payload, context)
        message = self.message
        extra_metadata: MutableMapping[str, object] | None = None
        passed: bool

        if isinstance(result, tuple):
            if not result:
                passed = True
            else:
                passed = bool(result[0])
                if len(result) > 1 and result[1] is not None:
                    override = _normalise_optional_text(str(result[1]))
                    if override:
                        message = override
                if len(result) > 2 and result[2] is not None:
                    extra_metadata = _ensure_mapping(result[2])
        else:
            passed = bool(result)

        if passed:
            return None

        metadata = _ensure_mapping(self.metadata)
        if extra_metadata:
            metadata.update(extra_metadata)

        return ValidationIssue(
            rule=self.name,
            message=message,
            severity=self.severity,
            weight=self.weight,
            tags=self.tags,
            metadata=_freeze_mapping(metadata),
        )


@dataclass(slots=True, frozen=True)
class ValidationIssue:
    """Represents a failed rule with impact scoring."""

    rule: str
    message: str
    severity: float
    weight: float
    tags: tuple[str, ...]
    metadata: Mapping[str, object]
    multiplier: float = 1.0

    def with_multiplier(self, multiplier: float) -> "ValidationIssue":
        return ValidationIssue(
            rule=self.rule,
            message=self.message,
            severity=self.severity,
            weight=self.weight,
            tags=self.tags,
            metadata=self.metadata,
            multiplier=max(float(multiplier), 0.0),
        )

    @property
    def impact(self) -> float:
        return self.severity * self.weight * self.multiplier

    @property
    def weighted_penalty(self) -> float:
        return self.weight * self.multiplier


@dataclass(slots=True)
class ValidationContext:
    """Contextual inputs that influence weighting and tolerance."""

    mission: str
    tolerance: float = 0.25
    focus_tags: tuple[str, ...] = field(default_factory=tuple)
    suppress_tags: tuple[str, ...] = field(default_factory=tuple)
    overrides: Mapping[str, float] = field(default_factory=dict)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.tolerance = max(float(self.tolerance), 0.0)
        self.focus_tags = _normalise_tags(self.focus_tags)
        self.suppress_tags = _normalise_tags(self.suppress_tags)
        self.overrides = _normalise_overrides(self.overrides)
        self.metadata = _freeze_mapping(self.metadata)

    def weight_multiplier(self, rule_name: str, tags: Sequence[str]) -> float:
        multiplier = self.overrides.get(rule_name, 1.0)
        if tags and self.focus_tags and any(tag in self.focus_tags for tag in tags):
            multiplier *= 1.3
        if tags and self.suppress_tags and any(tag in self.suppress_tags for tag in tags):
            multiplier *= 0.5
        return max(multiplier, 0.0)


@dataclass(slots=True, frozen=True)
class ValidationOutcome:
    """Evaluation output for a single payload."""

    passed: bool
    score: float
    issues: tuple[ValidationIssue, ...]
    evaluated_rules: int
    failing_severity: float
    timestamp: datetime
    metadata: Mapping[str, object]

    @property
    def failed_rules(self) -> int:
        return len(self.issues)


class DynamicValidator:
    """Adaptive validator that balances rule severity with mission context."""

    def __init__(
        self,
        rules: Iterable[ValidationRule | Mapping[str, Any]] | None = None,
        *,
        history_limit: int = 100,
    ) -> None:
        self._rules: list[ValidationRule] = []
        self._rule_index: dict[str, ValidationRule] = {}
        self._history: Deque[ValidationOutcome] = deque(maxlen=max(int(history_limit), 1))
        if rules:
            for definition in rules:
                self.add_rule(definition)

    @property
    def history(self) -> tuple[ValidationOutcome, ...]:
        return tuple(self._history)

    def add_rule(self, definition: ValidationRule | Mapping[str, Any]) -> ValidationRule:
        rule = self._coerce_rule(definition)
        existing = self._rule_index.get(rule.name)
        if existing is not None:
            index = self._rules.index(existing)
            self._rules[index] = rule
        else:
            self._rules.append(rule)
        self._rule_index[rule.name] = rule
        return rule

    def get_rule(self, name: str) -> ValidationRule:
        key = _normalise_identifier(name)
        try:
            return self._rule_index[key]
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise KeyError(f"unknown rule: {name}") from exc

    def evaluate(
        self,
        payload: Payload,
        context: ValidationContext,
        *,
        timestamp: datetime | None = None,
    ) -> ValidationOutcome:
        now = _coerce_timestamp(timestamp)
        issues: list[ValidationIssue] = []
        evaluated = 0
        effective_total = 0.0
        failing_weight = 0.0
        failing_severity = 0.0

        for rule in self._rules:
            if not rule.applies(payload, context):
                continue
            evaluated += 1
            multiplier = context.weight_multiplier(rule.name, rule.tags)
            effective_total += rule.weight * multiplier
            issue = rule.evaluate(payload, context)
            if issue is None:
                continue
            issue = issue.with_multiplier(multiplier)
            issues.append(issue)
            failing_weight += issue.weighted_penalty
            failing_severity += issue.impact

        issues.sort(key=lambda item: item.impact, reverse=True)

        if effective_total <= 0:
            score = 1.0
        else:
            score = max(0.0, min(1.0, (effective_total - failing_weight) / effective_total))

        passed = failing_severity <= context.tolerance

        outcome = ValidationOutcome(
            passed=passed,
            score=score,
            issues=tuple(issues),
            evaluated_rules=evaluated,
            failing_severity=failing_severity,
            timestamp=now,
            metadata=_freeze_mapping(
                {
                    "evaluated_rules": evaluated,
                    "failed_rules": len(issues),
                    "effective_total": effective_total,
                    "failing_weight": failing_weight,
                }
            ),
        )

        self._history.append(outcome)
        return outcome

    def _coerce_rule(self, definition: ValidationRule | Mapping[str, Any]) -> ValidationRule:
        if isinstance(definition, ValidationRule):
            return definition
        if not isinstance(definition, Mapping):  # pragma: no cover - defensive guard
            raise TypeError("rule definition must be a mapping or ValidationRule")

        candidate = dict(definition)
        check = candidate.get("check") or candidate.get("validator") or candidate.get("fn")
        if check is None:
            raise ValueError("rule definition requires a 'check' callable")

        name = candidate.get("name") or candidate.get("rule")
        if name is None:
            raise ValueError("rule definition requires a 'name'")

        description = candidate.get("description") or candidate.get("message")
        if description is None:
            raise ValueError("rule definition requires a 'description'")

        return ValidationRule(
            name=name,
            description=description,
            check=check,
            severity=candidate.get("severity", 0.5),
            weight=candidate.get("weight", 1.0),
            tags=candidate.get("tags"),
            guard=candidate.get("guard"),
            message=candidate.get("failure_message"),
            metadata=candidate.get("metadata"),
        )
