# Barometric Formula (Isothermal Atmosphere)

**Modules:** `dynamic_troposphere`, `dynamic_stratosphere`,
`dynamic_mesosphere`, `dynamic_thermosphere`, `dynamic_exosphere`

## Overview

Models atmospheric pressure decrease with altitude under isothermal conditions.

## Equation

$$p(h) = p_0 \exp\left(-\frac{M g h}{R T}\right).$$

- $p_0$ — reference pressure at sea level ($\theta$).
- $M$ — molar mass of air, $g$ — gravitational acceleration, $R$ — universal gas
  constant, $T$ — absolute temperature.

## Notes

- Altitude $h$ is part of state $x_t$; temperature variations can be
  disturbances $\xi_t$.
- Outputs include density and pressure used by aerospace modules.
