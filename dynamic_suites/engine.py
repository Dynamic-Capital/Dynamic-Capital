"""Operational intelligence for Dynamic Capital's automated suites."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import mean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "SuiteDefinition",
    "SuiteRun",
    "SuiteSnapshot",
    "SuitePortfolio",
    "DynamicSuiteEngine",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


def _normalise_key(value: str) -> str:
    normalised = value.strip().lower()
    if not normalised:
        raise ValueError("suite key must not be empty")
    return normalised


def _normalise_name(value: str) -> str:
    name = value.strip()
    if not name:
        raise ValueError("suite name must not be empty")
    return name


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: dict[str, None] = {}
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen[cleaned] = None
    return tuple(seen.keys())


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _average(values: Iterable[float]) -> float | None:
    series = [float(value) for value in values]
    if not series:
        return None
    return mean(series)


@dataclass(slots=True)
class SuiteDefinition:
    """Describes an automated suite that protects a production surface."""

    key: str
    name: str
    description: str = ""
    criticality: float = 0.5
    cadence_minutes: int = 60
    owner: str = ""
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.key = _normalise_key(self.key)
        self.name = _normalise_name(self.name)
        self.description = self.description.strip()
        self.criticality = _clamp(float(self.criticality), lower=0.0, upper=1.0)
        self.cadence_minutes = max(int(self.cadence_minutes), 1)
        self.owner = self.owner.strip()
        self.tags = _normalise_tags(self.tags)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "key": self.key,
            "name": self.name,
            "description": self.description,
            "criticality": self.criticality,
            "cadence_minutes": self.cadence_minutes,
            "owner": self.owner,
            "tags": list(self.tags),
        }


@dataclass(slots=True)
class SuiteRun:
    """Represents a single execution of a suite."""

    suite: str
    status: str = "passed"
    passed: bool = True
    coverage: float | None = None
    duration_seconds: float | None = None
    triggered_by: str = ""
    notes: str = ""
    timestamp: datetime = field(default_factory=_utcnow)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.suite = _normalise_key(self.suite)
        self.status = (self.status.strip().lower() or ("passed" if self.passed else "failed"))
        self.passed = bool(self.passed)
        if self.coverage is not None:
            self.coverage = _clamp(float(self.coverage), lower=0.0, upper=1.0)
        if self.duration_seconds is not None:
            self.duration_seconds = max(float(self.duration_seconds), 0.0)
        self.triggered_by = self.triggered_by.strip()
        self.notes = self.notes.strip()
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.metadata = _coerce_metadata(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "suite": self.suite,
            "status": self.status,
            "passed": self.passed,
            "coverage": self.coverage,
            "duration_seconds": self.duration_seconds,
            "triggered_by": self.triggered_by,
            "notes": self.notes,
            "timestamp": self.timestamp.isoformat(),
            "metadata": dict(self.metadata or {}),
        }


@dataclass(slots=True)
class SuiteSnapshot:
    """Aggregated telemetry for a registered suite."""

    definition: SuiteDefinition
    total_runs: int
    pass_rate: float
    stability_index: float
    average_coverage: float | None
    average_duration: float | None
    last_run: SuiteRun | None
    consecutive_failures: int
    cadence_health: float
    status: str
    narrative: str
    metadata: Mapping[str, object]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "definition": self.definition.as_dict(),
            "total_runs": self.total_runs,
            "pass_rate": self.pass_rate,
            "stability_index": self.stability_index,
            "average_coverage": self.average_coverage,
            "average_duration": self.average_duration,
            "last_run": self.last_run.as_dict() if self.last_run else None,
            "consecutive_failures": self.consecutive_failures,
            "cadence_health": self.cadence_health,
            "status": self.status,
            "narrative": self.narrative,
            "metadata": dict(self.metadata),
        }


@dataclass(slots=True)
class SuitePortfolio:
    """Portfolio-wide view of suites and their operational posture."""

    suites: tuple[SuiteSnapshot, ...]
    overall_pass_rate: float
    readiness_index: float
    cadence_health: float
    critical_alerts: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "suites": [snapshot.as_dict() for snapshot in self.suites],
            "overall_pass_rate": self.overall_pass_rate,
            "readiness_index": self.readiness_index,
            "cadence_health": self.cadence_health,
            "critical_alerts": list(self.critical_alerts),
            "narrative": self.narrative,
        }


def _coerce_definition(value: SuiteDefinition | Mapping[str, object]) -> SuiteDefinition:
    if isinstance(value, SuiteDefinition):
        return value
    if isinstance(value, Mapping):
        payload: MutableMapping[str, object] = dict(value)
        return SuiteDefinition(**payload)  # type: ignore[arg-type]
    raise TypeError("definition must be a SuiteDefinition or mapping")


def _coerce_run(value: SuiteRun | Mapping[str, object]) -> SuiteRun:
    if isinstance(value, SuiteRun):
        return value
    if isinstance(value, Mapping):
        payload: MutableMapping[str, object] = dict(value)
        return SuiteRun(**payload)  # type: ignore[arg-type]
    raise TypeError("run must be a SuiteRun or mapping")


class DynamicSuiteEngine:
    """Manage suites, capture run telemetry, and compute readiness insights."""

    def __init__(
        self,
        *,
        history: int = 50,
        definitions: Iterable[SuiteDefinition | Mapping[str, object]] | None = None,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._history = int(history)
        self._definitions: dict[str, SuiteDefinition] = {}
        self._runs: dict[str, Deque[SuiteRun]] = {}
        if definitions:
            self.register_many(definitions)

    # ----------------------------------------------------------------- registry
    def register(self, definition: SuiteDefinition | Mapping[str, object]) -> SuiteDefinition:
        suite_def = _coerce_definition(definition)
        self._definitions[suite_def.key] = suite_def
        self._runs.setdefault(suite_def.key, deque(maxlen=self._history))
        return suite_def

    def register_many(
        self, definitions: Iterable[SuiteDefinition | Mapping[str, object]]
    ) -> None:
        for definition in definitions:
            self.register(definition)

    # ---------------------------------------------------------------- telemetry
    def record(self, run: SuiteRun | Mapping[str, object]) -> SuiteRun:
        suite_run = _coerce_run(run)
        if suite_run.suite not in self._definitions:
            raise KeyError(
                f"suite '{suite_run.suite}' is not registered"
            )
        history = self._runs.setdefault(
            suite_run.suite, deque(maxlen=self._history)
        )
        history.append(suite_run)
        return suite_run

    def extend(self, runs: Iterable[SuiteRun | Mapping[str, object]]) -> None:
        for run in runs:
            self.record(run)

    def reset(self, suite: str | None = None) -> None:
        if suite is None:
            for history in self._runs.values():
                history.clear()
            return
        key = _normalise_key(suite)
        if key in self._runs:
            self._runs[key].clear()

    # ----------------------------------------------------------------- analysis
    def snapshot(self, suite: str) -> SuiteSnapshot:
        key = _normalise_key(suite)
        if key not in self._definitions:
            raise KeyError(f"suite '{key}' is not registered")
        definition = self._definitions[key]
        runs = tuple(self._runs.get(key, ()))
        total_runs = len(runs)
        pass_rate = sum(1 for run in runs if run.passed) / total_runs if total_runs else 0.0
        avg_coverage = _average(
            run.coverage for run in runs if run.coverage is not None
        )
        avg_duration = _average(
            run.duration_seconds for run in runs if run.duration_seconds is not None
        )
        last_run = runs[-1] if runs else None
        consecutive_failures = 0
        for run in reversed(runs):
            if run.passed:
                break
            consecutive_failures += 1
        cadence_health, cadence_delta = self._cadence_health(definition, last_run)
        stability_index = _clamp(
            0.65 * pass_rate + 0.35 * (1.0 - min(consecutive_failures / 5.0, 1.0))
        )
        status = self._determine_status(pass_rate, last_run, consecutive_failures)
        narrative = self._compose_narrative(
            definition,
            total_runs,
            pass_rate,
            status,
            last_run,
            cadence_delta,
            consecutive_failures,
        )
        recent_failures = [
            run.as_dict()
            for run in runs
            if not run.passed
        ][-3:]
        metadata: dict[str, object] = {
            "recent_failures": recent_failures,
            "recent_runs": [run.as_dict() for run in runs[-3:]],
            "cadence_minutes": definition.cadence_minutes,
            "cadence_delta_minutes": cadence_delta,
        }
        return SuiteSnapshot(
            definition=definition,
            total_runs=total_runs,
            pass_rate=pass_rate,
            stability_index=stability_index,
            average_coverage=avg_coverage,
            average_duration=avg_duration,
            last_run=last_run,
            consecutive_failures=consecutive_failures,
            cadence_health=cadence_health,
            status=status,
            narrative=narrative,
            metadata=metadata,
        )

    def build_portfolio(self) -> SuitePortfolio:
        snapshots = tuple(
            self.snapshot(key)
            for key in sorted(self._definitions)
        )
        if not snapshots:
            return SuitePortfolio(
                suites=(),
                overall_pass_rate=0.0,
                readiness_index=0.0,
                cadence_health=0.0,
                critical_alerts=(),
                narrative="No suites registered.",
            )
        weighted_total = sum(snapshot.definition.criticality for snapshot in snapshots)
        if weighted_total == 0:
            weighted_total = float(len(snapshots))
        overall_pass_rate = sum(
            snapshot.pass_rate * snapshot.definition.criticality
            for snapshot in snapshots
        ) / weighted_total
        readiness_index = _clamp(
            0.7 * overall_pass_rate
            + 0.3
            * (1.0 - min(
                sum(
                    snapshot.consecutive_failures
                    * snapshot.definition.criticality
                    for snapshot in snapshots
                )
                / max(weighted_total, 1.0)
                / 5.0,
                1.0,
            ))
        )
        cadence_health = _clamp(
            sum(
                snapshot.cadence_health * snapshot.definition.criticality
                for snapshot in snapshots
            )
            / weighted_total
        )
        critical_alerts = tuple(
            snapshot.narrative
            for snapshot in snapshots
            if snapshot.status == "red"
        )
        narrative = self._portfolio_narrative(snapshots, overall_pass_rate, readiness_index)
        return SuitePortfolio(
            suites=snapshots,
            overall_pass_rate=overall_pass_rate,
            readiness_index=readiness_index,
            cadence_health=cadence_health,
            critical_alerts=critical_alerts,
            narrative=narrative,
        )

    # ------------------------------------------------------------- helper logic
    def _cadence_health(
        self, definition: SuiteDefinition, last_run: SuiteRun | None
    ) -> tuple[float, float | None]:
        if last_run is None:
            return 0.0, None
        delta_minutes = (
            _utcnow() - last_run.timestamp
        ).total_seconds() / 60.0
        cadence_threshold = definition.cadence_minutes * 1.5
        health = _clamp(1.0 - min(delta_minutes / cadence_threshold, 1.0))
        return health, delta_minutes

    def _determine_status(
        self,
        pass_rate: float,
        last_run: SuiteRun | None,
        consecutive_failures: int,
    ) -> str:
        if last_run is None:
            return "unknown"
        if not last_run.passed or consecutive_failures >= 2:
            return "red"
        if pass_rate >= 0.65:
            return "green"
        return "amber"

    def _compose_narrative(
        self,
        definition: SuiteDefinition,
        total_runs: int,
        pass_rate: float,
        status: str,
        last_run: SuiteRun | None,
        cadence_delta: float | None,
        consecutive_failures: int,
    ) -> str:
        parts = [
            f"Suite {definition.name} ({definition.key})",
            f"pass rate {pass_rate:.0%} across {total_runs} runs",
            f"status {status.upper()}",
        ]
        if last_run is None:
            parts.append("no executions recorded yet")
        else:
            parts.append(
                f"last run {last_run.status} by {last_run.triggered_by or 'unknown'}"
            )
        if cadence_delta is not None:
            parts.append(f"ran {cadence_delta:.1f} minutes ago")
        if consecutive_failures:
            parts.append(f"{consecutive_failures} consecutive failures")
        if definition.owner:
            parts.append(f"owner {definition.owner}")
        if definition.tags:
            parts.append(
                "tags " + ", ".join(sorted(definition.tags))
            )
        return "; ".join(parts)

    def _portfolio_narrative(
        self,
        snapshots: Sequence[SuiteSnapshot],
        overall_pass_rate: float,
        readiness_index: float,
    ) -> str:
        anchors = [
            f"{snapshot.definition.name}: {snapshot.pass_rate:.0%}"
            for snapshot in snapshots
        ]
        anchor_text = ", ".join(anchors)
        return (
            f"Portfolio readiness {readiness_index:.0%} with aggregated pass rate "
            f"{overall_pass_rate:.0%}. Suites: {anchor_text}."
        )

    # --------------------------------------------------------------- inspection
    @property
    def definitions(self) -> tuple[SuiteDefinition, ...]:
        return tuple(self._definitions[key] for key in sorted(self._definitions))

    @property
    def history(self) -> int:
        return self._history
