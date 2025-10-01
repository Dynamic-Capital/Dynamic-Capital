from __future__ import annotations

import math

import pytest

from dynamic_quantum import (
    BASIS_ORDER,
    DEFAULT_OPERATORS,
    QuantumOperator,
    QuantumStrategicState,
    resonance_score,
)


def test_quantum_state_normalises() -> None:
    amplitudes = {label: 1 + 0j for label in BASIS_ORDER}
    state = QuantumStrategicState(amplitudes)
    norm = math.sqrt(sum(abs(value) ** 2 for value in state.amplitudes))
    assert pytest.approx(1.0) == norm


def test_quantum_state_rejects_zero_vector() -> None:
    with pytest.raises(ValueError):
        QuantumStrategicState([0j] * len(BASIS_ORDER))


def test_expectation_matches_manual_computation() -> None:
    identity = QuantumOperator(
        name="Identity",
        matrix=tuple(
            tuple(1.0 if row == column else 0.0 for column in range(len(BASIS_ORDER)))
            for row in range(len(BASIS_ORDER))
        ),
    )
    state = QuantumStrategicState([1, 0, 0, 0, 0])
    assert pytest.approx(1.0) == state.expectation(identity)


def test_resonance_score_aggregates_expectations() -> None:
    state = QuantumStrategicState([1, 1, 1, 1, 1])
    score = resonance_score(state)
    expected = sum(state.expectation(operator) for operator in DEFAULT_OPERATORS)
    assert pytest.approx(expected) == score
