Name: Upper Confidence Bound policy

Equation(s):

```math
a_t = \arg\max_i \left[ \hat{\mu}_i + \kappa \sqrt{\frac{\ln t}{n_i}} \right]
```

Assumptions:

- Rewards are bounded so concentration inequalities apply.
- Each arm has been sampled at least once so $n_i > 0$.

Calibration:

- Maintain empirical means $\hat{\mu}_i$ and counts $n_i$ from historical pulls.
- Tune $\kappa$ via simulation or regret minimization to balance exploration and
  exploitation.
