# Orbital Period (Kepler's Third Law)

**Modules:** `dynamic_space`, `dynamic_astronomy`,
`dynamic_interplanetary_space`

## Overview

Relates semi-major axis to orbital period around a central body.

## Equation

$$T = 2\pi \sqrt{\frac{a^3}{\mu}}, \qquad \mu = G M.$$

- $a$ — semi-major axis (state variable).
- $\mu$ — standard gravitational parameter determined by gravitational constant
  $G$ and mass $M$.

## Notes

- Control $u_t$ may adjust maneuver planning to target specific $T$.
- Disturbances $\xi_t$ capture perturbations like drag or third-body effects.
