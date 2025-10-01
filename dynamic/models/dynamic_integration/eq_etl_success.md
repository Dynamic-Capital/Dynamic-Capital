# End-to-End ETL Success Probability

**Modules:** `dynamic_bridge`, `dynamic_pipeline`, `dynamic_proxy`

## Overview

Probability that all stages in an integration pipeline succeed.

## Equation

$$P(\text{end-to-end}) = \prod_k P_k.$$

- $P_k$ — success probability of stage $k$ (parameter or state estimate).

## Notes

- Controls $u_t$ add retries or redundancy to increase $P(\text{end-to-end})$.
- Outputs track cumulative reliability for integration SLAs.
