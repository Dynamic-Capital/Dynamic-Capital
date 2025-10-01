# Skill Accumulation Dynamics

**Modules:** `dynamic_mentorship`, `dynamic_skills`

## Overview

Models skill growth through practice with forgetting.

## Equation

$$s_{t+1} = s_t + \eta \cdot \text{practice}_t - \delta s_t.$$

- $s_t$ — skill level (state variable).
- $\eta$ — learning efficiency, $\delta$ — decay rate (parameters in $\theta$).
- $\text{practice}_t$ — training effort control $u_t$.

## Notes

- Enforce bounds $s_t \ge 0$ via constraints.
- Outputs report competency trajectories for workforce planning.
