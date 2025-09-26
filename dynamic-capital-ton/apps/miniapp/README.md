# Dynamic Capital Telegram Mini App

This Next.js application provides a lightweight Telegram mini app experience with TON Connect integration, wallet linking, and TON subscription processing hooks.

## Environment variables

Create a `.env.local` file with the following values:

```bash
NEXT_PUBLIC_APP_URL=https://dynamic-capital-qazf2.ondigitalocean.app
SUPABASE_FN_URL=https://<project>.functions.supabase.co
NEXT_PUBLIC_TELEGRAM_ADMIN_IDS=123456789,987654321
EXNESS_MT5_LOGIN=
EXNESS_MT5_PASSWORD=
EXNESS_MT5_SERVER=
EXNESS_API_BASE_URL=https://<bridge-host>/api
```

- `NEXT_PUBLIC_TELEGRAM_ADMIN_IDS` controls which Telegram users see the embedded Exness MT5 terminal link.
- The `EXNESS_*` variables authenticate requests between the mini app API routes and your MT5 bridge (set `EXNESS_API_BASE_URL`
  to the HTTP endpoint that proxies Exness WebAPI calls).

If the Exness credentials are omitted the UI will fall back to sample data so the dashboard still renders inside development builds.

### Exness data surfaces

- `/admin/mt5` embeds the Exness hosted MT5 Web Terminal for approved Telegram IDs.
- `/api/exness/*` API routes proxy account summary, open positions, and equity history from the configured bridge. These feeds power
  the equity chart and positions table rendered on the “Activity” and “Support” sections of the home screen.

## Key scripts

- `pnpm install`
- `pnpm dev`
- `pnpm build`

API routes proxy the Supabase Edge functions defined under `supabase/functions/*`.

## Manual verification

You can confirm the proxy guards behave correctly with curl:

1. **Without `SUPABASE_FN_URL`**: run `pnpm dev` without the variable configured and call `curl -X POST http://localhost:3000/api/link-wallet -d '{}' -H 'Content-Type: application/json'`. The API should respond with `500` and a JSON error payload about the missing environment variable.
2. **With `SUPABASE_FN_URL`**: export `SUPABASE_FN_URL="https://<project>.functions.supabase.co"` (or set it in `.env.local`), restart the dev server, and repeat the curl command. This time the request should proxy through to the Supabase Edge function and return its response.
