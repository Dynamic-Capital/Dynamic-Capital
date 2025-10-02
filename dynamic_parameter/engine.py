"""Dynamic parameter orchestration engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ParameterSpec",
    "ParameterState",
    "ParameterChange",
    "ParameterSnapshot",
    "ParameterScenario",
    "ParameterScenarioResult",
    "DynamicParameterEngine",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_text(value: str, *, allow_empty: bool = False) -> str:
    text = (value or "").strip()
    if text:
        return text
    if allow_empty:
        return ""
    raise ValueError("value must not be empty")


def _normalise_name(value: str) -> str:
    return _normalise_text(value).lower().replace(" ", "_")


def _coerce_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for raw in tags:
        candidate = raw.strip().lower()
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        ordered.append(candidate)
    return tuple(ordered)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _cast_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        text = value.strip().lower()
        if text in {"true", "1", "yes", "y", "on"}:
            return True
        if text in {"false", "0", "no", "n", "off"}:
            return False
    raise ValueError("expected boolean-like value")


def _cast_int(value: object) -> int:
    if isinstance(value, bool):
        raise TypeError("bool is not a valid integer value")
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if value.is_integer():
            return int(value)
        raise ValueError("floating point value must be integral for int parameters")
    text = str(value).strip()
    if not text:
        raise ValueError("value must not be empty")
    float_value = float(text)
    if not float_value.is_integer():
        raise ValueError("value must represent an integer")
    return int(float_value)


def _cast_float(value: object) -> float:
    if isinstance(value, bool):
        raise TypeError("bool is not a valid float value")
    try:
        return float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise ValueError("value must be convertible to float") from exc


def _cast_string(value: object, *, allow_empty: bool) -> str:
    if isinstance(value, str):
        return _normalise_text(value, allow_empty=allow_empty)
    return _normalise_text(str(value), allow_empty=allow_empty)


@dataclass(slots=True)
class ParameterSpec:
    """Schema definition for an engine-managed parameter."""

    name: str
    description: str
    value_type: str
    default: object | None = None
    required: bool = False
    min_value: float | None = None
    max_value: float | None = None
    choices: Sequence[object] | None = None
    allow_empty: bool = False
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.description = _normalise_text(self.description)
        self.value_type = _normalise_text(self.value_type).lower()
        if self.value_type not in {"string", "int", "float", "bool"}:
            raise ValueError("value_type must be one of 'string', 'int', 'float', 'bool'")
        self.tags = _coerce_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)
        if self.min_value is not None:
            self.min_value = float(self.min_value)
        if self.max_value is not None:
            self.max_value = float(self.max_value)
        if (
            self.min_value is not None
            and self.max_value is not None
            and self.min_value > self.max_value
        ):
            raise ValueError("min_value must not exceed max_value")
        if self.default is not None:
            default, warnings = self._coerce_value(self.default, allow_none=False)
            if warnings:
                raise ValueError(
                    "default value triggers validation warnings; adjust specification"
                )
            self.default = default
        if self.choices:
            normalised: list[object] = []
            for choice in self.choices:
                coerced, warnings = self._coerce_value(choice, allow_none=False)
                if warnings:
                    raise ValueError("choice values must not trigger validation warnings")
                normalised.append(coerced)
            # Preserve ordering but remove duplicates.
            seen: set[object] = set()
            deduped: list[object] = []
            for choice in normalised:
                if choice in seen:
                    continue
                seen.add(choice)
                deduped.append(choice)
            self.choices = tuple(deduped)
            if self.default is not None and self.default not in self.choices:
                raise ValueError("default value must be part of the allowed choices")
        else:
            self.choices = None

    def _coerce_value(
        self, value: object | None, *, allow_none: bool
    ) -> tuple[object | None, tuple[str, ...]]:
        if value is None:
            if allow_none:
                return None, ()
            if self.required:
                raise ValueError(f"parameter '{self.name}' requires a value")
            return None, ()

        try:
            if self.value_type == "string":
                coerced = _cast_string(value, allow_empty=self.allow_empty)
            elif self.value_type == "int":
                coerced = _cast_int(value)
            elif self.value_type == "float":
                coerced = _cast_float(value)
            elif self.value_type == "bool":
                coerced = _cast_bool(value)
            else:  # pragma: no cover - defensive
                raise ValueError("unsupported value type")
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"parameter '{self.name}' expects a {self.value_type} value"
            ) from exc

        warnings: list[str] = []

        if self.choices is not None and coerced not in self.choices:
            allowed = ", ".join(map(str, self.choices))
            raise ValueError(
                f"parameter '{self.name}' must be one of: {allowed}"
            )

        if isinstance(coerced, (int, float)) and (
            self.min_value is not None or self.max_value is not None
        ):
            numeric = float(coerced)
            if self.min_value is not None and numeric < self.min_value:
                warnings.append(
                    f"parameter '{self.name}' below minimum {self.min_value}; clamped"
                )
                numeric = self.min_value
            if self.max_value is not None and numeric > self.max_value:
                warnings.append(
                    f"parameter '{self.name}' above maximum {self.max_value}; clamped"
                )
            if self.value_type == "int":
                coerced = int(round(numeric))
            else:
                coerced = numeric

        return coerced, tuple(warnings)

    def normalise(self, value: object | None) -> tuple[object | None, tuple[str, ...]]:
        try:
            coerced, warnings = self._coerce_value(
                value, allow_none=not self.required
            )
        except ValueError as exc:
            if self.default is not None:
                return self.default, (
                    f"parameter '{self.name}' invalid ({exc}); default applied",
                )
            raise

        if coerced is None and self.default is not None:
            return self.default, warnings + (
                f"parameter '{self.name}' missing; default applied",
            )
        return coerced, warnings

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "name": self.name,
            "description": self.description,
            "type": self.value_type,
            "required": self.required,
            "allow_empty": self.allow_empty,
            "tags": list(self.tags),
        }
        if self.default is not None:
            payload["default"] = self.default
        if self.min_value is not None:
            payload["min"] = self.min_value
        if self.max_value is not None:
            payload["max"] = self.max_value
        if self.choices is not None:
            payload["choices"] = list(self.choices)
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class ParameterState:
    """Current value tracked by the engine."""

    name: str
    value: object | None
    source: str
    updated_at: datetime
    notes: str | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.source = _normalise_text(self.source)
        if self.notes is not None:
            self.notes = _normalise_text(self.notes, allow_empty=True)
        if self.updated_at.tzinfo is None:
            self.updated_at = self.updated_at.replace(tzinfo=timezone.utc)
        else:
            self.updated_at = self.updated_at.astimezone(timezone.utc)

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "name": self.name,
            "value": self.value,
            "source": self.source,
            "updated_at": self.updated_at.isoformat(),
        }
        if self.notes:
            payload["notes"] = self.notes
        return payload


@dataclass(slots=True)
class ParameterChange:
    """Diff between the previous and current value for a parameter."""

    name: str
    previous: object | None
    current: object | None
    source: str
    notes: str | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.source = _normalise_text(self.source)
        if self.notes is not None:
            self.notes = _normalise_text(self.notes, allow_empty=True)

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "name": self.name,
            "previous": self.previous,
            "current": self.current,
            "source": self.source,
        }
        if self.notes:
            payload["notes"] = self.notes
        return payload


@dataclass(slots=True)
class ParameterSnapshot:
    """Snapshot of the engine state after an update cycle."""

    timestamp: datetime
    values: tuple[ParameterState, ...]
    changes: tuple[ParameterChange, ...]
    warnings: tuple[str, ...]
    missing: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "values": [state.as_dict() for state in self.values],
            "changes": [change.as_dict() for change in self.changes],
            "warnings": list(self.warnings),
            "missing": list(self.missing),
        }


@dataclass(slots=True)
class ParameterScenario:
    """Hypothetical set of overrides evaluated against the engine state."""

    name: str
    description: str
    overrides: Mapping[str, object]
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.description = _normalise_text(self.description)
        normalised: Dict[str, object] = {}
        for key, value in self.overrides.items():
            normalised[_normalise_name(key)] = value
        self.overrides = normalised
        self.tags = _coerce_tags(self.tags)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "description": self.description,
            "overrides": dict(self.overrides),
            "tags": list(self.tags),
        }


@dataclass(slots=True)
class ParameterScenarioResult:
    """Outcome of scenario evaluation."""

    scenario: ParameterScenario
    resolved_values: Mapping[str, object | None]
    changes: tuple[ParameterChange, ...]
    warnings: tuple[str, ...]
    missing: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "scenario": self.scenario.as_dict(),
            "resolved_values": dict(self.resolved_values),
            "changes": [change.as_dict() for change in self.changes],
            "warnings": list(self.warnings),
            "missing": list(self.missing),
        }


class DynamicParameterEngine:
    """Coordinator responsible for parameter specifications and runtime state."""

    def __init__(
        self,
        specs: Iterable[ParameterSpec] | None = None,
        baseline: Mapping[str, object] | None = None,
    ) -> None:
        self._specs: Dict[str, ParameterSpec] = {}
        self._states: Dict[str, ParameterState] = {}
        if specs is not None:
            for spec in specs:
                self.register_spec(spec)
        self._initialise_defaults()
        if baseline:
            self.apply_updates(baseline, source="baseline", notes="initial load")

    def register_spec(self, spec: ParameterSpec) -> None:
        if spec.name in self._specs:
            raise ValueError(f"parameter '{spec.name}' already registered")
        self._specs[spec.name] = spec

    def _initialise_defaults(self) -> None:
        timestamp = _utcnow()
        for spec in self._specs.values():
            if spec.default is not None and spec.name not in self._states:
                self._states[spec.name] = ParameterState(
                    name=spec.name,
                    value=spec.default,
                    source="default",
                    updated_at=timestamp,
                    notes="default value",
                )

    def specs(self) -> tuple[ParameterSpec, ...]:
        return tuple(self._specs.values())

    def state(self) -> Mapping[str, ParameterState]:
        return dict(self._states)

    def get(self, name: str) -> ParameterState | None:
        return self._states.get(_normalise_name(name))

    def apply_updates(
        self,
        updates: Mapping[str, object | None],
        *,
        source: str,
        notes: str | None = None,
    ) -> ParameterSnapshot:
        timestamp = _utcnow()
        changes: list[ParameterChange] = []
        warnings: list[str] = []
        normalised_notes = _normalise_text(notes, allow_empty=True) if notes else None
        for raw_name, raw_value in updates.items():
            name = _normalise_name(raw_name)
            spec = self._specs.get(name)
            if spec is None:
                warnings.append(f"unknown parameter '{name}' ignored")
                continue
            try:
                value, spec_warnings = spec.normalise(raw_value)
            except ValueError as exc:
                warnings.append(str(exc))
                continue
            for warning in spec_warnings:
                warnings.append(warning)
            previous_state = self._states.get(name)
            previous_value = previous_state.value if previous_state else None
            if previous_state is None or previous_value != value:
                change = ParameterChange(
                    name=name,
                    previous=previous_value,
                    current=value,
                    source=source,
                    notes=normalised_notes,
                )
                changes.append(change)
                self._states[name] = ParameterState(
                    name=name,
                    value=value,
                    source=source,
                    updated_at=timestamp,
                    notes=normalised_notes,
                )
            else:
                # Touch timestamp/source even if value unchanged for traceability.
                self._states[name] = ParameterState(
                    name=name,
                    value=value,
                    source=source,
                    updated_at=timestamp,
                    notes=normalised_notes,
                )
        missing = tuple(
            sorted(
                spec.name
                for spec in self._specs.values()
                if spec.required and spec.name not in self._states
            )
        )
        ordered_values = tuple(
            self._states[name]
            for name in sorted(self._states.keys())
        )
        return ParameterSnapshot(
            timestamp=timestamp,
            values=ordered_values,
            changes=tuple(changes),
            warnings=tuple(warnings),
            missing=missing,
        )

    def evaluate_scenario(self, scenario: ParameterScenario) -> ParameterScenarioResult:
        resolved: Dict[str, object | None] = {
            name: state.value for name, state in self._states.items()
        }
        changes: list[ParameterChange] = []
        warnings: list[str] = []

        for name, value in scenario.overrides.items():
            spec = self._specs.get(name)
            if spec is None:
                warnings.append(
                    f"scenario '{scenario.name}' references unknown parameter '{name}'"
                )
                continue
            try:
                coerced, spec_warnings = spec.normalise(value)
            except ValueError as exc:
                warnings.append(
                    f"scenario '{scenario.name}' invalid value for '{name}': {exc}"
                )
                continue
            for warning in spec_warnings:
                warnings.append(
                    f"scenario '{scenario.name}' {warning}"
                )
            previous = resolved.get(name, spec.default)
            if previous != coerced:
                changes.append(
                    ParameterChange(
                        name=name,
                        previous=previous,
                        current=coerced,
                        source=scenario.name,
                        notes=scenario.description,
                    )
                )
            resolved[name] = coerced

        for spec in self._specs.values():
            if spec.name not in resolved:
                resolved[spec.name] = spec.default

        missing = tuple(
            sorted(
                spec.name
                for spec in self._specs.values()
                if spec.required and resolved.get(spec.name) is None
            )
        )

        return ParameterScenarioResult(
            scenario=scenario,
            resolved_values=resolved,
            changes=tuple(changes),
            warnings=tuple(warnings),
            missing=missing,
        )

    def export_state(self) -> Mapping[str, object | None]:
        return {name: state.value for name, state in self._states.items()}

    def describe(self) -> MutableMapping[str, object]:
        return {
            "specs": [spec.as_dict() for spec in self._specs.values()],
            "state": [state.as_dict() for state in self._states.values()],
        }
