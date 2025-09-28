# Event Sourcing State Fold

**Modules:** `dynamic_event`, `dynamic_point_in_time`, `dynamic_states`

## Overview

Accumulates application state by folding ordered events.

## Equation

$$x_t = \text{fold}(x_{t-1}, e_t), \qquad e_t \sim \mathcal{E}.$$

- $e_t$ — event emitted at step $t$ (disturbance input).
- Fold operator applies deterministic transition logic encoded in module code.

## Notes

- Controls $u_t$ may alter event replay strategies (e.g., snapshots).
- Outputs read materialized views derived from $x_t$.
