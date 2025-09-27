# Environment Variables

This document lists environment variables used across the bot, mini app, and
maintenance scripts. Each entry notes its purpose, whether it's required, an
example value, and where it's referenced in the repository.

## Supabase

| Key                         | Purpose                                                   | Required | Example                     | Used in                                                                                                   |
| --------------------------- | --------------------------------------------------------- | -------- | --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | Base URL of the Supabase project.                         | Yes      | `https://xyz.supabase.co`   | `utils/config.ts`, `apps/web/integrations/supabase/client.ts`, `supabase/functions/telegram-bot/index.ts` |
| `SUPABASE_ANON_KEY`         | Public anon key for client-side calls (also accepts `SUPABASE_KEY`).                    | Yes      | `eyJ...`                    | `apps/web/integrations/supabase/client.ts`, `supabase/functions/theme-get/index.ts`, `supabase/functions/miniapp/src/lib/edge.ts`, `utils/config.ts` |
| `NEXT_PUBLIC_SUPABASE_URL`         | Build-time copy of `SUPABASE_URL` for the web app.        | Yes (web) | `https://xyz.supabase.co`   | `apps/web/config/supabase.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`    | Build-time copy of `SUPABASE_ANON_KEY` for the web app.   | Yes (web) | `eyJ...`                    | `apps/web/config/supabase.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for privileged Supabase access.          | Yes      | `service-role-key`          | `utils/config.ts`, `supabase/functions/telegram-bot/index.ts`                                         |
| `SUPABASE_PROJECT_ID`       | Supabase project reference used to build URLs in scripts. | No       | `abcd1234`
       | `scripts/ping-webhook.ts`, `scripts/miniapp-health-check.ts`                                              |
| `SUPABASE_PROJECT_REF`      | Alias for `SUPABASE_PROJECT_ID` consumed by CLI helpers. | No       | `abcd1234`
       | `scripts/update-telegram-miniapp.ts`, `scripts/setup-db-webhooks.ts`                                      |
| `SUPABASE_DB_PASSWORD`      | Postgres password for local or CI usage.                  | No       | `super-secret`              | Supabase CLI only                                                                                         |

## Trading Automation

| Key                          | Purpose                                                                         | Required | Example                 | Used in |
| ---------------------------- | ------------------------------------------------------------------------------- | -------- | ----------------------- | ------- |
| `TRADING_SIGNALS_WEBHOOK_SECRET` | Shared secret that TradingView webhooks must include when posting alerts.     | Yes      | `supabase-shared`       | `algorithms/vercel-webhook` ingestion handler (see TradingView→MT5 docs) |
| `MT5_BRIDGE_WORKER_ID`       | Identifier passed to the MT5 listener when claiming Supabase signals.           | Yes      | `worker-nyc-01`         | MT5 bridge runtime (`claim_trading_signal` / `record_trade_update` RPC calls) |
| `SUPABASE_SIGNALS_CHANNEL`   | Optional override for the realtime channel the MT5 bridge subscribes to.       | No       | `realtime:public:signals` | Trading bridge listener configuration |

## Telegram

| Key                       | Purpose                                                      | Required | Example                                          | Used in                                                              |
| ------------------------- | ------------------------------------------------------------ | -------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`      | Bot API token for making Telegram requests.                  | Yes      | `123456:ABCDEF`                                  | `supabase/functions/_shared/telegram.ts`, `scripts/set-webhook.ts`   |
| `TELEGRAM_WEBHOOK_SECRET` | Secret query param to validate webhook calls and required for privileged edge-function requests. | Yes      | `longrandomsecret`                               | `supabase/functions/telegram-bot/index.ts`, `scripts/set-webhook.ts`, `apps/web/config/supabase.ts` |
| `TELEGRAM_WEBHOOK_URL`    | Explicit webhook endpoint; overrides derived URL in scripts. | No       | `https://xyz.functions.supabase.co/telegram-bot` | `scripts/set-webhook.ts`, `scripts/ping-webhook.ts`                  |
| `TELEGRAM_ADMIN_IDS`      | Comma-separated list of admin Telegram IDs.                  | No       | `1001,1002`                                      | `supabase/functions/_shared/alerts.ts`                               |
| `TELEGRAM_BOT_USERNAME`   | Bot's public username for referral links.                    | No       | `mybot`                                 | `supabase/functions/referral-link/index.ts`, `apps/web/config/supabase.ts`                          |
| `TELEGRAM_BOT_URL`        | Public `t.me` link for the bot.                              | No       | `https://t.me/mybot`               | `apps/web/config/supabase.ts`                                            |
| `NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET` | Client-side copy of webhook secret for edge function calls. | No       | `longrandomsecret`                          | `apps/web/config/supabase.ts`                                            |
| `TELEGRAM_ID`             | Telegram user ID used for health checks.                     | No       | `123456789`                                      | `scripts/miniapp-health-check.ts`                                    |
| `SESSION_JWT_SECRET`      | Signing key for Mini App session JWTs.                       | Yes      | `hexstring`                         | `supabase/functions/tg-verify-init/index.ts`                         |

