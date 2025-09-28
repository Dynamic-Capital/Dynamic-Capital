"""Utilities for simple quantum mechanics modelling.

This module intentionally keeps the abstractions lightweight so that the
toolkit can be used in teaching or prototyping environments without pulling in
heavy numerical dependencies.  The helpers are organised around the core
formulae listed in the accompanying product requirements:

* Schrödinger equation (time dependent and stationary variants)
* Heisenberg uncertainty principle
* Harmonic oscillator energy spectrum
* Spin operators / Pauli matrices
* Relativistic equations (Dirac and Klein–Gordon) represented via helpers that
  prepare the canonical operator structures

The helpers below are not meant to replace a full-featured quantum mechanics
package.  Instead, they provide validated primitives that mirror the referenced
equations and enforce the physical constraints (such as state normalisation).
"""

from __future__ import annotations

from dataclasses import dataclass
from math import isclose
from typing import Iterable, Sequence, Tuple

ComplexTuple = Tuple[complex, ...]
Matrix = Tuple[ComplexTuple, ...]

# Reduced Planck constant (CODATA 2018)
H_BAR: float = 1.054_571_817e-34
SPEED_OF_LIGHT: float = 299_792_458.0


def _ensure_square_matrix(matrix: Matrix) -> Matrix:
    if not matrix:
        raise ValueError("operator matrix must not be empty")
    size = len(matrix)
    for row in matrix:
        if len(row) != size:
            raise ValueError("operator matrix must be square")
    return matrix


def _matrix_vector_product(matrix: Matrix, vector: ComplexTuple) -> ComplexTuple:
    if len(matrix) != len(vector):
        raise ValueError("dimension mismatch between operator and state")
    result = []
    for row in matrix:
        result.append(sum(element * amplitude for element, amplitude in zip(row, vector)))
    return tuple(result)


def _adjoint(matrix: Matrix) -> Matrix:
    size = len(matrix)
    return tuple(tuple(matrix[j][i].conjugate() for j in range(size)) for i in range(size))


def normalise_amplitudes(amplitudes: Iterable[complex]) -> ComplexTuple:
    """Normalise a sequence of amplitudes to satisfy the Born rule."""

    values = tuple(complex(value) for value in amplitudes)
    if not values:
        raise ValueError("at least one amplitude is required")
    norm = sum(abs(value) ** 2 for value in values) ** 0.5
    if norm == 0.0:
        raise ValueError("zero vector cannot be normalised")
    return tuple(value / norm for value in values)


@dataclass(frozen=True)
class Operator:
    """Represents a bounded linear operator in a finite-dimensional Hilbert space."""

    matrix: Matrix

    def __post_init__(self) -> None:  # noqa: D401 - documented in class docstring
        object.__setattr__(self, "matrix", _ensure_square_matrix(self.matrix))

    @property
    def dimension(self) -> int:
        return len(self.matrix)

    def apply(self, state: "QuantumState") -> ComplexTuple:
        if state.dimension != self.dimension:
            raise ValueError("state dimension is incompatible with operator")
        return _matrix_vector_product(self.matrix, state.amplitudes)

    def dagger(self) -> "Operator":
        return Operator(_adjoint(self.matrix))


def commutator(a: Operator, b: Operator) -> Operator:
    """Return the commutator [A, B] = AB - BA."""

    if a.dimension != b.dimension:
        raise ValueError("operators must have matching dimensions")
    size = a.dimension
    product_ab = []
    product_ba = []
    for i in range(size):
        row_ab = []
        row_ba = []
        for j in range(size):
            ab_entry = sum(a.matrix[i][k] * b.matrix[k][j] for k in range(size))
            ba_entry = sum(b.matrix[i][k] * a.matrix[k][j] for k in range(size))
            row_ab.append(ab_entry)
            row_ba.append(ba_entry)
        product_ab.append(tuple(row_ab))
        product_ba.append(tuple(row_ba))
    return Operator(tuple(
        tuple(ab - ba for ab, ba in zip(row_ab, row_ba))
        for row_ab, row_ba in zip(product_ab, product_ba)
    ))


@dataclass(frozen=True)
class QuantumState:
    """Normalised state vector supporting expectation calculations."""

    amplitudes: ComplexTuple

    def __post_init__(self) -> None:
        values = tuple(self.amplitudes)
        if not values:
            raise ValueError("a quantum state requires at least one basis amplitude")
        norm = sum(abs(value) ** 2 for value in values)
        if not isclose(norm, 1.0, rel_tol=1e-9, abs_tol=1e-9):
            raise ValueError("state amplitudes must be normalised to unity")
        object.__setattr__(self, "amplitudes", values)

    @property
    def dimension(self) -> int:
        return len(self.amplitudes)

    def probability(self, index: int) -> float:
        try:
            amplitude = self.amplitudes[index]
        except IndexError as exc:  # pragma: no cover - defensive programming
            raise IndexError("basis index out of range") from exc
        return abs(amplitude) ** 2

    def expectation(self, operator: Operator) -> complex:
        applied = operator.apply(self)
        return sum(
            amplitude.conjugate() * component
            for amplitude, component in zip(self.amplitudes, applied)
        )

    def as_column(self) -> ComplexTuple:
        return self.amplitudes


