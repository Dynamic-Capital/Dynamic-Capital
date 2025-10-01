# Automated Trading System Build Checklist

Use this checklist to track progress when implementing the TradingView → Vercel
→ Supabase → MetaTrader 5 automated trading architecture.

## 1. TradingView Signal Generation

- [ ] Finalize Pine Script strategy/indicator logic.
- [ ] Embed `alert()` calls with comprehensive JSON payload (symbol, side,
      price, risk, identifiers).
- [ ] Upgrade TradingView plan to enable webhooks (Essential or higher).
- [ ] Create alert(s) that trigger on strategy conditions.
- [ ] Set the webhook URL to the deployed Vercel function endpoint.
- [ ] Store and secure any shared secrets used for webhook authentication.

## 2. Vercel Webhook Receiver

- [ ] Scaffold a Vercel serverless function project in GitHub.
- [ ] Implement payload validation and authentication (e.g., signature or shared
      secret check).
- [ ] Parse TradingView alert fields and normalize symbol naming.
- [ ] Map the alert to a Supabase insert payload (table, columns, defaults).
- [ ] Handle duplicates/rapid-fire alerts safely (idempotency key or dedup
      logic).
- [ ] Add structured logging for received/processed alerts.
- [ ] Configure environment variables for Supabase URL, service key, secrets.
- [ ] Deploy the function to production and note the HTTPS endpoint.

## 3. Supabase Backend

- [ ] Design database schema (e.g., `signals`, `trades`, `settings` tables).
- [ ] Apply `supabase/migrations/20250920000000_trading_signals_pipeline.sql` to
      provision `trading_accounts`, `signals`, `signal_dispatches`, and `trades`
      with realtime + polling indexes.
- [ ] Apply migrations and verify table indexes/constraints.
- [ ] Enable Supabase Realtime for relevant tables/channels.
- [ ] Create policies or use service-role key to secure inserts/reads.
- [ ] Smoke test RPC helpers (`claim_trading_signal`,
      `mark_trading_signal_status`, `record_trade_update`) with a local Supabase
      client before wiring the MT5 listener.
- [ ] Test manual insert to confirm Vercel → Supabase integration.
- [ ] Document API endpoints or client libraries used by the EA.

## 4. MetaTrader 5 Expert Advisor (EA)

- [ ] Set up local MT5 development environment and source control for the EA.
- [ ] Implement Supabase polling or websocket client to watch for new signals.
- [ ] Parse incoming signals and map to MT5 order parameters.
- [ ] Implement trade execution, position management, and risk controls.
- [ ] Write back trade execution status/results to Supabase.
- [ ] Add robust error handling, retries, and logging within MT5.
- [ ] Backtest and forward-test the EA with simulated Supabase data.

## 5. Hosting & Infrastructure

- [ ] Provision a DigitalOcean Droplet (or preferred VPS) for 24/7 MT5 runtime.
- [ ] Harden server (firewall, updates, SSH keys, fail2ban/backups).
- [ ] Install MT5 and deploy the EA on the Droplet.
- [ ] Configure process monitoring or auto-restart for MT5/EA.
- [ ] Monitor system metrics (CPU, RAM, disk, network) and trading logs.

## 6. GitHub & CI/CD

- [ ] Organize repository to include Pine Script, Vercel function, EA, and
      Supabase schema.
- [ ] Configure GitHub Actions for automated testing/builds (MQL5 compilation,
      unit tests).
- [ ] Add deployment workflows for Vercel and any Supabase migrations.
- [ ] Set up branch protection, code review guidelines, and secret management.
- [ ] Document contribution guidelines and operational runbook.

## 7. End-to-End Validation & Monitoring

- [ ] Dry run: trigger TradingView alert and confirm propagation through Vercel
      → Supabase → MT5.
- [ ] Verify EA trade execution details are recorded back in Supabase.
- [ ] Set up alerting/notifications for failed webhooks, DB errors, or EA
      exceptions.
- [ ] Review latency end-to-end and optimize if necessary.
- [ ] Schedule periodic audits of trading performance and system health.

## Checklist Automation

Generate a quick status summary for this checklist with the repository tooling:

```bash
npm run checklists -- --checklist build-implementation
```
