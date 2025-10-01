# Battery State of Charge Update

**Modules:** `dynamic_energy`

## Overview

Discrete-time update for battery state of charge including charge/discharge
efficiencies.

## Equation

$$\text{SoC}_{t+1} = \text{SoC}_t + \frac{\eta_c I_c - I_d / \eta_d}{C} \Delta t.$$

- $I_c$, $I_d$ — charge/discharge currents (controls $u_t$).
- $\eta_c$, $\eta_d$ — efficiencies in $\theta$.
- $C$ — battery capacity parameter.

## Notes

- Enforce $0 \le \text{SoC}_t \le 1$ via constraints.
- Disturbances $\xi_t$ capture temperature effects or unexpected loads.
