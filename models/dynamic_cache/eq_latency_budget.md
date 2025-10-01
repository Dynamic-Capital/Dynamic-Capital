# Latency Budget Aggregation

**Modules:** `dynamic_http`, `dynamic_proxy`, `dynamic_load_balancer`

## Overview

Serial services accumulate latency budgets along the request path.

## Equation

$$T_{\text{end2end}} = \sum_k T_k.$$

- $T_k$ — latency of stage $k$ (state component or disturbance).
- Controls $u_t$ may re-order or bypass stages to manage the budget.

## Notes

- Constraint: $T_{\text{end2end}} \le T_{\text{SLO}}$ ensures overall response
  targets.
- Monitor contributions per stage to prioritize optimization.
