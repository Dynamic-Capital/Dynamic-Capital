"""High-level orchestration utilities for spherical resonance networks."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
import re
from typing import (
    TYPE_CHECKING,
    Deque,
    Iterable,
    Mapping,
    MutableMapping,
    Sequence,
    Literal,
    cast,
)

if TYPE_CHECKING:  # pragma: no cover - import cycle guard
    from dynamic.intelligence.agi import DynamicAGIModel

__all__ = [
    "SphereProfile",
    "SpherePulse",
    "SphereResponsibility",
    "SphereSnapshot",
    "SphereNetworkState",
    "SphereCollaborator",
    "SphereRoleManifestEntry",
    "DynamicSpheresEngine",
    "create_sphere_agent",
    "create_sphere_keeper",
    "create_sphere_bot",
    "create_sphere_helper",
    "sync_dynamic_agi_collaborators",
]


# --------------------------------------------------------------------------- utils

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_name(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("name must not be empty")
    return cleaned


def _normalise_key(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("name must not be empty")
    return cleaned


def _clamp(value: float, *, lower: float, upper: float) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(value, upper))


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


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


def _normalise_sequence(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for raw in values:
        cleaned = str(raw).strip()
        if not cleaned:
            continue
        marker = cleaned.lower()
        if marker in seen:
            continue
        seen.add(marker)
        ordered.append(cleaned)
    return tuple(ordered)


def _coerce_profile(value: SphereProfile | Mapping[str, object]) -> SphereProfile:
    if isinstance(value, SphereProfile):
        return value
    if isinstance(value, Mapping):
        return SphereProfile(**value)
    raise TypeError("profile must be a SphereProfile or mapping")


def _coerce_pulse(value: SpherePulse | Mapping[str, object]) -> SpherePulse:
    if isinstance(value, SpherePulse):
        return value
    if isinstance(value, Mapping):
        return SpherePulse(**value)
    raise TypeError("pulse must be a SpherePulse or mapping")


def _coerce_collaborator(
    value: "SphereCollaborator" | Mapping[str, object]
) -> "SphereCollaborator":
    if isinstance(value, SphereCollaborator):
        return value
    if isinstance(value, Mapping):
        return SphereCollaborator(**value)
    raise TypeError("collaborator must be a SphereCollaborator or mapping")


def _coerce_responsibility(
    value: "SphereResponsibility" | Mapping[str, object]
) -> "SphereResponsibility":
    if isinstance(value, SphereResponsibility):
        return value
    if isinstance(value, Mapping):
        return SphereResponsibility(**value)
    raise TypeError("responsibility must be a SphereResponsibility or mapping")


def _slugify_identifier(value: str, *, fallback: str = "dynamic-agi") -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        cleaned = fallback
    slug = re.sub(r"[^a-z0-9]+", "-", cleaned).strip("-")
    return slug or fallback


# ------------------------------------------------------------------------ dataclasses


@dataclass(slots=True)
class SphereProfile:
    """Baseline properties that describe a resonant sphere."""

    name: str
    radius_km: float
    density_gcc: float
    orbital_velocity_kms: float
    vibrational_state: float = 0.0
    energy_output_twh: float = 0.0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.radius_km = max(float(self.radius_km), 0.0)
        self.density_gcc = max(float(self.density_gcc), 0.0)
        self.orbital_velocity_kms = max(float(self.orbital_velocity_kms), 0.0)
        self.vibrational_state = _clamp(float(self.vibrational_state), lower=-1.0, upper=1.0)
        self.energy_output_twh = float(self.energy_output_twh)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class SpherePulse:
    """Momentary resonance adjustment recorded for a sphere."""

    sphere: str
    resonance: float
    energy_delta_twh: float = 0.0
    density_shift: float = 0.0
    tags: tuple[str, ...] = field(default_factory=tuple)
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.sphere = _normalise_key(self.sphere)
        self.resonance = _clamp(float(self.resonance), lower=-1.0, upper=1.0)
        self.energy_delta_twh = float(self.energy_delta_twh)
        self.density_shift = float(self.density_shift)
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class SphereResponsibility:
    """Responsibilities a collaborator upholds for a sphere."""

    tasks: tuple[str, ...] = field(default_factory=tuple)
    permissions: tuple[str, ...] = field(default_factory=tuple)
    priority: float = 0.5
    notes: str | None = None

    def __post_init__(self) -> None:
        self.tasks = _normalise_sequence(self.tasks)
        self.permissions = _normalise_sequence(self.permissions)
        self.priority = _clamp(float(self.priority), lower=0.0, upper=1.0)
        if self.notes is not None:
            note = self.notes.strip()
            self.notes = note or None

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "tasks": list(self.tasks),
            "permissions": list(self.permissions),
            "priority": self.priority,
        }
        if self.notes is not None:
            payload["notes"] = self.notes
        return payload


@dataclass(slots=True)
class SphereSnapshot:
    """Aggregated view of a sphere's posture and resonance."""

    sphere: SphereProfile
    resonance_index: float
    resonance_trend: float
    total_energy_output_twh: float
    cumulative_energy_delta_twh: float
    cumulative_density_shift: float
    pulses: tuple[SpherePulse, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "sphere": {
                "name": self.sphere.name,
                "radius_km": self.sphere.radius_km,
                "density_gcc": self.sphere.density_gcc,
                "orbital_velocity_kms": self.sphere.orbital_velocity_kms,
                "vibrational_state": self.sphere.vibrational_state,
                "energy_output_twh": self.sphere.energy_output_twh,
                "metadata": dict(self.sphere.metadata or {}),
            },
            "resonance_index": self.resonance_index,
            "resonance_trend": self.resonance_trend,
            "total_energy_output_twh": self.total_energy_output_twh,
            "cumulative_energy_delta_twh": self.cumulative_energy_delta_twh,
            "cumulative_density_shift": self.cumulative_density_shift,
            "pulses": [
                {
                    "sphere": pulse.sphere,
                    "resonance": pulse.resonance,
                    "energy_delta_twh": pulse.energy_delta_twh,
                    "density_shift": pulse.density_shift,
                    "tags": list(pulse.tags),
                    "weight": pulse.weight,
                    "timestamp": pulse.timestamp.isoformat(),
                    "metadata": dict(pulse.metadata or {}),
                }
                for pulse in self.pulses
            ],
        }


