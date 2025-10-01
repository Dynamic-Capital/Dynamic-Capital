# Model Documentation Templates

This directory provides reusable building blocks for documenting dynamic models
consistently. Use the templates to stand up a new folder quickly, then tailor
the content to the specific domain.

## Quickstart checklist

1. **Create a module directory** under `dynamic/models/<domain>`.
2. **Copy the schema skeleton** from `dynamic/models/TEMPLATE/schema.md` and fill in the
   problem definition (state, controls, parameters, and constraints).
3. **Add equation notes** by duplicating `dynamic/models/TEMPLATE/eq_template.md` or
   adapting one of the prebuilt drop-ins below.
4. **Document calibration** for every equation so that parameter estimation can
   be reproduced.
5. **Link modules** by stating which outputs feed into downstream models and
   which upstream signals are required.

## Template overview

| File                             | Purpose                                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `dynamic/models/TEMPLATE/schema.md`      | Canonical structure for a model specification, including state evolution, objectives, and constraint sets. |
| `dynamic/models/TEMPLATE/eq_template.md` | Standard layout for a single equation, highlighting assumptions and calibration data sources.              |

When copying a template, replace placeholders in angle brackets (`<...>`) and
delete any sections that do not apply.

## Domain starter schemas

These schema files instantiate the template for common domains. Use them as
blueprints when bootstrapping a new model folder, then tailor the state,
control, and calibration details to your scenario.

| Path | Captures |
| --- | --- |
| `dynamic/models/dynamic_agents/schema.md` | Assignment workflows with backlog and agent capacity states. |
| `dynamic/models/dynamic_blockchain/schema.md` | Difficulty, hash rate, and mempool interactions for proof-of-work systems. |
| `dynamic/models/dynamic_cache/schema.md` | Cache sizing under the Che approximation with smoothed arrival rates. |
| `dynamic/models/dynamic_forecast/schema.md` | Linear-Gaussian state estimation using Kalman filter structure. |
| `dynamic/models/dynamic_message_queue/schema.md` | Queue length management via controllable service rates. |
| `dynamic/models/dynamic_thinking/schema.md` | Multi-armed bandit tracking of posterior means and counts. |
| `dynamic/models/dynamic_token/schema.md` | Token market clearing with linear demand and supply curves (module exported as `dynamic.platform.token`). |
| `dynamic/models/dynamic_troposphere/schema.md` | Tropospheric pressure profiling with lapse-rate adjustments. |

## Ready-to-use equation snippets

Each of the files below follows the equation template and can be dropped into a
new module. Update variable names and calibration notes as needed.

| Path | Captures |
| --- | --- |
| `dynamic/models/dynamic_agents/eq_assignment.md` | Binary assignment objective with feasibility constraints for matching agents to tasks. |
| `dynamic/models/dynamic_blockchain/eq_pow.md` | Expected block time under proof-of-work, linking difficulty and aggregate hash rate. |
| `dynamic/models/dynamic_cache/eq_che.md` | Che approximation for cache hit probabilities and cache sizing. |
| `dynamic/models/dynamic_message_queue/eq_mm1.md` | M/M/1 queue steady-state utilization, wait time, and queue length relationships. |
| `dynamic/models/dynamic_forecast/eq_kalman.md` | Kalman filter prediction and update recursions for linear-Gaussian state space models. |
| `dynamic/models/dynamic_troposphere/eq_barometric.md` | Barometric formula relating altitude to pressure under an isothermal assumption. |
| `dynamic/models/dynamic_token/eq_equilibrium.md` | Linear demand/supply equilibrium condition for market-clearing token prices (module exported as `dynamic.platform.token`). |
| `dynamic/models/dynamic_thinking/eq_ucb.md` | Upper Confidence Bound (UCB) policy for exploration in multi-armed bandits. |

## Recommended authoring flow

- **Scope the dynamics**: Specify the state vector, control variables, and
  stochastic terms in the schema before detailing equations.
- **Pair equations with calibration**: For every derived expression, note the
  datasets, estimation horizon, and mapping to model parameters.
- **Surface dependencies early**: Document how signals (forecasts, prices,
  capacities, etc.) move between modules. This keeps multi-model pipelines
  traceable.
- **Version your assumptions**: When refining a model, timestamp revisions or
  provide scenario labels so historical documentation remains interpretable.
- **Cross-check units**: Ensure dimensions are consistent across linked modules
  to avoid mismatched integrations.

By keeping schema, equations, and calibration narratives synchronized, you can
iterate on dynamic models rapidly while maintaining reproducibility.
