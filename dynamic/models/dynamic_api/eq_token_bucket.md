# Token Bucket Rate Limiting

**Modules:** `dynamic_api`, `dynamic_rate_limit`

## Overview

Controls request throughput using replenishing tokens.

## Update Rule

$$b_{t+1} = \min\big(B,\; b_t + \rho \Delta t - \text{cost}_t\big).$$

- $B$ — bucket capacity ($\theta$).
- $\rho$ — refill rate.
- $\text{cost}_t$ — tokens consumed by current requests (control decision).

## Notes

- Enforce $b_{t+1} \ge 0$ via constraints; reject or defer traffic when
  depleted.
- Output metrics include instantaneous token levels and rejection counts.
