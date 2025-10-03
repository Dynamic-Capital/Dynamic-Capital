"""Conscious quantum collapse cycle implementation.

This module operationalises the DCM–DCH–DCR framework by providing a
numerically stable simulator for open quantum systems with intention-driven
feedback.  Each domain (e.g. market, psychology) is modelled as a small Hilbert
space whose density matrix evolves under a Hamiltonian, Lindblad decoherence
channels, and optional conscious projection terms.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, MutableMapping

try:  # pragma: no cover - dependency guard
    import numpy as np
except ModuleNotFoundError as exc:  # pragma: no cover - dependency guard
    raise ModuleNotFoundError(
        "numpy is required for conscious collapse simulations"
    ) from exc

__all__ = [
    "LindbladChannel",
    "MeasurementMap",
    "DomainConfig",
    "DomainSnapshot",
    "ConsciousCollapseEngine",
]

# ---------------------------------------------------------------------------
# dataclasses and helpers


@dataclass(slots=True)
class LindbladChannel:
    """Single Lindblad decay channel."""

    operator: np.ndarray
    rate: float

    def __post_init__(self) -> None:
        self.operator = _as_matrix(self.operator)
        if self.operator.shape[0] != self.operator.shape[1]:
            raise ValueError("lindblad operator must be square")
        self.rate = float(self.rate)
        if self.rate < 0:
            raise ValueError("lindblad rate must be non-negative")


MeasurementMap = Mapping[str, np.ndarray]


@dataclass(slots=True)
class DomainConfig:
    """Configuration bundle for a conscious domain."""

    hamiltonian: np.ndarray
    channels: tuple[LindbladChannel, ...] = field(default_factory=tuple)
    measurements: MeasurementMap | None = None
    quality_operator: np.ndarray | None = None

    def __post_init__(self) -> None:
        self.hamiltonian = _as_matrix(self.hamiltonian)
        if self.hamiltonian.shape[0] != self.hamiltonian.shape[1]:
            raise ValueError("hamiltonian must be square")
        for channel in self.channels:
            if channel.operator.shape != self.hamiltonian.shape:
                raise ValueError("lindblad operator shape mismatch")
        if self.measurements is not None:
            converted: dict[str, np.ndarray] = {}
            for label, op in self.measurements.items():
                if not label:
                    raise ValueError("measurement label must not be empty")
                op = _as_matrix(op)
                if op.shape != self.hamiltonian.shape:
                    raise ValueError("measurement operator shape mismatch")
                converted[label] = op
            self.measurements = converted
        if self.quality_operator is not None:
            quality = _as_matrix(self.quality_operator)
            if quality.shape != self.hamiltonian.shape:
                raise ValueError("quality operator shape mismatch")
            self.quality_operator = quality

    @property
    def dimension(self) -> int:
        return self.hamiltonian.shape[0]


@dataclass(slots=True)
class DomainSnapshot:
    """State diagnostics after an evolution step."""

    density_matrix: np.ndarray
    coherence: float
    purity: float
    measurement_probabilities: Mapping[str, float]
    renewal_quality: float | None

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "density_matrix": self.density_matrix,
            "coherence": self.coherence,
            "purity": self.purity,
            "measurement_probabilities": dict(self.measurement_probabilities),
            "renewal_quality": self.renewal_quality,
        }


# ---------------------------------------------------------------------------
# core engine


class ConsciousCollapseEngine:
    """Simulate multi-domain DCM–DCH–DCR dynamics."""

    def __init__(
        self,
        initial_states: Mapping[str, np.ndarray],
        configs: Mapping[str, DomainConfig],
        *,
        hbar: float = 1.0,
    ) -> None:
        if hbar <= 0:
            raise ValueError("hbar must be positive")
        if set(initial_states) != set(configs):
            raise ValueError("initial_states and configs must reference the same domains")
        self._hbar = float(hbar)
        self._domains: dict[str, _DomainState] = {}
        for name, psi in initial_states.items():
            config = configs[name]
            self._domains[name] = _DomainState(config=config, psi0=_as_vector(psi))

    @property
    def domain_names(self) -> tuple[str, ...]:
        return tuple(self._domains)

    def step(
        self,
        dt: float,
        *,
        intention_projectors: Mapping[str, np.ndarray] | None = None,
        intention_strength: float | Mapping[str, float] = 0.0,
    ) -> Mapping[str, DomainSnapshot]:
        if dt <= 0:
            raise ValueError("dt must be positive")
        snapshots: dict[str, DomainSnapshot] = {}
        for name, domain in self._domains.items():
            projector = None
            if intention_projectors is not None:
                projector = intention_projectors.get(name)
                if projector is not None:
                    projector = _as_matrix(projector)
                    if projector.shape != domain.config.hamiltonian.shape:
                        raise ValueError("intention projector shape mismatch")
            strength = _resolve_strength(intention_strength, name)
            domain.evolve(dt, self._hbar, projector, strength)
            snapshots[name] = domain.snapshot()
        return snapshots

    def collapse(self, domain_name: str, measurement_label: str) -> DomainSnapshot:
        if domain_name not in self._domains:
            raise KeyError(f"unknown domain '{domain_name}'")
        domain = self._domains[domain_name]
        domain.collapse(measurement_label)
        return domain.snapshot()

    def density_matrix(self, domain_name: str) -> np.ndarray:
        if domain_name not in self._domains:
            raise KeyError(f"unknown domain '{domain_name}'")
        return np.array(self._domains[domain_name].rho, copy=True)


# ---------------------------------------------------------------------------
# internal helpers


class _DomainState:
    def __init__(self, *, config: DomainConfig, psi0: np.ndarray) -> None:
        if psi0.ndim != 1:
            raise ValueError("initial state must be a vector")
        if psi0.shape[0] != config.dimension:
            raise ValueError("initial state dimension mismatch")
        norm = np.linalg.norm(psi0)
        if norm == 0:
            raise ValueError("initial state must not be the zero vector")
        self.config = config
        self.rho = _pure_density(psi0 / norm)

    def evolve(
        self,
        dt: float,
        hbar: float,
        projector: np.ndarray | None,
        strength: float,
    ) -> None:
        rho = self.rho
        config = self.config
        h = config.hamiltonian
        commutator = h @ rho - rho @ h
        drho = (-1j / hbar) * commutator
        for channel in config.channels:
            l = channel.operator
            dissipator = l @ rho @ l.conj().T - 0.5 * (l.conj().T @ l @ rho + rho @ l.conj().T @ l)
            drho += channel.rate * dissipator
        if projector is not None and strength != 0.0:
            expectation = float(np.real(np.trace(rho @ projector)))
            correction = projector @ rho + rho @ projector - 2.0 * expectation * rho
            drho += float(strength) * correction
        rho = rho + dt * drho
        self.rho = _enforce_physical(rho)

    def snapshot(self) -> DomainSnapshot:
        rho = self.rho
        measurement_probs: dict[str, float] = {}
        if self.config.measurements is not None:
            for label, op in self.config.measurements.items():
                effect = op.conj().T @ op
                prob = float(np.real(np.trace(effect @ rho)))
                measurement_probs[label] = max(0.0, min(1.0, prob))
        quality = None
        if self.config.quality_operator is not None:
            quality = float(np.real(np.trace(self.config.quality_operator @ rho)))
        return DomainSnapshot(
            density_matrix=np.array(rho, copy=True),
            coherence=_coherence_measure(rho),
            purity=_purity(rho),
            measurement_probabilities=measurement_probs,
            renewal_quality=quality,
        )

    def collapse(self, label: str) -> None:
        if self.config.measurements is None:
            raise RuntimeError("domain has no measurement operators configured")
        if label not in self.config.measurements:
            raise KeyError(f"unknown measurement '{label}'")
        operator = self.config.measurements[label]
        post = operator @ self.rho @ operator.conj().T
        probability = float(np.real(np.trace(post)))
        if probability <= 0:
            raise RuntimeError("measurement has zero probability for current state")
        self.rho = _enforce_physical(post / probability)


def _resolve_strength(value: float | Mapping[str, float], name: str) -> float:
    if isinstance(value, Mapping):
        raw = value.get(name, 0.0)
    else:
        raw = value
    return float(raw)


def _pure_density(psi: np.ndarray) -> np.ndarray:
    return np.outer(psi, psi.conj())


def _as_matrix(value: np.ndarray) -> np.ndarray:
    array = np.asarray(value, dtype=np.complex128)
    if array.ndim != 2:
        raise ValueError("matrix input must be two-dimensional")
    return array


def _as_vector(value: np.ndarray) -> np.ndarray:
    array = np.asarray(value, dtype=np.complex128)
    if array.ndim != 1:
        raise ValueError("vector input must be one-dimensional")
    return array


def _enforce_physical(rho: np.ndarray) -> np.ndarray:
    sym = 0.5 * (rho + rho.conj().T)
    eigvals, eigvecs = np.linalg.eigh(sym)
    eigvals = np.clip(eigvals, 0.0, None)
    reconstructed = (eigvecs * eigvals) @ eigvecs.conj().T
    trace = float(np.real(np.trace(reconstructed)))
    if trace <= 0:
        raise RuntimeError("density matrix trace vanished")
    return reconstructed / trace


def _coherence_measure(rho: np.ndarray) -> float:
    off_diag = rho - np.diag(np.diag(rho))
    return float(np.sum(np.abs(off_diag)))


def _purity(rho: np.ndarray) -> float:
    value = float(np.real(np.trace(rho @ rho)))
    return max(0.0, min(1.0, value))
