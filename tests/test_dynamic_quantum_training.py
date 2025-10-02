from __future__ import annotations

from math import cos, pi, sin
from typing import Sequence

import pytest

from dynamic_quantum.engine import DynamicQuantumEngine, QuantumEnvironment, QuantumPulse
from dynamic_quantum.training import (
    EngineTrainingAdapter,
    ParameterShiftTrainer,
    expectation_value_cost,
    fidelity_cost,
)


def _simple_cost(parameters: list[float]) -> float:
    total = 0.0
    for index, theta in enumerate(parameters):
        if index % 2 == 0:
            total += sin(theta)
        else:
            total += cos(theta)
    return total


def test_parameter_shift_matches_analytic_gradient() -> None:
    trainer = ParameterShiftTrainer(
        cost_function=_simple_cost,
        parameters=[0.31, -0.52],
        shift=pi / 4,
    )
    gradients = trainer.compute_gradients()
    analytic = (cos(0.31), -sin(-0.52))
    assert gradients[0] == pytest.approx(analytic[0], abs=1e-6)
    assert gradients[1] == pytest.approx(analytic[1], abs=1e-6)


def test_parameter_shift_step_updates_parameters() -> None:
    trainer = ParameterShiftTrainer(
        cost_function=_simple_cost,
        parameters=[0.2, 0.1],
        learning_rate=0.05,
    )
    result = trainer.step()
    expected_theta0 = 0.2 - 0.05 * cos(0.2)
    expected_theta1 = 0.1 - 0.05 * (-sin(0.1))
    assert result.parameters[0] == pytest.approx(expected_theta0, abs=1e-6)
    assert result.parameters[1] == pytest.approx(expected_theta1, abs=1e-6)


def test_fidelity_cost_matches_expected_overlap() -> None:
    def state_preparation(parameters: Sequence[float]) -> Sequence[complex]:
        theta = parameters[0]
        return (cos(theta / 2), sin(theta / 2))

    cost = fidelity_cost((1.0 + 0j, 0.0 + 0j), state_preparation=state_preparation)
    value = cost([0.0])
    assert value == pytest.approx(0.0, abs=1e-9)
    value = cost([pi])
    assert value == pytest.approx(1.0, abs=1e-9)


def test_expectation_value_cost_returns_energy() -> None:
    def state_preparation(parameters: Sequence[float]) -> Sequence[complex]:
        theta = parameters[0]
        return (cos(theta / 2), sin(theta / 2))

    observable = (
        (1.0 + 0j, 0.0 + 0j),
        (0.0 + 0j, -1.0 + 0j),
    )
    cost = expectation_value_cost(observable, state_preparation=state_preparation)
    assert cost([0.0]) == pytest.approx(1.0, abs=1e-9)
    assert cost([pi]) == pytest.approx(-1.0, abs=1e-9)


def test_engine_adapter_bootstrap_and_telemetry_records_environment() -> None:
    engine = DynamicQuantumEngine(window=3)
    engine.register_pulse(
        QuantumPulse(
            system="alpha",
            coherence=0.6,
            entanglement=0.55,
            temperature=42.0,
            flux=0.1,
            phase_variance=0.2,
            annotations=("calibration",),
            metadata={"batch": "2024-06"},
        )
    )
    engine.register_pulse(
        QuantumPulse(
            system="beta",
            coherence=0.4,
            entanglement=0.5,
            temperature=38.0,
            flux=-0.2,
            phase_variance=0.3,
        )
    )

    trainer = ParameterShiftTrainer(cost_function=_simple_cost, parameters=[0.1, 0.2])
    adapter = EngineTrainingAdapter(engine, trainer)
    params = adapter.bootstrap_parameters(3)
    assert len(params) == 3

    environment = QuantumEnvironment(
        vacuum_pressure=0.45,
        background_noise=0.4,
        gravity_gradient=0.35,
        measurement_rate=0.7,
        thermal_load=0.55,
    )

    telemetry = adapter.run_step(environment=environment)
    assert telemetry.environment["vacuum_pressure"] == pytest.approx(0.45)
    assert telemetry.latest_annotations == ("calibration",)
    assert telemetry.latest_metadata == {"batch": "2024-06"}
    assert telemetry.mean_stability == pytest.approx(
        sum(p.stability_index for p in engine.pulses) / len(engine.pulses)
    )
