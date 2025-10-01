# Query Cost Estimation

**Modules:** `dynamic_api`, `dynamic_graphql`, `dynamic_http`

## Overview

Aggregates per-field costs weighted by fan-out within a query plan.

## Equation

$$C(q) = \sum_{f \in q} \kappa_f \cdot \text{fanout}_f.$$

- $\kappa_f$ — cost coefficients in $\theta$.
- $\text{fanout}_f$ — expected expansion factor stored in $x_t$.

## Notes

- Controls $u_t$ apply query shaping or throttling when $C(q)$ exceeds
  thresholds.
- Output metrics track cumulative query cost to enforce budgets.
