"""Dynamic script orchestration utilities for automation coverage.

The trading organisation maintains dozens of operational scripts that guard the
health of deployments, synchronise external systems, and backfill research
datasets.  This module mirrors the catalogue that lives in Supabase so that
research notebooks and unit tests can reason about the automation footprint
without reaching for the database.  Each script descriptor captures the
execution cadence, required environment variables, and the most recent run
telemetry so schedulers can prioritise work accordingly.

The registry keeps the API intentionally small:

* :class:`DynamicScript` normalises descriptor payloads and exposes helpers for
  determining when a script is due to run.
* :class:`DynamicScriptRegistry` manages a collection of scripts, producing a
  prioritised execution plan that respects cadence, criticality, and runtime
  prerequisites.

The implementation mirrors the style of :mod:`dynamic.trading.algo.dynamic_nodes` to
keep the automation tooling consistent across pods.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, Iterator, Mapping, MutableMapping, Optional, Sequence, Tuple

__all__ = [
    "DynamicScript",
    "DynamicScriptRegistry",
    "ScriptConfigError",
]


class ScriptConfigError(ValueError):
    """Raised when an invalid script descriptor is supplied."""


def _normalise_identifier(value: str) -> str:
    raw = str(value).strip()
    if not raw:
        raise ScriptConfigError("identifier values cannot be empty")
    return raw


def _normalise_collection(values: Iterable[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    normalised: list[str] = []
    for raw in values:
        item = str(raw).strip()
        if not item or item in seen:
            continue
        seen.add(item)
        normalised.append(item)
    return tuple(normalised)


def _ensure_mapping(metadata: Mapping[str, object] | None) -> Mapping[str, object]:
    if metadata is None:
        return {}
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guardrail
        raise ScriptConfigError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class DynamicScript:
    """Normalised representation of an operational script descriptor."""

    script_id: str
    category: str
    entrypoint: str
    cadence_minutes: int | None = None
    env_vars: tuple[str, ...] = field(default_factory=tuple)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] = field(default_factory=dict)
    enabled: bool = True
    criticality: float | None = None

    # Runtime telemetry (mutated by the registry)
    last_run_at: datetime | None = None
    last_status: str = "idle"
    last_duration_ms: int | None = None
    last_notes: str | None = None

    def __post_init__(self) -> None:
        self.script_id = _normalise_identifier(self.script_id)

        category = str(self.category).strip().lower()
        if not category:
            raise ScriptConfigError("category is required")
        self.category = category

        entrypoint = str(self.entrypoint).strip()
        if not entrypoint:
            raise ScriptConfigError("entrypoint is required")
        self.entrypoint = entrypoint

        if self.cadence_minutes is not None:
            if self.cadence_minutes <= 0:
                raise ScriptConfigError("cadence_minutes must be a positive integer")
            self.cadence_minutes = int(self.cadence_minutes)

        self.env_vars = _normalise_collection(self.env_vars)
        self.tags = _normalise_collection(self.tags)
        self.metadata = _ensure_mapping(self.metadata)

        if self.criticality is not None:
            try:
                self.criticality = float(self.criticality)
            except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
                raise ScriptConfigError("criticality must be numeric") from exc
            if not 0 <= self.criticality <= 1:
                raise ScriptConfigError("criticality must be between 0 and 1")

    # ------------------------------------------------------------------ runtime
    def is_due(
        self,
        *,
        now: Optional[datetime] = None,
        include_manual: bool = False,
        available_env: Optional[Sequence[str]] = None,
    ) -> bool:
        """Return ``True`` when the script should be scheduled for execution."""

        if not self.enabled:
            return False

        if available_env is not None:
            available = {str(item).strip() for item in available_env}
            if any(var not in available for var in self.env_vars):
                return False

        if self.cadence_minutes is None:
            return include_manual

        if self.last_run_at is None:
            return True

        current_time = now or datetime.now(timezone.utc)
        if current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=timezone.utc)

        next_due = self.last_run_at + timedelta(minutes=self.cadence_minutes)
        return current_time >= next_due

    def mark_run(
        self,
        *,
        completed_at: Optional[datetime] = None,
        status: str = "success",
        duration_ms: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> None:
        """Update runtime telemetry after an execution attempt."""

        timestamp = completed_at or datetime.now(timezone.utc)
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)

        self.last_run_at = timestamp
        self.last_status = status
        self.last_duration_ms = int(duration_ms) if duration_ms is not None else None
        self.last_notes = str(notes) if notes is not None else None


class DynamicScriptRegistry:
    """Manage a collection of :class:`DynamicScript` instances."""

    def __init__(self, scripts: Optional[Iterable[DynamicScript | Mapping[str, object]]] = None) -> None:
        self._scripts: Dict[str, DynamicScript] = {}
        if scripts is not None:
            for script in scripts:
                self.register(script)

    # ----------------------------------------------------------------- mutation
    def register(self, script: DynamicScript | Mapping[str, object]) -> DynamicScript:
        if isinstance(script, DynamicScript):
            dynamic_script = script
        elif isinstance(script, Mapping):
            dynamic_script = DynamicScript(**script)  # type: ignore[arg-type]
        else:  # pragma: no cover - defensive guardrail
            raise ScriptConfigError("script must be a mapping or DynamicScript instance")

        self._scripts[dynamic_script.script_id] = dynamic_script
        return dynamic_script

    def record_result(
        self,
        script_id: str,
        *,
        completed_at: Optional[datetime] = None,
        status: str = "success",
        duration_ms: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> DynamicScript:
        script = self.get(script_id)
        script.mark_run(
            completed_at=completed_at,
            status=status,
            duration_ms=duration_ms,
            notes=notes,
        )
        return script

    # ------------------------------------------------------------------ access
    def get(self, script_id: str) -> DynamicScript:
        try:
            return self._scripts[_normalise_identifier(script_id)]
        except KeyError as exc:  # pragma: no cover - defensive guardrail
            raise KeyError(f"script '{script_id}' is not registered") from exc

    def __iter__(self) -> Iterator[DynamicScript]:  # pragma: no cover - trivial proxy
        return iter(self._scripts.values())

    def snapshot(self) -> Tuple[DynamicScript, ...]:
        return tuple(self._scripts.values())

    # --------------------------------------------------------------- introspect
    def resolve_due_scripts(
        self,
        *,
        now: Optional[datetime] = None,
        include_manual: bool = False,
        available_env: Optional[Sequence[str]] = None,
    ) -> list[DynamicScript]:
        """Return the scripts that are due, sorted by priority."""

        due_scripts = [
            script
            for script in self._scripts.values()
            if script.is_due(now=now, include_manual=include_manual, available_env=available_env)
        ]

        def sort_key(script: DynamicScript) -> tuple[float, int, str]:
            priority = script.criticality if script.criticality is not None else 0.0
            cadence = script.cadence_minutes if script.cadence_minutes is not None else 999999
            return (-priority, cadence, script.script_id)

        return sorted(due_scripts, key=sort_key)

    def category_summary(self) -> Mapping[str, int]:
        summary: MutableMapping[str, int] = {}
        for script in self._scripts.values():
            summary[script.category] = summary.get(script.category, 0) + 1
        return dict(sorted(summary.items()))