@dataclass(slots=True)
class SphereCollaborator:
    """Participant that maintains resonance consciousness across spheres."""

    identifier: str
    name: str
    role: Literal["agent", "keeper", "bot", "helper"]
    affinity: float = 0.5
    stability: float = 0.5
    influence: float = 0.5
    spheres: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None
    responsibilities: Mapping[str, SphereResponsibility] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.identifier = _normalise_key(self.identifier)
        self.name = _normalise_name(self.name)
        role = self.role.strip().lower()
        if role not in {"agent", "keeper", "bot", "helper"}:
            raise ValueError("role must be one of 'agent', 'keeper', 'bot', 'helper'")
        self.role = cast(Literal["agent", "keeper", "bot", "helper"], role)
        self.affinity = _clamp(float(self.affinity), lower=0.0, upper=1.0)
        self.stability = _clamp(float(self.stability), lower=0.0, upper=1.0)
        self.influence = _clamp(float(self.influence), lower=0.0, upper=1.0)
        self.metadata = _coerce_metadata(self.metadata)
        current_responsibilities = self.responsibilities
        self.responsibilities = {}
        self.set_spheres(self.spheres)
        if current_responsibilities:
            self.set_responsibilities(current_responsibilities)

    def set_spheres(self, spheres: Sequence[str] | None) -> None:
        seen: set[str] = set()
        ordered: list[str] = []
        if spheres:
            for candidate in spheres:
                cleaned = str(candidate).strip()
                if not cleaned:
                    continue
                key = _normalise_key(cleaned)
                if key not in seen:
                    seen.add(key)
                    ordered.append(key)
        self.spheres = tuple(ordered)

    def support_score(self) -> float:
        return (self.affinity * 0.5) + (self.stability * 0.3) + (self.influence * 0.2)

    def set_responsibilities(
        self,
        responsibilities: Mapping[str, SphereResponsibility | Mapping[str, object]] | None,
        *,
        merge: bool = False,
    ) -> None:
        if responsibilities:
            prepared: dict[str, SphereResponsibility] = {
                _normalise_key(sphere): _coerce_responsibility(payload)
                for sphere, payload in responsibilities.items()
            }
            if merge and self.responsibilities:
                merged = dict(self.responsibilities)
                merged.update(prepared)
                prepared = merged
            self.responsibilities = prepared
            if prepared:
                combined: list[str] = list(self.spheres)
                for sphere in prepared:
                    if sphere not in combined:
                        combined.append(sphere)
                self.set_spheres(combined)
        elif not merge:
            self.responsibilities = {}

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "identifier": self.identifier,
            "name": self.name,
            "role": self.role,
            "affinity": self.affinity,
            "stability": self.stability,
            "influence": self.influence,
            "spheres": list(self.spheres),
            "metadata": dict(self.metadata or {}),
            "responsibilities": {
                sphere: responsibility.as_dict()
                for sphere, responsibility in self.responsibilities.items()
            },
        }


