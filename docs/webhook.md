# Webhook Runbook

## Telegram Webhook

### JWT verification

The `telegram-webhook` edge function runs with `verify_jwt = false` in
`supabase/config.toml`. Telegram does not sign requests with Supabase JWTs, so
JWT checks would reject legitimate webhook deliveries. Instead, Telegram
includes our shared secret in the `X-Telegram-Bot-Api-Secret-Token` header
([docs](https://core.telegram.org/bots/api#setwebhook)). The function validates
this header for every request, so disabling JWT verification is safe.

### Rotating the secret

1. Update the `TELEGRAM_WEBHOOK_SECRET` in the environment or database.
2. Re-deploy the function
   (`supabase functions deploy telegram-webhook --no-verify-jwt`).
3. Run `deno run -A scripts/set-webhook.ts` (or `deno task set:webhook`) to
   register the new webhook URL and secret.

### Mini App initData validation

Mini App sessions must be verified server-side. The `verify-initdata` function
computes the HMAC-SHA256 signature as described in the Telegram spec and rejects
invalid payloads with `401`. Rotate the bot token or secret if verification
fails consistently.

## TradingView Webhook

The Python integration at `integrations/tradingview.py` exposes a Flask endpoint
for direct TradingView alerts. Each request must include the shared secret in
the `X-Tradingview-Secret` header; the handler rejects missing or invalid values
before any trading logic runs.

### Configuration

1. Set `TRADINGVIEW_WEBHOOK_SECRET` in the environment where the Flask app runs
   (see `.env.example`).
2. Expose the `/webhook` route over HTTPS and ensure TradingView can reach it.
3. In TradingView, configure the alert's webhook URL to the deployed endpoint
   and add the same secret under **Headers → Custom** so the delivery includes
   `X-Tradingview-Secret`.
4. Optionally seed alerts with `symbol`, `lot`, and `signal` keys to exercise
   the downstream trade execution and logging pipeline.

### Rotating the secret

1. Update `TRADINGVIEW_WEBHOOK_SECRET` in the process manager or secrets store.
2. Restart or reload the Flask service so the new secret is picked up.
3. Update every TradingView alert that targets the webhook to send the new
   header value. Alerts that continue using the old secret will receive `401`
   responses, mirroring the integration test coverage.

### Smoke testing

Send a sample payload with the configured secret to verify the end-to-end flow:

```bash
curl -X POST "https://<host>/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Tradingview-Secret: $TRADINGVIEW_WEBHOOK_SECRET" \
  -d '{"symbol":"XAUUSD","lot":0.25,"signal":"BUY"}'
```

A successful request returns `200` with the processed trade summary. Missing or
invalid secrets return `500` (not configured) or `401` (mismatch), matching the
automated tests.

## Trading Signals Webhook (Supabase → MT5)

The Supabase Edge Function at `supabase/functions/trading-signal/index.ts`
ingests TradingView alerts, normalizes them, and persists MT5-ready signals. It
enforces a shared secret via the `x-tradingview-secret` header before writing to
the `signals` table that the MT5 bridge consumes.

### Configuration

1. Set `TRADING_SIGNALS_WEBHOOK_SECRET` in the Supabase project environment and
   redeploy the `trading-signal` function so the new value is active.
2. The `trading.signals_ingest` feature flag is registered and enabled by
   default to keep automation active. Update the `features` table if you need to
   temporarily pause downstream processing.
3. Update TradingView alerts (or upstream services) to target the Supabase
   Functions URL and include the secret in the `x-tradingview-secret` header.
   The Python bridge in `integrations/tradingview.py` now forwards alerts
   automatically when `TRADING_SIGNALS_WEBHOOK_SECRET` (or
   `SUPABASE_TRADING_SIGNAL_SECRET`) and Supabase connection details are
   present.
4. Verify Supabase has the `signals` table and related RPC helpers deployed via
   the trading automation migration set.

### Rotating the secret

1. Update `TRADING_SIGNALS_WEBHOOK_SECRET` in Supabase.
2. Redeploy the edge function with `supabase functions deploy trading-signal` so
   the runtime reads the new secret.
3. Rotate the secret in every webhook client (TradingView, bridge services). Old
   values will now receive `401` responses logged as secret mismatches.

### Health checks

Use `curl` or the provided Supabase monitoring to confirm ingestion:

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/trading-signal" \
  -H "Content-Type: application/json" \
  -H "x-tradingview-secret: $TRADING_SIGNALS_WEBHOOK_SECRET" \
  -d '{"id":"demo-001","symbol":"EURUSD","direction":"buy"}'
```

A `200`/`202` response indicates the alert was accepted; `401` or `400`
responses call out secret mismatches or schema issues. Monitor Supabase logs and
the MT5 bridge listener for claimed signals to ensure the pipeline is healthy.

### Remote debugging with local MT5 terminals

Use the following workflow when a teammate has connected their local MT5
terminal to the automation stack via webhook but the engineering team cannot
access the workstation directly:

1. **Capture the webhook exchange**
   - Save the raw JSON payload that TradingView (or the upstream service)
     delivered to the webhook. Mask account identifiers before sharing.
   - Record the HTTP response status and body returned by the webhook handler.
   - If the webhook is proxied through a tunnel (e.g., ngrok, Cloudflare
     Tunnel), export the request trace or HAR for reference.
2. **Collect MT5 bridge telemetry**
   - Run the MT5 bridge worker with `LOG_LEVEL=DEBUG` so order routing steps and
     Supabase RPC calls are logged.
   - Copy the relevant log excerpt for the affected signal, including ticket
     IDs, rejection codes, and retry attempts.
   - If the Expert Advisor surfaces an alert inside MT5, take a screenshot or
     export the journal text and redact sensitive balances.
3. **Share Supabase context**
   - Query the `signals`, `mt5_trade_logs`, and `automation_events` tables for
     the signal identifier to confirm the state transitions the webhook
     recorded.
   - Include any error payloads from the `webhook_failures` or `automation_jobs`
     tables if retries were triggered.
4. **Report environment details**
   - Note the MT5 account type (demo vs. live), broker server, and EA version or
     Git commit.
   - Provide the tunnel or webhook URL (sans secrets) so engineers can replay
     requests against staging if needed.

Sharing the above artifacts allows reviewers to debug webhook failures and MT5
execution issues asynchronously without requiring remote access to the local
terminal.

## OpenAI Webhook

The `openai-webhook` function receives event callbacks from OpenAI. Every
request includes an `OpenAI-Signature` header containing an HMAC-SHA256 digest
of the raw body signed with `OPENAI_WEBHOOK_SECRET`. Requests with missing or
invalid signatures are rejected with `401`.

Register the webhook in the OpenAI dashboard using your Supabase Functions URL:

```
${SUPABASE_URL}/functions/v1/openai-webhook
```

Replace `SUPABASE_URL` with your project's base URL; OpenAI will POST events to
this endpoint.

### Rotating the secret

1. Update `OPENAI_WEBHOOK_SECRET` in the environment.
2. Re-deploy the function (`supabase functions deploy openai-webhook`).
3. Update the webhook endpoint in the OpenAI dashboard with the same secret.
