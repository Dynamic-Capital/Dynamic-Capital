"""Dynamic quantum strategic protocol primitives.

This module translates the conceptual "Dynamic Quantum Strategic Protocol"
into executable structures.  A strategic agent is represented as a quantum
state expressed over the basis (Clarity, Intel, Timing, Leverage, Execution).
Strategic principles are modelled as Hermitian operators that can be applied to
that state and evaluated through expectation values.

The implementation intentionally keeps the linear algebra lightweight so that
it can run without external numerical dependencies.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from typing import Iterable, Mapping, Sequence

__all__ = [
    "BASIS_ORDER",
    "QuantumStrategicState",
    "QuantumOperator",
    "DEFAULT_OPERATORS",
    "resonance_score",
]

# The canonical basis for the strategic state vector.  The order matters because
# operators are defined relative to these indices.
BASIS_ORDER: tuple[str, ...] = (
    "Clarity",
    "Intel",
    "Timing",
    "Leverage",
    "Execution",
)


def _normalise_state(amplitudes: Sequence[complex]) -> tuple[complex, ...]:
    norm = sum(abs(value) ** 2 for value in amplitudes) ** 0.5
    if norm == 0:
        raise ValueError("state vector must not be the zero vector")
    return tuple(value / norm for value in amplitudes)


def _as_vector(components: Mapping[str, complex] | Sequence[complex]) -> tuple[complex, ...]:
    if isinstance(components, Mapping):
        vector = [0j] * len(BASIS_ORDER)
        for index, label in enumerate(BASIS_ORDER):
            value = components.get(label)
            if value is None:
                raise KeyError(f"missing amplitude for basis '{label}'")
            vector[index] = complex(value)
        return tuple(vector)
    if len(components) != len(BASIS_ORDER):
        raise ValueError(
            f"state vector expected {len(BASIS_ORDER)} components, got {len(components)}",
        )
    return tuple(complex(value) for value in components)


def _matrix_vector_product(matrix: Sequence[Sequence[complex]], vector: Sequence[complex]) -> tuple[complex, ...]:
    return tuple(
        sum(matrix_row[column] * vector[column] for column in range(len(vector)))
        for matrix_row in matrix
    )


def _is_hermitian(matrix: Sequence[Sequence[complex]]) -> bool:
    size = len(matrix)
    for i in range(size):
        row = matrix[i]
        if len(row) != size:
            return False
        for j in range(size):
            if matrix[i][j] != matrix[j][i].conjugate():
                return False
    return True


@dataclass(frozen=True)
class QuantumStrategicState:
    """Represents the |ψ⟩ quantum state across the strategic basis."""

    amplitudes: tuple[complex, ...]

    def __init__(self, components: Mapping[str, complex] | Sequence[complex]) -> None:
        amplitudes = _as_vector(components)
        normalised = _normalise_state(amplitudes)
        object.__setattr__(self, "amplitudes", normalised)

    def apply(self, operator: "QuantumOperator") -> "QuantumStrategicState":
        """Apply the operator to the state, returning a new state."""

        transformed = operator.apply_to_vector(self.amplitudes)
        return QuantumStrategicState(transformed)

    def expectation(self, operator: "QuantumOperator") -> float:
        """Compute the expectation value ⟨ψ|Ô|ψ⟩ for the operator."""

        return operator.expectation(self.amplitudes)


@dataclass(frozen=True)
class QuantumOperator:
    """Hermitian operator acting on the strategic state."""

    name: str
    matrix: tuple[tuple[complex, ...], ...]

    def __post_init__(self) -> None:
        if len(self.matrix) != len(BASIS_ORDER):
            raise ValueError("operator matrix must be square with basis size")
        if not _is_hermitian(self.matrix):
            raise ValueError("operator matrix must be Hermitian")

    def apply_to_vector(self, amplitudes: Sequence[complex]) -> tuple[complex, ...]:
        return _matrix_vector_product(self.matrix, amplitudes)

    def expectation(self, amplitudes: Sequence[complex]) -> float:
        transformed = self.apply_to_vector(amplitudes)
        return float(
            sum(amplitudes[i].conjugate() * transformed[i] for i in range(len(BASIS_ORDER))).real
        )


def _operator(matrix: Sequence[Sequence[complex]], name: str) -> QuantumOperator:
    return QuantumOperator(name=name, matrix=tuple(tuple(row) for row in matrix))


_root_half = 1 / sqrt(2)

DEFAULT_OPERATORS: tuple[QuantumOperator, ...] = (
    _operator(
        [
            [_root_half, _root_half, 0, 0, 0],
            [_root_half, -_root_half, 0, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1],
        ],
        name="Pause",
    ),
    _operator(
        [
            [1, 0, 0, 0, 0],
            [0, 1, 0, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 2],
        ],
        name="Goal",
    ),
    _operator(
        [
            [1.2, 0, 0.1j, 0, 0],
            [0, 1.3, 0, 0.05j, 0],
            [-0.1j, 0, 1, 0, 0],
            [0, -0.05j, 0, 1, 0],
            [0, 0, 0, 0, 1],
        ],
        name="Learn",
    ),
    _operator(
        [
            [1, 0, 0.15, 0.05, 0],
            [0, 1, 0.1, 0.05, 0],
            [0.15, 0.1, 1, 0.2, 0],
            [0.05, 0.05, 0.2, 1, 0],
            [0, 0, 0, 0, 1],
        ],
        name="Map",
    ),
    _operator(
        [
            [1, 0, 0, 0, 0.05],
            [0, 1, 0, 0, 0.05],
            [0, 0, 1.1, -0.2j, 0.05],
            [0, 0, 0.2j, 1.05, 0.05],
            [0.05, 0.05, 0.05, 0.05, 1],
        ],
        name="Predict",
    ),
    _operator(
        [
            [1, 0, 0, 0.1, 0],
            [0, 1, 0, 0.1, 0],
            [0, 0, 1, 0.1, 0.1],
            [0.1, 0.1, 0.1, 1.2, 0.2],
            [0, 0, 0.1, 0.2, 1.1],
        ],
        name="Sync",
    ),
    _operator(
        [
            [1.05, 0.05, 0, 0.2, 0.2],
            [0.05, 1.05, 0, 0.2, 0.2],
            [0, 0, 1, 0, 0.2],
            [0.2, 0.2, 0, 1.2, 0.3],
            [0.2, 0.2, 0.2, 0.3, 1.3],
        ],
        name="Amplify",
    ),
    _operator(
        [
            [1.05, 0, 0.15, 0, 0],
            [0, 1.05, 0.15, 0, 0],
            [0.15, 0.15, 1.1, 0.1, 0],
            [0, 0, 0.1, 1, 0.1],
            [0, 0, 0, 0.1, 1],
        ],
        name="Pivot",
    ),
    _operator(
        [
            [1, 0.05, 0, 0, 0.1],
            [0.05, 1, 0, 0, 0.1],
            [0, 0, 1, 0, 0.1],
            [0, 0, 0, 1, 0.1],
            [0.1, 0.1, 0.1, 0.1, 1.2],
        ],
        name="Frame",
    ),
    _operator(
        [
            [1, 0, 0, 0, 0],
            [0, 1, 0, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1.5],
        ],
        name="Commit",
    ),
)


def resonance_score(state: QuantumStrategicState, operators: Iterable[QuantumOperator] = DEFAULT_OPERATORS) -> float:
    """Compute the resonance score R(ψ) = Σᵢ ⟨ψ|Ôᵢ|ψ⟩."""

    total = 0.0
    for operator in operators:
        total += state.expectation(operator)
    return total

