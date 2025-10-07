# Automation Expansion Snapshot — 14 Feb 2025

## Summary

- Deployed `--automate` and `--export-dir` options to the `playbook` CLI so
  ritual owners can generate timestamped initiative snapshots without manual
  copy/paste work.
- Added automation bundles and JSON export hooks to `npm run checklists`,
  enabling scheduled governance sweeps with machine-readable artefacts for every
  task.
- Upgraded the Dynamic Loop Engine’s self-loop metrics to weight signal
  magnitude and trend direction, improving fatigue detection and the quality of
  generated interventions.

## Automation Hooks

- `./playbook --automate --export-dir automation/playbook` now renders every
  `docs/status-updates` file into a timestamped Markdown export, supporting
  audit trails for daily, weekly, and quarterly rituals.
- `npm run checklists -- --automation governance --plan-export automation/logs/governance-plan.json --result-export automation/logs/governance-run.json`
  bundles DAI, DAGI, and trading build checks and writes both the plan and
  execution log to JSON for downstream dashboards.

## Loop Intelligence

- Loop stability now measures weighted variance across absolute signal
  magnitudes instead of allowing positive/negative offsets to cancel out risk.
- Momentum scoring considers signal weights, while fatigue emphasises
  high-magnitude regressions with weak trends so recovery triggers fire sooner.
- Healthy loops surface an `amplify` recommendation alongside the existing
  sustain notice when stability ≥0.85, momentum ≥0.8, and fatigue ≤0.25.

## Follow-Up Actions

1. Wire the new automation exports into the leadership cadence overlay to ensure
   every stand-up and governance review stores the generated artefacts with
   meeting notes.
2. Extend the automation bundle catalog with a trading readiness preset that
   includes liquidity checks once the downstream scripts stabilise.
3. Backfill historical loop evaluations with the enhanced engine to baseline the
   updated metrics before the next quarterly review.
