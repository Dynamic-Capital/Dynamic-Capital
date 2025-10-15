// Utilities for accessing feature flag configuration via secure edge function

import { withRetry } from "./retry.ts";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_CONFIG_FROM_ENV,
  SUPABASE_URL,
} from "@/config/supabase-runtime";
import { getFeatureFlagDefault } from "../../../shared/feature-flags.ts";

type FlagSnapshot = { ts: number; data: Record<string, boolean> };

const CONFIG_DISABLED_MESSAGE =
  "Supabase configuration is missing; remote config client is disabled.";

const CONFIG_FUNCTION_NAME = "config";
const CONFIG_PROXY_PATH = `/api/functions/${CONFIG_FUNCTION_NAME}`;

type RemoteConfigEndpoint = {
  url: string;
  headers: Record<string, string>;
};

type GlobalScope = typeof globalThis & {
  window?: { location?: { origin?: string } };
  location?: { origin?: string };
};

const globalScope = globalThis as GlobalScope;

let hasLoggedConfigWarning = false;

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}

function ensureLeadingSlash(value: string): string {
  return value.startsWith("/") ? value : `/${value}`;
}

function readBrowserOrigin(): string | undefined {
  const windowOrigin = globalScope.window?.location?.origin;
  if (typeof windowOrigin === "string" && windowOrigin.trim().length > 0) {
    return windowOrigin;
  }

  const globalOrigin = globalScope.location?.origin;
  if (typeof globalOrigin === "string" && globalOrigin.trim().length > 0) {
    return globalOrigin;
  }

  return undefined;
}

function resolveProxyOrigin(): string | undefined {
  const originCandidate = readBrowserOrigin();

  if (!originCandidate) {
    return undefined;
  }

  try {
    return stripTrailingSlash(new URL(originCandidate).toString());
  } catch {
    return stripTrailingSlash(originCandidate);
  }
}

function buildSupabaseConfigEndpoint(): RemoteConfigEndpoint | null {
  if (SUPABASE_CONFIG_FROM_ENV && SUPABASE_URL && SUPABASE_ANON_KEY) {
    const baseUrl = stripTrailingSlash(SUPABASE_URL);
    return {
      url: `${baseUrl}/functions/v1/${CONFIG_FUNCTION_NAME}`,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    };
  }

  const proxyOrigin = resolveProxyOrigin();
  if (!proxyOrigin) {
    return null;
  }

  return {
    url: `${stripTrailingSlash(proxyOrigin)}${
      ensureLeadingSlash(CONFIG_PROXY_PATH)
    }`,
    headers: {},
  };
}

function resolveRemoteConfigEndpoint(): RemoteConfigEndpoint | null {
  const endpoint = buildSupabaseConfigEndpoint();

  if (!endpoint && !hasLoggedConfigWarning) {
    hasLoggedConfigWarning = true;
    console.warn("Configuration warning:", CONFIG_DISABLED_MESSAGE);
  }

  return endpoint;
}

const DEFAULT_TIMEOUT_MS = 10_000;

async function call<T>(
  endpoint: RemoteConfigEndpoint,
  action: string,
  payload: Record<string, unknown> = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const headers = new Headers({
    "Content-Type": "application/json",
    ...endpoint.headers,
  });

  try {
    const res = await withRetry(
      async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          return await fetch(endpoint.url, {
            method: "POST",
            headers,
            body: JSON.stringify({ action, ...payload }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }
      },
      3,
    );
    if (!res.ok) {
      throw new Error(`Config edge function error: ${await res.text()}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Config request timed out after ${timeoutMs} ms`);
    }
    throw err;
  }
}

const activeConfigClient = {
  async getFlag(name: string, def = false): Promise<boolean> {
    const effectiveDefault = getFeatureFlagDefault(name, def);
    const endpoint = resolveRemoteConfigEndpoint();

    if (!endpoint) {
      console.warn(
        `[config] ${CONFIG_DISABLED_MESSAGE} Returning default for "${name}".`,
      );
      return effectiveDefault;
    }

    const data = await call<{ data: boolean }>(endpoint, "getFlag", {
      name,
      def: effectiveDefault,
    });
    return data?.data ?? effectiveDefault;
  },

  async setFlag(name: string, value: boolean): Promise<void> {
    const endpoint = resolveRemoteConfigEndpoint();
    if (!endpoint) {
      throw new Error(CONFIG_DISABLED_MESSAGE);
    }

    await call(endpoint, "setFlag", { name, value });
  },

  async preview(): Promise<FlagSnapshot> {
    const endpoint = resolveRemoteConfigEndpoint();
    if (!endpoint) {
      throw new Error(CONFIG_DISABLED_MESSAGE);
    }

    return await call<FlagSnapshot>(endpoint, "preview");
  },

  async publish(adminId?: string): Promise<void> {
    const endpoint = resolveRemoteConfigEndpoint();
    if (!endpoint) {
      throw new Error(CONFIG_DISABLED_MESSAGE);
    }

    await call(endpoint, "publish", { adminId });
  },

  async rollback(adminId?: string): Promise<void> {
    const endpoint = resolveRemoteConfigEndpoint();
    if (!endpoint) {
      throw new Error(CONFIG_DISABLED_MESSAGE);
    }

    await call(endpoint, "rollback", { adminId });
  },
};

const configClient = activeConfigClient;

export const { getFlag, setFlag, preview, publish, rollback } = configClient;
export { configClient };
