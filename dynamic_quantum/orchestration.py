"""Dynamic quantum orchestration bridging orderflow and strategic operators."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, MutableMapping

from dynamic_orderflow import DynamicOrderFlow, OrderFlowOptimization

from .protocol import (
    BASIS_ORDER,
    DEFAULT_OPERATORS,
    QuantumOperator,
    QuantumStrategicState,
    resonance_score,
)

__all__ = [
    "QuantumOrchestrationSnapshot",
    "DynamicQuantumOrchestrator",
]


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _derive_amplitudes(plan: OrderFlowOptimization) -> tuple[complex, ...]:
    intensity = _clamp(plan.imbalance.intensity)
    efficiency = _clamp(plan.efficiency)
    latency = max(plan.latency, 0.0)
    latency_component = _clamp(1.0 - min(latency / 2.0, 1.0))

    clarity = _clamp(0.4 + 0.6 * (1.0 - intensity), lower=0.05)
    intel = _clamp(0.3 + 0.7 * efficiency, lower=0.05)
    timing = _clamp(0.3 + 0.7 * latency_component, lower=0.05)

    if plan.imbalance.total_notional > 0.0:
        leverage_bias = plan.imbalance.bias
    else:
        leverage_bias = 0.5
    if plan.imbalance.dominant_side == "sell":
        leverage_base = 1.0 - leverage_bias
    elif plan.imbalance.dominant_side == "buy":
        leverage_base = leverage_bias
    else:
        leverage_base = 0.5
    leverage = _clamp(0.3 + 0.7 * leverage_base, lower=0.05)

    execution = _clamp(0.4 + 0.6 * efficiency * latency_component, lower=0.05)

    return tuple(complex(value) for value in (clarity, intel, timing, leverage, execution))


def _blend_states(
    base: QuantumStrategicState, derived: Iterable[complex], *, weight: float
) -> QuantumStrategicState:
    alpha = _clamp(weight)
    mixed = [
        (1.0 - alpha) * base.amplitudes[index] + alpha * component
        for index, component in enumerate(derived)
    ]
    return QuantumStrategicState(mixed)


@dataclass(slots=True)
class QuantumOrchestrationSnapshot:
    """Aggregate view of orderflow and quantum resonance alignment."""

    state: QuantumStrategicState
    resonance: float
    operator_expectations: Mapping[str, float]
    orderflow: OrderFlowOptimization
    recommendations: tuple[str, ...]

    def as_dict(self) -> Mapping[str, object]:
        payload: MutableMapping[str, object] = {
            "state": {
                label: amplitude
                for label, amplitude in zip(BASIS_ORDER, self.state.amplitudes)
            },
            "resonance": self.resonance,
            "operator_expectations": dict(self.operator_expectations),
            "orderflow": self.orderflow.as_dict(),
            "recommendations": self.recommendations,
        }
        return payload


class DynamicQuantumOrchestrator:
    """Coordinates orderflow telemetry with quantum strategic operators."""

    def __init__(
        self,
        *,
        operators: Iterable[QuantumOperator] | None = None,
    ) -> None:
        self._operators = tuple(operators or DEFAULT_OPERATORS)

    @property
    def operators(self) -> tuple[QuantumOperator, ...]:
        return self._operators

    def orchestrate(
        self,
        orderflow: DynamicOrderFlow,
        *,
        base_state: QuantumStrategicState | None = None,
    ) -> QuantumOrchestrationSnapshot:
        plan = orderflow.optimize()
        derived = _derive_amplitudes(plan)
        if base_state is None:
            state = QuantumStrategicState(derived)
        else:
            state = _blend_states(
                base_state,
                derived,
                weight=0.35 + 0.5 * plan.efficiency,
            )

        resonance = resonance_score(state, self._operators)
        expectations = {operator.name: state.expectation(operator) for operator in self._operators}

        recommendations = list(plan.directives)
        if plan.notes:
            recommendations.extend(plan.notes)
        if resonance < len(self._operators) * 0.8:
            recommendations.append("escalate resonance calibration protocols")
        elif resonance > len(self._operators):
            recommendations.append("sustain quantum leverage posture")
        recommendations = tuple(dict.fromkeys(recommendations))

        return QuantumOrchestrationSnapshot(
            state=state,
            resonance=resonance,
            operator_expectations=expectations,
            orderflow=plan,
            recommendations=recommendations,
        )
