# Simulation & Testing

Simulation assets orchestrate trace replays, Monte Carlo scenario generation, fuzzing, and chaos validation for the MAS.

## Components

- `trace_replay/` (pending): deterministic replays of historical trading days with KPI measurement hooks.
- `monte_carlo/` (pending): scenario generation notebooks and scripts.
- `fuzz/` (pending): schema fuzzers injecting payload mutations.
- `chaos/` (pending): templates for agent failure injections.

## Workflow

1. Select scenario and publish baseline metrics.
2. Run replay against staging cluster with synthetic topics.
3. Compare SLO deltas; gate deploy if regression > defined tolerance.
4. Archive run artifacts to MinIO with immutable retention.

