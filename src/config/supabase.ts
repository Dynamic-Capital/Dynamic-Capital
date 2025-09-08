import { optionalEnvVar } from "../utils/env.ts";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ENV_ERROR } from "../../shared/supabase-client.ts";

const PROJECT_ID = SUPABASE_URL.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)
  ? RegExp.$1
  : "";
const FUNCTIONS_URL = SUPABASE_URL.replace(
  ".supabase.co",
  ".functions.supabase.co",
);

export const SUPABASE_CONFIG = {
  // Project configuration
  PROJECT_ID,
  URL: SUPABASE_URL,
  ANON_KEY: SUPABASE_ANON_KEY,

  // Edge functions base URL
  FUNCTIONS_URL,

  // Edge function endpoints
  FUNCTIONS: {
    // Payment & checkout
    CHECKOUT_INIT: 'checkout-init',
    INTENT: 'intent',
    PLANS: 'plans',
    PROMO_VALIDATE: 'promo-validate',
    ACTIVE_PROMOS: 'active-promos',
    SUBSCRIPTION_STATUS: 'subscription-status',
    CRYPTO_TXID: 'crypto-txid',

    // Admin functions
    ADMIN_SESSION: 'admin-session',
    ADMIN_BANS: 'admin-bans',
    ADMIN_LOGS: 'admin-logs',
    ADMIN_ACT_ON_PAYMENT: 'admin-act-on-payment',
    ADMIN_LIST_PENDING: 'admin-list-pending',
    ADMIN_CHECK: 'admin-check',

    // Bot & system
    BOT_STATUS_CHECK: 'bot-status-check',
    ROTATE_WEBHOOK_SECRET: 'rotate-webhook-secret',
    RESET_BOT: 'reset-bot',
    BROADCAST_DISPATCH: 'broadcast-dispatch',
    WEB_APP_HEALTH: 'web-app-health',
    MINIAPP_HEALTH: 'miniapp-health',
    THEME_GET: 'theme-get',
    THEME_SAVE: 'theme-save',

    // Content & data
    CONTENT_BATCH: 'content-batch',
    ANALYTICS_DATA: 'analytics-data',
    MINIAPP: 'miniapp',

    // Verification
    VERIFY_INITDATA: 'verify-initdata',
  }
} as const;

export { SUPABASE_ENV_ERROR };

// Shared secret used by both the Telegram bot and web dashboard when calling
// protected edge functions. In browser builds it must be exposed via the
// VITE_ prefix.
const TELEGRAM_WEBHOOK_SECRET = optionalEnvVar("TELEGRAM_WEBHOOK_SECRET");

// Helper function to build function URLs
export const buildFunctionUrl = (functionName: keyof typeof SUPABASE_CONFIG.FUNCTIONS): string => {
  return `${SUPABASE_CONFIG.FUNCTIONS_URL}/${SUPABASE_CONFIG.FUNCTIONS[functionName]}`;
};

// Helper function for making authenticated requests to edge functions
export const callEdgeFunction = async (
  functionName: keyof typeof SUPABASE_CONFIG.FUNCTIONS,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    token?: string;
  } = {},
): Promise<{ data: any; status: number }> => {
  const { method = 'GET', body, headers = {}, token } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_CONFIG.ANON_KEY,
    ...headers,
  };

  if (TELEGRAM_WEBHOOK_SECRET) {
    requestHeaders['x-telegram-bot-api-secret-token'] = TELEGRAM_WEBHOOK_SECRET;
  }

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(buildFunctionUrl(functionName), {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Edge function ${functionName} failed: ${res.status} ${res.statusText}`);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  return { data, status: res.status };
};

// Telegram bot configuration
export const TELEGRAM_CONFIG = {
  BOT_USERNAME: 'Dynamic_VIP_BOT',
  BOT_URL: 'https://t.me/Dynamic_VIP_BOT',
} as const;

// Crypto configuration
export const CRYPTO_CONFIG = {
  USDT_TRC20_ADDRESS: optionalEnvVar('USDT_TRC20_ADDRESS') ?? '',
  NETWORKS: {
    TRC20: 'TRON (TRC20)',
    ERC20: 'Ethereum (ERC20)',
  }
} as const;
