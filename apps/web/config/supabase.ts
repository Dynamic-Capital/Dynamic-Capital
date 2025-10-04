import {
  SUPABASE_ANON_KEY,
  SUPABASE_CONFIG_FROM_ENV,
  SUPABASE_URL,
} from "@/config/supabase-runtime";
import { getEnvVar } from "@/utils/env";

export const SUPABASE_ENV_ERROR = "";

if (!SUPABASE_CONFIG_FROM_ENV) {
  console.info(
    "[Supabase] Using baked-in project credentials because env vars are not set.",
  );
}

export const SUPABASE_CONFIG = {
  URL: SUPABASE_URL,
  ANON_KEY: SUPABASE_ANON_KEY,
  FUNCTIONS_URL: SUPABASE_URL.replace(
    ".supabase.co",
    ".functions.supabase.co",
  ),
  FUNCTIONS: {
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
  },
} as const;

const DEFAULT_CRYPTO_SUPPORTED_CURRENCIES = [
  "BTC",
  "ETH",
  "USDT",
  "LTC",
] as const;
const DEFAULT_CRYPTO_DEPOSIT_ADDRESS = "TQn9Y2khEsLMWD1N4wZ7Eh6V8c8aL5Q1R4";
const DEFAULT_CRYPTO_USDT_TRC20_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const DEFAULT_CRYPTO_NETWORK = "mainnet";

type CryptoConfig = {
  SUPPORTED_CURRENCIES: readonly string[];
  DEPOSIT_ADDRESS: string;
  USDT_TRC20_ADDRESS: string;
  NETWORK: string;
};

function resolveString(
  key: string,
  fallback: string,
  aliases: string[] = [],
): string {
  const value = getEnvVar(key, aliases);
  return value ?? fallback;
}

function resolveSupportedCurrencies(): readonly string[] {
  const raw = getEnvVar("CRYPTO_SUPPORTED_CURRENCIES");
  if (!raw) return DEFAULT_CRYPTO_SUPPORTED_CURRENCIES;
  const parsed = raw
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map((token) => token.toUpperCase());
  return parsed.length > 0 ? parsed : DEFAULT_CRYPTO_SUPPORTED_CURRENCIES;
}

export const CRYPTO_CONFIG: CryptoConfig = {
  SUPPORTED_CURRENCIES: resolveSupportedCurrencies(),
  DEPOSIT_ADDRESS: resolveString(
    "CRYPTO_DEPOSIT_ADDRESS",
    DEFAULT_CRYPTO_DEPOSIT_ADDRESS,
  ),
  USDT_TRC20_ADDRESS: resolveString(
    "USDT_TRC20_ADDRESS",
    DEFAULT_CRYPTO_USDT_TRC20_ADDRESS,
  ),
  NETWORK: resolveString("CRYPTO_NETWORK", DEFAULT_CRYPTO_NETWORK),
};

type TelegramConfig = {
  BOT_URL: string;
  MINI_APP_URL: string;
  WEBHOOK_SECRET: string;
};

export const TELEGRAM_CONFIG: TelegramConfig = {
  BOT_URL: resolveString("TELEGRAM_BOT_URL", "https://t.me/your_bot"),
  MINI_APP_URL: resolveString(
    "MINI_APP_URL",
    "https://your-miniapp.supabase.co",
    ["NEXT_PUBLIC_MINI_APP_URL"],
  ),
  WEBHOOK_SECRET: resolveString(
    "NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET",
    "",
  ),
};

export const buildFunctionUrl = (
  functionName: keyof typeof SUPABASE_CONFIG.FUNCTIONS,
): string =>
  `${SUPABASE_CONFIG.FUNCTIONS_URL}/${SUPABASE_CONFIG.FUNCTIONS[functionName]}`;

type JsonBody = Parameters<typeof JSON.stringify>[0];

interface EdgeFunctionErrorBody {
  message?: unknown;
}

export const callEdgeFunction = async <T>(
  functionName: keyof typeof SUPABASE_CONFIG.FUNCTIONS,
  options: {
    method?: string;
    body?: JsonBody;
    headers?: Record<string, string>;
    token?: string;
  } = {},
): Promise<
  { data?: T; error?: { status: number; message: string }; status?: number }
> => {
  const { method = "GET", body, headers = {}, token } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_CONFIG.ANON_KEY,
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(buildFunctionUrl(functionName), {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: T | undefined;
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    let message = res.statusText;
    if (data && typeof data === "object") {
      const candidate = (data as EdgeFunctionErrorBody).message;
      if (typeof candidate === "string" && candidate.length > 0) {
        message = candidate;
      }
    }

    return {
      error: {
        status: res.status,
        message,
      },
      status: res.status,
    };
  }

  return { data, status: res.status };
};
