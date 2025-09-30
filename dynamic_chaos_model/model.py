"""High-level modelling utilities built on top of the Dynamic Chaos Engine.

This module provides a light-weight wrapper that calibrates a ``ChaosEngine``
to observed trajectories and offers convenience helpers for generating
forecasts.  The implementation intentionally keeps the heuristics simple so
that the utilities remain approachable for exploratory notebooks while still
surfacing useful diagnostics about how well the deterministic map explains the
observed data.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Callable, Sequence

from dynamic_chaos_engine.engine import (
    ChaosAttractor,
    ChaosEngine,
    ChaosState,
    Vector,
)

__all__ = [
    "ChaosModelConfig",
    "ChaosModel",
    "FitDiagnostics",
]


@dataclass(slots=True)
class ChaosModelConfig:
    """Configuration describing how a :class:`ChaosModel` should behave."""

    attractor: ChaosAttractor
    step_size: float = 1.0
    history_window: int = 512
    seed: int | None = None
    noise_floor: float = 1e-6


@dataclass(slots=True)
class FitDiagnostics:
    """Summary statistics describing a model calibration run."""

    residuals: tuple[float, ...]
    mean_residual: float
    max_residual: float
    noise_amplitude: float


class ChaosModel:
    """Estimate noise characteristics and forecast chaotic trajectories."""

    def __init__(self, config: ChaosModelConfig) -> None:
        self._config = config
        self._engine: ChaosEngine | None = None
        self._diagnostics: FitDiagnostics | None = None

    @property
    def config(self) -> ChaosModelConfig:
        """Return the immutable configuration used by the model."""

        return self._config

    @property
    def engine(self) -> ChaosEngine:
        """Return the fitted engine, raising if calibration has not occurred."""

        if self._engine is None:
            raise RuntimeError("ChaosModel must be fitted before accessing the engine")
        return self._engine

    @property
    def diagnostics(self) -> FitDiagnostics | None:
        """Return diagnostics from the most recent fit operation."""

        return self._diagnostics

    # ------------------------------------------------------------------
    # Calibration and evaluation
    # ------------------------------------------------------------------
    def fit(
        self,
        observations: Sequence[float] | Sequence[Sequence[float]],
    ) -> FitDiagnostics:
        """Calibrate the internal engine to match the provided observations."""

        vectors = _normalise_observations(observations)
        if len(vectors) < 2:
            raise ValueError("at least two observations are required to fit the model")

        residuals = _calculate_residuals(
            vectors,
            self._config.attractor.map_fn,
            self._config.step_size,
        )

        noise_amplitude = _estimate_noise(residuals, self._config.noise_floor)
        engine = ChaosEngine(
            vectors[-1],
            self._config.attractor.map_fn,
            step_size=self._config.step_size,
            noise_amplitude=noise_amplitude,
            history_window=self._config.history_window,
            seed=self._config.seed,
        )
        _seed_history(engine, vectors)

        diagnostics = FitDiagnostics(
            residuals=tuple(residuals),
            mean_residual=_mean(residuals),
            max_residual=max(residuals) if residuals else 0.0,
            noise_amplitude=noise_amplitude,
        )
        self._engine = engine
        self._diagnostics = diagnostics
        return diagnostics

    def score(self, observations: Sequence[float] | Sequence[Sequence[float]]) -> float:
        """Return the root mean squared error against ``observations``."""

        vectors = _normalise_observations(observations)
        if len(vectors) < 2:
            raise ValueError("at least two observations are required to compute a score")
        residuals = _calculate_residuals(
            vectors,
            self._config.attractor.map_fn,
            self._config.step_size,
        )
        return math.sqrt(sum(residual * residual for residual in residuals) / len(residuals))

    # ------------------------------------------------------------------
    # Forecasting helpers
    # ------------------------------------------------------------------
    def forecast(self, steps: int) -> list[ChaosState]:
        """Advance the fitted engine ``steps`` times and return the snapshots."""

        if steps <= 0:
            raise ValueError("steps must be positive")
        engine = self.engine
        return engine.simulate(steps)

    def reset(self) -> None:
        """Clear the fitted engine and diagnostics."""

        self._engine = None
        self._diagnostics = None


# ----------------------------------------------------------------------
# Internal helpers
# ----------------------------------------------------------------------

def _normalise_observations(
    observations: Sequence[float] | Sequence[Sequence[float]],
) -> list[Vector]:
    if not observations:
        raise ValueError("observations must not be empty")

    raw_sequence = list(observations)
    first = raw_sequence[0]
    vectors: list[Vector] = []
    if isinstance(first, (int, float)):
        for value in raw_sequence:
            if not isinstance(value, (int, float)):
                raise TypeError("all scalar observations must be numeric")
            vectors.append((float(value),))
    else:
        for vector in raw_sequence:
            if not isinstance(vector, Sequence):
                raise TypeError("each observation must be a sequence of numbers")
            if not vector:
                raise ValueError("observation vectors must not be empty")
            vectors.append(tuple(float(component) for component in vector))

    dimension = len(vectors[0])
    for vector in vectors:
        if len(vector) != dimension:
            raise ValueError("observations must all have the same dimensionality")
    return vectors


def _calculate_residuals(
    vectors: Sequence[Vector],
    map_fn: Callable[[Vector, float], Vector],
    step_size: float,
) -> list[float]:
    residuals: list[float] = []
    for previous, current in zip(vectors[:-1], vectors[1:]):
        predicted = map_fn(previous, step_size)
        residuals.append(_distance(predicted, current))
    return residuals


def _estimate_noise(residuals: Sequence[float], noise_floor: float) -> float:
    if not residuals:
        return max(noise_floor, 0.0)
    mean_square = sum(residual * residual for residual in residuals) / len(residuals)
    return max(noise_floor, math.sqrt(mean_square))


def _seed_history(engine: ChaosEngine, vectors: Sequence[Vector]) -> None:
    history = engine._history  # noqa: SLF001 - internal adjustment for calibration seeding
    history.clear()
    time_index = 0
    for index, vector in enumerate(vectors):
        divergence = 0.0 if index == 0 else _distance(vectors[index - 1], vector)
        energy = _energy(vector)
        history.append(
            ChaosState(
                time_index=time_index,
                vector=vector,
                divergence=divergence,
                energy=energy,
            )
        )
        time_index += 1
    engine._time_index = time_index - 1  # type: ignore[attr-defined]
    engine._state = vectors[-1]  # type: ignore[attr-defined]


def _distance(a: Vector, b: Vector) -> float:
    return math.sqrt(sum((ax - bx) ** 2 for ax, bx in zip(a, b)))


def _energy(vector: Vector) -> float:
    return 0.5 * sum(component * component for component in vector)


def _mean(values: Sequence[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)
