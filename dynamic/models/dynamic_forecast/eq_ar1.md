# AR(1) Process

**Modules:** `dynamic_forecast`, `dynamic_predictive`, `dynamic_indicators`,
`dynamic_candles`

## Overview

Autoregressive model of order 1 capturing persistence in time series.

## Equation

$$y_t = \phi y_{t-1} + \epsilon_t.$$

- $\phi$ — autoregressive coefficient ($\theta$).
- $\epsilon_t$ — white-noise disturbance mapped to $\xi_t$.

## Notes

- State $x_t$ stores lagged observations; controls may adjust $\phi$ via
  learning routines.
