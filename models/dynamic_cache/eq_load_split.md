# Load Splitting Weights

**Modules:** `dynamic_load_balancer`

## Overview

Distributes incoming traffic across servers to minimize the maximum utilization.

## Constraints

- Traffic allocation: $$\lambda_k = w_k \lambda.$$
- Utilization: $$\rho_k = \frac{\lambda_k}{\mu_k}.$$
- Optimization goal: $$\min_{w_k} \max_k \rho_k.$$

## Notes

- Decision variables $w_k$ belong to $u_t$ with $\sum_k w_k = 1$, $w_k \ge 0$.
- Service rates $\mu_k$ reside in $\theta$.
- Resulting utilizations update queueing metrics in $y_t$.
