Name: Che approximation for cache hits

Equation(s):

```math
h_i = 1 - \exp(-\lambda_i T_C), \quad \text{choose } T_C \text{ such that } \sum_i h_i = C
```

Assumptions:

- Request arrivals for object $i$ follow a Poisson process with rate
  $\lambda_i$.
- Cache is fully associative and admits a shared characteristic time $T_C$.

Calibration:

- Estimate $\lambda_i$ from request logs using exponential smoothing or windowed
  counts.
- Solve for $T_C$ with root-finding so the aggregate hit rate matches capacity
  $C$.
