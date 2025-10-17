# Dynamic Capital Telegram Mini App

This Next.js application provides a lightweight Telegram mini app experience
with TON Connect integration, wallet linking, and TON subscription processing
hooks.

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

## Key scripts

- `pnpm install`
- `pnpm dev`
- `pnpm build`

API routes proxy the Supabase Edge functions defined under
`supabase/functions/*`.

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

## Theme synchronization

Wallet-driven themes flow through three layers:

1. `shared/miniapp/theme-loader.ts` exposes the `MiniAppThemeManager`, which
   fetches Theme NFT metadata and commits any wallet-defined CSS variables
   (gradients, shadows, custom fonts, etc.) directly to
   `document.documentElement.style`.
2. `src/components/Providers.tsx` subscribes to the manager with
   `useMiniAppThemeManager` and mirrors any `--data-*` variables onto actual
   `data-*` attributes. The effect seeds deterministic defaults (dark mode when
   TonConnect has not resolved yet) so Once UI tokens stay stable during SSR, and
   it restores the baseline Once UI attributes whenever a wallet theme is
   removed.
3. Once UI’s `ThemeProvider` and `DataThemeProvider` read those `data-*`
   attributes to resolve their token maps. Because we only overwrite attributes
   that a wallet explicitly overrides, the default Once UI palette continues to
   drive semantic tokens while wallet themes control bespoke CSS variables.

When adding new wallet theme capabilities, extend the provider effect to map
additional `--data-*` keys and keep this section up to date so contributors know
which layer owns each responsibility.
