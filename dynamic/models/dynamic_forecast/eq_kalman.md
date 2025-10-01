Name: Kalman filter recursions

Equation(s):

```math
\begin{aligned}
\hat{x}_{t|t-1} &= A \hat{x}_{t-1|t-1} + B u_{t-1} \\
K_t &= P_{t|t-1} H^{\top} (H P_{t|t-1} H^{\top} + R)^{-1} \\
\hat{x}_{t|t} &= \hat{x}_{t|t-1} + K_t (y_t - H \hat{x}_{t|t-1})
\end{aligned}
```

Assumptions:

- Dynamics and observations are linear with Gaussian noise.
- Control input $u_t$ is known without error at update time.

Calibration:

- Estimate $A$, $B$, $H$, $Q$, and $R$ via expectation-maximization or subspace
  identification.
- Validate the filter by checking innovation covariance against
  $H P_{t|t-1} H^{\top} + R$.
