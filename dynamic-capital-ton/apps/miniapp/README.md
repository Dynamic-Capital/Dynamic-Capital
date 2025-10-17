# Dynamic Capital Telegram Mini App

This Next.js application provides a lightweight Telegram mini app experience
with TON Connect integration, wallet linking, and TON subscription processing
hooks. The UI is built with the [Once UI design system](https://once-ui.com)
and lives under `src/` to mirror the official starter layout.

## Environment variables

Create a `.env.local` file with the following values:

```bash
NEXT_PUBLIC_APP_URL=https://dynamiccapital.ton
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_FN_URL=https://<project>.functions.supabase.co
# Optional but recommended so server-side proxy calls include an API key
SUPABASE_ANON_KEY=<anon-key>
# Optional override if the operations treasury rotates
NEXT_PUBLIC_TON_OPS_TREASURY=<ops-treasury-wallet>
```

The `NEXT_PUBLIC_SUPABASE_*` values enable live subscription plan updates inside
the Mini App by connecting directly to Supabase Realtime.

> **Note:** When testing in browsers without native TON DNS support, use the
> TON Foundation gateway (`https://ton.site/dynamiccapital.ton`) instead of the
> raw `.ton` origin. The helper constants in `shared/ton/site.ts` and the
> [gateway guide](../../../docs/ton-site-gateway-access.md) keep the URLs aligned
> and list legacy self-hosted proxies.

## Local development

The mini app is wired as a workspace inside the root repository. Install
dependencies and run the dev server with:

```bash
npm install --workspace apps/miniapp
npm run dev --workspace apps/miniapp
```

The source code resides in `src/`. Global Once UI providers and the ton connect
bridge live in `src/components/miniapp/home/HomeContent.tsx` and the layout
shell (`src/app/(main)/layout.tsx`).

API routes proxy the Supabase Edge functions defined under
`supabase/functions/*`. The TON Connect manifest resolver surfaces a banner when
the live manifest is unavailable and automatically falls back to the bundled
manifest for local testing.

## Manual verification

You can confirm the proxy guards behave correctly with curl:

1. **Without `SUPABASE_FN_URL`**: run `pnpm dev` without the variable configured
   and call
   `curl -X POST http://localhost:3000/api/link-wallet -d '{}' -H 'Content-Type: application/json'`.
   The API should respond with `500` and a JSON error payload about the missing
   environment variable.
2. **With `SUPABASE_FN_URL`**: export
   `SUPABASE_FN_URL="https://<project>.functions.supabase.co"` (or set it in
   `.env.local`), restart the dev server, and repeat the curl command. This time
   the request should proxy through to the Supabase Edge function and return its
   response.
