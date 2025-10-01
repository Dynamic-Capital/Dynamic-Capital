# Reinforcement Learning Skeleton

**Modules:** `dynamic_agents`, `dynamic_assign`, `dynamic_task_manager`

## Overview

Markov decision processes capture sequential decision-making for agent policies
and task dispatch.

## Value Functions

- State-value under policy $\pi$:
  $$V^{\pi}(s) = \mathbb{E} \left[ \sum_{t \ge 0} \gamma^t r_t \mid s_0 = s \right].$$
- Optimal policy selection: $$\pi^* = \arg\max_{\pi} V^{\pi}(s).$$

## Q-Learning Update

Iterative value improvement follows
$$Q(s,a) \leftarrow Q(s,a) + \eta \big( r + \gamma \max_{a'} Q(s', a') - Q(s,a) \big).$$

## Parameters

- Discount $\gamma \in [0,1)$ and learning rate $\eta$ reside in $\theta$.
- Rewards $r$ derive from the loss $\ell(y_t, u_t)$ or domain-specific payoffs.

## Integration Notes

- The state $x_t$ encodes the environment representation, while $u_t$ indexes
  policy actions.
- Convergence diagnostics for $Q$ updates can populate $y_t$ metrics (e.g.,
  Bellman error norms).
- Constraints ensure valid action spaces or task feasibility during learning.
