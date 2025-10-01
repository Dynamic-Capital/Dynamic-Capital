# Inventory and Emission Balance

**Modules:** `dynamic_supply`, `dynamic.platform.token`

## Overview

Tracks inventory evolution considering production, sales, and burns.

## Dynamics

$$\dot{I} = \text{production} - \text{sales} - \text{burn}.$$

- $I$ — inventory state variable in $x_t$.
- Production and sales may be controlled via $u_t$; burns can be disturbances
  $\xi_t$.

## Notes

- Integrating $\dot{I}$ over time yields discrete inventory updates for planning
  horizons.
- Constraint checks ensure $I \ge 0$ or maintain safety stock levels.
