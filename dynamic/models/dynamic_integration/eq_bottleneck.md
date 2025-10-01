# Pipeline Throughput Bottleneck

**Modules:** `dynamic_bridge`, `dynamic_pipeline`

## Overview

End-to-end throughput limited by slowest stage.

## Equation

$$X = \min_k X_k.$$

- $X_k$ — throughput of stage $k$ (state or parameter).

## Notes

- Controls $u_t$ allocate resources to the bottleneck stage to lift overall
  throughput.
- Monitor $X$ alongside latency metrics to maintain integration SLAs.
