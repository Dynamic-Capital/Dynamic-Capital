"""Dynamic physics simulation and insight generation."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from math import fsum, sqrt
from types import MappingProxyType
from typing import Deque, Dict, Iterable, Mapping, MutableMapping

__all__ = [
    "DynamicPhysicsEngine",
    "ForceEvent",
    "PhysicsBody",
    "PhysicsSnapshot",
    "Vector3",
    "compute_energy_breakdown",
]


# ---------------------------------------------------------------------------
# helpers


def _coerce_float(value: float) -> float:
    return float(value)


def _clamp_non_negative(value: float) -> float:
    numeric = float(value)
    if numeric < 0.0:
        return 0.0
    return numeric


def _ensure_identifier(identifier: str) -> str:
    text = str(identifier).strip()
    if not text:
        raise ValueError("identifier must not be empty")
    return text


def _normalise_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if isinstance(metadata, MappingProxyType):
        return metadata
    if not isinstance(metadata, Mapping):
        raise TypeError("metadata must be a mapping")
    return MappingProxyType(dict(metadata))


# ---------------------------------------------------------------------------
# domain primitives


@dataclass(slots=True)
class Vector3:
    """Simple three-dimensional vector supporting basic operations."""

    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

    def __post_init__(self) -> None:
        self.x = _coerce_float(self.x)
        self.y = _coerce_float(self.y)
        self.z = _coerce_float(self.z)

    def __add__(self, other: "Vector3") -> "Vector3":
        if not isinstance(other, Vector3):
            return NotImplemented
        return Vector3(self.x + other.x, self.y + other.y, self.z + other.z)

    def __sub__(self, other: "Vector3") -> "Vector3":
        if not isinstance(other, Vector3):
            return NotImplemented
        return Vector3(self.x - other.x, self.y - other.y, self.z - other.z)

    def scale(self, factor: float) -> "Vector3":
        numeric = float(factor)
        return Vector3(self.x * numeric, self.y * numeric, self.z * numeric)

    def dot(self, other: "Vector3") -> float:
        if not isinstance(other, Vector3):
            raise TypeError("other must be a Vector3 instance")
        return (self.x * other.x) + (self.y * other.y) + (self.z * other.z)

    def magnitude(self) -> float:
        return sqrt(self.dot(self))

    def normalised(self) -> "Vector3":
        length = self.magnitude()
        if length == 0:
            return Vector3()
        return self.scale(1.0 / length)

    def as_tuple(self) -> tuple[float, float, float]:
        return (self.x, self.y, self.z)

    @classmethod
    def zero(cls) -> "Vector3":
        return cls(0.0, 0.0, 0.0)


@dataclass(slots=True)
class PhysicsBody:
    """Represents a body being tracked by the simulation."""

    identifier: str
    mass: float
    position: Vector3 = field(default_factory=Vector3)
    velocity: Vector3 = field(default_factory=Vector3)
    pinned: bool = False
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _ensure_identifier(self.identifier)
        self.mass = float(self.mass)
        if self.mass <= 0.0:
            raise ValueError("mass must be greater than zero")
        if not isinstance(self.position, Vector3):
            raise TypeError("position must be a Vector3 instance")
        if not isinstance(self.velocity, Vector3):
            raise TypeError("velocity must be a Vector3 instance")
        self.pinned = bool(self.pinned)
        self.metadata = _normalise_metadata(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "identifier": self.identifier,
            "mass": self.mass,
            "position": self.position.as_tuple(),
            "velocity": self.velocity.as_tuple(),
            "pinned": self.pinned,
            "metadata": dict(self.metadata) if self.metadata is not None else None,
        }


@dataclass(slots=True)
class ForceEvent:
    """A continuous force applied to a body over a duration."""

    body_id: str
    force: Vector3
    duration: float = 0.0
    delay: float = 0.0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.body_id = _ensure_identifier(self.body_id)
        if not isinstance(self.force, Vector3):
            raise TypeError("force must be a Vector3 instance")
        self.duration = _clamp_non_negative(self.duration)
        self.delay = _clamp_non_negative(self.delay)
        self.metadata = _normalise_metadata(self.metadata)


@dataclass(slots=True)
class PhysicsSnapshot:
    """Immutable view of the simulation state."""

    time: float
    bodies: Mapping[str, Mapping[str, object]]
    total_kinetic_energy: float
    total_potential_energy: float

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "time": self.time,
            "bodies": {key: dict(value) for key, value in self.bodies.items()},
            "total_kinetic_energy": self.total_kinetic_energy,
            "total_potential_energy": self.total_potential_energy,
        }


# ---------------------------------------------------------------------------
# engine


class DynamicPhysicsEngine:
    """Integrates simple rigid body motion with configurable forces."""

    def __init__(
        self,
        *,
        gravity: Vector3 | None = None,
        damping: float = 0.015,
    ) -> None:
        self.gravity = gravity if gravity is not None else Vector3(0.0, -9.81, 0.0)
        if not isinstance(self.gravity, Vector3):
            raise TypeError("gravity must be a Vector3 instance")
        self.damping = _clamp_non_negative(damping)
        self._time = 0.0
        self._bodies: Dict[str, PhysicsBody] = {}
        self._forces: Deque[tuple[ForceEvent, float]] = deque()

    @property
    def time(self) -> float:
        return self._time

    @property
    def bodies(self) -> Mapping[str, PhysicsBody]:
        return MappingProxyType(self._bodies)

    def add_body(self, body: PhysicsBody) -> None:
        if body.identifier in self._bodies:
            raise ValueError(f"body '{body.identifier}' already registered")
        self._bodies[body.identifier] = body

    def remove_body(self, identifier: str) -> None:
        key = _ensure_identifier(identifier)
        self._bodies.pop(key, None)
        self._forces = deque(
            (event, remaining)
            for event, remaining in self._forces
            if event.body_id != key
        )

    def queue_force(self, event: ForceEvent) -> None:
        self._forces.append((event, event.duration))

    def apply_impulse(self, identifier: str, impulse: Vector3) -> None:
        key = _ensure_identifier(identifier)
        body = self._bodies.get(key)
        if body is None or body.pinned:
            return
        if not isinstance(impulse, Vector3):
            raise TypeError("impulse must be a Vector3 instance")
        delta_velocity = impulse.scale(1.0 / body.mass)
        body.velocity = body.velocity + delta_velocity

    def _apply_forces(self, dt: float) -> None:
        updated: Deque[tuple[ForceEvent, float]] = deque()
        for event, remaining in self._forces:
            if event.delay > 0.0:
                new_delay = max(event.delay - dt, 0.0)
                updated.append((ForceEvent(event.body_id, event.force, remaining, new_delay, event.metadata), remaining))
                continue
            body = self._bodies.get(event.body_id)
            if body is None or body.pinned:
                continue
            slice_dt = min(dt, remaining)
            acceleration = event.force.scale(1.0 / body.mass)
            body.velocity = body.velocity + acceleration.scale(slice_dt)
            remaining -= slice_dt
            if remaining > 0.0:
                updated.append((ForceEvent(event.body_id, event.force, remaining, 0.0, event.metadata), remaining))
        self._forces = updated

    def step(self, dt: float, *, substeps: int = 1) -> PhysicsSnapshot:
        timestep = float(dt)
        if timestep <= 0.0:
            raise ValueError("dt must be greater than zero")
        if substeps <= 0:
            raise ValueError("substeps must be positive")
        increment = timestep / float(substeps)
        for _ in range(substeps):
            self._apply_forces(increment)
            for body in self._bodies.values():
                if body.pinned:
                    continue
                # apply gravity
                body.velocity = body.velocity + self.gravity.scale(increment)
                # integrate position
                body.position = body.position + body.velocity.scale(increment)
                # apply linear damping
                damping_factor = max(0.0, 1.0 - (self.damping * increment))
                body.velocity = body.velocity.scale(damping_factor)
            self._time += increment
        return self.snapshot()

    def snapshot(self) -> PhysicsSnapshot:
        state: Dict[str, Mapping[str, object]] = {}
        for identifier, body in self._bodies.items():
            state[identifier] = MappingProxyType(
                {
                    "mass": body.mass,
                    "position": body.position.as_tuple(),
                    "velocity": body.velocity.as_tuple(),
                    "pinned": body.pinned,
                    "metadata": dict(body.metadata) if body.metadata is not None else None,
                }
            )
        kinetic, potential = compute_energy_breakdown(self._bodies.values(), gravity=self.gravity)
        return PhysicsSnapshot(
            time=self._time,
            bodies=MappingProxyType(state),
            total_kinetic_energy=kinetic,
            total_potential_energy=potential,
        )

    def advance_until(self, target_time: float, *, max_step: float = 0.1) -> PhysicsSnapshot:
        goal = float(target_time)
        if goal < self._time:
            raise ValueError("target_time must be greater than or equal to current time")
        step_size = float(max_step)
        if step_size <= 0.0:
            raise ValueError("max_step must be greater than zero")
        while self._time + step_size < goal:
            self.step(step_size)
        remaining = goal - self._time
        if remaining > 0.0:
            self.step(remaining)
        return self.snapshot()

    def run_forces(self, events: Iterable[ForceEvent], *, dt: float) -> PhysicsSnapshot:
        for event in events:
            self.queue_force(event)
        return self.step(dt)


def compute_energy_breakdown(
    bodies: Iterable[PhysicsBody],
    *,
    gravity: Vector3,
) -> tuple[float, float]:
    """Return aggregate kinetic and potential energy for a set of bodies.

    This helper mirrors the calculations performed in :meth:`DynamicPhysicsEngine.snapshot`
    so teams can evaluate energy trends without instantiating an engine.  It also keeps the
    energy accounting logic in one place, which makes the project easier to maintain.
    """

    gravity_direction = gravity.normalised()
    gravity_magnitude = gravity.magnitude()
    kinetic_terms: list[float] = []
    potential_terms: list[float] = []
    for body in bodies:
        speed = body.velocity.magnitude()
        kinetic_terms.append(0.5 * body.mass * (speed**2))
        height = body.position.dot(gravity_direction.scale(-1.0))
        potential_terms.append(body.mass * gravity_magnitude * max(height, 0.0))
    return fsum(kinetic_terms), fsum(potential_terms)
