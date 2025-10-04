# DeepseekV3 Liquidity Scenario Catalogue

The DeepseekV3 knowledge base now tracks the market microstructure conditions
that historically required bespoke routing guidance. Each scenario captures the
signal source, the expected order flow response, and remediation guidance for
operators.

## Scenario Index

1. **SMC Liquidation Cascades**  
   *Signal source*: curated imbalance captures described in
   `content/knowledge-base/deepseekv3/liquidity-ingest-journal.md`.  
   *Playbook*: throttle iceberg orders once cumulative delta exceeds 1.8× the
   30-minute baseline.  
   *Remediation*: cross-check imbalance clusters with the aggregated depth of
   market snapshots documented in the same journal before sending overrides to
   the execution graph.

2. **Synthetic Gap Detection**  
   *Signal source*: rolling spread analysis summarised inside the telemetry
   refresh runbook.  
   *Playbook*: park conditional orders two ticks inside the weighted midpoint
   until the spread recovers to 0.75× of the 14-day moving average.  
   *Remediation*: schedule the Deepseek ensemble to re-evaluate after 6 bars and
   escalate to the trading desk if dispersion persists beyond 3 cycles.

3. **Block Sweep Alerts**  
   *Signal source*: queue worker transcript recorded in
   `content/knowledge-base/deepseekv3/liquidity-ingest-journal.md`.  
   *Playbook*: enable dual confirmation from ChatCPT5 prior to auto-routing any
   hedging orders above the `notional_guardrail` threshold.  
   *Remediation*: ensure the DeepseekV3 telemetry exporter records the sweep
   packet ID in Supabase for audit reconciliation.

## Referenced Artefacts

- `content/knowledge-base/deepseekv3/liquidity-ingest-journal.md`
- `content/knowledge-base/deepseekv3/telemetry-refresh-runbook.md`

These artefacts close the catalogue gap that triggered the benchmark downgrade
by providing complete coverage for liquidity-related escalations.
