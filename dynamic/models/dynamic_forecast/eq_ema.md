# Exponential Moving Average

**Modules:** `dynamic_indicators`, `dynamic_candles`

## Overview

Smooths price series with exponential weighting.

## Recurrence

$$\text{EMA}_t = \alpha p_t + (1 - \alpha) \text{EMA}_{t-1}.$$

- $p_t$ — observed price (part of $y_t$ / $x_t$).
- $\alpha$ — smoothing factor ($\theta$).

## Notes

- Initialization uses $\text{EMA}_0$ from prior average.
- Control $u_t$ can adapt $\alpha$ based on volatility regimes.
