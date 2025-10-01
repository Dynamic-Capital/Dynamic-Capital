# Linear Supply and Demand Equilibrium

**Modules:** `dynamic_supply`, `dynamic_demand`, `dynamic_stake`

## Overview

Computes market-clearing price and quantity for linear demand and supply curves.

## Equations

\[ \begin{aligned} Q_D &= \alpha - \beta P, \\ Q_S &= \gamma + \delta P, \\ P^*
&= \frac{\alpha - \gamma}{\beta + \delta}, \\ Q^* &= \alpha - \beta P^*.
\end{aligned} \]

## Parameters

- $\alpha, \beta$ — demand intercept and slope.
- $\gamma, \delta$ — supply intercept and slope.

## Integration

- $x_t$ tracks inventory and demand signals; $u_t$ adjusts pricing controls.
- Output metrics expose surplus and price deviations from $P^*$.