## Mini App

| Key                   | Purpose                                                | Required | Example                                      | Used in                                                                       |
| --------------------- | ------------------------------------------------------ | -------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| `MINI_APP_URL`        | Hosted Mini App base URL.                              | No       | `https://xyz.functions.supabase.co/miniapp/` | `supabase/functions/telegram-bot/index.ts`, `scripts/set-chat-menu-button.ts` |
| `MINI_APP_SHORT_NAME` | BotFather short name that opens the Mini App.          | No       | `dynamic_pay`                                | `supabase/functions/telegram-bot/index.ts`, `scripts/set-chat-menu-button.ts` |
| `FUNCTIONS_BASE`      | Base URL for integration tests hitting live functions. | No       | `https://xyz.supabase.co/functions/v1`       | `supabase/functions/_tests/integration_smoke_test.ts`                         |

## Crypto

| Key                | Purpose                                   | Required | Example                           | Used in                 |
| ------------------ | ----------------------------------------- | -------- | --------------------------------- | ----------------------- |
| `USDT_TRC20_ADDRESS` | TRC20 wallet address for USDT deposits. | Yes      | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` | `apps/web/config/supabase.ts` |

Additional crypto keys:

- `CRYPTO_DEPOSIT_ADDRESS` — Primary deposit address shown in checkout instructions.
- `CRYPTO_SUPPORTED_CURRENCIES` — Comma-separated list of currencies surfaced in the Mini App checkout.
- `CRYPTO_NETWORK` — Friendly label for the default payment network.

## AI / Feature toggles

| Key                       | Purpose                                                    | Required            | Example           | Used in                                                                                                 |
| ------------------------- | ---------------------------------------------------------- | ------------------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`          | API key for AI features like FAQ or OCR.                   | No                  | `sk-...`          | `supabase/functions/ai-faq-assistant/index.ts`, `supabase/functions/receipt-ocr/index.ts`               |
| `OPENAI_ENABLED`          | Enables OpenAI-powered responses.                          | No                  | `true`            | `supabase/functions/telegram-bot/index.ts`                                                              |
| `OPENAI_WEBHOOK_SECRET`   | HMAC secret to verify OpenAI webhook payloads.             | No                  | `supersecret` | `supabase/functions/openai-webhook/index.ts`                                               |
| `ANTHROPIC_API_KEY`       | API key for Claude responses in the LLM studio.            | No                  | `sk-ant-...` |
   | `apps/web/services/llm/providers.ts`                                                                   |
| `GROQ_API_KEY`            | API key for Groq-hosted Mixtral responses.                 | No                  | `gsk_...`    |
   | `apps/web/services/llm/providers.ts`                                                                   |
| `GOOGLE_GEMMA_API_KEY`    | API key for Google Gemma responses in the LLM studio.      | No                  | `AIza...`    |
   | `apps/web/services/llm/providers.ts`                                                                   |