@dataclass(slots=True)
class SphereRoleManifestEntry:
    """Role-specific manifest for collaborators active on a sphere."""

    collaborator_id: str
    collaborator_name: str
    role: Literal["agent", "keeper", "bot", "helper"]
    tasks: tuple[str, ...]
    permissions: tuple[str, ...]
    priority: float

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "collaborator_id": self.collaborator_id,
            "collaborator_name": self.collaborator_name,
            "role": self.role,
            "tasks": list(self.tasks),
            "permissions": list(self.permissions),
            "priority": self.priority,
        }


@dataclass(slots=True)
class SphereNetworkState:
    """Network level aggregates for a collection of resonant spheres."""

    average_resonance: float
    total_energy_output_twh: float
    total_energy_delta_twh: float
    spheres_requiring_attention: tuple[str, ...]
    snapshots: Mapping[str, SphereSnapshot]
    collaborators: Mapping[str, SphereCollaborator] = field(default_factory=dict)
    consciousness_resilience: float = 0.0
    collaboration_health: Mapping[str, float] = field(default_factory=dict)
    role_manifest: Mapping[str, tuple[SphereRoleManifestEntry, ...]] = field(
        default_factory=dict
    )


# --------------------------------------------------------------------- factories


def create_sphere_agent(
    identifier: str,
    name: str,
    *,
    affinity: float = 0.5,
    stability: float = 0.5,
    influence: float = 0.5,
    spheres: Sequence[str] | None = None,
    metadata: Mapping[str, object] | None = None,
) -> SphereCollaborator:
    return SphereCollaborator(
        identifier=identifier,
        name=name,
        role="agent",
        affinity=affinity,
        stability=stability,
        influence=influence,
        spheres=tuple(spheres or ()),
        metadata=metadata,
    )


def create_sphere_keeper(
    identifier: str,
    name: str,
    *,
    affinity: float = 0.6,
    stability: float = 0.7,
    influence: float = 0.4,
    spheres: Sequence[str] | None = None,
    metadata: Mapping[str, object] | None = None,
) -> SphereCollaborator:
    return SphereCollaborator(
        identifier=identifier,
        name=name,
        role="keeper",
        affinity=affinity,
        stability=stability,
        influence=influence,
        spheres=tuple(spheres or ()),
        metadata=metadata,
    )


