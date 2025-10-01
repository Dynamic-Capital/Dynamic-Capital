# Shallow-Water Equations (1-D)

**Modules:** `dynamic_ocean`

## Overview

Captures conservation of mass and momentum for shallow-water flows.

## Equations

\[ \begin{aligned} \partial_t \eta + \partial_x (h u) &= 0, \\ \partial_t u + u
\partial_x u + g \partial_x \eta &= 0. \end{aligned} \]

- $\eta$ — surface elevation perturbation (state variable).
- $u$ — depth-averaged velocity.
- $h$ — mean water depth; $g$ — gravitational acceleration.

## Notes

- Discretize for numerical simulation consistent with the meta-model.
- Boundary controls $u_t$ can inject flux or set wall conditions.
