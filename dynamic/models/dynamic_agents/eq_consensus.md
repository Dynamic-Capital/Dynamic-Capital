# Multi-Agent Consensus Update

**Modules:** `dynamic_agents`, `dynamic_syncronization`

## Overview

Average consensus pushes local states toward neighborhood means using a shared
step size.

## Dynamics

For agent $i$ at iteration $k$:
$$x_i(k+1) = x_i(k) + \alpha \sum_{j \in \mathcal{N}(i)} \big( x_j(k) - x_i(k) \big).$$

## Parameters

- $\alpha$ — consensus gain in $\theta$; select $0 < \alpha < 1/\Delta$ where
  $\Delta$ is the maximum node degree to ensure stability.
- $\mathcal{N}(i)$ — neighborhood defined by the communication graph.

## Meta-Model Mapping

- State $x_t$ collects the stacked agent opinions.
- Control $u_t$ may tune $\alpha$ or trigger asynchronous updates.
- Disturbances $\xi_t$ capture link failures or delayed messages.

## Notes

Consensus residuals provide natural convergence metrics for $y_t$ and feed loss
terms $\ell(y_t, u_t)$ measuring disagreement.
