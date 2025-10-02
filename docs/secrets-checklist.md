# Secrets Checklist

This checklist maps each deployment target to the environment variables it must
provide. Only variable _names_ are listed. Configure actual values via the
respective secrets managers (Vercel, DigitalOcean App Platform, Supabase Edge
Functions, and DigitalOcean droplets).

## Supabase Edge Functions

- SUPABASE_URL / SUPABASE_ANON_KEY _(local fetches & callbacks)_
- SUPABASE_SERVICE_ROLE (alias: SUPABASE_SERVICE_ROLE_KEY)
- SUPABASE_PROJECT_REF
- TELEGRAM_BOT_TOKEN / TELEGRAM_WEBHOOK_SECRET
- TELEGRAM_APP_ID / TELEGRAM_APP_HASH _(Mini App helpers)_
- BINANCE_PAY_API_KEY / BINANCE_PAY_SECRET
- TRADING_SIGNALS_WEBHOOK_SECRET
- DYNAMIC_TON_API_KEY _(Dynamic TON webhook verification)_
- OPENAI_API_KEY _(if AI flows enabled)_
- OPENAI_WEBHOOK_SECRET _(if webhooks enabled)_
- EXNESS_MT5_LOGIN / EXNESS_MT5_PASSWORD / EXNESS_MT5_SERVER
- MT5_BRIDGE_WORKER_ID
- BRIDGE_HOST / BRIDGE_USER / BRIDGE_SSH_KEY _(bridge restarts)_

## Vercel – User/Admin Next.js apps

**Projects:** `user-dashboard`, `admin-dashboard`

- NODE_ENV / NEXT_PUBLIC_ENV _(set per environment)_
- NEXT_PUBLIC_COMMIT_SHA _(set via CI)_
- NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_URL / SUPABASE_ANON_KEY _(SSR helpers & API routes)_
- SUPABASE_SERVICE_ROLE (alias: SUPABASE_SERVICE_ROLE_KEY)
- SUPABASE_PROJECT_REF _(Edge Function routing hints)_
- NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET
- DYNAMIC_TON_API_KEY _(server-side verification of Dynamic TON webhooks)_
- SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN _(if enabled)_
- NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_POSTHOG_HOST _(analytics)_
- BINANCE_PAY_API_KEY / BINANCE_PAY_SECRET _(server-side payment status
  polling)_
- TELEGRAM_BOT_TOKEN _(admin moderation tools)_
- OPENAI_API_KEY _(AI assistants)_

## DigitalOcean App Platform – Marketing & Mini App

- NODE_ENV / NEXT_PUBLIC_ENV
- NEXT_PUBLIC_COMMIT_SHA
- NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_API_URL
- TELEGRAM_APP_ID / TELEGRAM_APP_HASH _(Mini App auth handshake)_
- CDN_BUCKET / CDN_REGION / CDN_ACCESS_KEY / CDN_SECRET_KEY _(if CDN refresh is
  enabled)_
- CDN_ENDPOINT / CDN_ENDPOINT_ID / CDN_PURGE_PATHS _(cache management)_
- BINANCE_PAY_API_KEY / BINANCE_PAY_SECRET _(Mini App payment confirmations)_

## DigitalOcean Droplet – MT5 Bridge & Telegram Bot Workers

Store secrets in the droplet's env file or systemd unit:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE
- TELEGRAM_BOT_TOKEN
- TELEGRAM_APP_ID / TELEGRAM_APP_HASH _(Mini App auth)_
- BRIDGE_HOST / BRIDGE_USER / BRIDGE_SSH_KEY _(for self-healing scripts)_
- EXNESS_MT5_LOGIN / EXNESS_MT5_PASSWORD / EXNESS_MT5_SERVER
- OPENAI_API_KEY _(if AI assistants are active)_
- BINANCE_PAY_API_KEY / BINANCE_PAY_SECRET _(callback replay utilities)_

## Shared CI/CD variables

Configure within GitHub Actions or the CI provider:

- VERCEL_TOKEN
- DO_API_TOKEN
- DO_APP_ID
- SUPABASE_PROJECT_ID
- SUPABASE_DB_PASSWORD
- SUPABASE_PROJECT_REF _(for Supabase CLI deploys)_
- NEXT_PUBLIC_COMMIT_SHA _(computed per build)_

Keep this document updated when new modules require secrets or when a secret
moves between providers.
