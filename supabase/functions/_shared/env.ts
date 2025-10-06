/** List all secrets used by the bot + mini app. Add here when new ones arise. */
export type EnvKey =
  | "SUPABASE_URL"
  | "SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "SUPABASE_SERVICE_ROLE"
  | "SUPABASE_DB_URL"
  | "SUPABASE_PROJECT_ID"
  | "SUPABASE_PROJECT_REF"
  | "TELEGRAM_BOT_TOKEN"
  | "TELEGRAM_WEBHOOK_SECRET"
  | "TELEGRAM_APP_ID"
  | "TELEGRAM_APP_HASH"
  | "ADMIN_API_SECRET"
  | "SESSION_JWT_SECRET"
  | "TELEGRAM_BOT_USERNAME"
  | "TELEGRAM_BOT_URL"
  | "OPENAI_API_KEY"
  | "OPENAI_ENABLED"
  | "OPENAI_WEBHOOK_SECRET"
  | "OPENAI_REALTIME_MODEL"
  | "FAQ_ENABLED"
  | "SERVICE_ROLE_KEY"
  | "PROJECT_ID"
  | "PROJECT_URL"
  | "ONEDRIVE_CLIENT_ID"
  | "ONEDRIVE_CLIENT_SECRET"
  | "ONEDRIVE_DEFAULT_DRIVE_ID"
  | "ONEDRIVE_SCOPE"
  | "ONEDRIVE_TENANT_ID"
  | "ONEDRIVE_WEBHOOK_SECRET"
  | "ONEDRIVE_WEBHOOK_CLIENT_STATE"
  | "ONEDRIVE_PROXY_SECRET"
  | "DATABASE_PASSWORD"
  | "MINI_APP_URL"
  | "MINI_APP_SHORT_NAME"
  | "BOT_VERSION"
  | "WINDOW_SECONDS"
  | "AMOUNT_TOLERANCE"
  | "REQUIRE_PAY_CODE"
  | "SB_REQUEST_ID"
  | "BENEFICIARY_TABLE"
  | "SESSION_TIMEOUT_MINUTES"
  | "FOLLOW_UP_DELAY_MINUTES"
  | "MAX_FOLLOW_UPS"
  | "CRYPTO_DEPOSIT_ADDRESS"
  | "SYNC_BATCH_SIZE"
  | "VIP_CHANNELS"
  | "VIP_EXPIRY_GRACE_DAYS"
  | "BINANCE_PAY_API_KEY"
  | "BINANCE_PAY_SECRET"
  | "TRADING_SIGNALS_WEBHOOK_SECRET"
  | "EXNESS_MT5_LOGIN"
  | "EXNESS_MT5_PASSWORD"
  | "EXNESS_MT5_SERVER"
  | "MT5_BRIDGE_WORKER_ID"
  | "BRIDGE_HOST"
  | "BRIDGE_USER"
  | "BRIDGE_SSH_KEY"
  | "TON_USD_OVERRIDE"
  | "VIP_PRICING_SECRET"
  | "PROMO_AUTOGEN_SECRET"
  | "VIP_PRICING_LOOKBACK_DAYS"
  | "PROMO_AUTOGEN_MIN_USERS"
  | "PROMO_AUTOGEN_MIN_REVENUE"
  | "RESEND_API_KEY"
  | "COLD_EMAIL_FROM_ADDRESS"
  | "COLD_EMAIL_FROM_NAME"
  | "COLD_EMAIL_REPLY_TO"
  | "COLD_EMAIL_MAX_BATCH"
  | "ALLOWED_ORIGINS";

/** Test-only env injection type */
type TestEnv = Partial<Record<EnvKey, string>>;

function sanitize(value: string | undefined | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (
    v === "" || v.toLowerCase() === "undefined" || v.toLowerCase() === "null"
  ) {
    return null;
  }
  return v;
}

/** Get a single env value (production via Deno.env, tests via __TEST_ENV__). */
export function getEnv<K extends EnvKey>(key: K): string {
  const testEnv =
    (globalThis as unknown as { __TEST_ENV__?: TestEnv }).__TEST_ENV__;
  const v = sanitize(Deno.env.get(key) ?? testEnv?.[key]);
  if (!v) throw new Error(`Missing required env: ${key}`);
  return v;
}

/** Get a group of envs at once; will throw if any is missing. */
export function requireEnv<K extends readonly EnvKey[]>(
  keys: K,
): Record<K[number], string> {
  const out: Record<string, string> = {};
  for (const key of keys as readonly EnvKey[]) {
    out[key] = getEnv(key);
  }
  return out as Record<K[number], string>;
}

/** Optionally get an env (returns null if absent). */
export function optionalEnv<K extends EnvKey>(key: K): string | null {
  const testEnv =
    (globalThis as unknown as { __TEST_ENV__?: TestEnv }).__TEST_ENV__;
  return sanitize(Deno.env.get(key) ?? testEnv?.[key]);
}

/**
 * Check a set of env keys and return which ones are missing.
 * Unlike `requireEnv`, this does not throw and is handy for preflight checks.
 */
export function checkEnv(keys: readonly EnvKey[]): {
  ok: boolean;
  missing: string[];
} {
  const missing = keys.filter((k) => !optionalEnv(k));
  return { ok: missing.length === 0, missing };
}

export function need(k: string): string {
  const v = sanitize(Deno.env.get(k));
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
}

export const maybe = (k: string) => sanitize(Deno.env.get(k));
