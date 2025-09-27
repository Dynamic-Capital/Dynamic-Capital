# MT5 Supabase Bridge

This integration pairs a native MetaTrader 5 expert advisor with a Supabase Edge
Function so trade activity from MT5 can be mirrored into the shared `trades`
table.

## MT5 Expert Advisor

The [`SupabaseBridge.mq5`](../integrations/mt5/SupabaseBridge.mq5) script posts
open trade details to the Supabase Edge Function every tick. Update the
`SUPABASE_URL` constant with your project reference.

> **Important:** In MetaTrader 5 go to **Tools → Options → Expert Advisors** and
> add your Supabase function URL to the _Allow WebRequests for listed URL_
> section.

## Supabase Edge Function

Deploy the [`supabase/functions/mt5`](../supabase/functions/mt5/index.ts)
handler to receive MT5 payloads. The function normalises the trade payload and
persists it using a service-role Supabase client. Required environment
variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Trades are inserted into the `trades` table with the following fields:

- `symbol`
- `side`
- `qty`
- `price`
- `pnl`
- `source` (`MT5`)

The handler responds with a JSON payload describing the insert so downstream
automation can react immediately.
