"""Dynamic Quantum Agents orchestrating resonance insights across subsystems."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from types import MappingProxyType
from typing import Iterable, Mapping, MutableMapping, Sequence, Tuple, Type

from dynamic_agents._insight import AgentInsight, Number, utcnow
from dynamic_quantum.engine import (
    DynamicQuantumEngine,
    QuantumEnvironment,
    QuantumPulse,
    QuantumResonanceFrame,
)

__all__ = [
    "QuantumAgentProfile",
    "QuantumAgentInsight",
    "DynamicQuantumAgent",
    "QUANTUM_AGENT_PROFILES",
    "list_quantum_agent_profiles",
    "build_quantum_agent_registry",
    "DynamicZeusQuantumAgent",
    "DynamicHeraQuantumAgent",
    "DynamicPoseidonQuantumAgent",
    "DynamicDemeterQuantumAgent",
    "DynamicAthenaQuantumAgent",
    "DynamicApolloQuantumAgent",
    "DynamicArtemisQuantumAgent",
    "DynamicAresQuantumAgent",
    "DynamicAphroditeQuantumAgent",
    "DynamicHephaestusQuantumAgent",
    "DynamicHermesQuantumAgent",
    "DynamicDionysusQuantumAgent",
]


def _normalise_sequence(values: Iterable[str]) -> Tuple[str, ...]:
    ordered: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = value.strip()
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(text)
    return tuple(ordered)


_DOMAIN_SEPARATOR = re.compile(r"\s*(?:,|/|\band\b)\s*", re.IGNORECASE)


def _derive_domains(core_task: str) -> Tuple[str, ...]:
    segments = _DOMAIN_SEPARATOR.split(core_task)
    domains = [segment.strip() for segment in segments if segment.strip()]
    if not domains:
        cleaned = core_task.strip()
        if cleaned:
            domains = [cleaned]
    return _normalise_sequence(domains)


@dataclass(frozen=True, slots=True)
class QuantumAgentProfile:
    """Static configuration describing a Dynamic Quantum Agent."""

    code: str
    designation: str
    core_task: str
    quantum_primitives: Tuple[str, ...]
    classical_interfaces: Tuple[str, ...]
    tier: str
    domains: Tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not self.code:
            raise ValueError("QuantumAgentProfile requires a code")
        if not self.designation:
            raise ValueError("QuantumAgentProfile requires a designation")
        if not self.core_task:
            raise ValueError("QuantumAgentProfile requires a core_task")
        if not self.quantum_primitives:
            raise ValueError("QuantumAgentProfile requires at least one quantum primitive")
        if not self.classical_interfaces:
            raise ValueError("QuantumAgentProfile requires at least one classical interface")
        if not self.tier:
            raise ValueError("QuantumAgentProfile requires a tier")
        domains = self.domains or _derive_domains(self.core_task)
        object.__setattr__(self, "domains", _normalise_sequence(domains))

    @property
    def summary(self) -> str:
        return f"{self.designation}: {self.core_task}"


@dataclass(slots=True)
class QuantumAgentInsight:
    """Structured insight produced by a quantum agent run."""

    raw: AgentInsight
    profile: QuantumAgentProfile
    frame: QuantumResonanceFrame
    environment: Mapping[str, Number] | None
    decoherence_projection: float | None = None

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "profile": {
                "code": self.profile.code,
                "designation": self.profile.designation,
                "core_task": self.profile.core_task,
                "quantum_primitives": list(self.profile.quantum_primitives),
                "classical_interfaces": list(self.profile.classical_interfaces),
                "tier": self.profile.tier,
                "domains": list(self.profile.domains),
            },
            "raw": {
                "domain": self.raw.domain,
                "domains": list(self.raw.domains),
                "states": list(self.raw.states),
                "generated_at": self.raw.generated_at.isoformat(),
                "title": self.raw.title,
                "metrics": dict(self.raw.metrics),
                "highlights": list(self.raw.highlights),
                "details": dict(self.raw.details or {}),
            },
            "frame": {
                "mean_coherence": self.frame.mean_coherence,
                "mean_entanglement": self.frame.mean_entanglement,
                "mean_flux": self.frame.mean_flux,
                "mean_phase_variance": self.frame.mean_phase_variance,
                "stability_outlook": self.frame.stability_outlook,
                "anomalies": list(self.frame.anomalies),
                "recommended_actions": list(self.frame.recommended_actions),
                "ewma_coherence": self.frame.ewma_coherence,
                "ewma_entanglement": self.frame.ewma_entanglement,
                "ewma_flux": self.frame.ewma_flux,
                "ewma_phase_variance": self.frame.ewma_phase_variance,
                "equilibrium_gap": self.frame.equilibrium_gap,
                "drift_score": self.frame.drift_score,
            },
        }
        if self.environment is not None:
            payload["environment"] = dict(self.environment)
        if self.decoherence_projection is not None:
            payload["decoherence_projection"] = self.decoherence_projection
        return payload


class DynamicQuantumAgent:
    """Base class implementing Dynamic Quantum Agent orchestration."""

    profile: QuantumAgentProfile

    def __init__(
        self,
        *,
        engine: DynamicQuantumEngine | None = None,
        environment: QuantumEnvironment | None = None,
        window: int = 180,
        equilibrium_target: float = 0.72,
        domains: Sequence[str] | None = None,
    ) -> None:
        if engine is not None:
            if window != engine.window:
                window = engine.window
            equilibrium_target = getattr(engine, "_equilibrium_target", equilibrium_target)
        self._engine = engine or DynamicQuantumEngine(window=window, equilibrium_target=equilibrium_target)
        self._default_environment = environment
        self.name = getattr(self, "name", self.profile.code)
        self._domains_override = _normalise_sequence(domains) if domains is not None else None
        self._equilibrium_target = equilibrium_target

    @property
    def engine(self) -> DynamicQuantumEngine:
        return self._engine

    @property
    def pulses(self) -> Tuple[QuantumPulse, ...]:
        return self._engine.pulses

    @property
    def domains(self) -> Tuple[str, ...]:
        if self._domains_override is not None:
            return self._domains_override
        return self.profile.domains

    def register_pulse(self, pulse: QuantumPulse | Mapping[str, object]) -> QuantumPulse:
        return self._engine.register_pulse(pulse)

    def register_pulses(self, pulses: Sequence[QuantumPulse | Mapping[str, object]]) -> Tuple[QuantumPulse, ...]:
        return self._engine.register_pulses(pulses)

    def clear(self) -> None:
        self._engine.clear()

    def _resolve_environment(self, environment: QuantumEnvironment | None) -> QuantumEnvironment | None:
        if environment is not None:
            return environment
        return self._default_environment

    def synthesise_frame(self, *, environment: QuantumEnvironment | None = None) -> QuantumResonanceFrame:
        resolved = self._resolve_environment(environment)
        return self._engine.synthesize_frame(environment=resolved)

    def estimate_decoherence(
        self,
        time_steps: int,
        *,
        environment: QuantumEnvironment | None = None,
    ) -> float:
        resolved = self._resolve_environment(environment)
        if resolved is None:
            raise ValueError("environment required to estimate decoherence")
        return self._engine.estimate_decoherence(time_steps, resolved)

    def _environment_as_mapping(self, environment: QuantumEnvironment | None) -> Mapping[str, Number] | None:
        if environment is None:
            return None
        return {
            "vacuum_pressure": environment.vacuum_pressure,
            "background_noise": environment.background_noise,
            "gravity_gradient": environment.gravity_gradient,
            "measurement_rate": environment.measurement_rate,
            "thermal_load": environment.thermal_load,
        }

    def _derive_states(
        self,
        frame: QuantumResonanceFrame,
        environment: QuantumEnvironment | None,
    ) -> Tuple[str, ...]:
        states: list[str] = []
        if frame.stability_outlook >= self._equilibrium_target:
            states.append("equilibrium")
        else:
            states.append("decohering")
        states.extend(frame.anomalies)
        if environment is not None:
            if environment.is_noisy:
                states.append("noisy")
            if environment.is_measurement_aggressive:
                states.append("measurement-aggressive")
            if environment.is_fragile_vacuum:
                states.append("fragile-vacuum")
            if environment.requires_cooling:
                states.append("thermal-load")
        return _normalise_sequence(states)

    def generate_insight(
        self,
        *,
        environment: QuantumEnvironment | None = None,
        include_decoherence: bool = False,
        decoherence_steps: int = 5,
        timestamp: datetime | None = None,
        domains: Sequence[str] | None = None,
        states: Sequence[str] | None = None,
    ) -> QuantumAgentInsight:
        resolved_environment = self._resolve_environment(environment)
        frame = self.synthesise_frame(environment=resolved_environment)
        metrics: MutableMapping[str, Number] = {
            "mean_coherence": frame.mean_coherence,
            "mean_entanglement": frame.mean_entanglement,
            "mean_flux": frame.mean_flux,
            "mean_phase_variance": frame.mean_phase_variance,
            "stability_outlook": frame.stability_outlook,
            "anomaly_count": float(len(frame.anomalies)),
            "recommended_action_count": float(len(frame.recommended_actions)),
        }
        highlights: list[str] = []
        if frame.anomalies:
            highlights.append(
                f"Detected anomalies: {', '.join(frame.anomalies)}"
            )
        if frame.recommended_actions:
            highlights.append(frame.recommended_actions[0])
        details: MutableMapping[str, object] = {
            "profile": self.profile,
            "frame": frame,
        }
        if resolved_environment is not None:
            details["environment"] = resolved_environment

        resolved_domains = self.domains if domains is None else _normalise_sequence(domains)
        derived_states = self._derive_states(frame, resolved_environment)
        resolved_states = derived_states if states is None else _normalise_sequence(states)

        generated = AgentInsight(
            domain=self.profile.designation,
            generated_at=timestamp or utcnow(),
            title=f"{self.profile.designation} resonance frame",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
            domains=resolved_domains,
            states=resolved_states,
        )

        decoherence_projection: float | None = None
        if include_decoherence and resolved_environment is not None:
            decoherence_projection = self.estimate_decoherence(
                decoherence_steps,
                environment=resolved_environment,
            )

        return QuantumAgentInsight(
            raw=generated,
            profile=self.profile,
            frame=frame,
            environment=self._environment_as_mapping(resolved_environment),
            decoherence_projection=decoherence_projection,
        )


def _build_profile(
    code: str,
    designation: str,
    core_task: str,
    quantum_primitives: Sequence[str],
    classical_interfaces: Sequence[str],
    tier: str,
) -> QuantumAgentProfile:
    return QuantumAgentProfile(
        code=code,
        designation=designation,
        core_task=core_task,
        quantum_primitives=_normalise_sequence(quantum_primitives),
        classical_interfaces=_normalise_sequence(classical_interfaces),
        tier=tier.strip(),
    )


_QUANTUM_AGENT_DATA: Tuple[tuple[str, str, str, Tuple[str, ...], Tuple[str, ...], str], ...] = (
    (
        "zeus",
        "Zeus DQA",
        "Governance, arbitration, oracle validation",
        (
            "Quantum consensus subroutines",
            "QFT-assisted validation",
        ),
        (
            "gRPC policy API",
            "signed attestations",
        ),
        "Tier 3: governance quorum",
    ),
    (
        "hera",
        "Hera DQA",
        "Social trust, loyalty scoring",
        (
            "Quantum-enhanced graph embeddings",
            "Amplitude encoding for relationship tensors",
        ),
        (
            "REST trust API",
            "reputation DB",
        ),
        "Tier 2: community staking",
    ),
    (
        "poseidon",
        "Poseidon DQA",
        "Liquidity and volatility modeling",
        (
            "Variational quantum circuits for stochastic sampling",
            "Quantum Monte Carlo",
        ),
        (
            "Streaming market feeds",
            "risk engine",
        ),
        "Tier 2",
    ),
    (
        "demeter",
        "Demeter DQA",
        "Resource allocation, supply forecasting",
        (
            "Quantum annealing for combinatorial allocation",
        ),
        (
            "Inventory sync",
            "oracle feeds",
        ),
        "Tier 1",
    ),
    (
        "athena",
        "Athena DQA",
        "Strategic planning and ethical reasoning",
        (
            "Grover-accelerated policy search",
            "Hybrid symbolic-quantum planners",
        ),
        (
            "Policy engine",
            "mentor scoring API",
        ),
        "Tier 3",
    ),
    (
        "apollo",
        "Apollo DQA",
        "Forecasting and signal synthesis",
        (
            "Quantum signal processing",
            "QFT for time-series spectral analysis",
        ),
        (
            "Forecast API",
            "content pipeline",
        ),
        "Tier 2",
    ),
    (
        "artemis",
        "Artemis DQA",
        "Autonomous scouting and edge discovery",
        (
            "Quantum walk algorithms",
            "Low-latency QNN for anomaly detection",
        ),
        (
            "Edge probe API",
            "telemetry",
        ),
        "Tier 1",
    ),
    (
        "ares",
        "Ares DQA",
        "Adversarial testing and red-team",
        (
            "Quantum adversarial example generator",
            "Amplitude-based perturbations",
        ),
        (
            "Pen-test orchestration",
            "vulnerability ledger",
        ),
        "Tier 2",
    ),
    (
        "aphrodite",
        "Aphrodite DQA",
        "Sentiment and UX resonance",
        (
            "Quantum embeddings for multimodal affect",
            "Entanglement-assisted retrieval",
        ),
        (
            "UX tuning API",
            "A/B config",
        ),
        "Tier 1",
    ),
    (
        "hephaestus",
        "Hephaestus DQA",
        "Contract crafting and pipeline builds",
        (
            "Quantum-optimised synthesis for constraint solving",
        ),
        (
            "CI/CD hooks",
            "smart contract factory",
        ),
        "Tier 2",
    ),
    (
        "hermes",
        "Hermes DQA",
        "Messaging, routing, micropayments",
        (
            "Quantum key distribution",
            "Low-latency routing heuristics",
        ),
        (
            "Message bus",
            "payment rails",
        ),
        "Tier 3: payment validators",
    ),
    (
        "dionysus",
        "Dionysus DQA",
        "Crowd dynamics and memetic propagation",
        (
            "Quantum random walks",
            "Sampling for viral spread models",
        ),
        (
            "Social feed controller",
            "campaign API",
        ),
        "Tier 1",
    ),
)


QUANTUM_AGENT_PROFILES: Mapping[str, QuantumAgentProfile] = {
    code: _build_profile(code, designation, core_task, primitives, interfaces, tier)
    for code, designation, core_task, primitives, interfaces, tier in _QUANTUM_AGENT_DATA
}


@lru_cache(maxsize=1)
def list_quantum_agent_profiles() -> Tuple[QuantumAgentProfile, ...]:
    return tuple(QUANTUM_AGENT_PROFILES.values())


class DynamicZeusQuantumAgent(DynamicQuantumAgent):
    profile = QUANTUM_AGENT_PROFILES["zeus"]


class DynamicHeraQuantumAgent(DynamicQuantumAgent):
    profile = QUANTUM_AGENT_PROFILES["hera"]


class DynamicPoseidonQuantumAgent(DynamicQuantumAgent):
    profile = QUANTUM_AGENT_PROFILES["poseidon"]


class DynamicDemeterQuantumAgent(DynamicQuantumAgent):
    profile = QUANTUM_AGENT_PROFILES["demeter"]


class DynamicAthenaQuantumAgent(DynamicQuantumAgent):
    profile = QUANTUM_AGENT_PROFILES["athena"]


class DynamicApolloQuantumAgent(DynamicQuantumAgent):
    profile = QUANTUM_AGENT_PROFILES["apollo"]


class DynamicArtemisQuantumAgent(DynamicQuantumAgent):
    profile = QUANTUM_AGENT_PROFILES["artemis"]


class DynamicAresQuantumAgent(DynamicQuantumAgent):
    profile = QUANTUM_AGENT_PROFILES["ares"]


class DynamicAphroditeQuantumAgent(DynamicQuantumAgent):
    profile = QUANTUM_AGENT_PROFILES["aphrodite"]


class DynamicHephaestusQuantumAgent(DynamicQuantumAgent):
    profile = QUANTUM_AGENT_PROFILES["hephaestus"]


class DynamicHermesQuantumAgent(DynamicQuantumAgent):
    profile = QUANTUM_AGENT_PROFILES["hermes"]


class DynamicDionysusQuantumAgent(DynamicQuantumAgent):
    profile = QUANTUM_AGENT_PROFILES["dionysus"]


@lru_cache(maxsize=1)
def build_quantum_agent_registry() -> Mapping[str, Type[DynamicQuantumAgent]]:
    registry = {
        profile.code: agent
        for profile, agent in (
            (QUANTUM_AGENT_PROFILES["zeus"], DynamicZeusQuantumAgent),
            (QUANTUM_AGENT_PROFILES["hera"], DynamicHeraQuantumAgent),
            (QUANTUM_AGENT_PROFILES["poseidon"], DynamicPoseidonQuantumAgent),
            (QUANTUM_AGENT_PROFILES["demeter"], DynamicDemeterQuantumAgent),
            (QUANTUM_AGENT_PROFILES["athena"], DynamicAthenaQuantumAgent),
            (QUANTUM_AGENT_PROFILES["apollo"], DynamicApolloQuantumAgent),
            (QUANTUM_AGENT_PROFILES["artemis"], DynamicArtemisQuantumAgent),
            (QUANTUM_AGENT_PROFILES["ares"], DynamicAresQuantumAgent),
            (QUANTUM_AGENT_PROFILES["aphrodite"], DynamicAphroditeQuantumAgent),
            (QUANTUM_AGENT_PROFILES["hephaestus"], DynamicHephaestusQuantumAgent),
            (QUANTUM_AGENT_PROFILES["hermes"], DynamicHermesQuantumAgent),
            (QUANTUM_AGENT_PROFILES["dionysus"], DynamicDionysusQuantumAgent),
        )
    }
    return MappingProxyType(registry)

