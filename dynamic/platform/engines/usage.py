"""High-level usage primitives for linking Dynamic Capital engines together."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Mapping, MutableMapping, Sequence

from dynamic_assign.engine import (
    AgentProfile,
    AssignableTask,
    AssignmentDecision,
    DynamicAssignEngine,
)
from dynamic_space.engine import DynamicSpaceEngine, SpaceNetworkOverview
from dynamic_space.space import SpaceEventSeverity, SpaceSector
from dynamic_zone.zone import (
    DynamicZoneRegistry,
    Zone,
    ZoneBoundary,
    ZoneEventType,
    ZoneNotFoundError,
    ZoneSnapshot,
)

__all__ = [
    "PersonaSignal",
    "UsageCycleResult",
    "DynamicUsageOrchestrator",
]


def _normalise_text(value: str, *, field_name: str) -> str:
    text = value.strip()
    if not text:
        raise ValueError(f"{field_name} must not be empty")
    return text


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _ensure_mapping(mapping: Mapping[str, object] | None, *, field_name: str) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):
        raise TypeError(f"{field_name} must be a mapping if provided")
    return mapping


def _normalise_sequence(values: Iterable[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    cleaned: list[str] = []
    seen: set[str] = set()
    for value in values:
        candidate = value.strip()
        if not candidate:
            continue
        lowered = candidate.lower()
        if lowered not in seen:
            seen.add(lowered)
            cleaned.append(candidate)
    return tuple(cleaned)


@dataclass(slots=True)
class PersonaSignal:
    """Structured representation of persona insights that require action."""

    persona: str
    summary: str
    zone: str
    sector: str
    severity: float
    required_skills: tuple[str, ...] = field(default_factory=tuple)
    estimated_effort_hours: float = 4.0
    task_identifier: str | None = None
    metadata: Mapping[str, object] | None = None
    zone_configuration: Zone | Mapping[str, object] | None = None
    sector_configuration: SpaceSector | Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.persona = _normalise_text(self.persona, field_name="persona")
        self.summary = _normalise_text(self.summary, field_name="summary")
        self.zone = _normalise_text(self.zone, field_name="zone")
        self.sector = _normalise_text(self.sector, field_name="sector")
        self.severity = _clamp(self.severity)
        self.required_skills = _normalise_sequence(self.required_skills)
        self.estimated_effort_hours = max(float(self.estimated_effort_hours), 0.0)
        if self.task_identifier is not None:
            self.task_identifier = _normalise_text(
                str(self.task_identifier), field_name="task_identifier"
            )
        self.metadata = _ensure_mapping(self.metadata, field_name="metadata")
        if self.zone_configuration is not None and not isinstance(
            self.zone_configuration, (Zone, Mapping)
        ):
            raise TypeError("zone_configuration must be a Zone or mapping")
        if self.sector_configuration is not None and not isinstance(
            self.sector_configuration, (SpaceSector, Mapping)
        ):
            raise TypeError("sector_configuration must be a SpaceSector or mapping")


@dataclass(frozen=True, slots=True)
class UsageCycleResult:
    """Aggregate output of a usage cycle linking personas, zones, and tasks."""

    assignments: tuple[AssignmentDecision, ...]
    tasks: tuple[AssignableTask, ...]
    zone_snapshots: Mapping[str, ZoneSnapshot]
    space_overview: SpaceNetworkOverview

    def as_dict(self) -> dict[str, object]:
        return {
            "assignments": [decision.as_dict() for decision in self.assignments],
            "tasks": [
                {
                    "identifier": task.identifier,
                    "description": task.description,
                    "priority": task.priority,
                    "required_skills": task.required_skills,
                    "estimated_effort_hours": task.estimated_effort_hours,
                    "metadata": dict(task.metadata or {}),
                }
                for task in self.tasks
            ],
            "zone_snapshots": {
                name: snapshot.as_dict() for name, snapshot in self.zone_snapshots.items()
            },
            "space_overview": {
                "average_stability": self.space_overview.average_stability,
                "total_energy_output_gw": self.space_overview.total_energy_output_gw,
                "sectors_requiring_attention": self.space_overview.sectors_requiring_attention,
            },
        }


class DynamicUsageOrchestrator:
    """Coordinate personas, zones, sectors, and assignments in a single loop."""

    def __init__(
        self,
        *,
        zone_registry: DynamicZoneRegistry | None = None,
        space_engine: DynamicSpaceEngine | None = None,
        assign_engine: DynamicAssignEngine | None = None,
        alert_threshold: float = 0.55,
        critical_threshold: float = 0.85,
    ) -> None:
        self.zone_registry = zone_registry or DynamicZoneRegistry()
        self.space_engine = space_engine or DynamicSpaceEngine()
        self.assign_engine = assign_engine or DynamicAssignEngine()
        self._alert_threshold = _clamp(alert_threshold)
        self._critical_threshold = max(
            self._alert_threshold, _clamp(critical_threshold)
        )

    # ------------------------------------------------------------------ registry
    def register_zone(self, zone: Zone | Mapping[str, object]) -> Zone:
        """Ensure a zone is available to receive persona and task telemetry."""

        return self.zone_registry.register_zone(zone)

    def register_zones(self, zones: Iterable[Zone | Mapping[str, object]]) -> list[Zone]:
        return self.zone_registry.register_zones(zones)

    def register_sector(self, sector: SpaceSector | Mapping[str, object]) -> SpaceSector:
        """Ensure a sector is orchestrated by the space engine."""

        return self.space_engine.upsert_sector(sector)

    # ----------------------------------------------------------------- orchestrat
    def plan_cycle(
        self,
        signals: Sequence[PersonaSignal],
        agents: Sequence[AgentProfile] | None,
        *,
        limit: int | None = None,
        allow_unassigned: bool = False,
        horizon: int = 5,
    ) -> UsageCycleResult:
        if not signals:
            zone_snapshots = self.zone_registry.snapshot()
            if not isinstance(zone_snapshots, Mapping):
                zone_snapshots = {zone_snapshots.zone.name: zone_snapshots}
            return UsageCycleResult(
                assignments=(),
                tasks=(),
                zone_snapshots=zone_snapshots,
                space_overview=self.space_engine.network_overview(horizon=horizon),
            )

        tasks: list[AssignableTask] = []
        for index, signal in enumerate(signals):
            tasks.append(self._ingest_signal(signal, index))

        if agents:
            assignments = tuple(
                self.assign_engine.recommend_assignments(tasks, agents, limit=limit)
            )
        elif allow_unassigned:
            assignments = ()
        else:
            raise ValueError("agents must be provided or allow_unassigned must be True")

        zone_snapshots = self.zone_registry.snapshot()
        if not isinstance(zone_snapshots, Mapping):
            zone_snapshots = {zone_snapshots.zone.name: zone_snapshots}
        overview = self.space_engine.network_overview(horizon=horizon)
        return UsageCycleResult(
            assignments=assignments,
            tasks=tuple(tasks),
            zone_snapshots=zone_snapshots,
            space_overview=overview,
        )

    # ----------------------------------------------------------------- personas
    def load_persona_chain(self, *, force: bool = False) -> Mapping[str, object]:
        """Load and optionally re-prime the default Dynamic AI persona chain."""

        from dynamic.intelligence.ai_apps.agents import (  # local import to avoid heavy startup cost
            configure_dynamic_start_agents,
            get_dynamic_start_agents,
            prime_dynamic_start_agents,
        )

        if force:
            configure_dynamic_start_agents()
        prime_dynamic_start_agents()
        return get_dynamic_start_agents()

    # ---------------------------------------------------------------- internals
    def _ingest_signal(self, signal: PersonaSignal, index: int) -> AssignableTask:
        self._ensure_zone(signal)
        self._ensure_sector(signal)

        zone_metadata = self._build_metadata(signal)
        event_kind = (
            ZoneEventType.ALERT if signal.severity >= self._alert_threshold else ZoneEventType.SAMPLE
        )
        change = 1 if event_kind is ZoneEventType.ALERT else 0
        self.zone_registry.record_event(
            signal.zone,
            kind=event_kind,
            change=change,
            value=signal.severity,
            note=signal.summary,
            metadata=zone_metadata,
        )

        self.space_engine.record_event(
            {
                "sector_name": signal.sector,
                "description": signal.summary,
                "impact_score": signal.severity,
                "severity": self._space_severity(signal.severity).value,
                "metadata": zone_metadata,
            }
        )

        identifier = signal.task_identifier or self._derive_task_identifier(signal, index)
        task_metadata: MutableMapping[str, object] = dict(zone_metadata)
        task_metadata.setdefault("source", "persona_signal")
        return AssignableTask(
            identifier=identifier,
            description=signal.summary,
            priority=signal.severity,
            required_skills=signal.required_skills,
            estimated_effort_hours=signal.estimated_effort_hours,
            metadata=task_metadata,
        )

    def _ensure_zone(self, signal: PersonaSignal) -> None:
        if any(zone.name == signal.zone for zone in self.zone_registry.list_zones()):
            return
        if signal.zone_configuration is None:
            raise ZoneNotFoundError(
                f"zone '{signal.zone}' is not registered; provide zone_configuration or register it first"
            )
        payload = signal.zone_configuration
        if isinstance(payload, Mapping):
            data = dict(payload)
            data.setdefault("name", signal.zone)
            if "boundary" not in data:
                data["boundary"] = ZoneBoundary(0, 1, 0, 1)
            self.zone_registry.register_zone(data)
        else:
            zone = payload
            if zone.name != signal.zone:
                zone = Zone(
                    name=signal.zone,
                    boundary=zone.boundary,
                    capacity=zone.capacity,
                    sensitivity=zone.sensitivity,
                    tags=zone.tags,
                    metadata=zone.metadata,
                )
            self.zone_registry.register_zone(zone)

    def _ensure_sector(self, signal: PersonaSignal) -> None:
        try:
            self.space_engine.space.get_sector(signal.sector)
        except KeyError:
            payload = signal.sector_configuration
            if payload is None:
                payload = {
                    "name": signal.sector,
                    "hazard_index": max(signal.severity, 0.3),
                    "supply_level": 0.5,
                    "energy_output_gw": 0.0,
                }
            elif isinstance(payload, Mapping):
                data = dict(payload)
                data.setdefault("name", signal.sector)
                payload = data
            self.space_engine.upsert_sector(payload)

    def _build_metadata(self, signal: PersonaSignal) -> dict[str, object]:
        metadata: dict[str, object] = dict(signal.metadata or {})
        metadata.setdefault("persona", signal.persona)
        metadata.setdefault("zone", signal.zone)
        metadata.setdefault("sector", signal.sector)
        metadata.setdefault("severity", signal.severity)
        return metadata

    def _derive_task_identifier(self, signal: PersonaSignal, index: int) -> str:
        base = f"{signal.zone}-{signal.persona}-{index + 1}"
        slug = "-".join(part for part in base.lower().replace("_", " ").split())
        cleaned = "".join(
            char if char.isalnum() or char == "-" else "-" for char in slug
        ).strip("-")
        return cleaned or f"task-{index + 1}"

    def _space_severity(self, severity: float) -> SpaceEventSeverity:
        if severity >= self._critical_threshold:
            return SpaceEventSeverity.CRITICAL
        if severity >= self._alert_threshold:
            return SpaceEventSeverity.ALERT
        if severity >= 0.35:
            return SpaceEventSeverity.ADVISORY
        return SpaceEventSeverity.INFO

