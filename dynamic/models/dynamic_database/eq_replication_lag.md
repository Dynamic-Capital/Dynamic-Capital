# Replication Lag Dynamics

**Modules:** `dynamic_database`, `dynamic_chain`, `dynamic_consistency`

## Overview

Models lag between primary and replica databases.

## Equation

$$\dot{\ell} = \lambda_w - \mu_r.$$

- $\lambda_w$ — write arrival rate (disturbance $\xi_t$).
- $\mu_r$ — replica apply rate (control or parameter $\theta$).

## Notes

- Integrate to compute lag $\ell$; enforce $\ell \le \ell_{\max}$ via
  constraints.
- Output metrics include staleness alerts and replica health.
