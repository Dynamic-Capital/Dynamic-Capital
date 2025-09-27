# MT5 Supabase Bridge

This integration pairs a native MetaTrader 5 expert advisor with a Supabase Edge
Function so trade activity from MT5 terminals can be mirrored into the
`mt5_trade_logs` table for downstream automation and telemetry.

## MT5 Expert Advisor

The [`SupabaseBridge.mq5`](../integrations/mt5/SupabaseBridge.mq5) script posts
open trade details to the Supabase Edge Function at a configurable heartbeat.
Update the `InpSupabaseUrl` input with your project reference and adjust the
`InpHeartbeatSeconds` interval to control how frequently each ticket is synced
(default: 15 seconds).

Each payload includes the symbol, side, lot size, average price, floating PnL,
account login, and the MT5 ticket identifier/open time. The expert advisor skips
any request when the heartbeat interval has not elapsed to avoid hammering the
webhook with identical data.

> **Important:** In MetaTrader 5 go to **Tools → Options → Expert Advisors** and
> add your Supabase function URL to the _Allow WebRequests for listed URL_
> section.

## Supabase Edge Function

Deploy the [`supabase/functions/mt5`](../supabase/functions/mt5/index.ts)
handler to receive MT5 payloads. The function normalises the trade payload,
ensures required fields are present (symbol, side, ticket), and upserts the
record into `public.mt5_trade_logs` using the ticket ID as a natural key.
Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

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
- Timestamps (`received_at`, `updated_at`)

The handler responds with a JSON payload describing the normalised record so
follow-up automation can react immediately (for example, dispatching Telegram
alerts or reconciling with TradingView signals).
