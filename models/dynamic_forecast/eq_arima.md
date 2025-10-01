# ARIMA(p, d, q) Structure

**Modules:** `dynamic_forecast`, `dynamic_predictive`

## Overview

Autoregressive integrated moving average models extend AR processes with
differencing and moving-average terms.

## Equation

Apply $d$ successive differences to $y_t$ before fitting ARMA$(p,q)$:
$$\nabla^d y_t = c + \sum_{i=1}^p \phi_i \nabla^d y_{t-i} + \sum_{j=1}^q \theta_j \epsilon_{t-j} + \epsilon_t.$$

## Notes

- Differencing order $d$ is part of $\theta$.
- Controls $u_t$ can trigger parameter re-estimation windows.
- Innovations $\epsilon_t$ map to disturbances $\xi_t$.
