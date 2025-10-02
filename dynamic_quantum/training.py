"""Parameter-shift training utilities for quantum-inspired circuits."""

from __future__ import annotations

from dataclasses import dataclass
from math import isclose, pi, sin, sqrt
from typing import Callable, Iterable, Mapping, MutableSequence, Sequence

from .engine import DynamicQuantumEngine, QuantumEnvironment, QuantumPulse

CostFunction = Callable[[Sequence[float]], float]
StatePreparation = Callable[[Sequence[float]], Sequence[complex]]


def _isclose_complex(a: complex, b: complex, *, rel_tol: float = 1e-9, abs_tol: float = 1e-12) -> bool:
    difference = abs(a - b)
    return difference <= max(rel_tol * max(abs(a), abs(b)), abs_tol)


def _normalise_state(state: Sequence[complex]) -> tuple[complex, ...]:
    if not state:
        raise ValueError("state vector must be non-empty")
    norm = sqrt(sum(abs(amplitude) ** 2 for amplitude in state))
    if isclose(norm, 0.0):
        raise ValueError("state vector norm must be non-zero")
    return tuple(complex(amplitude) / norm for amplitude in state)


def fidelity_cost(
    target_state: Sequence[complex],
    *,
    state_preparation: StatePreparation,
) -> CostFunction:
    """Return a cost function measuring 1 - fidelity with a target state."""

    normalised_target = _normalise_state(target_state)

    def cost(parameters: Sequence[float]) -> float:
        prepared = _normalise_state(state_preparation(parameters))
        if len(prepared) != len(normalised_target):
            raise ValueError("prepared state and target state dimensions must match")
        overlap = sum(target.conjugate() * value for target, value in zip(normalised_target, prepared))
        fidelity = abs(overlap) ** 2
        return 1.0 - float(fidelity)

    return cost


def expectation_value_cost(
    observable: Sequence[Sequence[complex]],
    *,
    state_preparation: StatePreparation,
) -> CostFunction:
    """Return a cost function that evaluates ⟨ψ|H|ψ⟩ for a Hermitian observable."""

    if not observable or not observable[0]:
        raise ValueError("observable must be a non-empty square matrix")
    dimension = len(observable)
    matrix: tuple[tuple[complex, ...], ...] = tuple(tuple(complex(entry) for entry in row) for row in observable)
    for row in matrix:
        if len(row) != dimension:
            raise ValueError("observable must be square")
    for i in range(dimension):
        for j in range(dimension):
            if not _isclose_complex(matrix[i][j], matrix[j][i].conjugate()):
                raise ValueError("observable must be Hermitian")

    def cost(parameters: Sequence[float]) -> float:
        state = _normalise_state(state_preparation(parameters))
        if len(state) != dimension:
            raise ValueError("prepared state dimension does not match observable")
        expectation = 0j
        for i, amplitude in enumerate(state):
            row_sum = sum(matrix[i][j] * state[j] for j in range(dimension))
            expectation += amplitude.conjugate() * row_sum
        if not isclose(expectation.imag, 0.0, abs_tol=1e-9):
            raise ValueError("expectation value must be real for Hermitian observables")
        return float(expectation.real)

    return cost


@dataclass(slots=True)
class ParameterShiftResult:
    """Result emitted after a single optimisation step."""

    step: int
    parameters: tuple[float, ...]
    cost: float
    gradients: tuple[float, ...]


class ParameterShiftTrainer:
    """Implements gradient descent using the parameter-shift rule."""

    def __init__(
        self,
        *,
        cost_function: CostFunction,
        parameters: Sequence[float],
        learning_rate: float = 0.1,
        shift: float = pi / 2.0,
    ) -> None:
        if learning_rate <= 0.0:
            raise ValueError("learning_rate must be positive")
        if shift <= 0.0:
            raise ValueError("shift must be positive")
        if isclose(sin(shift), 0.0, abs_tol=1e-9):
            raise ValueError("shift produces undefined parameter-shift gradient")
        self._cost_function = cost_function
        self._parameters: MutableSequence[float] = [float(value) for value in parameters]
        if not self._parameters:
            raise ValueError("parameters must be non-empty")
        self._learning_rate = float(learning_rate)
        self._shift = float(shift)
        self._step = 0

    @property
    def parameters(self) -> tuple[float, ...]:
        return tuple(self._parameters)

    def set_parameters(self, parameters: Sequence[float]) -> None:
        updated = [float(value) for value in parameters]
        if not updated:
            raise ValueError("parameters must be non-empty")
        self._parameters[:] = updated

    def _evaluate(self, parameters: Sequence[float]) -> float:
        return float(self._cost_function(parameters))

    def compute_gradients(self) -> tuple[float, ...]:
        """Return parameter-shift gradients for the current parameters."""

        gradients: MutableSequence[float] = []
        denominator = 2.0 * sin(self._shift)
        for index, value in enumerate(self._parameters):
            shifted_forward = list(self._parameters)
            shifted_backward = list(self._parameters)
            shifted_forward[index] = value + self._shift
            shifted_backward[index] = value - self._shift
            forward_cost = self._evaluate(shifted_forward)
            backward_cost = self._evaluate(shifted_backward)
            gradient = (forward_cost - backward_cost) / denominator
            gradients.append(gradient)
        return tuple(gradients)

    def step(self) -> ParameterShiftResult:
        gradients = self.compute_gradients()
        for index, gradient in enumerate(gradients):
            self._parameters[index] -= self._learning_rate * gradient
        self._step += 1
        cost = self._evaluate(self._parameters)
        return ParameterShiftResult(
            step=self._step,
            parameters=self.parameters,
            cost=cost,
            gradients=gradients,
        )


