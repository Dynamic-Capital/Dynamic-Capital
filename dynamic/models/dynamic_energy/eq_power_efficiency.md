# Power and Efficiency Relationships

**Modules:** `dynamic_energy`, `dynamic_fuel`, `dynamic_generator`

## Overview

Links torque, angular velocity, and power while quantifying conversion
efficiency.

## Equations

$$P = \tau \omega, \qquad \eta = \frac{P_{\text{out}}}{P_{\text{in}}}.$$

- $\tau$ — torque (control or disturbance).
- $\omega$ — angular velocity (state variable).
- Efficiency $\eta$ belongs to $\theta$ when modeled as constant or derived from
  lookup tables.

## Notes

Outputs include fuel usage and generation KPIs derived from $P$ and $\eta$.
