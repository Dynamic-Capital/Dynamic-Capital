# dynamic_cache model

State: x_t = [λ_t, T_{C,t}] (per-object arrival rates, characteristic time)
Controls: u_t = [T_{C,t}] (cache residence tuning) Params: θ = [C, β] (cache
capacity, smoothing factor)

Dynamics: λ_{i,t+1} = (1-β) λ_{i,t} + β d_{i,t} T_{C,t+1} = T_{C,t} + u_t +
ξ^T_t

Outputs: y_t = h_t = 1 - \exp(-λ_t T_{C,t})

Objective: min J = Σ_t \left[(\sum_i h_{i,t} - C)^2 + w_T u_t^2\right]

Constraints: 0 ≤ h_{i,t} ≤ 1, Σ_i h_{i,t} = C
