# Repository Summary — Dynamic-Capital

**Generated:** Sun, 21 Sep 2025 07:07:22 GMT **Repo root:** Dynamic-Capital

## Directory Map (top-level)

- _static/
- algorithms/
- apps/
- broadcast/
- db/
- dns/
- docker/
- docs/
- functions/
- go-service/
- node_modules/
- queue/
- scripts/
- src/
- supabase/
- tests/
- tools/

### Dynamic Theme Touchpoints

- `apps/web/app/layout.tsx` — Injects the boot-time theme resolver and sets the
  default `data-theme` attribute to prevent flashes during hydration.
- `apps/web/hooks/useTheme.tsx` — Central hook that coordinates `next-themes`,
  Telegram `themeParams`, and CSS variables while storing preferences in
  `localStorage`.
- `apps/web/components/ui/theme-toggle.tsx` — Shared toggle surfaced in both the
  marketing shell and authenticated dashboard for switching modes.
- `supabase/functions/theme-get/index.ts` &
  `supabase/functions/theme-save/index.ts` — Edge functions that read/write the
  `theme:<uid>` setting in `bot_settings` so the preference travels with the
  user.

## Edge Functions Inventory

| Function                    | Entry file                                              | Default export |
| --------------------------- | ------------------------------------------------------- | -------------- |
| active-promos               | supabase/functions/active-promos/index.ts               | Yes            |
| admin-act-on-payment        | supabase/functions/admin-act-on-payment/index.ts        | Yes            |
| admin-bans                  | supabase/functions/admin-bans/index.ts                  | Yes            |
| admin-check                 | supabase/functions/admin-check/index.ts                 | Yes            |
| admin-check-miniapp         | supabase/functions/admin-check-miniapp/index.ts         | Yes            |
| admin-clear-payments        | supabase/functions/admin-clear-payments/index.ts        | Yes            |
| admin-list-pending          | supabase/functions/admin-list-pending/index.ts          | Yes            |
| admin-logs                  | supabase/functions/admin-logs/index.ts                  | Yes            |
| admin-reset-system          | supabase/functions/admin-reset-system/index.ts          | Yes            |
| admin-review-payment        | supabase/functions/admin-review-payment/index.ts        | Yes            |
| admin-session               | supabase/functions/admin-session/index.ts               | Yes            |
| ai-faq-assistant            | supabase/functions/ai-faq-assistant/index.ts            | Yes            |
| analytics-collector         | supabase/functions/analytics-collector/index.ts         | Yes            |
| analytics-data              | supabase/functions/analytics-data/index.ts              | Yes            |
| auth/telegram-init          | supabase/functions/auth/telegram-init/index.ts          | Yes            |
| bot-status-check            | supabase/functions/bot-status-check/index.ts            | Yes            |
| broadcast-cron              | supabase/functions/broadcast-cron/index.ts              | Yes            |
| broadcast-dispatch          | supabase/functions/broadcast-dispatch/index.ts          | Yes            |
| build-miniapp               | supabase/functions/build-miniapp/index.ts               | Yes            |
| chatgpt-proxy               | supabase/functions/chatgpt-proxy/index.ts               | Yes            |
| checkout-init               | supabase/functions/checkout-init/index.ts               | Yes            |
| cleanup-old-receipts        | supabase/functions/cleanup-old-receipts/index.ts        | Yes            |
| cleanup-old-sessions        | supabase/functions/cleanup-old-sessions/index.ts        | Yes            |
| cleanup-old-webhook-updates | supabase/functions/cleanup-old-webhook-updates/index.ts | Yes            |
| config                      | supabase/functions/config/index.ts                      | Yes            |
| contact-links               | supabase/functions/contact-links/index.ts               | Yes            |
| content-batch               | supabase/functions/content-batch/index.ts               | Yes            |
| crypto-txid                 | supabase/functions/crypto-txid/index.ts                 | Yes            |
| crypto-webhook              | supabase/functions/crypto-webhook/index.ts              | Yes            |
| data-retention-cron         | supabase/functions/data-retention-cron/index.ts         | Yes            |
| debug-bot                   | supabase/functions/debug-bot/index.ts                   | Yes            |
| funnel-track                | supabase/functions/funnel-track/index.ts                | Yes            |
| github-cleanup              | supabase/functions/github-cleanup/index.ts              | Yes            |
| intent                      | supabase/functions/intent/index.ts                      | Yes            |
| keep-alive                  | supabase/functions/keep-alive/index.ts                  | Yes            |
| linkage-audit               | supabase/functions/linkage-audit/index.ts               | Yes            |
| miniapp-health              | supabase/functions/miniapp-health/index.ts              | Yes            |
| openai-webhook              | supabase/functions/openai-webhook/index.ts              | Yes            |
| ops-health                  | supabase/functions/ops-health/index.ts                  | Yes            |
| payments-auto-review        | supabase/functions/payments-auto-review/index.ts        | Yes            |
| plans                       | supabase/functions/plans/index.ts                       | Yes            |
| private-pool-deposit        | supabase/functions/private-pool-deposit/index.ts        | Yes            |
| private-pool-settle-cycle   | supabase/functions/private-pool-settle-cycle/index.ts   | Yes            |
| private-pool-withdraw       | supabase/functions/private-pool-withdraw/index.ts       | Yes            |
| promo-redeem                | supabase/functions/promo-redeem/index.ts                | Yes            |
| promo-validate              | supabase/functions/promo-validate/index.ts              | Yes            |
| receipt                     | supabase/functions/receipt/index.ts                     | Yes            |
| receipt-ocr                 | supabase/functions/receipt-ocr/index.ts                 | Yes            |
| receipt-submit              | supabase/functions/receipt-submit/index.ts              | Yes            |
| receipt-upload-url          | supabase/functions/receipt-upload-url/index.ts          | Yes            |
| receipts                    | supabase/functions/receipts/index.ts                    | Yes            |
| referral-link               | supabase/functions/referral-link/index.ts               | Yes            |
| reset-bot                   | supabase/functions/reset-bot/index.ts                   | Yes            |
| rotate-admin-secret         | supabase/functions/rotate-admin-secret/index.ts         | Yes            |
| rotate-webhook-secret       | supabase/functions/rotate-webhook-secret/index.ts       | Yes            |
| setup-lovable-miniapp       | supabase/functions/setup-lovable-miniapp/index.ts       | Yes            |
| setup-miniapp               | supabase/functions/setup-miniapp/index.ts               | Yes            |
| setup-telegram-webhook      | supabase/functions/setup-telegram-webhook/index.ts      | Yes            |
| setup-webhook               | supabase/functions/setup-webhook/index.ts               | Yes            |
| setup-webhook-helper        | supabase/functions/setup-webhook-helper/index.ts        | Yes            |
| subscription-status         | supabase/functions/subscription-status/index.ts         | Yes            |
| subscriptions-cron          | supabase/functions/subscriptions-cron/index.ts          | Yes            |
| sync-audit                  | supabase/functions/sync-audit/index.ts                  | Yes            |
| system-health               | supabase/functions/system-health/index.ts               | Yes            |
| telegram-bot                | supabase/functions/telegram-bot/index.ts                | Yes            |
| telegram-bot-sync           | supabase/functions/telegram-bot-sync/index.ts           | Yes            |
| telegram-bot/admin-handlers | supabase/functions/telegram-bot/admin-handlers/index.ts | Yes            |
| telegram-getwebhook         | supabase/functions/telegram-getwebhook/index.ts         | Yes            |
| telegram-setwebhook         | supabase/functions/telegram-setwebhook/index.ts         | Yes            |
| telegram-webhook            | supabase/functions/telegram-webhook/index.ts            | Yes            |
| telegram-webhook-keeper     | supabase/functions/telegram-webhook-keeper/index.ts     | Yes            |
| tg-verify-init              | supabase/functions/tg-verify-init/index.ts              | Yes            |
| theme-get                   | supabase/functions/theme-get/index.ts                   | Yes            |
| theme-save                  | supabase/functions/theme-save/index.ts                  | Yes            |
| trade-helper                | supabase/functions/trade-helper/index.ts                | Yes            |
| traffic-monitor             | supabase/functions/traffic-monitor/index.ts             | Yes            |
| update-telegram-miniapp     | supabase/functions/update-telegram-miniapp/index.ts     | Yes            |
| upload-miniapp-html         | supabase/functions/upload-miniapp-html/index.ts         | Yes            |
| verify-initdata             | supabase/functions/verify-initdata/index.ts             | Yes            |
| verify-telegram             | supabase/functions/verify-telegram/index.ts             | Yes            |
| vip-sync                    | supabase/functions/vip-sync/index.ts                    | Yes            |
| vip-sync-enhanced           | supabase/functions/vip-sync-enhanced/index.ts           | Yes            |
| web-app-analytics           | supabase/functions/web-app-analytics/index.ts           | Yes            |
| web-app-health              | supabase/functions/web-app-health/index.ts              | Yes            |

