"""Core primitives powering the Dynamic Chaos Engine.

The goal of this module is to expose a light-weight toolkit for experimenting
with chaotic dynamical systems inside the Dynamic Capital knowledge base.  It
focuses on three responsibilities:

* providing a small data model for chaotic state snapshots and anomaly events,
* wrapping arbitrary iterative maps in a consistent `ChaosEngine` interface, and
* shipping reference attractors (logistic and Lorenz) that are easy to plug into
  experiments or educational notebooks.

Nothing in this module aims to be a perfect physical simulation—the intention is
for it to be a numerically stable playground that stays approachable for folks
without a deep background in nonlinear dynamics.  The implementation therefore
leans on simple Euler integration, optional stochastic noise, and conservative
defaults that avoid exploding values while still highlighting the core chaotic
behaviour.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
import math
import random
from typing import Callable, Deque, Iterator, Sequence

Vector = tuple[float, ...]
ChaosMap = Callable[[Vector, float], Vector]

__all__ = [
    "Vector",
    "ChaosMap",
    "ChaosState",
    "ChaosEvent",
    "ChaosAttractor",
    "LyapunovEstimate",
    "ChaosEngine",
    "create_engine_from_attractor",
    "logistic_map",
    "lorenz_system",
    "sample_chaotic_signal",
]


@dataclass(slots=True)
class ChaosState:
    """Snapshot of a chaotic system at a discrete time step."""

    time_index: int
    vector: Vector
    divergence: float
    energy: float

    def as_dict(self) -> dict[str, float | int | Sequence[float]]:
        """Return a serialisable representation of the state."""

        return {
            "time_index": self.time_index,
            "vector": list(self.vector),
            "divergence": self.divergence,
            "energy": self.energy,
        }


@dataclass(slots=True)
class ChaosEvent:
    """An anomaly detected while the engine evolves the system."""

    time_index: int
    kind: str
    intensity: float
    description: str
    state: ChaosState

    def __str__(self) -> str:  # pragma: no cover - presentation helper
        return (
            f"ChaosEvent(kind={self.kind!r}, intensity={self.intensity:.3f}, "
            f"time_index={self.time_index})"
        )


@dataclass(slots=True)
class ChaosAttractor:
    """Metadata describing a known chaotic attractor configuration."""

    name: str
    map_fn: ChaosMap
    default_state: Vector
    description: str


@dataclass(slots=True)
class LyapunovEstimate:
    """Rolling Lyapunov exponent estimate based on recent states."""

    exponent: float
    window: int
    stable: bool = field(default=False)


class ChaosEngine:
    """Iteratively evolves a chaotic map with optional noise injection."""

    def __init__(
        self,
        initial_state: Sequence[float],
        map_fn: ChaosMap,
        *,
        step_size: float = 1.0,
        noise_amplitude: float = 0.0,
        history_window: int = 128,
        seed: int | None = None,
    ) -> None:
        if not initial_state:
            raise ValueError("initial_state must contain at least one value")
        self._state: Vector = tuple(float(value) for value in initial_state)
        self._map_fn = map_fn
        self._step_size = float(step_size)
        if self._step_size <= 0:
            raise ValueError("step_size must be positive")
        self._noise_amplitude = max(0.0, float(noise_amplitude))
        self._history: Deque[ChaosState] = deque(maxlen=max(2, int(history_window)))
        self._time_index = 0
        self._rng = random.Random(seed)
        # seed history with initial state so consumers can inspect it immediately
        initial = self._create_state(self._state, divergence=0.0, energy=self._energy(self._state))
        self._history.append(initial)

    # ------------------------------------------------------------------
    # public API
    # ------------------------------------------------------------------
    @property
    def state(self) -> ChaosState:
        """Return the most recent state snapshot."""

        return self._history[-1]

    @property
    def history(self) -> tuple[ChaosState, ...]:
        """Return an immutable copy of the history window."""

        return tuple(self._history)

    def step(self) -> ChaosState:
        """Advance the system by one time step."""

        next_vector = self._map_fn(self._state, self._step_size)
        if self._noise_amplitude:
            next_vector = tuple(
                value + self._rng.gauss(0.0, self._noise_amplitude) for value in next_vector
            )
        divergence = self._distance(self._state, next_vector)
        energy = self._energy(next_vector)
        self._time_index += 1
        self._state = next_vector
        snapshot = self._create_state(next_vector, divergence=divergence, energy=energy)
        self._history.append(snapshot)
        return snapshot

    def simulate(self, steps: int) -> list[ChaosState]:
        """Run the system for *steps* iterations and return the snapshots."""

        if steps < 0:
            raise ValueError("steps must be non-negative")
        return [self.step() for _ in range(steps)]

    def stream(self, steps: int | None = None) -> Iterator[ChaosState]:
        """Yield states indefinitely or for the requested number of steps."""

        remaining = steps
        while remaining is None or remaining > 0:
            yield self.step()
            if remaining is not None:
                remaining -= 1

    def detect_events(
        self,
        *,
        energy_multiplier: float = 2.5,
        divergence_threshold: float = 1.5,
    ) -> list[ChaosEvent]:
        """Inspect the recent history for significant energy or divergence spikes."""

        if len(self._history) < 3:
            return []
        baseline_energy = sum(state.energy for state in self._history[:-1]) / (len(self._history) - 1)
        baseline_divergence = sum(state.divergence for state in self._history[:-1]) / (
            len(self._history) - 1
        )
        latest = self.state
        events: list[ChaosEvent] = []
        if baseline_energy and latest.energy >= baseline_energy * max(1.0, energy_multiplier):
            events.append(
                ChaosEvent(
                    time_index=latest.time_index,
                    kind="energy_spike",
                    intensity=latest.energy / baseline_energy,
                    description="Energy exceeded rolling baseline",
                    state=latest,
                )
            )
        if baseline_divergence and latest.divergence >= baseline_divergence * max(1.0, divergence_threshold):
            events.append(
                ChaosEvent(
                    time_index=latest.time_index,
                    kind="divergence_spike",
                    intensity=latest.divergence / baseline_divergence,
                    description="Divergence exceeded rolling baseline",
                    state=latest,
                )
            )
        return events

    def estimate_lyapunov(self) -> LyapunovEstimate:
        """Estimate the maximal Lyapunov exponent from the recent history."""

        if len(self._history) < 3:
            return LyapunovEstimate(exponent=0.0, window=len(self._history), stable=False)
        contributions: list[float] = []
        previous = self._history[0]
        for state in list(self._history)[1:]:
            prev_divergence = max(previous.divergence, 1e-9)
            current_divergence = max(state.divergence, 1e-9)
            contributions.append(math.log(current_divergence / prev_divergence))
            previous = state
        exponent = sum(contributions) / len(contributions)
        stable = len(self._history) == self._history.maxlen
        return LyapunovEstimate(exponent=exponent, window=len(self._history), stable=stable)

    # ------------------------------------------------------------------
    # helper methods
    # ------------------------------------------------------------------
    def _create_state(self, vector: Vector, *, divergence: float, energy: float) -> ChaosState:
        return ChaosState(time_index=self._time_index, vector=vector, divergence=divergence, energy=energy)

    @staticmethod
    def _distance(a: Vector, b: Vector) -> float:
        return math.sqrt(sum((ax - bx) ** 2 for ax, bx in zip(a, b)))

    @staticmethod
    def _energy(vector: Vector) -> float:
        return 0.5 * sum(value * value for value in vector)


# ----------------------------------------------------------------------
# Reference attractors
# ----------------------------------------------------------------------

def logistic_map(r: float, *, dimensions: int = 1) -> ChaosAttractor:
    """Return a logistic map attractor configuration."""

    if dimensions <= 0:
        raise ValueError("dimensions must be positive")

    def step(state: Vector, _: float) -> Vector:
        return tuple(r * value * (1.0 - value) for value in state)

    description = (
        "Canonical logistic map where sensitivity to initial conditions "
        "emerges when r > 3.569."
    )
    default_state = tuple(0.5 for _ in range(dimensions))
    return ChaosAttractor(
        name=f"logistic_r={r}",
        map_fn=step,
        default_state=default_state,
        description=description,
    )


def lorenz_system(
    *,
    sigma: float = 10.0,
    beta: float = 8.0 / 3.0,
    rho: float = 28.0,
    dt: float = 0.01,
) -> ChaosAttractor:
    """Return a Lorenz system attractor with Euler integration."""

    def step(state: Vector, _: float) -> Vector:
        x, y, z = state
        dx = sigma * (y - x)
        dy = x * (rho - z) - y
        dz = x * y - beta * z
        return (
            x + dx * dt,
            y + dy * dt,
            z + dz * dt,
        )

    description = "Classic Lorenz attractor integrated with a fixed Euler step."
    default_state: Vector = (1.0, 1.0, 1.0)
    return ChaosAttractor(
        name="lorenz",
        map_fn=step,
        default_state=default_state,
        description=description,
    )


# ----------------------------------------------------------------------
# Convenience helpers
# ----------------------------------------------------------------------

def sample_chaotic_signal(
    engine: ChaosEngine,
    *,
    steps: int,
    feature: Callable[[ChaosState], float] | None = None,
) -> list[float]:
    """Sample a scalar signal from an engine over the provided number of steps."""

    if steps <= 0:
        raise ValueError("steps must be positive")
    extractor = feature or (lambda state: state.vector[0])
    samples: list[float] = []
    for state in engine.simulate(steps):
        samples.append(float(extractor(state)))
    return samples


def create_engine_from_attractor(
    attractor: ChaosAttractor,
    *,
    step_size: float = 1.0,
    noise_amplitude: float = 0.0,
    history_window: int = 128,
    seed: int | None = None,
) -> ChaosEngine:
    """Instantiate a :class:`ChaosEngine` using a preset attractor."""

    engine = ChaosEngine(
        attractor.default_state,
        attractor.map_fn,
        step_size=step_size,
        noise_amplitude=noise_amplitude,
        history_window=history_window,
        seed=seed,
    )
    # Step once so the history reflects the first evolution from the preset.
    engine.step()
    return engine
