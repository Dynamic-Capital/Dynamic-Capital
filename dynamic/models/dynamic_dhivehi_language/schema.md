State: x_t = [g_t, q_t, a_t] (glossary coverage index, translation quality
score, actionable backlog)

Controls: u_t = [r_t, c_t, h_t] (review throughput, corpus curation effort,
human escalation hours)

Params: θ = [λ_g, λ_c, ρ_h, σ_d] (incoming glossary terms, translation memory
growth, review productivity, demand variance)

Dynamics:

g_{t+1} = g_t + λ_g - r_t

q_{t+1} = q_t + ρ_h h_t - σ_d c_t

a_{t+1} = a_t + λ_c - (r_t + c_t)

Outputs: y_t = [coverage_t, quality_t, readiness_t]

Objective: max J = Σ_t [w_c coverage_t + w_q quality_t + w_r readiness_t - w_b
backlog_t]

Constraints: 0 ≤ coverage_t, quality_t ≤ 1; r_t ≤ review_capacity_t; c_t ≤
curation_capacity_t; h_t ≤ support_hours_t; readiness_t = 1 - a_t / a_max
