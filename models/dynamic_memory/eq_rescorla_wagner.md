# Rescorla–Wagner Learning Rule

**Modules:** `dynamic_memory`, `dynamic_consciousness`, `dynamic_metacognition`

## Overview

Classical conditioning update capturing association strength adjustments.

## Equation

$$\Delta V = \alpha \beta (\lambda - V).$$

- $V$ — current associative strength (state variable).
- $\alpha$, $\beta$ — learning rate parameters ($\theta$).
- $\lambda$ — expected reinforcement.

## Notes

- Update $V \leftarrow V + \Delta V$ per trial.
- Disturbances $\xi_t$ model stochastic reinforcement availability.
