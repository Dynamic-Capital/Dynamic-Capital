# M/M/1 Queue Performance

**Modules:** `dynamic_cache`, `dynamic_cdn`, `dynamic_load_balancer`,
`dynamic_http`, `dynamic_message_queue`, `dynamic_proxy`

## Overview

Models single-server queueing behavior per hop or service endpoint.

## Equations

\[ \rho = \frac{\lambda}{\mu}, \qquad W = \frac{1}{\mu - \lambda}, \qquad L =
\lambda W. \]

## Parameters

- $\lambda$ — arrival rate captured by disturbances $\xi_t$ or controls (traffic
  shaping).
- $\mu$ — service rate parameter in $\theta$.

## Notes

- Stability requires $\rho < 1$; enforce via constraints.
- Latency $W$ feeds SLO metrics in $y_t$.
