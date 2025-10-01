# <dir> model

## Problem statement

- **State**: $x_t = [\ldots]$
- **Controls**: $u_t = [\ldots]$
- **Parameters**: $\theta = [\ldots]$
- **Disturbances / shocks**: $\xi_t = [\ldots]$
- **Horizon**: $t = 0, \ldots, T$

## Dynamics

$$
x_{t+1} = f(x_t, u_t, \xi_t; \theta)
$$

Specify any piecewise structure or switching regimes here. Note how exogenous
inputs alter the transition function.

## Outputs / observables

$$
y_t = g(x_t; \theta)
$$

Describe which components of $y_t$ are consumed by other modules or exposed to
downstream analytics.

## Objective

$$
\min_{\{u_t\}} J = \sum_{t=0}^{T} \Big[ \ell(y_t, u_t) + \sum_k w_k \, \varphi_k(x_t, u_t) \Big]
$$

Clarify the economic or engineering interpretation of $\ell(\cdot)$ and each
regularization/penalty term $\varphi_k(\cdot)$.

## Constraints

- **Equality**: $h(x_t, u_t; \theta) = 0$
- **Inequality**: $c(x_t, u_t; \theta) \le 0$

Include state/control bounds, integral constraints, or safety envelopes as
needed.

## Initial conditions & calibration hooks

- Initial state $x_0 = [\ldots]$
- Prior over parameters $p(\theta)$ or reference estimates.
- Data sources required to fit or validate the model.

## Interfaces

- **Inputs consumed**: <upstream signals>
- **Outputs produced**: <downstream dependencies>

Document how this module composes with others in the system.
