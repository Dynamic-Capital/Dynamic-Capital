"""Quantum orchestration primitives for Dynamic Capital."""

from __future__ import annotations

from .engine import (
    DynamicQuantumEngine,
    QuantumEnvironment,
    QuantumPulse,
    QuantumResonanceFrame,
)
from .collapse_cycle import (
    ConsciousCollapseEngine,
    DomainConfig,
    DomainSnapshot,
    LindbladChannel,
)
from .training import (
    EngineTrainingAdapter,
    expectation_value_cost,
    fidelity_cost,
    ParameterShiftResult,
    ParameterShiftTrainer,
    TrainingTelemetry,
)

__all__ = [
    "DynamicQuantumEngine",
    "QuantumEnvironment",
    "QuantumPulse",
    "QuantumResonanceFrame",
    "ConsciousCollapseEngine",
    "DomainConfig",
    "DomainSnapshot",
    "LindbladChannel",
    "EngineTrainingAdapter",
    "expectation_value_cost",
    "fidelity_cost",
    "ParameterShiftResult",
    "ParameterShiftTrainer",
    "TrainingTelemetry",
]
