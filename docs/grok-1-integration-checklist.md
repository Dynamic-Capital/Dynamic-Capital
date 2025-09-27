# Grok-1 Integration Checklist

Use this checklist to operationalize Grok-1 inside the Dynamic Capital
automation stack—from research workflows to Telegram delivery—without breaking
existing guardrails.

> **Status:** In progress. Complete each section before inviting broader team
> usage or shipping Grok-powered outputs to members.

## 1. Repository & Access Preparation

- [ ] Fork or mirror [`xai-org/grok-1`](https://github.com/xai-org/grok-1) into
      a vetted organization account and review the license obligations.
- [ ] Capture model weights, tokenizer assets, and required build tooling in a
      controlled artifact store (e.g., private bucket + checksum manifest).
- [ ] Align environment variable naming with `docs/env.md`; document any new
      secrets in `.env.example` and Supabase/Vercel vaults without committing
      real values.
- [ ] Update `docs/REPO_INVENTORY.md` (or equivalent) with the local cache
      location, synchronization cadence, and retention policy for Grok assets.

## 2. Prompting & Context Design

- [ ] Establish canonical prompt templates for SMC ideation, execution guardrail
      reviews, and UI copywriting; store them under `content/prompts/grok-1/`.
- [ ] Map repository artifacts (TradeConfig logs, analyzer traces, glossary
      entries) to prompt attachments so responses stay grounded in current
      logic.
- [ ] Define token budgets, truncation rules, and paraphrase safeguards before
      exposing prompts to automated jobs.
- [ ] Record evaluation prompts and expected outputs in `tests/llm-scenarios/`
      for regression testing.

## 3. Trading Strategy & Analyzer Enhancements

- [x] Integrate Grok-assisted idea reviews into the `algorithms/` workflow
      (e.g., PR template checkbox, reviewer step, or IDE helper notes). See
      `algorithms/python/grok_advisor.py` and the `TradeLogic` advisor hook for
      the live prompt pipeline.
- [ ] Codify how Grok suggestions translate into Pine Script or TypeScript
      changes; update `algorithms/README.md` with the acceptance criteria.
- [ ] Gate analyzer modifications on new or updated tests in
      `tests/trading-*`—include Grok-generated heuristics in test fixtures for
      repeatability.
- [ ] Document a rollback plan when Grok-generated logic underperforms (feature
      flag, config revert, or analyzer toggle).

## 4. Signal Ingestion & Supabase Coordination

- [ ] Extend webhook payload schemas (`api/tradingview-alerts.ts`, Supabase
      migrations) to capture any new fields Grok recommends.
- [ ] Run Supabase migrations in staging and update RLS policies if Grok outputs
      introduce new roles or columns.
- [ ] Add logging that distinguishes Grok-suggested alerts versus human-crafted
      payloads to support downstream analytics.
- [ ] Update `supabase/functions/*` docs so operators know which flows depend on
      Grok output and where to validate signals.

## 5. Execution Layer & Risk Controls

- [ ] Have Grok produce risk scenario scripts and validate them against existing
      Expert Advisor safeguards (`Experts/`, `Include/`).
- [ ] Stress-test queue workers and Supabase polling with Grok-generated edge
      cases; capture failures in the runbook for remediation.
- [ ] Ensure overrides or manual approvals log whether Grok participated in the
      decision so accountability is clear.
- [ ] Confirm Task Scheduler / service restarts still recover cleanly with the
      new load profile.

## 6. Telegram & Mini App Experiences

- [ ] Prototype Grok-assisted copy in a staging branch of
      `apps/web/app/telegram/` while keeping Tailwind conventions intact.
- [ ] Verify Mini App theming remains synced when Grok introduces new content
      modules or cards.
- [ ] Add UX acceptance criteria for Grok responses (tone, length, disclaimers)
      to the UI QA checklist.
- [ ] Update broadcast templates and admin tooling to highlight when content was
      assisted by Grok.

## 7. Operations, Compliance & Monitoring

- [ ] Expand monitoring dashboards (Supabase logs, Redis metrics, MT5 bridge
      health) with Grok-specific dimensions and alerts.
- [ ] Capture evaluation metrics (win rate impact, reviewer acceptance) in a
      shared dashboard or Notion page.
- [ ] Coordinate a security review covering prompt injection, data leakage, and
      secret handling before production rollout.
- [ ] Train operators using refreshed runbooks and record dry-run transcripts in
      `docs/meeting-notes/`.

Maintain this checklist as Grok-1 capabilities evolve so future upgrades follow
the same guardrails.
