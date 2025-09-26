# Trading Algo Improvement Checklist

Use this checklist to tighten the Smart Money Concepts (SMC) workflow that
supports the trading automation stack. Each section ladders into the repository
touchpoints called out in `algorithms/`, Supabase Edge Functions, and the
Telegram delivery surfaces so changes propagate end-to-end. Treat the list as a
living review ritual for each improvement sprint so that new ideas translate
into measurable trading performance.

## 1. Foundation & Data Hygiene

- [ ] Confirm live market data feeds include liquidity metrics (session
      highs/lows, round numbers) required by SMC rules before signals flow into
      Supabase.
- [ ] Sync glossary terminology across bot configs, analyst runbooks, and UI
      labels so BOS/SMS, liquidity sweeps, and mitigation blocks remain
      consistent with `docs/glossary` references.
- [ ] Verify Supabase dashboards or logs capture BOS/liquidity sweep events for
      later review and store raw captures under `supabase/functions/*` logs or
      analytics tables.
- [ ] Validate data timestamps and session boundaries against exchange calendars
      after deployments or vendor switchovers so time-sensitive SMC logic does
      not drift.
- [ ] Archive notable feed anomalies (missing candles, widened spreads) inside
      the analytics schema to build a reference library for future mitigations.

## 2. Parameter & Configuration Governance

- [ ] Revisit `TradeConfig` SMC settings weekly; tighten
      `smc_level_threshold_pips` if entries are late and raise `smc_bias_weight`
      when structural bias should dominate other signals.
- [ ] Capture parameter changes plus performance metrics in the
      `algorithms/README.md` handoff log (date, change, observed outcome).
- [ ] Ensure alerting thresholds mirror the glossary checkpoints and commit the
      configuration changes alongside updates to `.env.example` when new keys
      are introduced.
- [ ] Add quick-hit postmortems for any config rollback so future operators
      understand why a threshold failed in production.
- [ ] Cross-check queue worker environment variables with Supabase edge function
      settings after each release to prevent stale overrides.

## 3. Analyzer & Signal Enhancements

- [ ] Extend `SMCAnalyzer.observe` with new mitigation block or liquidity
      pattern checks before persisting context to Supabase.
- [ ] Populate `MarketSnapshot.smc_zones` with discretionary continuation and
      reversal bases so automated runs reference the same supply/demand map as
      desk markups.
- [ ] Calibrate `smc_liquidity_weight` and `smc_bias_weight` after adding new
      zones to confirm continuation bases boost aligned trades while opposing
      supply/demand pockets still gate entries.
- [ ] Add unit or integration tests for each new SMC filter under
      `tests/trading-*` to prevent regressions in BOS/SMS detection.
- [ ] Log additional analyzer outputs (e.g., swept level IDs, mitigation block
      hits) to the analytics tables surfaced in dashboards so reviewers can
      audit context.
- [ ] Compare analyzer variants with shadow runs or notebook replays to confirm
      new heuristics improve win rate or risk-adjusted returns before merging.
- [ ] Document any external indicators or feature-engineering scripts in
      `algorithms/docs/` so analysts can replicate the logic outside automation.

## 4. Execution & Risk Discipline

- [ ] Require every published trade idea to reference the glossary checklist—
      call out BOS status, liquidity sweep confirmation, and mitigation
      alignment.
- [ ] Gate automated entries on passing both the glossary checklist and analyzer
      context review; wire the gating logic through queue and Supabase workers
      (`queue/index.ts`, `supabase/functions/telegram-bot/*`).
- [ ] Record reasons for overrides when human analysts diverge from automated
      recommendations and archive them in Supabase for feedback analysis.
- [ ] Stress-test latency-sensitive paths (order routing, Telegram alerts,
      Supabase webhooks) after every analyzer change to verify execution timing
      stays inside the acceptable window.
- [ ] Validate position sizing and risk caps against the portfolio policy doc
      before enabling new strategies or leverage adjustments.

## 5. Deployment & Communication

- [ ] Confirm deployment checklists for `algorithms/`, edge functions, and queue
      workers remain synchronized so feature flags activate in the correct
      sequence.
- [ ] Update member-facing portals (e.g., Liquidity Signal Desk) to highlight
      new checklist items and confirm the Telegram broadcast templates mirror
      the latest vocabulary.
- [ ] Notify data vendors or brokerage partners of significant behavioral
      changes (new order types, higher message rates) before rollout to prevent
      compliance issues.

## 6. Feedback Loop & Continuous Improvement

- [ ] Review post-trade analytics to correlate glossary-aligned setups with
      performance outcomes and adjust `TradeConfig` weights accordingly.
- [ ] Schedule retrospective sessions to adjust SMC thresholds, analyzer
      filters, and documentation when patterns emerge; capture notes in
      `docs/meeting-notes/` or the shared project tracker.
- [ ] Run quarterly scenario reviews comparing simulated and live fills to
      surface slippage patterns or venue degradations.
- [ ] Close the loop on overrides by tagging outcomes (positive, negative,
      neutral) and summarizing insights during the next strategy sync.
