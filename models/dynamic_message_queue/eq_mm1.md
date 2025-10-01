Name: M/M/1 steady-state metrics

Equation(s):

```math
\rho = \frac{\lambda}{\mu}, \quad W = \frac{1}{\mu - \lambda}, \quad L = \lambda W
```

Assumptions:

- Arrivals are Poisson with rate $\lambda$ and service times are exponential
  with rate $\mu$.
- System operates in steady state with $\lambda < \mu$.

Calibration:

- Fit $\lambda$ and $\mu$ from arrival and service telemetry using maximum
  likelihood or moment matching.
- Confirm the stability condition $\lambda < \mu$ before applying the formulas.
