# Task Assignment MILP

**Modules:** `dynamic_agents`, `dynamic_assign`, `dynamic_task_manager`

## Overview

This formulation assigns agents to tasks with binary decision variables while
minimizing total cost.

## Decision Variables

- $a_{ij} \in \{0, 1\}$ — assignment of agent $i$ to task $j$.

## Objective

Minimize the weighted assignment cost:
$$\min_{a_{ij}} \sum_{i \in \text{agents}} \sum_{j \in \text{tasks}} c_{ij} \, a_{ij}.$$

## Constraints

- Every task is covered: $$\sum_{i} a_{ij} = 1 \quad \forall j.$$
- Agents are single-tasked: $$\sum_{j} a_{ij} \le 1 \quad \forall i.$$
- Binary feasibility: $$a_{ij} \in \{0,1\}.$$

These constraints map to $c(x_t, u_t) \le 0$ by embedding the equality and
inequality conditions as residuals.

## Notes

- $x_t$ captures task backlog state; $u_t$ includes the binary assignment
  matrix.
- Cost coefficients $c_{ij}$ belong to $\theta$ and encode travel time, skill
  fit, or priority penalties.
- Relaxations (e.g., continuous $a_{ij}$) can be introduced for large-scale
  heuristics; document the impact in module README files.
