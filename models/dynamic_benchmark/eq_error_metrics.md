# Error Metrics (MAE and RMSE)

**Modules:** `dynamic_benchmark`

## Overview

Quantifies predictive performance using mean absolute error and root-mean-square
error.

## Equations

\[ \text{MAE} = \frac{1}{n} \sum |y - \hat{y}|, \qquad \text{RMSE} =
\sqrt{\frac{1}{n} \sum (y - \hat{y})^2}. \]

- $y$ — observed outcomes, $\hat{y}$ — predictions (components of $y_t$ and
  $g(x_t)$).
- Sample size $n$ tracked in state.

## Notes

- Loss terms include MAE/RMSE to penalize forecasting deviations.
- Controls $u_t$ may switch models based on these metrics.
