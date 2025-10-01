# Dynamic Capital Master Meta-Model

The Dynamic Capital platform models every subsystem using a shared
control-theoretic grammar. This meta-model defines the symbols, governing
equations, and optimization scaffold that individual domain modules extend
through plug-in equation sheets.

## Core Elements

| Symbol                 | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| $x_t \in \mathbb{R}^n$ | System state at step $t$ capturing latent variables.               |
| $u_t$                  | Control action or decision variables applied at step $t$.          |
| $\xi_t$                | Exogenous inputs or disturbances that affect the state transition. |
| $\theta$               | Fixed model parameters for a module (learned or configured).       |
| $y_t$                  | Observable outputs or KPIs derived from the state.                 |
| $c(x_t, u_t)$          | Constraint vector that must remain non-positive.                   |
| $\ell(y_t, u_t)$       | Stage loss incorporating operational penalties.                    |
| $\phi_k(x_t, u_t)$     | Auxiliary objective components with weight $w_k$.                  |

## Dynamics Templates

Each module specifies dynamics in either discrete or continuous time using the
shared notation:

- **Discrete-time transition** $$x_{t+1} = f(x_t, u_t, \xi_t; \theta)$$

- **Continuous-time evolution** $$\dot{x} = f(x, u, \xi; \theta)$$

Modules may linearize or approximate $f(\cdot)$, but the contract of
state-input-disturbance-parameter arguments is conserved.

## Output and Metrics

Outputs are computed via $$y_t = g(x_t; \theta)$$

where $g(\cdot)$ maps latent state into metrics, alerts, or decision features.
Plug-in sheets should document how the outputs feed front-end analytics, trading
bots, or governance dashboards.

## Constraints

All hard or soft feasibility limits are encoded as $$c(x_t, u_t) \le 0.$$

Modules note slack variables or dual interpretations when applicable (e.g.,
queue stability, regulatory caps, risk budgets).

## Objective Structure

Optimization problems adopt a weighted loss formulation:
$$\min_{\{u_t\}_{t=0}^T} J = \sum_{t=0}^T \Big( \ell(y_t, u_t) + \sum_k w_k \, \phi_k(x_t, u_t) \Big).$$

Weights $w_k$ configure trade-offs such as risk-adjusted return, energy
efficiency, or latency versus throughput. Individual equation sheets reference
this scaffold and describe module-specific loss terms.

## Using the Meta-Model

1. Identify the relevant module directory under `dynamic/models/` and review the
   associated `eq_*.md` sheet(s).
2. Instantiate the state, control, and disturbance variables consistent with the
   shared notation.
3. Apply the documented dynamics, constraints, and objectives, substituting
   module-specific parameters $\theta$.
4. Integrate the resulting equations into simulations, optimizers, or monitoring
   pipelines.

### Module Equation Index

The following plug-in equation sheets reuse the meta-model grammar:

- [Agent coordination and tasking](dynamic_agents/) — task assignment MILPs,
  consensus flows, and reinforcement learning updates.
- [Blockchain and cryptoeconomic primitives](dynamic_blockchain/) — proof
  systems, staking, supply emission, and validator risk models.
- [Market interaction and supply-demand modeling](dynamic_supply/).
- [Networking, caching, and service-layer queues](dynamic_cache/).
- [Microservices reliability and logging SLOs](dynamic_microservices/).
- [Forecasting and indicator analytics](dynamic_forecast/).
- [Energy systems and battery dispatch](dynamic_energy/).
- [Wave and physics simulators](dynamic_wave/).
- [Atmosphere, orbital, and space dynamics](dynamic_space/).
- [Oceanographic flows](dynamic_ocean/).
- [Cognitive and decision processes](dynamic_memory/).
- [API, cryptography, and rate limits](dynamic_api/).
- [Domain services and addressing](dynamic_domain/).
- [Compliance, contracts, and reputation](dynamic_contracts/).
- [Database replication and consistency](dynamic_database/).
- [Team operations and learning curves](dynamic_team/).
- [Benchmarking and scoring](dynamic_benchmark/).
- [Text analytics and glossary tooling](dynamic_text/).
- [Event sourcing and state transitions](dynamic_event/).
- [Integration bridges and pipelines](dynamic_integration/).

Each sheet references the implementing `dynamic_*` package(s) and may introduce
additional derived quantities, but the state/control conventions remain
unchanged.
