# Generation Dispatch Optimization

**Modules:** `dynamic_energy`, `dynamic_generator`

## Overview

Relaxes unit commitment to continuous power decisions with capacity constraints.

## Problem

\[ \begin{aligned} &\min_{\{P_t\}} \sum_t c(P_t) \\ \text{s.t.}\quad &0 \le P_t
\le P_{\max}, \\ &\sum_i P_{i,t} = D_t. \end{aligned} \]

- $c(\cdot)$ — generation cost curve in $\theta$.
- $D_t$ — demand requirement (disturbance $\xi_t$).

## Notes

- Decision variable $P_t$ belongs to $u_t$.
- Equality constraint enforces load balance per timestep.
