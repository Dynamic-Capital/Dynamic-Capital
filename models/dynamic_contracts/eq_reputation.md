# Reputation Posterior (Beta-Bernoulli)

**Modules:** `dynamic_review`, `dynamic_reference`

## Overview

Bayesian update for success/failure feedback represented by a Beta distribution.

## Posterior

$$\text{Beta}(\alpha + s,\; \beta + f).$$

- $s$, $f$ — counts of positive and negative outcomes (state increments).
- $\alpha$, $\beta$ — prior hyperparameters ($\theta$).

## Mean Reputation

$$\mathbb{E}[p] = \frac{\alpha + s}{\alpha + \beta + s + f}.$$

## Notes

- Controls $u_t$ manage weighting schemes (e.g., recency adjustments).
- Reputation metrics inform contract approval policies.
