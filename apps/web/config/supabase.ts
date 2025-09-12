import { getEnvVar } from "@/utils/env.ts";
export { SUPABASE_ENV_ERROR } from "@/integrations/supabase/client.ts";

const SUPABASE_URL = getEnvVar("NEXT_PUBLIC_SUPABASE_URL", ["SUPABASE_URL"]) ??
  "";
const SUPABASE_ANON_KEY =
  getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", ["SUPABASE_ANON_KEY"]) ?? "";

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
    CONTENT_BATCH: "content-batch",
    ANALYTICS_DATA: "analytics-data",
    MINIAPP: "miniapp",
    VERIFY_INITDATA: "verify-initdata",
  },
} as const;

export const buildFunctionUrl = (
  functionName: keyof typeof SUPABASE_CONFIG.FUNCTIONS,
): string =>
  `${SUPABASE_CONFIG.FUNCTIONS_URL}/${SUPABASE_CONFIG.FUNCTIONS[functionName]}`;

export const callEdgeFunction = async <T>(
  functionName: keyof typeof SUPABASE_CONFIG.FUNCTIONS,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    token?: string;
  } = {},
): Promise<{ data?: T; error?: { status: number; message: string } }> => {
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
    return {
      error: {
        status: res.status,
        message: (data as any)?.message ?? res.statusText,
      },
    };
  }

  return { data };
};
