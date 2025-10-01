# Forgetting Curve

**Modules:** `dynamic_memory`, `dynamic_implicit_memory`,
`dynamic_memory_reconsolidation`

## Overview

Models retention decay over time without reinforcement.

## Equation

$$R(t) = \exp\left(-\frac{t}{\tau}\right).$$

- $R(t)$ — retention level (state component).
- $\tau$ — decay time constant in $\theta$.

## Notes

- Controls $u_t$ (practice sessions) reset or boost retention.
- Outputs feed training cadence recommendations.