| `FAQ_ENABLED`             | Enables FAQ command handling.                              | No                  | `true`            | `supabase/functions/telegram-bot/index.ts`                                                              |
| `AMOUNT_TOLERANCE`        | Allowed payment variance (fractional).                     | No                  | `0.02`            | `supabase/functions/telegram-bot/index.ts`                                                              |
| `WINDOW_SECONDS`          | Time window for receipt timestamps.                        | No                  | `180`             | `supabase/functions/telegram-bot/index.ts`                                                              |
| `RATE_LIMIT_PER_MINUTE`   | Per-user rate limit for Telegram commands.                 | No                  | `20`              | `supabase/functions/telegram-bot/index.ts`                                                              |
| `BENEFICIARY_TABLE`       | Override beneficiaries table name.                         | No                  | `beneficiaries`   | `supabase/functions/telegram-bot/helpers/beneficiary.ts`                                                |
| `RETENTION_DAYS`          | Number of days to keep logs before purge.                  | No                  | `90`              | `supabase/functions/data-retention-cron/index.ts`                                                       |
| `SESSION_TIMEOUT_MINUTES` | Minutes of inactivity before a user session is terminated. | No                  | `30`              | `supabase/functions/cleanup-old-sessions/index.ts`                                                      |
| `FOLLOW_UP_DELAY_MINUTES` | Minutes of inactivity before sending follow-up messages.   | No                  | `10`              | `supabase/functions/cleanup-old-sessions/index.ts`                                                      |
| `MAX_FOLLOW_UPS`          | Maximum number of follow-up messages to send per user.     | No                  | `3`               | `supabase/functions/cleanup-old-sessions/index.ts`                                                      |
| `ADMIN_API_SECRET`        | Shared secret for privileged admin endpoints.              | Yes for admin tasks | `hexstring`      | `supabase/functions/admin-session/index.ts`, `supabase/functions/rotate-admin-secret/index.ts`, `supabase/functions/rotate-webhook-secret/index.ts`, `supabase/functions/admin-review-payment/index.ts` |
## CDN

These variables configure uploads to DigitalOcean Spaces. Set them in
**App Settings → Environment Variables** when using DigitalOcean App Platform.
You can confirm access with `doctl spaces list`.

| Key | Purpose | Required | Example | Used in |
| --- | ------- | -------- | ------- | ------- |
| `CDN_BUCKET` | DigitalOcean Spaces bucket for static assets | Yes (landing build) | `my-space` | `scripts/upload-assets.js` |
| `CDN_REGION` | Spaces region for the CDN bucket | Yes (landing build) | `nyc3` | `scripts/upload-assets.js` |
| `CDN_ENDPOINT` | Override for the DigitalOcean Spaces API host (defaults to `<region>.digitaloceanspaces.com`); leave unset when specifying a CDN vanity domain | No | `https://nyc3.digitaloceanspaces.com` | `scripts/upload-assets.js`, `scripts/digitalocean/sync-cdn-config.mjs` |
| `CDN_ACCESS_KEY` | Spaces access key for uploads | Yes (landing build) | `DO0000000000EXAMPLE` | `scripts/upload-assets.js` |
| `CDN_SECRET_KEY` | Spaces secret key for uploads | Yes (landing build) | `supersecret` | `scripts/upload-assets.js` |
| `CDN_ENDPOINT_ID` | CDN endpoint ID used for automated cache purges | No (required for purge) | `a1b2c3d4-5678-90ab-cdef-1234567890ab` | `scripts/upload-assets.js` |
| `CDN_PURGE_PATHS` | Comma-separated CDN paths to purge after uploads | No | `/index.html,/` | `scripts/upload-assets.js` |
| `DIGITALOCEAN_TOKEN` | API token used for CDN purges and other DigitalOcean automation | No | `dop_v1_example` | `scripts/upload-assets.js`, `scripts/digitalocean/*` |

## Misc

