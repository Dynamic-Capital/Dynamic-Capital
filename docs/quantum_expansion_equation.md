# Quantum Expansion Equation

## Overview

The quantum expansion equation models how a particle's effective spatial spread
evolves over time when quantum uncertainty, thermal agitation, and the
large-scale expansion of spacetime all contribute simultaneously. It extends
classical diffusion by embedding the dynamics in an expanding cosmological
background while preserving micro-scale thermal and quantum effects.

## Core Recurrence

\[ D_{t+1} = a(t+1) \cdot \Big[ D_t + \beta D_t \Delta T_t + \hbar \frac{\Delta
t}{m D_t} \Big] \]

Where:

- \(D_{t+1}\) – effective spread (e.g., wave packet width) at the next state.
- \(a(t+1)\) – cosmic scale factor describing the macroscopic expansion of
  spacetime.
- \(\beta D_t \Delta T_t\) – thermally driven change in spread from local
  vibrations or heat exchange.
- \(\hbar\) – reduced Planck constant introducing Heisenberg uncertainty.
- \(m\) – particle mass.
- \(\frac{\hbar \Delta t}{m D_t}\) – diffusion term associated with free
  wavefunction spreading.

## Term Breakdown

1. **Thermal contribution (\(\beta D_t \Delta T_t\))**
   - Captures stochastic spread induced by temperature gradients and collisions.
   - Dominant for mesoscopic systems where thermal agitation overwhelms quantum
     or cosmological effects.
2. **Cosmic expansion (\(a(t+1)\))**
   - Scales the entire bracketed micro-state update by the background expansion
     of spacetime.
   - Relevant for astrophysical or cosmological simulations that track particles
     over cosmological timescales.
3. **Quantum diffusion (\(\hbar \frac{\Delta t}{m D_t}\))**
   - Represents intrinsic wave packet spreading.
   - Mirrors the free-particle variance evolution \(\sigma(t) = \sqrt{
     \sigma_0^2 + \frac{\hbar^2 t^2}{m^2 \sigma_0^2} }\).
   - Dominant for light particles (e.g., electrons, photons) or ultra-cold
     regimes where thermal agitation is suppressed.

## Multi-scale Interpretation

- **Everyday matter:** thermal term dominates; cosmic and quantum effects are
  negligible.
- **Astrophysical bodies:** cosmic expansion dictates large-scale behavior;
  quantum diffusion is negligible at these scales.
- **Quantum systems:** quantum diffusion drives the dynamics; thermal and cosmic
  contributions can often be neglected.
- **Extreme environments (early universe, near singularities):** all terms
  couple, suggesting pathways to quantum gravity regimes where thermal, quantum,
  and cosmological effects intertwine.

## Implementation Notes

- The recurrence can be embedded in numerical solvers where \(\Delta t\) varies
  adaptively to maintain stability.
- For stiff regimes (e.g., near \(D_t \to 0\)), impose lower bounds on \(D_t\)
  to avoid singular quantum diffusion terms.
- Coupling with energy-density or field-theory models can generalize the quantum
  term \(f_q(\hbar, m, \Delta t)\) to include tunneling or interaction-driven
  spread adjustments.
