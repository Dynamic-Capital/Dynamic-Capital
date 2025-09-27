# Unified Webhook Sync Architecture

## Purpose

This document captures the Dynamic Fusion signal pipeline that keeps
TradingView, Python automation, and the MT5 executor aligned while feeding
downstream Treasury and token accounting (DAI, DA, and DCT). It serves as the
source of truth for onboarding, maintenance, and audits.

## High-level flow

1. **TradingView visuals**
   - Pine Script strategies remain lightweight and emit alerts via `alert()`.
   - Alerts contain normalized JSON (symbol, side, sizing, identifiers) and are
     visible to the education/community audience for transparency.
2. **Python webhook service**
   - Receives TradingView alerts through HTTPS webhooks.
   - Validates signatures/secrets and guards against duplicate delivery.
   - Enriches the payload via Dynamic Fusion logic (Supabase data, Grok,
     DeepSeek, and open-source lobes) before authoring a canonical trade
     decision.
   - Persists the decision and audit trail to Supabase.
3. **MT5 Expert Advisor executor**
   - Subscribes to approved signals from Supabase or a queue dispatched by the
     Python service.
   - Runs as a thin EA focused on order entry, risk enforcement, and telemetry.
   - Posts fill states, errors, and ticket metadata back to Supabase so
     dashboards stay current.
4. **Treasury and token updates**
   - Supabase triggers or scheduled jobs translate trade results into treasury
     positions and update DAI/DA/DCT token ledgers automatically.
   - Downstream analytics read from the same records for reporting and community
     updates.

## Design principles

- **Single source of truth**: Dynamic Fusion logic lives in the Python service.
  Pine Script and MQL5 implementations consume decisions instead of duplicating
  indicators or risk rules.
- **Separation of concerns**: Pine Script handles education/visualization,
  Python performs orchestration and validation, and MT5 focuses on deterministic
  execution.
- **Traceability**: Every hop (alert receipt, AI validation, MT5 action,
  treasury mutation) writes structured logs to Supabase for compliance and
  incident response.
- **24/7 resilience**: MT5 EA auto-starts with strict risk management, while the
  webhook stack includes retry logic, observability, and alerting on failures.

## Implementation checklist

- [ ] Confirm Pine Script alerts reference this architecture and emit the agreed
      JSON schema.
- [ ] Harden the Python webhook (auth, idempotency, monitoring) before routing
      live funds.
- [ ] Wire MT5 EA to the Supabase-backed signal queue and enforce per-trade risk
      controls.
- [ ] Verify treasury/token automation consumes MT5 execution updates and stays
      in sync with on-chain balances.
- [ ] Share updated diagrams and runbooks with trading, ops, and community
      stakeholders.
