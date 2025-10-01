# dynamic_thinking model

State: x_t = [\hat{μ}_t, n_t] (posterior mean rewards per arm, pull counts)
Controls: u_t = [a_t] (arm selection) Params: θ = [κ, β] (exploration weight,
prior strength)

Dynamics: \hat{μ}_{i,t+1} = \frac{n_{i,t} \hat{μ}_{i,t} + r_{i,t+1}}{n_{i,t} +
1} \mathbb{1}\{a_t = i\} + \hat{μ}_{i,t} \mathbb{1}\{a_t \ne i\} n_{i,t+1} =
n_{i,t} + \mathbb{1}\{a_t = i\}

Outputs: y_t = a_t = \arg\max_i [\hat{μ}_{i,t} + κ \sqrt{\ln t / n_{i,t}}]

Objective: min J = -Σ_t r_{a_t,t}

Constraints: n_{i,t} ≥ 1 \ \forall i, κ ≥ 0
