# 51% Attack Success Probability

**Modules:** `dynamic_blockchain`, `dynamic_proof_of_work`

## Overview

Approximate probability that an attacker with hash share $q < 0.5$ overtakes $k$
confirmation blocks.

## Equation

$$P_{\text{success}} \approx \exp\big(-2 (1 - 2q)^2 k \big).$$

## Parameters

- $q$ — attacker hash share embedded in $\theta$ or derived from state $x_t$.
- $k$ — confirmation depth configured by governance controls $u_t$.

## Notes

- Sensitivity analysis over $q$ informs security dashboards ($y_t$).
- Constraint enforcement can require $P_{\text{success}} \le \epsilon$ for
  target security level.
