export const SUPABASE_FUNCTIONS = {
  CHECKOUT_INIT: "checkout-init",
  INTENT: "intent",
  PLANS: "plans",
  PROMO_VALIDATE: "promo-validate",
  ACTIVE_PROMOS: "active-promos",
  SUBSCRIPTION_STATUS: "subscription-status",
  CRYPTO_TXID: "crypto-txid",
  ADMIN_SESSION: "admin-session",
  ADMIN_BANS: "admin-bans",
  ADMIN_LOGS: "admin-logs",
  ADMIN_ACT_ON_PAYMENT: "admin-act-on-payment",
  ADMIN_REVIEW_PAYMENT: "admin-review-payment",
  ADMIN_LIST_PENDING: "admin-list-pending",
  ADMIN_CHECK: "admin-check",
  BOT_STATUS_CHECK: "bot-status-check",
  ROTATE_WEBHOOK_SECRET: "rotate-webhook-secret",
  ROTATE_ADMIN_SECRET: "rotate-admin-secret",
  RESET_BOT: "reset-bot",
  BROADCAST_DISPATCH: "broadcast-dispatch",
  BUILD_MINIAPP: "build-miniapp",
  UPLOAD_MINIAPP_HTML: "upload-miniapp-html",
  WEB_APP_HEALTH: "web-app-health",
  MINIAPP_HEALTH: "miniapp-health",
  THEME_GET: "theme-get",
  THEME_SAVE: "theme-save",
  START_MINTING: "start-minting",
  CONTENT_BATCH: "content-batch",
  ANALYTICS_DATA: "analytics-data",
  LANDING_HERO_METRICS: "landing-hero-metrics",
  ECONOMIC_CALENDAR: "economic-calendar",
  MINIAPP: "miniapp",
  VERIFY_INITDATA: "verify-initdata",
  LINK_WALLET: "link-wallet",
  TON_CONNECT_SESSION: "ton-connect-session",
  PROCESS_SUBSCRIPTION: "process-subscription",
  PRIVATE_POOL_DEPOSIT: "private-pool-deposit",
  PRIVATE_POOL_WITHDRAW: "private-pool-withdraw",
  SETTLE_ORDER: "settle-order",
} as const;

export type SupabaseFunctionKey = keyof typeof SUPABASE_FUNCTIONS;

export function resolveSupabaseFunctionPath(
  key: SupabaseFunctionKey,
): string {
  return SUPABASE_FUNCTIONS[key];
}
