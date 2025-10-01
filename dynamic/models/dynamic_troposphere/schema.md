# dynamic_troposphere model

State: x_t = [p_t, T_t] (pressure profile, layer temperature) Controls: u_t =
[ℓ_t] (lapse-rate adjustment) Params: θ = [p_0, M, g, R] (surface pressure,
molar mass of air, gravity, gas constant)

Dynamics: T_{t+1} = T_t + ℓ_t + ξ^T_t p_{t+1}(h) = p_0 \exp\left(- \frac{M g
h}{R T_{t+1}}\right)

Outputs: y_t = p_t(h)

Objective: min J = Σ_t \int_h (p_t(h) - p^{\text{obs}}_t(h))^2 \, dh

Constraints: T_t > 0, ℓ_t ∈ [ℓ_{\min}, ℓ_{\max}]
