# Dynamic Capital Telegram Mini App

This Next.js application provides a lightweight Telegram mini app experience with TON Connect integration, wallet linking, and TON subscription processing hooks.

## Environment variables

Create a `.env.local` file with the following values:

```bash
NEXT_PUBLIC_APP_URL=https://dynamic-capital-qazf2.ondigitalocean.app
SUPABASE_FN_URL=https://<project>.functions.supabase.co
```

## Key scripts

- `pnpm install`
- `pnpm dev`
- `pnpm build`

API routes proxy the Supabase Edge functions defined under `supabase/functions/*`.