| Key                   | Purpose                                  | Required | Example                   | Used in                           |
| --------------------- | ---------------------------------------- | -------- | ------------------------- | --------------------------------- |
| `DOMAIN`              | Apex domain used for DNS scripts and certificate provisioning. | Yes (prod) | `example.com` | `scripts/dns/*`, deployment docs |
| `SITE_URL`            | Base URL for the deployed site; used for redirects and canonical host checks. | Yes      | `http://localhost:3000` | `next.config.mjs`, `hooks/useAuth.tsx` |
| `NEXT_PUBLIC_SITE_URL`| Client-side canonical site URL surfaced in marketing metadata. | Yes (web) | `https://example.com/` | `apps/web/app/layout.tsx`, `docs/NETWORKING.md` |
| `NEXT_PUBLIC_API_URL`  | Base URL for client API requests (defaults to same-origin `/api`). | No | `http://localhost:3000/api` | `env.ts` |
| `SENTRY_DSN`          | Server-side Sentry DSN for error reporting. | No | `https://public@o0.ingest.sentry.io/0` | `apps/web/sentry.server.config.ts` |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser Sentry DSN exposed to the client. | No | `https://public@o0.ingest.sentry.io/0` | `apps/web/env.ts`, `apps/web/sentry.client.config.ts` |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key for analytics tracking. | No | `phc_xxx` | `apps/web/components/PostHogInit.tsx` |
| `NEXT_PUBLIC_POSTHOG_HOST` | Optional PostHog API host override. | No | `https://app.posthog.com` | `apps/web/components/PostHogInit.tsx` |
| `NODE_EXTRA_CA_CERTS` | Additional CA bundle for outbound HTTPS. | No       | `/etc/ssl/custom.pem`     | `apps/web/utils/http-ca.ts`            |
| `A_SUPABASE_URL`      | Supabase URL used by audit scripts.      | No       | `https://xyz.supabase.co` | `scripts/audit/read_meta.mjs`     |
| `A_SUPABASE_KEY`      | Supabase key used by audit scripts.      | No       | `service-role-key`        | `scripts/audit/read_meta.mjs`     |
| `HEALTH_URL`          | Base URL for mini app health checks.     | No       | `https://example.com`     | `scripts/miniapp-health-check.ts` |
| `ALLOWED_ORIGINS`     | Comma-separated origins allowed for CORS (defaults to `SITE_URL` or `http://localhost:3000`). | No       | `https://dynamic-capital.ondigitalocean.app,https://dynamic-capital.vercel.app,https://dynamic-capital.lovable.app`     | `middleware.ts`, `supabase/functions/_shared/http.ts` |
| `MINIAPP_ORIGIN`      | Origins allowed to call Telegram verification and mini-app APIs.              | No (required for production bots) | `https://dynamic-capital.ondigitalocean.app` | `supabase/functions/verify-telegram/index.ts` |
| `LOG_LEVEL`           | Minimum log level for server logs (`debug`, `info`, `warn`, `error`). | No       | `warn`                    | `utils/logger.ts` |
| `FUNCTIONS_BASE_URL`   | Override Supabase functions host when provisioning database webhooks. | No       | `https://custom.functions.supabase.co` | `scripts/setup-db-webhooks.ts` |
| `LOGTAIL_SOURCE_TOKEN` | Logtail source token used for Supabase log drain setup.              | No       | `gls_xxx`                    | `scripts/setup-log-drain.ts` |
| `LOGTAIL_URL`          | Optional Logtail API endpoint override.                              | No       | `https://in.logtail.com`     | `scripts/setup-log-drain.ts` |
| `GITHUB_PAT`           | GitHub personal access token for cleanup automation.                 | No       | `ghp_example`                | `supabase/functions/github-cleanup/index.ts` |
| `GITHUB_REPO`          | GitHub repository targeted by cleanup jobs (`owner/name`).           | No       | `dynamic-labs/dynamic-capital` | `supabase/functions/github-cleanup/index.ts` |
| `GITHUB_DEFAULT_BRANCH`| Default branch used by GitHub cleanup automation.                    | No       | `main`                       | `supabase/functions/github-cleanup/index.ts` |
| `GITHUB_ID`            | GitHub OAuth client ID for NextAuth.                                 | No       | `Iv1.example`                | `apps/web/app/api/auth/[...nextauth]/route.ts` |
| `GITHUB_SECRET`        | GitHub OAuth client secret for NextAuth.                             | No       | `super-secret`               | `apps/web/app/api/auth/[...nextauth]/route.ts` |
| `WINDOW_SECONDS`          | Time window for receipt timestamps.                        | No                  | `180`             | `supabase/functions/telegram-bot/index.ts`                                                              |
| `RATE_LIMIT_PER_MINUTE`   | Per-user rate limit for Telegram commands.                 | No                  | `20`              | `supabase/functions/telegram-bot/index.ts`                                                              |
| `BENEFICIARY_TABLE`       | Override beneficiaries table name.                         | No                  | `beneficiaries`   | `supabase/functions/telegram-bot/helpers/beneficiary.ts`                                                |
| `RETENTION_DAYS`          | Number of days to keep logs before purge.                  | No                  | `90`              | `supabase/functions/data-retention-cron/index.ts`                                                       |
| `SESSION_TIMEOUT_MINUTES` | Minutes of inactivity before a user session is terminated. | No                  | `30`              | `supabase/functions/cleanup-old-sessions/index.ts`                                                      |
| `FOLLOW_UP_DELAY_MINUTES` | Minutes of inactivity before sending follow-up messages.   | No                  | `10`              | `supabase/functions/cleanup-old-sessions/index.ts`                                                      |
| `MAX_FOLLOW_UPS`          | Maximum number of follow-up messages to send per user.     | No                  | `3`               | `supabase/functions/cleanup-old-sessions/index.ts`                                                      |
| `ADMIN_API_SECRET`        | Shared secret for privileged admin endpoints.              | Yes for admin tasks | `hexstring`      | `supabase/functions/admin-session/index.ts`, `supabase/functions/rotate-admin-secret/index.ts`, `supabase/functions/rotate-webhook-secret/index.ts`, `supabase/functions/admin-review-payment/index.ts` |
## CDN

