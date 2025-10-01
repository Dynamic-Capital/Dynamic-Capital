# Cache Hit Rate (Che Approximation)

**Modules:** `dynamic_cache`, `dynamic_cdn`

## Overview

Models item hit probability under the independent reference model.

## Equation

$$h_i = 1 - \exp(-\lambda_i T_C).$$

- $\lambda_i$ — request rate for item $i$ (disturbance $\xi_t$).
- $T_C$ — characteristic time determined from cache capacity constraint
  $\sum_i h_i \le C$.

## Notes

- Solve for $T_C$ numerically to satisfy capacity in the control loop.
- Hit rates drive cache efficiency metrics in $y_t$ and penalty terms in
  $\ell(y_t, u_t)$.
