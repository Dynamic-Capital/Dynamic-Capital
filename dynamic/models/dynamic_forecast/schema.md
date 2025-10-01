# dynamic_forecast model

State: x_t = [\hat{x}_{t|t}, P_{t|t}] (posterior state estimate, covariance)
Controls: u_t = [u_t] (exogenous control input) Params: θ = [A, B, H, Q, R]
(state transition, control, observation, process noise, observation noise)

Dynamics: \hat{x}_{t+1|t} = A \hat{x}_{t|t} + B u_t + ξ^x_t P_{t+1|t} = A
P_{t|t} A^\top + Q

Outputs: y_t = H \hat{x}_{t|t}

Objective: min J = Σ_t [ (y_t - y^{\text{obs}}_t)^\top R^{-1} (y_t -
y^{\text{obs}}_t) + \operatorname{tr}(P_{t|t}) ]

Constraints: P_{t|t} \succeq 0, R \succ 0, Q \succeq 0
