# dynamic_message_queue model

State: x_t = [L_t, λ_t, μ_t] (queue length, arrival rate, service rate)
Controls: u_t = [μ_t] (server provisioning) Params: θ = [c_W, c_μ, β_λ] (wait
time penalty, service cost, arrival smoothing)

Dynamics: λ_{t+1} = (1-β_λ) λ_t + β_λ d_t L_{t+1} = \max\{0, L_t + λ_t - μ_t +
ξ^L_t\} μ_{t+1} = μ_t + u_t

Outputs: y_t = [ρ_t, W_t, L_t] = [λ_t / μ_t, 1 / (μ_t - λ_t), L_t]

Objective: min J = Σ_t [c_W W_t + c_μ u_t^2]

Constraints: 0 ≤ λ_t < μ_t, μ_t ≥ μ_{\min}
