Name: Binary assignment program

Equation(s):

```math
\begin{aligned}
& \min_{a_{ij}} && \sum_i \sum_j c_{ij} a_{ij} \\
& \text{s.t.} && \sum_i a_{ij} = 1 \quad \forall j \\
& && \sum_j a_{ij} \le 1 \quad \forall i \\
& && a_{ij} \in \{0,1\}
\end{aligned}
```

Assumptions:

- Each task is completed by exactly one agent; capacity is at most one task per
  agent.
- Costs $c_{ij}$ are known at decision time and incorporate task-agent
  suitability.

Calibration:

- Collect historical assignment outcomes or expert scoring to estimate $c_{ij}$.
- Normalize costs so that feasibility constraints dominate tie-breaking instead
  of scale artifacts.
