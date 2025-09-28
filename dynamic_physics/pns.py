"""Adaptive proto-neutron-star fallback simulation utilities.

This module upgrades the previous explicit-Euler integration approach for the
proto-neutron-star (PNS) fallback model to an adaptive Runge-Kutta solver.  The
model now accounts for neutrino-driven cooling, neutrino winds, and a
parameterised equation of state limit so callers can explore conditions that
lead to black-hole formation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Mapping, Sequence

import numpy as np
from scipy.integrate import solve_ivp

__all__ = [
    "G",
    "C",
    "M_SUN",
    "NeutrinoCoolingModel",
    "ProtoNeutronStar",
    "SimulationConfig",
    "SimulationResult",
    "fallback_power_law_mdot",
]

# ---------------------------------------------------------------------------
# Global constants (cgs units)
# ---------------------------------------------------------------------------

G: float = 6.67430e-8
"""Newtonian gravitational constant (cm^3 g^-1 s^-2)."""

C: float = 2.99792458e10
"""Speed of light (cm s^-1)."""

M_SUN: float = 1.98847e33
"""Solar mass (g)."""


# ---------------------------------------------------------------------------
# Domain models
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class NeutrinoCoolingModel:
    """Parameterized representation of neutrino emission from a PNS surface."""

    base_luminosity: float = 3.0e52
    """Reference luminosity used to normalise emission scaling (erg s^-1)."""

    temperature_scale: float = 5.0e10
    """Characteristic temperature for newly formed PNSs (K)."""

    radius_scale: float = 3.0e6
    """Reference radius corresponding to :attr:`temperature_scale` (cm)."""

    emission_index: float = 6.0
    """Exponent linking temperature to neutrino luminosity."""

    surface_emissivity: float = 0.8
    """Effective emissivity factor capturing deviations from a pure blackbody."""

    def luminosity(self, temperature: float, radius: float) -> float:
        """Return the neutrino luminosity for a given thermal state.

        The model assumes a modified blackbody emission law with an adjustable
        emissivity to capture departures from equilibrium transport.  The
        ``emission_index`` parameter maintains compatibility with fast-cooling
        regimes that scale more steeply with temperature than the classical
        :math:`T^4` law.
        """

        temp_ratio = max(temperature, 0.0) / self.temperature_scale
        radius_ratio = max(radius, self.radius_scale) / self.radius_scale
        return (
            self.surface_emissivity
            * self.base_luminosity
            * (temp_ratio**self.emission_index)
            * (radius_ratio**2)
        )


@dataclass(slots=True)
class SimulationConfig:
    """Configuration parameters for integrating the PNS evolution model."""

    start_time: float = 0.0
    end_time: float = 100.0
    max_step: float = 1.0
    rtol: float = 1e-6
    atol: float = 1e-9


@dataclass(slots=True)
class SimulationResult:
    """Container for the evolution history produced by :func:`solve_ivp`."""

    times: np.ndarray
    masses: np.ndarray
    radii: np.ndarray
    temperatures: np.ndarray
    metadata: Mapping[str, float] = field(default_factory=dict)

    @property
    def black_hole_time(self) -> float | None:
        """Return the time at which a black hole formed, if applicable."""

        return self.metadata.get("black_hole_time")

    @property
    def termination_reason(self) -> str:
        """Explain why integration stopped."""

        if "black_hole_time" in self.metadata:
            return "black-hole threshold reached"
        if "max_mass_time" in self.metadata:
            return "equation-of-state limit reached"
        return "integration completed"


@dataclass(slots=True)
class ProtoNeutronStar:
    """Evolves the mass, radius, and temperature of a proto-neutron star."""

    mass: float
    radius: float
    temperature: float
    eos_max_mass: float
    radius_floor: float = 1.2e6
    contraction_timescale: float = 0.6
    wind_efficiency: float = 0.05
    heat_capacity: float = 2.0e38
    accretion_efficiency: float = 0.4
    neutrino_model: NeutrinoCoolingModel = field(default_factory=NeutrinoCoolingModel)

    def initial_state(self) -> np.ndarray:
        """Return the state vector ``[mass, radius, temperature]``."""

        return np.array([self.mass, self.radius, self.temperature], dtype=float)

    def _equilibrium_radius(self, mass: float) -> float:
        """Crude mass-radius relation used as a contraction attractor."""

        baryonic_scale = max(mass / (1.4 * M_SUN), 1e-3)
        reference = 1.8e6 * baryonic_scale ** (-1.0 / 3.0)
        return max(reference, self.radius_floor)

    def _neutrino_wind_mdot(self, luminosity: float, mass: float, radius: float) -> float:
        """Estimate mass loss driven by neutrino winds."""

        escape_energy = max(G * mass / max(radius, self.radius_floor), 1e14)
        return self.wind_efficiency * luminosity / escape_energy

    def _derivatives(
        self,
        time: float,
        state: Sequence[float],
        mdot_func: Callable[[float, float, float], float],
    ) -> np.ndarray:
        """Compute time-derivatives of ``mass``, ``radius``, and ``temperature``."""

        mass, radius, temperature = state
        accretion_rate = float(mdot_func(time, mass, radius))
        luminosity = self.neutrino_model.luminosity(temperature, radius)
        wind_loss = self._neutrino_wind_mdot(luminosity, mass, radius)
        net_mdot = accretion_rate - wind_loss
        if mass <= 0.5 * M_SUN and net_mdot < 0.0:
            net_mdot = 0.0

        equilibrium_radius = self._equilibrium_radius(mass)
        luminosity_factor = 1.0 + (luminosity / self.neutrino_model.base_luminosity)
        contraction_tau = self.contraction_timescale / luminosity_factor
        radius_delta = -(radius - equilibrium_radius) / max(contraction_tau, 1e-6)

        potential_per_mass = G * mass / max(radius, self.radius_floor)
        heating = max(accretion_rate, 0.0) * potential_per_mass * self.accretion_efficiency
        cooling = luminosity
        temperature_delta = (heating - cooling) / self.heat_capacity

        return np.array([net_mdot, radius_delta, temperature_delta], dtype=float)

    def integrate(
        self,
        mdot_func: Callable[[float, float, float], float],
        *,
        config: SimulationConfig,
    ) -> SimulationResult:
        """Evolve the PNS using an adaptive Runge-Kutta integrator."""

        def rhs(time: float, state: np.ndarray) -> np.ndarray:
            return self._derivatives(time, state, mdot_func)

        def schwarzschild_event(time: float, state: np.ndarray) -> float:
            mass, radius, _ = state
            return radius - (2.0 * G * mass / (C**2))

        schwarzschild_event.terminal = True  # type: ignore[attr-defined]
        schwarzschild_event.direction = -1  # type: ignore[attr-defined]

        def eos_event(time: float, state: np.ndarray) -> float:
            mass, _, _ = state
            return self.eos_max_mass - mass

        eos_event.terminal = True  # type: ignore[attr-defined]
        eos_event.direction = -1  # type: ignore[attr-defined]

        solution = solve_ivp(
            rhs,
            t_span=(config.start_time, config.end_time),
            y0=self.initial_state(),
            method="RK45",
            max_step=config.max_step,
            rtol=config.rtol,
            atol=config.atol,
            events=(schwarzschild_event, eos_event),
            dense_output=False,
        )

        metadata: dict[str, float] = {}
        if solution.t_events:
            if solution.t_events[0].size:
                metadata["black_hole_time"] = float(solution.t_events[0][0])
            if solution.t_events[1].size:
                metadata["max_mass_time"] = float(solution.t_events[1][0])

        final_mass, final_radius, final_temperature = (float(value[-1]) for value in solution.y)
        self.mass = final_mass
        self.radius = max(final_radius, self.radius_floor)
        self.temperature = max(final_temperature, 0.0)

        return SimulationResult(
            times=solution.t,
            masses=solution.y[0],
            radii=np.maximum(solution.y[1], self.radius_floor),
            temperatures=np.maximum(solution.y[2], 0.0),
            metadata=metadata,
        )


# ---------------------------------------------------------------------------
# Helper accretion models
# ---------------------------------------------------------------------------


def fallback_power_law_mdot(time: float, *_: float) -> float:
    """Simple fallback accretion prescription following a power-law decay."""

    return ((time + 0.1) ** -1.5) * (M_SUN / 50.0)

