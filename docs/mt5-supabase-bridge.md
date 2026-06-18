# MT5 Supabase Bridge

This integration pairs a native MetaTrader 5 expert advisor with a suite of
Supabase Edge Functions so trade activity, account heartbeats, risk adjustments,
and Dynamic AI command directives can flow bi-directionally between MT5 and the
Dynamic Capital platform.

## MT5 Expert Advisor

The [`SupabaseBridge.mq5`](../integrations/mt5/SupabaseBridge.mq5) script posts
open trade details to the Supabase Edge Function at a configurable heartbeat.
Update the `InpSupabaseUrl` input with your project reference and adjust the
`InpHeartbeatSeconds` interval to control how frequently each ticket is synced
(default: 15 seconds).

Each payload includes the symbol, side, lot size, average price, floating PnL,
account login, ticket identifier/open time, and a `source` tag (default: `mt5`).
The expert advisor skips any request when the heartbeat interval has not elapsed
to avoid hammering the webhook with identical data.

Alongside per-position updates, the advisor emits an account-level heartbeat
payload every `InpHeartbeatSeconds` so dashboards can detect if the terminal is
online even when no trades are open. Two additional inputs enable the reverse
bridge:

- `InpCommandsUrl` / `InpCommandsSecret` (or `InpTerminalKey`) poll
  `/mt5-commands` to receive `open`/`close`/`modify` directives from Dynamic AI
  agents.
- `InpRiskUrl` / `InpRiskSecret` (or `InpTerminalKey`) poll `/mt5-risk` for
  trailing-stop and SL/TP adjustments produced by the risk policy.

Both pollers acknowledge execution status back to Supabase so automation can
track the lifecycle (`queued → sent → filled/applied/failed`).

> **Important:** In MetaTrader 5 go to **Tools → Options → Expert Advisors** and
> add your Supabase function URLs to the _Allow WebRequests for listed URL_
> section.

## Supabase Edge Functions

### Trade ingestion (`/mt5`)

Deploy [`supabase/functions/mt5`](../supabase/functions/mt5/index.ts) to
normalise MT5 payloads, ensure required fields are present (symbol, side,
ticket), and upsert records into `public.mt5_trade_logs`. The same handler also
recognises account heartbeat payloads and persists them to
`public.mt5_account_heartbeats`.

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_TRADES_CHAT_ID`
- (Optional) `TELEGRAM_TRADES_TEMPLATE`

`mt5_trade_logs` captures a heartbeat of each position with the following
fields:

- `mt5_ticket_id`
- `symbol`
- `side` (`buy` or `sell`)
- `volume`
- `open_price`
- `profit`
- `account_login`
- `opened_at`
- `raw_payload`
- `source`
- Timestamps (`received_at`, `updated_at`)

`mt5_account_heartbeats` stores account snapshots (`account_login`, `status`,
`balance`, `equity`, `free_margin`, `raw_payload`) keyed by timestamp so the web
app can display terminal health.

After persisting a trade the function pushes a Telegram notification so
operators receive real-time alerts. Messages can be customised via the template
environment variable mentioned above (placeholders: `symbol`, `side`, `volume`,
`open_price`, `profit`, `account`, `ticket`, `source`).

### Command queue (`/mt5-commands`)

[`supabase/functions/mt5-commands`](../supabase/functions/mt5-commands/index.ts)
provides a write API for automation (Dynamic AI, sentiment agents, etc.) to
enqueue MT5 instructions and a read/ack API for the expert advisor.

- `POST /mt5-commands` (authenticated with `MT5_COMMANDS_WEBHOOK_SECRET`)
  validates incoming JSON, stores it in `public.mt5_commands`, and returns the
  generated IDs.
- `GET /mt5-commands?account=...` (authenticated with `MT5_TERMINAL_KEY`)
  returns queued commands for the terminal, marking them as `sent`.
- `PATCH /mt5-commands` updates the command status (`filled`, `failed`, etc.)
  based on EA acknowledgements.

### Risk adjustment feed (`/mt5-risk`)

[`supabase/functions/mt5-risk`](../supabase/functions/mt5-risk/index.ts) exposes
Dynamic AI's risk guardrails to MT5. Scheduled jobs (see
[`dynamic_ai/risk_sync.py`](../dynamic_ai/risk_sync.py)) post desired SL/TP and
trailing-stop levels to the endpoint, which persists them in
`public.mt5_risk_adjustments`. Terminals poll the same endpoint for pending
actions and respond with `PATCH` updates when adjustments have been applied.

Environment variables:

- `MT5_RISK_WEBHOOK_SECRET`
- `MT5_COMMANDS_WEBHOOK_SECRET`
- `MT5_TERMINAL_KEY`

### Risk policy automation

[`dynamic_ai/risk_sync.py`](../dynamic_ai/risk_sync.py) converts `RiskContext`
plus live MT5 snapshots into adjustment payloads and posts them to `/mt5-risk`.
Tests in [`tests/test_mt5_risk_sync.py`](../tests/test_mt5_risk_sync.py) cover
payload generation and webhook behaviour.

### Telegram notifications

Every successful trade upsert triggers a Telegram message so operators receive
real-time alerts. Configure the bot token, chat ID, and optional template via
environment variables noted above.