These variables configure uploads to DigitalOcean Spaces. Set them in
**App Settings → Environment Variables** when using DigitalOcean App Platform.
You can confirm access with `doctl spaces list`.

| Key | Purpose | Required | Example | Used in |
| --- | ------- | -------- | ------- | ------- |
| `CDN_BUCKET` | DigitalOcean Spaces bucket for static assets | Yes (landing build) | `my-space` | `scripts/upload-assets.js` |
| `CDN_REGION` | Spaces region for the CDN bucket | Yes (landing build) | `nyc3` | `scripts/upload-assets.js` |
| `CDN_ENDPOINT` | Override for the DigitalOcean Spaces API host (defaults to `<region>.digitaloceanspaces.com`); leave unset when specifying a CDN vanity domain | No | `https://nyc3.digitaloceanspaces.com` | `scripts/upload-assets.js`, `scripts/digitalocean/sync-cdn-config.mjs` |
| `CDN_ACCESS_KEY` | Spaces access key for uploads | Yes (landing build) | `DO0000000000EXAMPLE` | `scripts/upload-assets.js` |
| `CDN_SECRET_KEY` | Spaces secret key for uploads | Yes (landing build) | `supersecret` | `scripts/upload-assets.js` |
| `CDN_ENDPOINT_ID` | CDN endpoint ID used for automated cache purges | No (required for purge) | `a1b2c3d4-5678-90ab-cdef-1234567890ab` | `scripts/upload-assets.js` |
| `CDN_PURGE_PATHS` | Comma-separated CDN paths to purge after uploads | No | `/index.html,/` | `scripts/upload-assets.js` |
| `DIGITALOCEAN_TOKEN` | API token used for CDN purges and other DigitalOcean automation | No | `dop_v1_example` | `scripts/upload-assets.js`, `scripts/digitalocean/*` |

## Misc

