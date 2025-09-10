# Environment Variables

This document lists environment variables used across the bot, mini app, and
maintenance scripts. Each entry notes its purpose, whether it's required, an
example value, and where it's referenced in the repository.

## Supabase

| Key                         | Purpose                                                   | Required | Example                     | Used in                                                                                                   |
| --------------------------- | --------------------------------------------------------- | -------- | --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | Base URL of the Supabase project.                         | Yes      | `https://xyz.supabase.co`   | `src/utils/config.ts`, `src/integrations/supabase/client.ts`, `supabase/functions/telegram-bot/index.ts` |
| `SUPABASE_ANON_KEY`         | Public anon key for client-side calls (also accepts `SUPABASE_KEY`).                    | Yes      | `eyJ...`                    | `src/integrations/supabase/client.ts`, `supabase/functions/theme-get/index.ts`, `supabase/functions/miniapp/src/lib/edge.ts` |
| `NEXT_PUBLIC_SUPABASE_URL`         | Build-time copy of `SUPABASE_URL` for the web app.        | Yes (web) | `https://xyz.supabase.co`   | `src/config/supabase.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`    | Build-time copy of `SUPABASE_ANON_KEY` for the web app.   | Yes (web) | `eyJ...`                    | `src/config/supabase.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for privileged Supabase access.          | Yes      | `service-role-key`          | `src/utils/config.ts`, `supabase/functions/telegram-bot/index.ts`                                         |
| `SUPABASE_PROJECT_ID`       | Supabase project reference used to build URLs in scripts. | No       | `abcd1234`                  | `scripts/ping-webhook.ts`, `scripts/miniapp-health-check.ts`                                              |
| `SUPABASE_ACCESS_TOKEN`     | Token for Supabase CLI operations.                        | No       | `sbp_at...`                 | Supabase CLI only                                                                                         |
| `SUPABASE_DB_PASSWORD`      | Postgres password for local or CI usage.                  | No       | `super-secret`              | Supabase CLI only                                                                                         |

## Telegram

| Key                       | Purpose                                                      | Required | Example                                          | Used in                                                              |
| ------------------------- | ------------------------------------------------------------ | -------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`      | Bot API token for making Telegram requests.                  | Yes      | `123456:ABCDEF`                                  | `supabase/functions/_shared/telegram.ts`, `scripts/set-webhook.ts`   |
| `TELEGRAM_WEBHOOK_SECRET` | Secret query param to validate webhook calls and required for privileged edge-function requests. | Yes      | `longrandomsecret`                               | `supabase/functions/telegram-bot/index.ts`, `scripts/set-webhook.ts`, `src/config/supabase.ts` |
| `TELEGRAM_WEBHOOK_URL`    | Explicit webhook endpoint; overrides derived URL in scripts. | No       | `https://xyz.functions.supabase.co/telegram-bot` | `scripts/set-webhook.ts`, `scripts/ping-webhook.ts`                  |
| `TELEGRAM_ADMIN_IDS`      | Comma-separated list of admin Telegram IDs.                  | No       | `1001,1002`                                      | `supabase/functions/_shared/alerts.ts`                               |
| `TELEGRAM_BOT_USERNAME`   | Bot's public username for referral links.                    | No       | `mybot`                                 | `supabase/functions/referral-link/index.ts`, `src/config/supabase.ts`                          |
| `TELEGRAM_BOT_URL`        | Public `t.me` link for the bot.                              | No       | `https://t.me/mybot`               | `src/config/supabase.ts`                                            |
| `NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET` | Client-side copy of webhook secret for edge function calls. | No       | `longrandomsecret`                          | `src/config/supabase.ts`                                            |
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
| `USDT_TRC20_ADDRESS` | TRC20 wallet address for USDT deposits. | Yes      | `TEX7N2YKZX2KJR8HXRZ5WQGK5JFCGR7` | `src/config/supabase.ts` |

## AI / Feature toggles

| Key                       | Purpose                                                    | Required            | Example           | Used in                                                                                                 |
| ------------------------- | ---------------------------------------------------------- | ------------------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`          | API key for AI features like FAQ or OCR.                   | No                  | `sk-...`          | `supabase/functions/ai-faq-assistant/index.ts`, `supabase/functions/receipt-ocr/index.ts`               |
| `OPENAI_ENABLED`          | Enables OpenAI-powered responses.                          | No                  | `true`            | `supabase/functions/telegram-bot/index.ts`                                                              |
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
## Misc

| Key                   | Purpose                                  | Required | Example                   | Used in                           |
| --------------------- | ---------------------------------------- | -------- | ------------------------- | --------------------------------- |
| `NODE_EXTRA_CA_CERTS` | Additional CA bundle for outbound HTTPS. | No       | `/etc/ssl/custom.pem`     | `src/utils/http-ca.ts`            |
| `A_SUPABASE_URL`      | Supabase URL used by audit scripts.      | No       | `https://xyz.supabase.co` | `scripts/audit/read_meta.mjs`     |
| `A_SUPABASE_KEY`      | Supabase key used by audit scripts.      | No       | `service-role-key`        | `scripts/audit/read_meta.mjs`     |
| `HEALTH_URL`          | Base URL for mini app health checks.     | No       | `https://example.com`     | `scripts/miniapp-health-check.ts` |