PAULI_MATRICES: dict[str, Operator] = {
    "sigma_x": Operator(((0 + 0j, 1 + 0j), (1 + 0j, 0 + 0j))),
    "sigma_y": Operator(((0 + 0j, -1j), (1j, 0 + 0j))),
    "sigma_z": Operator(((1 + 0j, 0 + 0j), (0 + 0j, -1 + 0j))),
}


def bell_state_phi_plus() -> QuantumState:
    """Return the maximally entangled |Φ⁺⟩ Bell state."""

    amplitudes = normalise_amplitudes((1 + 0j, 0 + 0j, 0 + 0j, 1 + 0j))
    return QuantumState(amplitudes)


def schrodinger_time_derivative(
    hamiltonian: Operator,
    state: QuantumState,
    *,
    hbar: float = H_BAR,
) -> ComplexTuple:
    """Compute ∂Ψ/∂t from the time-dependent Schrödinger equation."""

    applied = hamiltonian.apply(state)
    coefficient = -1j / hbar
    return tuple(coefficient * component for component in applied)


def stationary_state_residual(
    hamiltonian: Operator,
    state: QuantumState,
    energy: complex,
) -> ComplexTuple:
    """Return the residual vector for the time-independent Schrödinger equation."""

    applied = hamiltonian.apply(state)
    return tuple(component - energy * amplitude for component, amplitude in zip(applied, state.amplitudes))


def heisenberg_uncertainty_limit(delta_x: float, delta_p: float, *, hbar: float = H_BAR) -> float:
    """Return ΔxΔp − ħ/2 to evaluate the uncertainty principle constraint."""

    return (float(delta_x) * float(delta_p)) - (hbar / 2.0)


def harmonic_oscillator_energy(n: int, angular_frequency: float, *, hbar: float = H_BAR) -> float:
    """Energy of the n-th level of a quantum harmonic oscillator."""

    if n < 0:
        raise ValueError("quantum number n must be non-negative")
    return hbar * float(angular_frequency) * (n + 0.5)


def minimal_coupling_momentum(
    momentum: Sequence[float],
    charge: float,
    potential: Sequence[float],
) -> Tuple[float, ...]:
    """Apply the minimal coupling substitution p → p − qA."""

    momentum_vector = tuple(float(component) for component in momentum)
    potential_vector = tuple(float(component) for component in potential)
    if len(momentum_vector) != len(potential_vector):
        raise ValueError("momentum and potential vectors must have the same dimension")
    return tuple(p - (charge * a_component) for p, a_component in zip(momentum_vector, potential_vector))


def dirac_equation_residual(
    gamma_matrices: Sequence[Operator],
    derivatives: Sequence[float],
    spinor: ComplexTuple,
    mass: float,
) -> ComplexTuple:
    """Evaluate (iγ^μ∂_μ − m)ψ for a provided spinor."""

    if not gamma_matrices:
        raise ValueError("at least one gamma matrix is required")
    if len(gamma_matrices) != len(derivatives):
        raise ValueError("gamma matrices and derivative components must align")
    dimension = gamma_matrices[0].dimension
    for gamma in gamma_matrices:
        if gamma.dimension != dimension:
            raise ValueError("all gamma matrices must share the same dimension")
    if len(spinor) != dimension:
        raise ValueError("spinor dimension must match gamma matrices")
    residual = [0j for _ in range(dimension)]
    for gamma, derivative in zip(gamma_matrices, derivatives):
        applied = _matrix_vector_product(gamma.matrix, spinor)
        residual = [
            current + 1j * float(derivative) * component
            for current, component in zip(residual, applied)
        ]
    return tuple(value - float(mass) * component for value, component in zip(residual, spinor))


def klein_gordon_residual(
    dalembertian_phi: complex,
    field: complex,
    mass: float,
    *,
    speed_of_light: float = SPEED_OF_LIGHT,
    hbar: float = H_BAR,
) -> complex:
    """Evaluate (□ + m²c²/ħ²)φ for a scalar field sample."""

    prefactor = (float(mass) ** 2) * (speed_of_light**2) / (hbar**2)
    return complex(dalembertian_phi) + prefactor * complex(field)


__all__ = [
    "ComplexTuple",
    "Matrix",
    "H_BAR",
    "SPEED_OF_LIGHT",
    "Operator",
    "QuantumState",
    "PAULI_MATRICES",
    "bell_state_phi_plus",
    "commutator",
    "dirac_equation_residual",
    "harmonic_oscillator_energy",
    "heisenberg_uncertainty_limit",
    "klein_gordon_residual",
    "minimal_coupling_momentum",
    "normalise_amplitudes",
    "schrodinger_time_derivative",
    "stationary_state_residual",
]
