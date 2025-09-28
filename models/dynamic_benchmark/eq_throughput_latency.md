# Throughput and Parallel Latency Metrics

**Modules:** `dynamic_benchmark`, `dynamic_version`

## Overview

Defines throughput as jobs per time and parallel latency via harmonic mean.

## Equations

$$X = \frac{N}{T}, \qquad T_p = \left( \sum_i \frac{1}{t_i} \right)^{-1}.$$

- $N$ — completed units, $T$ — elapsed time.
- $t_i$ — per-worker runtimes.

## Notes

- Track $X$ in outputs for performance baselines.
- Controls adjust resource allocations to target $T_p$ improvements.
