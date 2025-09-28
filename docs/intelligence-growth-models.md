# Intelligence Growth Models

This reference outlines four common approaches for modelling the evolution of an
intelligence metric over time. Each section captures the governing equation,
explains the underlying assumptions, and highlights practical implications for
alignment or capability planning.

## 1. Exponential Self-Improvement

When the rate of improvement scales directly with the current intelligence
level, the discrete-time update rule becomes:

$$
I_{t+1} = I_t + R(I_t)
$$

with a recursive improvement function $R(I_t) = \alpha I_t$. Substituting
yields:

$$
I_{t+1} = (1 + \alpha) I_t
$$

Iterating the update produces exponential growth:

$$
I(t) = I_0 e^{\alpha t}
$$

**Key considerations**

- Captures smooth compounding in settings where improvements linearly reinforce
  themselves.
- Works well for early-stage capability curves or when resources remain
  abundant.
- Sensitive to the calibration of $\alpha$; small increases in the feedback
  coefficient markedly accelerate the trajectory.

## 2. Intelligence Explosion (Superlinear Feedback)

A continuous-time formulation with superlinear reinforcement uses:

$$
\frac{dI}{dt} = k I^{\beta}, \quad \beta > 1
$$

where $k$ quantifies optimisation efficiency and $\beta$ controls the feedback
intensity.

**Implications**

- For $\beta > 1$, the solution reaches a finite-time singularity—the system
  "blows up" in finite time, representing a theoretical intelligence explosion.
- Models aggressive recursive self-improvement scenarios but ignores external
  constraints.
- Requires careful boundary conditions in simulations to avoid numerical
  instability near the singularity.

## 3. Resource-Limited Feedback

To encode diminishing returns as resources saturate, constrain the growth term:

$$
\frac{dI}{dt} = \frac{k I}{1 + \lambda I}
$$

where $\lambda$ aggregates the limiting factors (compute, energy, data).

**Implications**

- Behaviour is approximately exponential when $I$ is small and resources are
  plentiful.
- Growth tapers toward an asymptote as $I$ increases, mirroring logistic-style
  ceilings.
- Useful for planning trajectories that respect hard external resource caps.

## 4. Hybrid Logistic Model

A practical compromise balances self-improvement with limiting pressures:

$$
\frac{dI}{dt} = \alpha I - \beta I^2
$$

The linear term ($\alpha I$) rewards compounding advances, while the quadratic
drag ($\beta I^2$) captures resource friction and complexity costs.

**Implications**

- Produces a "fast takeoff then plateau" pattern: rapid capability gains until
  limiting effects dominate.
- Equilibrium occurs at $I^{*} = \alpha / \beta$, providing a target
  intelligence level for long-run planning.
- Parameter tuning offers knobs for scenario analysis: increase $\alpha$ for
  faster takeoff, raise $\beta$ to simulate stronger bottlenecks.
