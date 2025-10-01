# dynamic_token model

State: x_t = [P_t, Q_{D,t}, Q_{S,t}] (price, demand, supply) Controls: u_t =
[m_t] (market operations or issuance decisions) Params: θ = [α_t, β_t, γ_t, δ_t,
P_*] (demand intercept, demand slope, supply intercept, supply slope, target
price)

Dynamics: Q_{D,t+1} = α_{t+1} - β_{t+1} P_t + ξ^D_t Q_{S,t+1} = γ_{t+1} +
δ_{t+1} P_t + ξ^S_t P_{t+1} = P_t + m_t + ξ^P_t

Outputs: y_t = P^*_t = \frac{α_t - γ_t}{β_t + δ_t}

Objective: min J = Σ_t [(P_t - P_*)^2 + c_m m_t^2]

Constraints: β_t + δ_t > 0, Q_{D,t}, Q_{S,t} ≥ 0
