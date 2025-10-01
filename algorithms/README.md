# Algorithm Development Workspace

This directory tree groups together all source code and artifacts required for
the TradingView → Vercel → Supabase → MetaTrader 5 automation pipeline. Each
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

## Grok advisory workflow

- `python/grok_advisor.py` – prompt builder and completion helpers that relay
  live trade context to Grok-1.
- `python/trade_logic.py` – accepts an optional Grok advisor during
  `TradeLogic.on_bar` so Grok can suggest confidence adjustments before trades
  are finalised.
- `python/realtime.py` – wire Grok into `RealtimeExecutor` by supplying an
  advisor instance; decisions surface the returned rationale under the
  `context["advisor"]` key for downstream audit trails.
- `python/awesome_api.py` – converts AwesomeAPI FX/crypto data into
  `MarketSnapshot` objects so the Python trading stack and live logic consume
  the same market feed used by the product surfaces.

To enable Grok feedback in a live service, instantiate a completion client (e.g.
wrapping the local `grok-1` `InferenceRunner`) and pass a configured
`GrokAdvisor` instance into `RealtimeExecutor`.
