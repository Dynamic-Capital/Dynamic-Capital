from __future__ import annotations

import pytest

from dynamic_quantum.engine import QuantumEnvironment, QuantumPulse
from dynamic_agents.quantum import (
    DynamicApolloQuantumAgent,
    DynamicZeusQuantumAgent,
    list_quantum_agent_profiles,
)


def test_quantum_agent_profiles_registry_complete() -> None:
    profiles = list_quantum_agent_profiles()
    codes = {profile.code for profile in profiles}
    expected = {
        "zeus",
        "hera",
        "poseidon",
        "demeter",
        "athena",
        "apollo",
        "artemis",
        "ares",
        "aphrodite",
        "hephaestus",
        "hermes",
        "dionysus",
    }
    assert codes == expected
    assert all(profile.quantum_primitives for profile in profiles)
    assert all(profile.classical_interfaces for profile in profiles)


def test_dynamic_quantum_agent_generates_insight() -> None:
    agent = DynamicApolloQuantumAgent()
    agent.register_pulses(
        (
            QuantumPulse(
                system="alpha",
                coherence=0.62,
                entanglement=0.58,
                temperature=42.0,
                flux=0.1,
                phase_variance=0.21,
            ),
            QuantumPulse(
                system="beta",
                coherence=0.66,
                entanglement=0.6,
                temperature=40.0,
                flux=-0.05,
                phase_variance=0.19,
                annotations=("focus",),
            ),
            QuantumPulse(
                system="gamma",
                coherence=0.7,
                entanglement=0.64,
                temperature=39.0,
                flux=0.08,
                phase_variance=0.18,
                metadata={"channel": "apollo"},
            ),
        )
    )
    environment = QuantumEnvironment(
        vacuum_pressure=0.55,
        background_noise=0.42,
        gravity_gradient=0.38,
        measurement_rate=0.6,
        thermal_load=0.52,
    )

    insight = agent.generate_insight(
        environment=environment,
        include_decoherence=True,
        decoherence_steps=4,
    )

    assert insight.raw.domain == agent.profile.designation
    assert "stability_outlook" in insight.raw.metrics
    assert insight.frame.mean_coherence > 0.6
    assert insight.environment == {
        "vacuum_pressure": environment.vacuum_pressure,
        "background_noise": environment.background_noise,
        "gravity_gradient": environment.gravity_gradient,
        "measurement_rate": environment.measurement_rate,
        "thermal_load": environment.thermal_load,
    }
    assert insight.decoherence_projection is not None


def test_dynamic_quantum_agent_requires_environment_for_decoherence() -> None:
    agent = DynamicZeusQuantumAgent()
    agent.register_pulse(
        QuantumPulse(
            system="zeus",
            coherence=0.7,
            entanglement=0.65,
            temperature=45.0,
            flux=0.05,
            phase_variance=0.22,
        )
    )

    with pytest.raises(ValueError):
        agent.estimate_decoherence(time_steps=3)
