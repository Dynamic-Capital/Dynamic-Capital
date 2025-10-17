# Authentication configuration

This document summarises the environment variables required to run the
NextAuth + Supabase integration locally and in production.

## Required secrets

Configure the following keys in your `.env.local`, CI, and production secret
managers:

| Variable                                                          | Purpose                                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`                       | Supabase project URL used by the NextAuth adapter.                                    |
| `SUPABASE_SERVICE_ROLE_KEY`                                       | Service role key for Supabase adapter writes.                                         |
| `GITHUB_ID`                                                       | GitHub OAuth client ID powering the public login flow.                                |
| `GITHUB_SECRET`                                                   | GitHub OAuth client secret paired with the above client ID.                           |
| `TELEGRAM_BOT_URL`                                                | Public URL of the production Telegram bot (used in surfaces and CTA links).           |
| `MINI_APP_URL` / `NEXT_PUBLIC_MINI_APP_URL`                       | Canonical Telegram Mini App origin shared between the app shell and TonConnect flows. |
| `NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET` / `TELEGRAM_WEBHOOK_SECRET` | Shared secret for Telegram webhook validation across web and edge functions.          |

> **Note:** Development builds may fall back to stub values for the Telegram bot
> URLs and webhook secret. Production and CI builds must set real values or the
> app will fail fast during initialisation.

## Local testing

1. Copy `.env.example` to `.env.local` and populate the keys above with either
   sandbox credentials or explicit development placeholders.
2. Run `npm run lint` and `npm run typecheck` after updating env values to
   confirm the auth module still compiles.
3. Execute targeted auth tests via `npm run test -- auth` (or the
   project-specific auth test command) before opening a pull request.
