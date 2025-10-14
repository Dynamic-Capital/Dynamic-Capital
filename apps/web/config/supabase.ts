import {
  SUPABASE_ANON_KEY,
  SUPABASE_CONFIG_FROM_ENV,
  SUPABASE_URL,
} from "@/config/supabase-runtime";
import { getEnvVar } from "@/utils/env";
import {
  SUPABASE_FUNCTIONS,
  type SupabaseFunctionKey,
} from "@shared/supabase/functions";

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
  FUNCTIONS: SUPABASE_FUNCTIONS,
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
  functionName: SupabaseFunctionKey,
): string =>
  `${SUPABASE_CONFIG.FUNCTIONS_URL}/${SUPABASE_CONFIG.FUNCTIONS[functionName]}`;

export type { SupabaseFunctionKey };

type JsonBody = Parameters<typeof JSON.stringify>[0];

interface EdgeFunctionErrorBody {
  message?: unknown;
}

function buildInternalFunctionProxyUrl(functionPath: string): string {
  const normalized = functionPath.replace(/^\/+/, "");
  if (typeof window !== "undefined") {
    return `/api/functions/${normalized}`;
  }

  const base = getEnvVar("SITE_URL", ["NEXT_PUBLIC_SITE_URL"])
    ?.replace(/\/+$/, "");
  const origin = base && base.length > 0 ? base : "http://localhost:3000";
  return `${origin}/api/functions/${normalized}`;
}

export const callEdgeFunction = async <T>(
  functionName: SupabaseFunctionKey,
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
  const functionPath = SUPABASE_CONFIG.FUNCTIONS[functionName];

  if (!functionPath) {
    return {
      error: {
        status: 0,
        message: `Unknown Supabase function: ${String(functionName)}`,
      },
      status: 0,
    };
  }

  const useProxy = !SUPABASE_CONFIG_FROM_ENV;
  const endpoint = useProxy
    ? buildInternalFunctionProxyUrl(functionPath)
    : buildFunctionUrl(functionName);

  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has("Content-Type") && body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (!useProxy) {
    requestHeaders.set("apikey", SUPABASE_CONFIG.ANON_KEY);
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  } else if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Network request failed";

    return {
      error: {
        status: 0,
        message,
      },
      status: 0,
    };
  }

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
