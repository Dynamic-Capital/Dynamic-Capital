# Quorum Conditions

**Modules:** `dynamic_cap_theorem`

## Overview

Ensures strong reads in quorum-based systems.

## Condition

$$R + W > N.$$

- $R$ — read quorum size, $W$ — write quorum size, $N$ — replica count.

## Notes

- Decision variables $u_t$ adjust quorum sizes to balance latency and
  consistency.
- Increasing $R$ reduces staleness probability at cost of higher read latency
  captured in $\ell(y_t, u_t)$.
