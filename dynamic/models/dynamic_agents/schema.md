# dynamic_agents model

State: x_t = [b_t, s_t] (task backlog, available agent capacity) Controls: u_t =
[A_t] (binary assignment matrix) Params: θ = [c_t, λ_t, r_t] (cost matrix, task
arrivals, agent return rates)

Dynamics: b_{t+1} = b_t + λ_t - (A_t \, \mathbf{1}) s_{t+1} = s_t + r_t -
(A_t^\top \, \mathbf{1})

Outputs: y_t = A_t

Objective: min J = Σ_t [⟨c_t, A_t⟩]

Constraints: A_t \, \mathbf{1} = \mathbf{1}, A_t^\top \, \mathbf{1} ≤ s_t, A_t ∈
{0,1}
