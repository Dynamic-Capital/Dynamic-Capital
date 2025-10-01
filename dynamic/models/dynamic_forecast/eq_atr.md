# Average True Range

**Modules:** `dynamic_indicators`

## Overview

Measures market volatility via the exponential average of true range.

## Equation

$$\text{ATR} = \text{EMA}(\text{TR}).$$

- True range (TR) derives from high/low/close data within $x_t$.
- Same EMA update as defined in `eq_ema.md` applied to TR values.

## Notes

ATR informs risk controls $u_t$ (position sizing) and outputs volatility
dashboards.