@dataclass(slots=True)
class TrainingTelemetry:
    """Rich telemetry emitted by the engine adapter after each step."""

    result: ParameterShiftResult
    mean_stability: float
    latest_annotations: tuple[str, ...]
    latest_metadata: Mapping[str, object] | None
    environment: Mapping[str, object] | None


class EngineTrainingAdapter:
    """Connects the classical engine with the parameter-shift trainer."""

    def __init__(self, engine: DynamicQuantumEngine, trainer: ParameterShiftTrainer) -> None:
        self._engine = engine
        self._trainer = trainer
        self._telemetry: MutableSequence[TrainingTelemetry] = []

    @property
    def telemetry(self) -> tuple[TrainingTelemetry, ...]:
        return tuple(self._telemetry)

    def bootstrap_parameters(self, dimension: int) -> tuple[float, ...]:
        """Initialise circuit parameters using statistics from recent pulses."""

        pulses = self._engine.pulses
        if not pulses:
            raise ValueError("no pulses available to bootstrap parameters")
        aggregates = _summarise_pulses(pulses)
        base_vector = (
            aggregates["mean_coherence"],
            aggregates["mean_entanglement"],
            1.0 - aggregates["mean_phase_variance"],
            1.0 - abs(aggregates["mean_flux"]),
        )
        parameters: MutableSequence[float] = []
        for index in range(dimension):
            parameters.append(pi * base_vector[index % len(base_vector)])
        self._trainer.set_parameters(parameters)
        return self._trainer.parameters

    def run_step(
        self,
        *,
        environment: QuantumEnvironment | None = None,
        loss_adjustments: Iterable[float] | None = None,
    ) -> TrainingTelemetry:
        """Execute one training step and record telemetry metadata."""

        result = self._trainer.step()
        if loss_adjustments:
            adjusted_cost = result.cost + sum(loss_adjustments)
            result = ParameterShiftResult(
                step=result.step,
                parameters=result.parameters,
                cost=adjusted_cost,
                gradients=result.gradients,
            )

        telemetry = TrainingTelemetry(
            result=result,
            mean_stability=_mean_stability(self._engine.pulses),
            latest_annotations=_latest_annotations(self._engine.pulses),
            latest_metadata=_latest_metadata(self._engine.pulses),
            environment=_environment_to_mapping(environment),
        )
        self._telemetry.append(telemetry)
        return telemetry


def _summarise_pulses(pulses: Sequence[QuantumPulse]) -> Mapping[str, float]:
    total = {
        "mean_coherence": 0.0,
        "mean_entanglement": 0.0,
        "mean_flux": 0.0,
        "mean_phase_variance": 0.0,
    }
    for pulse in pulses:
        total["mean_coherence"] += pulse.coherence
        total["mean_entanglement"] += pulse.entanglement
        total["mean_flux"] += pulse.flux
        total["mean_phase_variance"] += pulse.phase_variance
    count = float(len(pulses))
    return {key: value / count for key, value in total.items()}


def _mean_stability(pulses: Sequence[QuantumPulse]) -> float:
    if not pulses:
        return 0.0
    total = sum(pulse.stability_index for pulse in pulses)
    return total / float(len(pulses))


def _latest_annotations(pulses: Sequence[QuantumPulse]) -> tuple[str, ...]:
    if not pulses:
        return ()
    for pulse in reversed(pulses):
        if pulse.annotations:
            return tuple(pulse.annotations)
    return ()


def _latest_metadata(pulses: Sequence[QuantumPulse]) -> Mapping[str, object] | None:
    if not pulses:
        return None
    for pulse in reversed(pulses):
        if pulse.metadata:
            return dict(pulse.metadata)
    return None


def _environment_to_mapping(
    environment: QuantumEnvironment | None,
) -> Mapping[str, object] | None:
    if environment is None:
        return None
    return {
        "vacuum_pressure": environment.vacuum_pressure,
        "background_noise": environment.background_noise,
        "gravity_gradient": environment.gravity_gradient,
        "measurement_rate": environment.measurement_rate,
        "thermal_load": environment.thermal_load,
    }

