# DNS Cache Staleness Probability

**Modules:** `dynamic_domain`, `dynamic_domain_name_system`,
`dynamic_domain_names`

## Overview

Probability that cached records are stale given Poisson update arrivals.

## Equation

$$p_{\text{stale}} = \exp(-\lambda \cdot \text{TTL}).$$

- $\lambda$ — record update rate ($\theta$ or disturbance $\xi_t$).
- TTL — cache lifetime setting (control $u_t$).

## Notes

- Constraint ensures $p_{\text{stale}} \le p_{\max}$ for reliability targets.
- Outputs monitor DNS cache effectiveness.
