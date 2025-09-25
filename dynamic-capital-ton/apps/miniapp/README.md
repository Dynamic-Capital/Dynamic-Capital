# Dynamic Capital Telegram Mini App

This Next.js application provides a lightweight Telegram mini app experience with TON Connect integration, wallet linking, and TON subscription processing hooks.

## Environment variables

Create a `.env.local` file with the following values:

```bash
NEXT_PUBLIC_APP_URL=https://dynamic-capital-qazf2.ondigitalocean.app
NEXT_PUBLIC_TON_INTAKE_WALLET=EQXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
SUPABASE_FN_URL=https://<project>.functions.supabase.co
```

## Key scripts

- `pnpm install`
- `pnpm dev`
- `pnpm build`

API routes proxy the Supabase Edge functions defined under `supabase/functions/*`.

## Manual verification

You can confirm the proxy guards behave correctly with curl:

1. **Without `SUPABASE_FN_URL`**: run `pnpm dev` without the variable configured and call `curl -X POST http://localhost:3000/api/link-wallet -d '{}' -H 'Content-Type: application/json'`. The API should respond with `500` and a JSON error payload about the missing environment variable.
2. **With `SUPABASE_FN_URL`**: export `SUPABASE_FN_URL="https://<project>.functions.supabase.co"` (or set it in `.env.local`), restart the dev server, and repeat the curl command. This time the request should proxy through to the Supabase Edge function and return its response.
