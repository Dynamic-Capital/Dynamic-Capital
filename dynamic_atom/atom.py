"""Atomic energy state modelling for Dynamic Capital orchestration."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
import math
from typing import Deque, Iterable, Literal, Mapping, MutableMapping, Sequence, Tuple

__all__ = [
    "AtomicComposition",
    "AtomSnapshot",
    "DynamicAtom",
    "ElectronShell",
    "ElectronTransition",
    "ExcitationResult",
    "RelaxationResult",
    "TransitionLogEntry",
]


# ---------------------------------------------------------------------------
# helpers


def _ensure_positive_int(value: int, *, field_name: str) -> int:
    if int(value) != value or value <= 0:
        raise ValueError(f"{field_name} must be a positive integer")
    return int(value)


def _ensure_non_negative_int(value: int, *, field_name: str) -> int:
    if int(value) != value or value < 0:
        raise ValueError(f"{field_name} must be a non-negative integer")
    return int(value)


def _ensure_finite_float(value: float, *, field_name: str) -> float:
    numeric = float(value)
    if not math.isfinite(numeric):
        raise ValueError(f"{field_name} must be a finite number")
    return numeric


def _ensure_utc(moment: datetime | None) -> datetime:
    if moment is None:
        return datetime.now(timezone.utc)
    if moment.tzinfo is None:
        return moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(timezone.utc)


def _normalise_symbol(symbol: str) -> str:
    cleaned = symbol.strip()
    if not cleaned:
        raise ValueError("symbol must not be empty")
    if len(cleaned) == 1:
        return cleaned.upper()
    return cleaned[0].upper() + cleaned[1:].lower()


def _ensure_mapping(metadata: Mapping[str, object] | None) -> MutableMapping[str, object]:
    if metadata is None:
        return {}
    if not isinstance(metadata, Mapping):
        raise TypeError("metadata must be a mapping when provided")
    return dict(metadata)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class AtomicComposition:
    """Describes the immutable nucleus of the atom."""

    symbol: str
    protons: int
    neutrons: int
    electrons: int
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.symbol = _normalise_symbol(self.symbol)
        self.protons = _ensure_positive_int(self.protons, field_name="protons")
        self.neutrons = _ensure_positive_int(self.neutrons, field_name="neutrons")
        self.electrons = _ensure_non_negative_int(self.electrons, field_name="electrons")
        self.metadata = _ensure_mapping(self.metadata)

    @property
    def mass_number(self) -> int:
        return self.protons + self.neutrons

    @property
    def charge(self) -> int:
        return self.protons - self.electrons

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "symbol": self.symbol,
            "protons": self.protons,
            "neutrons": self.neutrons,
            "electrons": self.electrons,
            "mass_number": self.mass_number,
            "charge": self.charge,
            "metadata": dict(self.metadata),
        }


@dataclass(slots=True)
class ElectronShell:
    """Represents a quantised electron shell around the nucleus."""

    name: str
    principal_quantum_number: int
    capacity: int
    energy_ev: float
    electrons: int = 0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = self.name.strip()
        if not self.name:
            raise ValueError("shell name must not be empty")
        self.principal_quantum_number = _ensure_positive_int(
            self.principal_quantum_number, field_name="principal_quantum_number"
        )
        self.capacity = _ensure_positive_int(self.capacity, field_name="capacity")
        self.energy_ev = _ensure_finite_float(self.energy_ev, field_name="energy_ev")
        self.electrons = _ensure_non_negative_int(self.electrons, field_name="electrons")
        if self.electrons > self.capacity:
            raise ValueError("electrons cannot exceed shell capacity")
        self.metadata = _ensure_mapping(self.metadata)

    @property
    def available_capacity(self) -> int:
        return self.capacity - self.electrons

    @property
    def occupancy_ratio(self) -> float:
        if self.capacity == 0:
            return 0.0
        return self.electrons / self.capacity

    def add_electron(self, count: int = 1) -> None:
        count = _ensure_positive_int(count, field_name="count")
        if self.electrons + count > self.capacity:
            raise ValueError("adding electrons would exceed shell capacity")
        self.electrons += count

    def remove_electron(self, count: int = 1) -> None:
        count = _ensure_positive_int(count, field_name="count")
        if self.electrons - count < 0:
            raise ValueError("cannot remove more electrons than present")
        self.electrons -= count

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "principal_quantum_number": self.principal_quantum_number,
            "capacity": self.capacity,
            "energy_ev": self.energy_ev,
            "electrons": self.electrons,
            "occupancy_ratio": self.occupancy_ratio,
            "metadata": dict(self.metadata),
        }


@dataclass(slots=True)
class ElectronTransition:
    """Represents the movement of an electron between shells."""

    from_shell: str
    to_shell: str
    energy_ev: float
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.from_shell = self.from_shell.strip()
        self.to_shell = self.to_shell.strip()
        if not self.from_shell or not self.to_shell:
            raise ValueError("shell names must not be empty")
        self.energy_ev = _ensure_finite_float(self.energy_ev, field_name="energy_ev")
        if self.energy_ev <= 0.0:
            raise ValueError("transition energy must be positive")
        self.occurred_at = _ensure_utc(self.occurred_at)
        self.metadata = _ensure_mapping(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "from_shell": self.from_shell,
            "to_shell": self.to_shell,
            "energy_ev": self.energy_ev,
            "occurred_at": self.occurred_at.isoformat(),
            "metadata": dict(self.metadata),
        }


@dataclass(slots=True)
class TransitionLogEntry:
    """Stores the history of excitations and relaxations."""

    kind: Literal["excitation", "relaxation"]
    transition: ElectronTransition

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "kind": self.kind,
            "transition": self.transition.as_dict(),
        }


@dataclass(slots=True)
class ExcitationResult:
    """Outcome returned when the atom absorbs energy."""

    transitions: Tuple[ElectronTransition, ...]
    residual_energy_ev: float

    @property
    def absorbed_energy_ev(self) -> float:
        return sum(transition.energy_ev for transition in self.transitions)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "transitions": [transition.as_dict() for transition in self.transitions],
            "residual_energy_ev": self.residual_energy_ev,
            "absorbed_energy_ev": self.absorbed_energy_ev,
        }


@dataclass(slots=True)
class RelaxationResult:
    """Outcome returned when the atom relaxes towards its ground state."""

    transitions: Tuple[ElectronTransition, ...]
    emitted_energy_ev: float

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "transitions": [transition.as_dict() for transition in self.transitions],
            "emitted_energy_ev": self.emitted_energy_ev,
        }


@dataclass(slots=True)
class AtomSnapshot:
    """Describes the present electron configuration and excitation energy."""

    symbol: str
    charge: int
    mass_number: int
    shell_occupancy: Tuple[MutableMapping[str, object], ...]
    excitation_energy_ev: float
    metadata: Mapping[str, object]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "symbol": self.symbol,
            "charge": self.charge,
            "mass_number": self.mass_number,
            "shell_occupancy": list(self.shell_occupancy),
            "excitation_energy_ev": self.excitation_energy_ev,
            "metadata": dict(self.metadata),
        }


# ---------------------------------------------------------------------------
# defaults


_DEFAULT_SHELL_TEMPLATE: Tuple[Tuple[str, int, int, float], ...] = (
    ("K", 1, 2, 0.0),
    ("L", 2, 8, 10.2),
    ("M", 3, 18, 12.1),
    ("N", 4, 32, 13.5),
)


def _default_shells(electrons: int) -> list[ElectronShell]:
    remaining = electrons
    shells: list[ElectronShell] = []
    for name, n, capacity, energy in _DEFAULT_SHELL_TEMPLATE:
        allocation = min(remaining, capacity)
        shells.append(
            ElectronShell(
                name=name,
                principal_quantum_number=n,
                capacity=capacity,
                energy_ev=energy,
                electrons=allocation,
            )
        )
        remaining -= allocation
    if remaining > 0:
        raise ValueError(
            "Default shell template cannot accommodate all electrons; provide a custom configuration."
        )
    return shells


# ---------------------------------------------------------------------------
# DynamicAtom core


class DynamicAtom:
    """Model atomic excitations with quantised electron shell transitions."""

    def __init__(
        self,
        composition: AtomicComposition,
        *,
        shells: Sequence[ElectronShell] | None = None,
        history_limit: int | None = 256,
        metadata: Mapping[str, object] | None = None,
    ) -> None:
        self._composition = composition
        if history_limit is not None and history_limit <= 0:
            raise ValueError("history_limit must be positive when provided")
        self._metadata = _ensure_mapping(metadata)
        source_shells = list(shells) if shells is not None else _default_shells(composition.electrons)
        if not source_shells:
            raise ValueError("at least one electron shell must be supplied")
        # create defensive copies to avoid mutating external objects
        self._shells: tuple[ElectronShell, ...] = tuple(replace(shell) for shell in source_shells)
        self._validate_shell_configuration()
        self._ground_distribution: tuple[int, ...] = tuple(shell.electrons for shell in self._shells)
        total_ground_electrons = sum(self._ground_distribution)
        if total_ground_electrons != composition.electrons:
            raise ValueError(
                "sum of shell electrons must equal composition electrons in the ground state configuration"
            )
        self._history: Deque[TransitionLogEntry] = deque(maxlen=history_limit)

    # ------------------------------------------------------------------
    # validation and utilities

    def _validate_shell_configuration(self) -> None:
        ordered = sorted(self._shells, key=lambda shell: (shell.principal_quantum_number, shell.energy_ev))
        if list(self._shells) != ordered:
            # reorder to maintain consistent ascending energy representation
            self._shells = tuple(ordered)
        # ensure strictly increasing energy for successive shells to avoid degeneracy handling complexity
        last_energy = None
        last_n = None
        for shell in self._shells:
            if last_energy is not None:
                if shell.energy_ev < last_energy:
                    raise ValueError("shell energies must be non-decreasing with quantum number")
                if shell.principal_quantum_number < last_n:  # pragma: no cover - defensive guard
                    raise ValueError("principal quantum numbers must be non-decreasing")
            last_energy = shell.energy_ev
            last_n = shell.principal_quantum_number

    def _total_electrons(self) -> int:
        return sum(shell.electrons for shell in self._shells)

    def _ensure_conservation(self) -> None:
        total = self._total_electrons()
        if total != self._composition.electrons:  # pragma: no cover - defensive guard
            raise RuntimeError("electron conservation violated")

    # ------------------------------------------------------------------
    # public properties

    @property
    def composition(self) -> AtomicComposition:
        return self._composition

    @property
    def shells(self) -> tuple[ElectronShell, ...]:
        return self._shells

    @property
    def metadata(self) -> Mapping[str, object]:
        return self._metadata

    @property
    def history(self) -> tuple[TransitionLogEntry, ...]:
        return tuple(self._history)

    @property
    def excitation_energy_ev(self) -> float:
        return sum(
            (shell.energy_ev * (shell.electrons - ground))
            for shell, ground in zip(self._shells, self._ground_distribution)
        )

    # ------------------------------------------------------------------
    # state transitions

    def excite(self, energy_ev: float, *, timestamp: datetime | None = None) -> ExcitationResult:
        available = _ensure_finite_float(energy_ev, field_name="energy_ev")
        if available <= 0.0:
            raise ValueError("energy_ev must be positive for excitation")
        moment = _ensure_utc(timestamp)
        transitions: list[ElectronTransition] = []
        while True:
            candidate: tuple[float, int, int] | None = None
            for lower_index, lower_shell in enumerate(self._shells[:-1]):
                if lower_shell.electrons <= 0:
                    continue
                for higher_index in range(lower_index + 1, len(self._shells)):
                    higher_shell = self._shells[higher_index]
                    if higher_shell.available_capacity <= 0:
                        continue
                    delta = higher_shell.energy_ev - lower_shell.energy_ev
                    if delta <= 0.0:
                        continue
                    if delta > available + 1e-9:
                        continue
                    if candidate is None or delta > candidate[0]:
                        candidate = (delta, lower_index, higher_index)
            if candidate is None:
                break
            delta, lower_idx, higher_idx = candidate
            lower_shell = self._shells[lower_idx]
            higher_shell = self._shells[higher_idx]
            lower_shell.remove_electron()
            higher_shell.add_electron()
            available -= delta
            transition = ElectronTransition(
                from_shell=lower_shell.name,
                to_shell=higher_shell.name,
                energy_ev=delta,
                occurred_at=moment,
            )
            transitions.append(transition)
            if self._history.maxlen != 0:
                self._history.append(TransitionLogEntry(kind="excitation", transition=transition))
        self._ensure_conservation()
        return ExcitationResult(transitions=tuple(transitions), residual_energy_ev=available)

    def relax(self, *, timestamp: datetime | None = None) -> RelaxationResult:
        moment = _ensure_utc(timestamp)
        transitions: list[ElectronTransition] = []
        emitted = 0.0
        while True:
            candidate: tuple[float, int, int] | None = None
            for higher_index in range(len(self._shells) - 1, -1, -1):
                higher_shell = self._shells[higher_index]
                surplus = higher_shell.electrons - self._ground_distribution[higher_index]
                if surplus <= 0:
                    continue
                for lower_index in range(higher_index - 1, -1, -1):
                    lower_shell = self._shells[lower_index]
                    deficit = self._ground_distribution[lower_index] - lower_shell.electrons
                    if deficit <= 0:
                        continue
                    delta = higher_shell.energy_ev - lower_shell.energy_ev
                    if delta <= 0.0:
                        continue
                    if candidate is None or delta > candidate[0]:
                        candidate = (delta, lower_index, higher_index)
            if candidate is None:
                break
            delta, lower_idx, higher_idx = candidate
            higher_shell = self._shells[higher_idx]
            lower_shell = self._shells[lower_idx]
            higher_shell.remove_electron()
            lower_shell.add_electron()
            emitted += delta
            transition = ElectronTransition(
                from_shell=higher_shell.name,
                to_shell=lower_shell.name,
                energy_ev=delta,
                occurred_at=moment,
            )
            transitions.append(transition)
            if self._history.maxlen != 0:
                self._history.append(TransitionLogEntry(kind="relaxation", transition=transition))
        self._ensure_conservation()
        return RelaxationResult(transitions=tuple(transitions), emitted_energy_ev=emitted)

    # ------------------------------------------------------------------
    # observation

    def snapshot(self) -> AtomSnapshot:
        occupancy = tuple(shell.as_dict() for shell in self._shells)
        return AtomSnapshot(
            symbol=self._composition.symbol,
            charge=self._composition.charge,
            mass_number=self._composition.mass_number,
            shell_occupancy=occupancy,
            excitation_energy_ev=self.excitation_energy_ev,
            metadata=self._metadata,
        )

    def iter_shells(self) -> Iterable[ElectronShell]:
        return iter(self._shells)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "composition": self._composition.as_dict(),
            "snapshot": self.snapshot().as_dict(),
            "history": [entry.as_dict() for entry in self._history],
        }
