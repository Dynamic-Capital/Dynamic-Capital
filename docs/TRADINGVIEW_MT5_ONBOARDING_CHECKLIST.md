# TradingView → MT5 Onboarding Checklist

Use this list when spinning up the TradingView webhook to MetaTrader 5 automation flow. It mirrors the onboarding roadmap so cross-functional contributors can work in parallel while keeping hand-offs explicit.

## 1. Align scope & shared artifacts
- [ ] Document the end-to-end architecture (TradingView → webhook → Supabase → MT5 EA) in the project tracker.
- [ ] Inventory existing Pine Script, webhook handlers, Supabase schema, and EA code so owners know baseline maturity.
- [ ] Capture sample TradingView alert payloads (JSON) and share with downstream teams.
- [ ] Centralize documentation in the `algorithms/` workspace to keep scripts, webhook logic, and EA tasks discoverable.

## 2. TradingView & Pine Script readiness
- [ ] Finalize or update Pine Script strategies/indicators tied to the automation effort.
- [ ] Embed `alert()` calls that emit normalized JSON (symbol, direction, sizing, identifiers).
- [ ] Confirm TradingView plan tier supports webhooks and has capacity for required alerts.
- [ ] Stand up alerts with webhook delivery enabled and validated against the staging endpoint.
- [ ] Record alert configuration details and any throttling limits in documentation.

## 3. Webhook ingestion service
- [ ] Stand up the webhook receiver (Vercel serverless function or Python service) following repo conventions.
- [ ] Implement authentication (shared secret, signature) and reject unauthorized payloads.
- [ ] Normalize symbols, timestamps, and payload shape to match Supabase expectations.
- [ ] Add idempotency or deduplication to prevent duplicate trade executions.
- [ ] Emit structured logs and capture metrics for received, processed, and failed alerts.
- [ ] Write unit/integration tests covering happy-path and malformed payloads.

## 4. Supabase backend enablement
- [ ] Design and migrate tables such as `signals`, `trades`, `positions`, and configuration stores.
- [ ] Define RLS policies or restrict access via service-role keys for automation components.
- [ ] Enable Realtime channels or RPC endpoints that the EA/process will consume.
- [ ] Run manual inserts from the webhook service to confirm database connectivity.
- [ ] Document REST/RPC usage patterns and share connection credentials securely.

## 5. MetaTrader 5 Expert Advisor integration
- [ ] Decide on connectivity (Supabase polling/realtime vs. socket bridge) and implement the adapter layer.
- [ ] Parse incoming payloads and map to MT5 trade parameters with validation.
- [ ] Implement execution logic, risk management, and post-trade reconciliation.
- [ ] Forward execution status, fills, and error states back to Supabase for observability.
- [ ] Add robust logging, retries, and fail-safes for network or broker issues.
- [ ] Backtest and forward-test with demo accounts using staged signals.

## 6. Infrastructure, CI/CD & operations
- [ ] Provision and harden a VPS (e.g., DigitalOcean) to host MT5 and supporting services 24/7.
- [ ] Configure MT5 auto-start, EA deployment, and monitoring/alerting for crashes or disconnects.
- [ ] Centralize secret management for TradingView, Supabase, and broker credentials.
- [ ] Extend CI/CD pipelines to lint/test Pine Script, webhook code, and EA builds.
- [ ] Add deployment automation for Vercel functions and Supabase migrations.
- [ ] Document operational runbooks, escalation paths, and rollback procedures.

## 7. Security, validation & go-live
- [ ] Lock down webhook endpoints (IP allowlists, TLS verification, API keys).
- [ ] Run end-to-end dry runs from TradingView alert to MT5 execution on a demo account.
- [ ] Measure latency at each hop and tune alerts or infrastructure as needed.
- [ ] Set up observability dashboards/alerts for webhook failures, Supabase errors, and EA exceptions.
- [ ] Perform go-live review with stakeholders, including risk/compliance sign-off.
- [ ] Schedule ongoing audits of trading performance, system health, and credential hygiene.
