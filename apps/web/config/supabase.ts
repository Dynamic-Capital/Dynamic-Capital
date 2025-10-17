import {
  SUPABASE_ANON_KEY,
  SUPABASE_CONFIG_FROM_ENV,
  SUPABASE_FUNCTIONS_URL,
  SUPABASE_URL,
} from "@/config/supabase-runtime";
import { isDevelopment } from "@/config/node-env";
import { getEnvVar } from "@/utils/env";
import {
  SUPABASE_FUNCTIONS,
  type SupabaseFunctionKey,
} from "@shared/supabase/functions";
import { resolveSupabaseFunctionFallback } from "./supabase-fallback";

export const SUPABASE_ENV_ERROR = "";

if (!SUPABASE_CONFIG_FROM_ENV) {
  console.info(
    "[Supabase] Using baked-in project credentials because env vars are not set.",
  );
}

export const SUPABASE_CONFIG = {
  URL: SUPABASE_URL,
  ANON_KEY: SUPABASE_ANON_KEY,
  FUNCTIONS_URL: SUPABASE_FUNCTIONS_URL,
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
  aliases: readonly string[] = [],
): string {
  const value = getEnvVar(key, aliases);
  return value ?? fallback;
}

function resolveStrictString(
  key: string,
  fallback: string,
  aliases: readonly string[] = [],
): string {
  const value = getEnvVar(key, aliases);
  if (value) {
    return value;
  }

  if (isDevelopment) {
    return fallback;
  }

  const aliasSuffix = aliases.length > 0
    ? ` (aliases: ${aliases.join(", ")})`
    : "";
  throw new Error(`Missing required env: ${key}${aliasSuffix}`);
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
  BOT_URL: resolveStrictString(
    "TELEGRAM_BOT_URL",
    "https://t.me/dynamiccapital_dev_bot",
  ),
  MINI_APP_URL: resolveStrictString(
    "MINI_APP_URL",
    "http://localhost:3000/miniapp",
    ["NEXT_PUBLIC_MINI_APP_URL"],
  ),
  WEBHOOK_SECRET: resolveStrictString(
    "NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET",
    "local-telegram-webhook-secret",
    ["TELEGRAM_WEBHOOK_SECRET"],
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
    searchParams?: Record<string, string | number | boolean | undefined>;
    signal?: AbortSignal;
    cache?: RequestCache;
  } = {},
): Promise<
  { data?: T; error?: { status: number; message: string }; status?: number }
> => {
  const {
    method = "GET",
    body,
    headers = {},
    token,
    searchParams,
    signal,
    cache,
  } = options;
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

  if (!SUPABASE_CONFIG_FROM_ENV) {
    const fallback = resolveSupabaseFunctionFallback(
      functionName,
      method,
      (body as Record<string, unknown>) ?? null,
    );

    if (fallback) {
      return {
        data: fallback.data as T | undefined,
        error: fallback.error,
        status: fallback.status,
      };
    }
  }

  const useProxy = !SUPABASE_CONFIG_FROM_ENV;
  let endpoint = useProxy
    ? buildInternalFunctionProxyUrl(functionPath)
    : buildFunctionUrl(functionName);

  if (searchParams) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === null) {
        continue;
      }
      query.set(key, String(value));
    }
    const queryString = query.toString();
    if (queryString) {
      endpoint = `${endpoint}${
        endpoint.includes("?") ? "&" : "?"
      }${queryString}`;
    }
  }

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
    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
      signal,
      cache,
    };

    if (body !== undefined) {
      requestInit.body = JSON.stringify(body);
    }

    res = await fetch(endpoint, requestInit);
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
