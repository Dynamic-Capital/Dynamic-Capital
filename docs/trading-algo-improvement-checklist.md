# Trading Algo Improvement Checklist

Use this checklist to tighten the Smart Money Concepts (SMC) workflow that
supports the trading automation stack. Each section ladders into the repository
touchpoints called out in `algorithms/`, Supabase Edge Functions, and the
Telegram delivery surfaces so changes propagate end-to-end.

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

## 2. Configuration Review

- [ ] Revisit `TradeConfig` SMC settings weekly; tighten
      `smc_level_threshold_pips` if entries are late and raise `smc_bias_weight`
      when structural bias should dominate other signals.
- [ ] Capture parameter changes plus performance metrics in the
      `algorithms/README.md` handoff log (date, change, observed outcome).
- [ ] Ensure alerting thresholds mirror the glossary checkpoints and commit the
      configuration changes alongside updates to `.env.example` when new keys
      are introduced.

## 3. Analyzer Enhancements

- [ ] Extend `SMCAnalyzer.observe` with new mitigation block or liquidity
      pattern checks before persisting context to Supabase.
- [ ] Add unit or integration tests for each new SMC filter under
      `tests/trading-*` to prevent regressions in BOS/SMS detection.
- [ ] Log additional analyzer outputs (e.g., swept level IDs, mitigation block
      hits) to the analytics tables surfaced in dashboards so reviewers can
      audit context.

## 4. Execution Discipline

- [ ] Require every published trade idea to reference the glossary checklist—
      call out BOS status, liquidity sweep confirmation, and mitigation
      alignment.
- [ ] Gate automated entries on passing both the glossary checklist and analyzer
      context review; wire the gating logic through queue and Supabase workers
      (`queue/index.ts`, `supabase/functions/telegram-bot/*`).
- [ ] Record reasons for overrides when human analysts diverge from automated
      recommendations and archive them in Supabase for feedback analysis.

## 5. Feedback Loop

- [ ] Review post-trade analytics to correlate glossary-aligned setups with
      performance outcomes and adjust `TradeConfig` weights accordingly.
- [ ] Schedule retrospective sessions to adjust SMC thresholds, analyzer
      filters, and documentation when patterns emerge; capture notes in
      `docs/meeting-notes/` or the shared project tracker.
- [ ] Update member-facing portals (e.g., Liquidity Signal Desk) to highlight
      new checklist items and confirm the Telegram broadcast templates mirror
      the latest vocabulary.
