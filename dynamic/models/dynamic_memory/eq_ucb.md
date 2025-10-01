# Upper Confidence Bound Exploration

**Modules:** `dynamic_mindset`, `dynamic_thinking`, `dynamic_creative_thinking`

## Overview

Balances exploration and exploitation in bandit problems.

## Selection Rule

$$a = \arg\max_i \left( \hat{\mu}_i + \kappa \sqrt{\frac{\ln t}{n_i}} \right).$$

- $\hat{\mu}_i$ — empirical mean reward (state variable).
- $n_i$ — count of pulls for arm $i$.
- $\kappa$ — exploration parameter in $\theta$.

## Notes

- Time $t$ increments with each decision step.
- Controls $u_t$ tune $\kappa$ or impose fairness constraints.