| Key                   | Purpose                                  | Required | Example                   | Used in                           |
| --------------------- | ---------------------------------------- | -------- | ------------------------- | --------------------------------- |
| `DOMAIN`              | Apex domain used for DNS scripts and certificate provisioning. | Yes (prod) | `example.com` | `scripts/dns/*`, deployment docs |
| `SITE_URL`            | Base URL for the deployed site; used for redirects and canonical host checks. | Yes      | `http://localhost:3000` | `next.config.mjs`, `hooks/useAuth.tsx` |
| `NEXT_PUBLIC_SITE_URL`| Client-side canonical site URL surfaced in marketing metadata. | Yes (web) | `https://example.com/` | `apps/web/app/layout.tsx`, `docs/NETWORKING.md` |
| `NEXT_PUBLIC_API_URL`  | Base URL for client API requests (defaults to same-origin `/api`). | No | `http://localhost:3000/api` | `env.ts` |
| `SENTRY_DSN`          | Server-side Sentry DSN for error reporting. | No | `https://public@o0.ingest.sentry.io/0` | `apps/web/sentry.server.config.ts` |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser Sentry DSN exposed to the client. | No | `https://public@o0.ingest.sentry.io/0` | `apps/web/env.ts`, `apps/web/sentry.client.config.ts` |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key for analytics tracking. | No | `phc_xxx` | `apps/web/components/PostHogInit.tsx` |
| `NEXT_PUBLIC_POSTHOG_HOST` | Optional PostHog API host override. | No | `https://app.posthog.com` | `apps/web/components/PostHogInit.tsx` |
| `NODE_EXTRA_CA_CERTS` | Additional CA bundle for outbound HTTPS. | No       | `/etc/ssl/custom.pem`     | `apps/web/utils/http-ca.ts`            |
| `A_SUPABASE_URL`      | Supabase URL used by audit scripts.      | No       | `https://xyz.supabase.co` | `scripts/audit/read_meta.mjs`     |
| `A_SUPABASE_KEY`      | Supabase key used by audit scripts.      | No       | `service-role-key`        | `scripts/audit/read_meta.mjs`     |
| `HEALTH_URL`          | Base URL for mini app health checks.     | No       | `https://example.com`     | `scripts/miniapp-health-check.ts` |
| `ALLOWED_ORIGINS`     | Comma-separated origins allowed for CORS (defaults to `SITE_URL` or `http://localhost:3000`). | No       | `https://dynamic-capital.ondigitalocean.app,https://dynamic-capital.vercel.app,https://dynamic-capital.lovable.app`     | `middleware.ts`, `supabase/functions/_shared/http.ts` |
| `MINIAPP_ORIGIN`      | Origins allowed to call Telegram verification and mini-app APIs.              | No (required for production bots) | `https://dynamic-capital.ondigitalocean.app` | `supabase/functions/verify-telegram/index.ts` |
| `LOG_LEVEL`           | Minimum log level for server logs (`debug`, `info`, `warn`, `error`). | No       | `warn`                    | `utils/logger.ts` |
| `FUNCTIONS_BASE_URL`   | Override Supabase functions host when provisioning database webhooks. | No       | `https://custom.functions.supabase.co` | `scripts/setup-db-webhooks.ts` |
| `LOGTAIL_SOURCE_TOKEN` | Logtail source token used for Supabase log drain setup.              | No       | `gls_xxx`                    | `scripts/setup-log-drain.ts` |
| `LOGTAIL_URL`          | Optional Logtail API endpoint override.                              | No       | `https://in.logtail.com`     | `scripts/setup-log-drain.ts` |
| `GITHUB_PAT`           | GitHub personal access token for cleanup automation.                 | No       | `ghp_example`                | `supabase/functions/github-cleanup/index.ts` |
| `GITHUB_REPO`          | GitHub repository targeted by cleanup jobs (`owner/name`).           | No       | `dynamic-labs/dynamic-capital` | `supabase/functions/github-cleanup/index.ts` |
| `GITHUB_DEFAULT_BRANCH`| Default branch used by GitHub cleanup automation.                    | No       | `main`                       | `supabase/functions/github-cleanup/index.ts` |
| `GITHUB_ID`            | GitHub OAuth client ID for NextAuth.                                 | No       | `Iv1.example`                | `apps/web/app/api/auth/[...nextauth]/route.ts` |
| `GITHUB_SECRET`        | GitHub OAuth client secret for NextAuth.                             | No       | `super-secret`               | `apps/web/app/api/auth/[...nextauth]/route.ts` |