## Environment Keys (detected)

- A_SUPABASE_KEY
- A_SUPABASE_URL
- ADMIN_API_SECRET
- ALLOWED_ORIGINS
- ANALYZE
- APP_URL
- CDN_ACCESS_KEY
- CDN_BUCKET
- CDN_ENDPOINT
- CDN_ENDPOINT_ID
- CDN_PURGE_PATHS
- CDN_REGION
- CDN_SECRET_KEY
- CI
- CODEX_AGENT
- CODEX_AGENT_ID
- CODEX_DISABLE_SHARED_CACHE
- CODEX_PROFILE
- DATABASE_URL
- DEBUG
- DEFAULT_LOCALE
- DENO_DEPLOYMENT_ID
- DENO_REGION
- DEPLOY_URL
- DEPLOYMENT_URL
- DIGITALOCEAN_APP_SITE_DOMAIN
- DIGITALOCEAN_APP_URL
- DIGITALOCEAN_TOKEN
- DISABLE_HTTP_REDIRECTS
- ENABLE_SENTRY
- EXAMPLE_KEY
- FUNCTIONS_BASE
- FUNCTIONS_BASE_URL
- GITHUB_DEFAULT_BRANCH
- GITHUB_ID
- GITHUB_PAT
- GITHUB_REPO
- GITHUB_SECRET
- HEALTH_URL
- LEGACY_HOST
- LOG_LEVEL
- LOGTAIL_SOURCE_TOKEN
- LOGTAIL_URL
- LOVABLE_ORIGIN
- MINI_APP_SHORT_NAME
- MINI_APP_URL
- MINIAPP_ORIGIN
- NEXT_PUBLIC_DEFAULT_LOCALE
- NEXT_PUBLIC_POSTHOG_HOST
- NEXT_PUBLIC_POSTHOG_KEY
- NEXT_PUBLIC_SENTRY_DSN
- NEXT_PUBLIC_SITE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NODE_ENV
- NODE_EXTRA_CA_CERTS
- PATH
- PORT
- PREVIEW_URL
- PRIMARY_HOST
- PUBLIC_URL
- QUEUE_PENDING_THRESHOLD
- RETENTION_DAYS
- SENTRY_DSN
- SITE_URL
- SKIP_NEXT_BUILD
- SSL_CERT_PATH
- SSL_KEY_PATH
- STATIC_EXPORT_PORT
- SUPABASE_ACCESS_TOKEN
- SUPABASE_ALERTS_TABLE
- SUPABASE_ANON_KEY
- SUPABASE_DB_PASSWORD
- SUPABASE_PROJECT_ID
- SUPABASE_PROJECT_REF
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_URL
- TELEGRAM_ADMIN_IDS
- TELEGRAM_BOT_TOKEN
- TELEGRAM_BOT_USERNAME
- TELEGRAM_ID
- TELEGRAM_WEBHOOK_SECRET
- TELEGRAM_WEBHOOK_URL
- TRADINGVIEW_WEBHOOK_SECRET
- URL
- VERCEL_URL

## Automation Notes

- Run `npm run docs:summary` before merging to refresh this inventory.
- Run `npm run docs:organize` to update `docs/REPO_FILE_ORGANIZER.md` when the
  top-level layout changes.
- When marketing assets change, rerun the landing build parity checklist below.

### Landing Build Parity Checklist

- [ ] Run `npm run build:landing` to regenerate `_static/` assets.
- [ ] Compare `_static/` with `apps/web/app/(marketing)` and commit any
      differences.
- [ ] Record the parity outcome in release notes or the PR description.

_Generated with `scripts/generate-repo-summary.ts`._
