# Kalman Filter Recursions

**Modules:** `dynamic_forecast`, `dynamic_predictive`

## Overview

Linear Gaussian state-space inference used for smoothing and forecasting.

## Prediction Step

\[ \begin{aligned} x_{t|t-1} &= A x_{t-1} + B u_{t-1}, \\ P_{t|t-1} &= A P_{t-1}
A^\top + Q. \end{aligned} \]

## Update Step

\[ \begin{aligned} K_t &= P_{t|t-1} H^\top (H P_{t|t-1} H^\top + R)^{-1}, \\
x_{t|t} &= x_{t|t-1} + K_t (y_t - H x_{t|t-1}), \\ P_{t|t} &= (I - K_t H)
P_{t|t-1}. \end{aligned} \]

## Notes

- Matrices $A, B, H, Q, R$ lie in $\theta$.
- Output residuals $(y_t - H x_{t|t-1})$ power indicator diagnostics.
