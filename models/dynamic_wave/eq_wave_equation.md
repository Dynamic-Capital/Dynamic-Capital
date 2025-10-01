# Wave Equation

**Modules:** `dynamic_wave`, `dynamic_physics`

## Overview

Describes propagation of waves with speed $c$ across spatial domain.

## Equation

$$\frac{\partial^2 u}{\partial t^2} = c^2 \nabla^2 u.$$

- $u$ — field variable stored in state $x_t$ (e.g., displacement).
- Wave speed $c$ resides in parameters $\theta$ with relation $c = f \lambda$
  when wavelength $\lambda$ and frequency $f$ are known.

## Notes

- Discretize using finite differences to embed into the discrete meta-model.
- Outputs track energy or boundary conditions derived from $u$.
