# Secrets Checklist

This checklist maps each deployment target to the environment variables it must
provide. Only variable *names* are listed. Configure actual values via the
respective secrets managers (Vercel, DigitalOcean App Platform, Supabase Edge
Functions, and DigitalOcean droplets).

## Supabase Edge Functions
- SUPABASE_URL / SUPABASE_ANON_KEY *(local fetches & callbacks)*
- SUPABASE_SERVICE_ROLE (alias: SUPABASE_SERVICE_ROLE_KEY)
- SUPABASE_PROJECT_REF
- TELEGRAM_BOT_TOKEN / TELEGRAM_WEBHOOK_SECRET
- TELEGRAM_APP_ID / TELEGRAM_APP_HASH *(Mini App helpers)*
- BINANCE_PAY_API_KEY / BINANCE_PAY_SECRET
- TRADING_SIGNALS_WEBHOOK_SECRET
- OPENAI_API_KEY *(if AI flows enabled)*
- OPENAI_WEBHOOK_SECRET *(if webhooks enabled)*
- EXNESS_MT5_LOGIN / EXNESS_MT5_PASSWORD / EXNESS_MT5_SERVER
- MT5_BRIDGE_WORKER_ID
- BRIDGE_HOST / BRIDGE_USER / BRIDGE_SSH_KEY *(bridge restarts)*

## Vercel – User/Admin Next.js apps
**Projects:** `user-dashboard`, `admin-dashboard`
- NODE_ENV / NEXT_PUBLIC_ENV *(set per environment)*
- NEXT_PUBLIC_COMMIT_SHA *(set via CI)*
- NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_URL / SUPABASE_ANON_KEY *(SSR helpers & API routes)*
- SUPABASE_SERVICE_ROLE (alias: SUPABASE_SERVICE_ROLE_KEY)
- SUPABASE_PROJECT_REF *(Edge Function routing hints)*
- NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET
- SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN *(if enabled)*
- NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_POSTHOG_HOST *(analytics)*
- BINANCE_PAY_API_KEY / BINANCE_PAY_SECRET *(server-side payment status polling)*
- TELEGRAM_BOT_TOKEN *(admin moderation tools)*
- OPENAI_API_KEY *(AI assistants)*

## DigitalOcean App Platform – Marketing & Mini App
- NODE_ENV / NEXT_PUBLIC_ENV
- NEXT_PUBLIC_COMMIT_SHA
- NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_API_URL
- TELEGRAM_APP_ID / TELEGRAM_APP_HASH *(Mini App auth handshake)*
- CDN_BUCKET / CDN_REGION / CDN_ACCESS_KEY / CDN_SECRET_KEY *(if CDN refresh is enabled)*
- CDN_ENDPOINT / CDN_ENDPOINT_ID / CDN_PURGE_PATHS *(cache management)*
- BINANCE_PAY_API_KEY / BINANCE_PAY_SECRET *(Mini App payment confirmations)*

## DigitalOcean Droplet – MT5 Bridge & Telegram Bot Workers
Store secrets in the droplet's env file or systemd unit:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE
- TELEGRAM_BOT_TOKEN
- TELEGRAM_APP_ID / TELEGRAM_APP_HASH *(Mini App auth)*
- BRIDGE_HOST / BRIDGE_USER / BRIDGE_SSH_KEY *(for self-healing scripts)*
- EXNESS_MT5_LOGIN / EXNESS_MT5_PASSWORD / EXNESS_MT5_SERVER
- OPENAI_API_KEY *(if AI assistants are active)*
- BINANCE_PAY_API_KEY / BINANCE_PAY_SECRET *(callback replay utilities)*

## Shared CI/CD variables
Configure within GitHub Actions or the CI provider:
- VERCEL_TOKEN
- DO_API_TOKEN
- DO_APP_ID
- SUPABASE_PROJECT_ID
- SUPABASE_DB_PASSWORD
- SUPABASE_PROJECT_REF *(for Supabase CLI deploys)*
- NEXT_PUBLIC_COMMIT_SHA *(computed per build)*

Keep this document updated when new modules require secrets or when a secret
moves between providers.
