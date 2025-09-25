# Algorithm Development Workspace

This directory tree groups together all source code and artifacts required for the
TradingView → Vercel → Supabase → MetaTrader 5 automation pipeline. Each
sub-folder is intentionally scoped so that strategy builders, automation
engineers, and QA can collaborate without stepping on each other's toes.

## Directory Overview

- `pine-script/` – TradingView strategy and indicator source files, including
  alert payload documentation and reusable include snippets.
- `vercel-webhook/` – Vercel serverless function project used to ingest webhook
  alerts and forward structured events into Supabase.
- `mql5/` – MetaTrader 5 Expert Advisor implementation, supporting libraries,
  and backtesting artifacts.

Refer to the README in each sub-folder for layout details, build commands, and
handoff expectations between teams. Supabase database migrations and functions
remain in the top-level `supabase/` directory.

## Grok-1 Collaboration Protocols

- **Suggestion Translation Rules** – When Grok proposes Pine Script updates,
  mirror the recommendation in TypeScript analyzers or Supabase queue workers
  before merging. Capture the mapping in the PR description (`Before`, `Grok
  Proposal`, `Final Implementation`) so reviewers can track deltas. Pine Script
  diffs must include inline comments referencing the originating prompt and
  attachments listed in `content/prompts/grok-1/attachments-map.md`.
- **Acceptance Criteria** – A Grok-assisted change cannot merge without:
  1. Updated or new tests under `tests/trading-*` that cover the scenario the
     model touched.
  2. Analyzer trace exports demonstrating at least one passing dry run with the
     new logic.
  3. Confirmation that queue workers and Supabase functions can ingest any new
     fields without schema drift (link to the guardrail review prompt output).
- **Rollback Plan** – Every PR must document the flag or config used to disable
  the Grok-generated behavior (`TRADING_SIGNALS_WEBHOOK_SECRET` scoped feature
  flag, MT5 Expert Advisor input, or Supabase function toggle). Store the
  procedure under `algorithms/ROLLBACKS.md` with timestamp, owner, and recovery
  steps. Operators should test the rollback in staging before the change goes
  live and log the results in the same file.