def create_sphere_bot(
    identifier: str,
    name: str,
    *,
    affinity: float = 0.4,
    stability: float = 0.6,
    influence: float = 0.7,
    spheres: Sequence[str] | None = None,
    metadata: Mapping[str, object] | None = None,
) -> SphereCollaborator:
    return SphereCollaborator(
        identifier=identifier,
        name=name,
        role="bot",
        affinity=affinity,
        stability=stability,
        influence=influence,
        spheres=tuple(spheres or ()),
        metadata=metadata,
    )


def create_sphere_helper(
    identifier: str,
    name: str,
    *,
    affinity: float = 0.55,
    stability: float = 0.5,
    influence: float = 0.45,
    spheres: Sequence[str] | None = None,
    metadata: Mapping[str, object] | None = None,
) -> SphereCollaborator:
    return SphereCollaborator(
        identifier=identifier,
        name=name,
        role="helper",
        affinity=affinity,
        stability=stability,
        influence=influence,
        spheres=tuple(spheres or ()),
        metadata=metadata,
    )


# --------------------------------------------------------------------------- engine


class DynamicSpheresEngine:
    """Coordinate resonance data for a network of spheres."""

    def __init__(
        self,
        profiles: Iterable[SphereProfile | Mapping[str, object]] | None = None,
        *,
        history: int = 72,
        attention_threshold: float = 0.35,
        smoothing: float = 0.25,
        collaborators: Iterable[SphereCollaborator | Mapping[str, object]] | None = None,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._history = int(history)
        self._attention_threshold = _clamp(float(attention_threshold), lower=-1.0, upper=1.0)
        self._smoothing = _clamp(float(smoothing), lower=0.0, upper=1.0)
        self._profiles: dict[str, SphereProfile] = {}
        self._pulses: dict[str, Deque[SpherePulse]] = {}
        self._collaborators: dict[str, SphereCollaborator] = {}
        self._sphere_assignments: dict[str, set[str]] = {}
        if profiles:
            for profile in profiles:
                self.upsert_profile(profile)
        if collaborators:
            for collaborator in collaborators:
                self.upsert_collaborator(collaborator)

    # ------------------------------------------------------------------- configure
    @property
    def attention_threshold(self) -> float:
        return self._attention_threshold

    def configure_attention_threshold(self, value: float) -> None:
        self._attention_threshold = _clamp(float(value), lower=-1.0, upper=1.0)

    @property
    def profiles(self) -> tuple[SphereProfile, ...]:
        return tuple(self._profiles.values())

    @property
    def collaborators(self) -> tuple[SphereCollaborator, ...]:
        return tuple(self._collaborators.values())

    # --------------------------------------------------------------------- register
    def upsert_profile(self, profile: SphereProfile | Mapping[str, object]) -> SphereProfile:
        resolved = _coerce_profile(profile)
        key = _normalise_key(resolved.name)
        self._profiles[key] = resolved
        self._pulses.setdefault(key, deque(maxlen=self._history))
        assignments = self._sphere_assignments.setdefault(key, set())
        if assignments:
            assignments.clear()
        for collaborator in self._collaborators.values():
            if key in self._active_sphere_keys(collaborator.spheres):
                assignments.add(collaborator.identifier)
        return resolved

    def remove_profile(self, name: str) -> None:
        key = _normalise_key(name)
        self._profiles.pop(key, None)
        self._pulses.pop(key, None)
        assigned = self._sphere_assignments.pop(key, None)
        if assigned:
            for identifier in list(assigned):
                collaborator = self._collaborators.get(identifier)
                if collaborator is None:
                    continue
                previous = collaborator.spheres
                collaborator.set_spheres(
                    tuple(
                        sphere
                        for sphere in collaborator.spheres
                        if _normalise_key(sphere) != key
                    )
                )
                self._sync_assignments(collaborator, previous)

    # --------------------------------------------------------------- collaborators
    def upsert_collaborator(
        self, collaborator: SphereCollaborator | Mapping[str, object]
    ) -> SphereCollaborator:
        resolved = _coerce_collaborator(collaborator)
        previous = self._collaborators.get(resolved.identifier)
        previous_spheres: Sequence[str] | None = previous.spheres if previous else ()
        self._collaborators[resolved.identifier] = resolved
        self._sync_assignments(resolved, previous_spheres)
        return resolved

    def upsert_agent(
        self,
        identifier: str,
        name: str,
        *,
        affinity: float = 0.5,
        stability: float = 0.5,
        influence: float = 0.5,
        spheres: Sequence[str] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> SphereCollaborator:
        return self.upsert_collaborator(
            create_sphere_agent(
                identifier=identifier,
                name=name,
                affinity=affinity,
                stability=stability,
                influence=influence,
                spheres=spheres,
                metadata=metadata,
            )
        )

    def upsert_keeper(
        self,
        identifier: str,
        name: str,
        *,
        affinity: float = 0.6,
        stability: float = 0.7,
        influence: float = 0.4,
        spheres: Sequence[str] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> SphereCollaborator:
        return self.upsert_collaborator(
            create_sphere_keeper(
                identifier=identifier,
                name=name,
                affinity=affinity,
                stability=stability,
                influence=influence,
                spheres=spheres,
                metadata=metadata,
            )
        )

    def upsert_bot(
        self,
        identifier: str,
        name: str,
        *,
        affinity: float = 0.4,
        stability: float = 0.6,
        influence: float = 0.7,
        spheres: Sequence[str] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> SphereCollaborator:
        return self.upsert_collaborator(
            create_sphere_bot(
                identifier=identifier,
                name=name,
                affinity=affinity,
                stability=stability,
                influence=influence,
                spheres=spheres,
                metadata=metadata,
            )
        )

    def upsert_helper(
        self,
        identifier: str,
        name: str,
        *,
        affinity: float = 0.55,
        stability: float = 0.5,
        influence: float = 0.45,
        spheres: Sequence[str] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> SphereCollaborator:
        return self.upsert_collaborator(
            create_sphere_helper(
                identifier=identifier,
                name=name,
                affinity=affinity,
                stability=stability,
                influence=influence,
                spheres=spheres,
                metadata=metadata,
            )
        )

    def assign_collaborator(
        self, identifier: str, spheres: Sequence[str] | None
    ) -> SphereCollaborator:
        key = _normalise_key(identifier)
        collaborator = self._collaborators.get(key)
        if collaborator is None:
            raise KeyError(f"collaborator '{identifier}' is not registered")
        previous = collaborator.spheres
        collaborator.set_spheres(spheres or ())
        self._sync_assignments(collaborator, previous)
        return collaborator

    def configure_responsibilities(
        self,
        identifier: str,
        responsibilities: Mapping[str, SphereResponsibility | Mapping[str, object]] | None,
        *,
        merge: bool = False,
    ) -> SphereCollaborator:
        key = _normalise_key(identifier)
        collaborator = self._collaborators.get(key)
        if collaborator is None:
            raise KeyError(f"collaborator '{identifier}' is not registered")
        previous = collaborator.spheres
        collaborator.set_responsibilities(responsibilities, merge=merge)
        self._sync_assignments(collaborator, previous)
        return collaborator

    def sync_with_dynamic_agi(
        self,
        agi: "DynamicAGIModel",
        *,
        spheres: Sequence[str] | None = None,
    ) -> tuple[SphereCollaborator, SphereCollaborator, SphereCollaborator, SphereCollaborator]:
        """Synchronise AGI collaborators onto the engine."""

        identity = agi.identity
        display = identity.acronym or identity.name
        base_identifier = _slugify_identifier(display)
        assigned = tuple(spheres or (profile.name for profile in self.profiles))

        version_info = agi.version_metadata
        metadata_base: Mapping[str, object] = {
            "agi_identity": identity.as_dict(),
            "agi_version": getattr(agi, "version", None),
            "agi_version_info": version_info,
        }

        def _metadata(role: str) -> Mapping[str, object]:
            payload = dict(metadata_base)
            payload["agi_role"] = role
            return payload

        responsibility_templates: Mapping[str, Mapping[str, object]] = {
            "agent": {
                "tasks": (
                    "Coordinate resonance strategy",
                    "Activate stabilization pulses",
                ),
                "permissions": (
                    "adjust-resonance",
                    "deploy-harmonics",
                    "access-diagnostics",
                ),
                "priority": 0.9,
            },
            "keeper": {
                "tasks": (
                    "Audit resonance baselines",
                    "Validate collaborator cohesion",
                ),
                "permissions": (
                    "read-state",
                    "raise-alerts",
                ),
                "priority": 0.8,
            },
            "bot": {
                "tasks": (
                    "Stream telemetry into network",
                    "Automate pulse balancing",
                ),
                "permissions": (
                    "ingest-telemetry",
                    "apply-auto-adjustments",
                ),
                "priority": 0.7,
            },
            "helper": {
                "tasks": (
                    "Support human operators",
                    "Document resonance insights",
                ),
                "permissions": (
                    "read-state",
                    "annotate-findings",
                ),
                "priority": 0.6,
            },
        }

        def _responsibilities(role: str) -> Mapping[str, SphereResponsibility]:
            template = responsibility_templates[role]
            return {
                sphere: SphereResponsibility(
                    tasks=template["tasks"],
                    permissions=template["permissions"],
                    priority=float(template["priority"]),
                    notes=f"Dynamic AGI {role} duties for {display}",
                )
                for sphere in assigned
            }

        agent = self.upsert_agent(
            f"{base_identifier}-agent",
            f"{display} Agent",
            spheres=assigned,
            metadata=_metadata("agent"),
        )
        self.configure_responsibilities(
            agent.identifier, _responsibilities("agent"), merge=False
        )
        keeper = self.upsert_keeper(
            f"{base_identifier}-keeper",
            f"{display} Keeper",
            spheres=assigned,
            metadata=_metadata("keeper"),
        )
        self.configure_responsibilities(
            keeper.identifier, _responsibilities("keeper"), merge=False
        )
        bot = self.upsert_bot(
            f"{base_identifier}-bot",
            f"{display} Bot",
            spheres=assigned,
            metadata=_metadata("bot"),
        )
        self.configure_responsibilities(
            bot.identifier, _responsibilities("bot"), merge=False
        )
        helper = self.upsert_helper(
            f"{base_identifier}-helper",
            f"{display} Helper",
            spheres=assigned,
            metadata=_metadata("helper"),
        )
        self.configure_responsibilities(
            helper.identifier, _responsibilities("helper"), merge=False
        )
        return agent, keeper, bot, helper

    def remove_collaborator(self, identifier: str) -> None:
        key = _normalise_key(identifier)
        collaborator = self._collaborators.pop(key, None)
        if collaborator is not None:
            self._clear_assignments(collaborator)

    # ---------------------------------------------------------------------- capture
    def capture(self, pulse: SpherePulse | Mapping[str, object]) -> SpherePulse:
        resolved = _coerce_pulse(pulse)
        if resolved.sphere not in self._profiles:
            raise KeyError(f"sphere '{resolved.sphere}' is not registered")
        self._pulses.setdefault(resolved.sphere, deque(maxlen=self._history)).append(resolved)
        return resolved

    def extend(self, pulses: Iterable[SpherePulse | Mapping[str, object]]) -> None:
        for pulse in pulses:
            self.capture(pulse)

    # --------------------------------------------------------------------- snapshot
    def snapshot(self, name: str) -> SphereSnapshot:
        key = _normalise_key(name)
        profile = self._profiles.get(key)
        if profile is None:
            raise KeyError(f"sphere '{name}' is not registered")
        history = tuple(self._pulses.get(key, ()))
        if history:
            total_weight = sum(pulse.weight for pulse in history) or 1.0
            weighted_sum = sum(pulse.resonance * pulse.weight for pulse in history)
            resonance_index = weighted_sum / total_weight
            resonance_trend = self._calculate_trend(history)
            energy_delta = sum(pulse.energy_delta_twh for pulse in history)
            density_shift = sum(pulse.density_shift for pulse in history)
        else:
            resonance_index = profile.vibrational_state
            resonance_trend = 0.0
            energy_delta = 0.0
            density_shift = 0.0
        total_energy = profile.energy_output_twh + energy_delta
        return SphereSnapshot(
            sphere=profile,
            resonance_index=resonance_index,
            resonance_trend=resonance_trend,
            total_energy_output_twh=total_energy,
            cumulative_energy_delta_twh=energy_delta,
            cumulative_density_shift=density_shift,
            pulses=history,
        )

    def _calculate_trend(self, history: Sequence[SpherePulse]) -> float:
        if len(history) < 2:
            return 0.0
        window = min(6, len(history))
        recent = history[-window:]
        baseline = sum(p.resonance for p in history[:window]) / window
        latest = sum(p.resonance for p in recent) / len(recent)
        raw_trend = latest - baseline
        return raw_trend * (1.0 - self._smoothing) + history[-1].resonance * self._smoothing

    # -------------------------------------------------------------- assignments util
    def _active_sphere_keys(self, spheres: Sequence[str] | None) -> set[str]:
        if not spheres:
            return set()
        keys: set[str] = set()
        for raw in spheres:
            key = _normalise_key(raw)
            if key in self._profiles:
                keys.add(key)
        return keys

    def _sync_assignments(
        self, collaborator: SphereCollaborator, previous: Sequence[str] | None
    ) -> None:
        previous_keys = self._active_sphere_keys(previous)
        current_keys = self._active_sphere_keys(collaborator.spheres)
        removed = previous_keys - current_keys
        added = current_keys - previous_keys
        for key in removed:
            assignments = self._sphere_assignments.get(key)
            if assignments:
                assignments.discard(collaborator.identifier)
        for key in added:
            self._sphere_assignments.setdefault(key, set()).add(collaborator.identifier)

    def _clear_assignments(self, collaborator: SphereCollaborator) -> None:
        for key in self._active_sphere_keys(collaborator.spheres):
            assignments = self._sphere_assignments.get(key)
            if assignments:
                assignments.discard(collaborator.identifier)

    # ------------------------------------------------------------------- aggregates
    def network_state(self) -> SphereNetworkState:
        snapshots: MutableMapping[str, SphereSnapshot] = {}
        for key in self._profiles:
            snapshots[key] = self.snapshot(key)
        if snapshots:
            average_resonance = sum(snapshot.resonance_index for snapshot in snapshots.values()) / len(snapshots)
            total_energy_output = sum(snapshot.total_energy_output_twh for snapshot in snapshots.values())
            total_energy_delta = sum(snapshot.cumulative_energy_delta_twh for snapshot in snapshots.values())
        else:
            average_resonance = 0.0
            total_energy_output = 0.0
            total_energy_delta = 0.0
        collaboration_scores: dict[str, float] = {key: 0.0 for key in snapshots}
        collaborator_shares: dict[str, float] = {}
        for identifier, collaborator in self._collaborators.items():
            active = self._active_sphere_keys(collaborator.spheres)
            if not active:
                continue
            collaborator_shares[identifier] = collaborator.support_score() / len(active)
        role_manifest_builder: dict[str, list[SphereRoleManifestEntry]] = {}
        for collaborator in self._collaborators.values():
            if not collaborator.responsibilities:
                continue
            for sphere_key, responsibility in collaborator.responsibilities.items():
                snapshot = snapshots.get(sphere_key)
                if snapshot is None:
                    continue
                manifest_entries = role_manifest_builder.setdefault(
                    snapshot.sphere.name, []
                )
                manifest_entries.append(
                    SphereRoleManifestEntry(
                        collaborator_id=collaborator.identifier,
                        collaborator_name=collaborator.name,
                        role=collaborator.role,
                        tasks=responsibility.tasks,
                        permissions=responsibility.permissions,
                        priority=responsibility.priority,
                    )
                )
        for sphere_key in collaboration_scores:
            assignments = self._sphere_assignments.get(sphere_key)
            if not assignments:
                continue
            score = 0.0
            for identifier in assignments:
                share = collaborator_shares.get(identifier)
                if share is None:
                    continue
                score = _clamp(score + share, lower=0.0, upper=1.0)
            collaboration_scores[sphere_key] = score
        if collaboration_scores:
            collaboration_mean = sum(collaboration_scores.values()) / len(collaboration_scores)
        else:
            collaboration_mean = 0.0
        resonance_normalised = (
            _clamp((average_resonance + 1.0) / 2.0, lower=0.0, upper=1.0)
            if snapshots
            else 0.0
        )
        consciousness_resilience = _clamp(
            resonance_normalised * 0.6 + collaboration_mean * 0.4,
            lower=0.0,
            upper=1.0,
        )
        attention = tuple(
            snapshot.sphere.name
            for snapshot in sorted(
                snapshots.values(),
                key=lambda snap: (snap.resonance_index, snap.sphere.name.lower()),
            )
            if snapshot.resonance_index < self._attention_threshold
        )
        role_manifest: dict[str, tuple[SphereRoleManifestEntry, ...]] = {}
        for sphere_name, entries in role_manifest_builder.items():
            role_manifest[sphere_name] = tuple(
                sorted(
                    entries,
                    key=lambda entry: (
                        -entry.priority,
                        entry.collaborator_name.lower(),
                        entry.collaborator_id,
                    ),
                )
            )
        collaboration_health = {
            snapshots[key].sphere.name: collaboration_scores.get(key, 0.0)
            for key in snapshots
        }
        return SphereNetworkState(
            average_resonance=average_resonance,
            total_energy_output_twh=total_energy_output,
            total_energy_delta_twh=total_energy_delta,
            spheres_requiring_attention=attention,
            snapshots=snapshots,
            collaborators=dict(self._collaborators),
            consciousness_resilience=consciousness_resilience,
            collaboration_health=collaboration_health,
            role_manifest=role_manifest,
        )

    def export_state(self) -> dict[str, object]:
        state = self.network_state()
        return {
            "average_resonance": state.average_resonance,
            "total_energy_output_twh": state.total_energy_output_twh,
            "total_energy_delta_twh": state.total_energy_delta_twh,
            "spheres_requiring_attention": state.spheres_requiring_attention,
            "consciousness_resilience": state.consciousness_resilience,
            "collaboration_health": dict(state.collaboration_health),
            "collaborators": {
                identifier: collaborator.as_dict()
                for identifier, collaborator in state.collaborators.items()
            },
            "snapshots": {
                key: snapshot.as_dict()
                for key, snapshot in state.snapshots.items()
            },
            "role_manifest": {
                sphere: [entry.as_dict() for entry in entries]
                for sphere, entries in state.role_manifest.items()
            },
        }

    def collaboration_manifest(self) -> dict[str, object]:
        state = self.network_state()
        return {
            "consciousness_resilience": state.consciousness_resilience,
            "collaboration_health": dict(state.collaboration_health),
            "collaborators": {
                identifier: collaborator.as_dict()
                for identifier, collaborator in state.collaborators.items()
            },
            "role_manifest": {
                sphere: [entry.as_dict() for entry in entries]
                for sphere, entries in state.role_manifest.items()
            },
        }


def sync_dynamic_agi_collaborators(
    engine: DynamicSpheresEngine,
    agi: "DynamicAGIModel",
    *,
    spheres: Sequence[str] | None = None,
) -> tuple[SphereCollaborator, SphereCollaborator, SphereCollaborator, SphereCollaborator]:
    """Synchronise a :class:`DynamicSpheresEngine` with a Dynamic AGI model."""

    return engine.sync_with_dynamic_agi(agi, spheres=spheres)
