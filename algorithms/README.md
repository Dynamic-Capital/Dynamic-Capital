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
