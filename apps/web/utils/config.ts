// Utilities for accessing feature flag configuration via secure edge function

import { getEnvVar } from "./env.ts";
import { withRetry } from "./retry.ts";

type FlagSnapshot = { ts: number; data: Record<string, boolean> };

const PLACEHOLDER_URL = "https://stub.supabase.co";
const PLACEHOLDER_KEY = "stub-anon-key";

const SUPABASE_URL =
  getEnvVar("SUPABASE_URL", ["NEXT_PUBLIC_SUPABASE_URL"]) ?? PLACEHOLDER_URL;
const SUPABASE_KEY =
  getEnvVar("SUPABASE_ANON_KEY", [
    "SUPABASE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ]) ?? PLACEHOLDER_KEY;

const SUPABASE_CONFIG_MISSING =
  !SUPABASE_URL ||
  SUPABASE_URL === PLACEHOLDER_URL ||
  !SUPABASE_KEY ||
  SUPABASE_KEY === PLACEHOLDER_KEY;

const CONFIG_DISABLED_MESSAGE =
  "Supabase configuration is missing; remote config client is disabled.";

if (SUPABASE_CONFIG_MISSING) {
  console.warn("Configuration warning:", CONFIG_DISABLED_MESSAGE);
}

const DEFAULT_TIMEOUT_MS = 10_000;

async function call<T>(
  action: string,
  payload: Record<string, unknown> = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  if (SUPABASE_CONFIG_MISSING) {
    throw new Error(CONFIG_DISABLED_MESSAGE);
  }
  try {
    const res = await withRetry(
      async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          return await fetch(`${SUPABASE_URL}/functions/v1/config`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
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
    const data = await call<{ data: boolean }>("getFlag", { name, def });
    return data?.data ?? def;
  },

  async setFlag(name: string, value: boolean): Promise<void> {
    await call("setFlag", { name, value });
  },

  async preview(): Promise<FlagSnapshot> {
    return await call<FlagSnapshot>("preview");
  },

  async publish(adminId?: string): Promise<void> {
    await call("publish", { adminId });
  },

  async rollback(adminId?: string): Promise<void> {
    await call("rollback", { adminId });
  },
};

const disabledConfigClient = {
  getFlag(name: string, def = false): Promise<boolean> {
    console.warn(
      `[config] ${CONFIG_DISABLED_MESSAGE} Returning default for "${name}".`,
    );
    return Promise.resolve(def);
  },

  setFlag(_name: string, _value: boolean): Promise<void> {
    return Promise.reject(new Error(CONFIG_DISABLED_MESSAGE));
  },

  preview(): Promise<FlagSnapshot> {
    return Promise.reject(new Error(CONFIG_DISABLED_MESSAGE));
  },

  publish(_adminId?: string): Promise<void> {
    return Promise.reject(new Error(CONFIG_DISABLED_MESSAGE));
  },

  rollback(_adminId?: string): Promise<void> {
    return Promise.reject(new Error(CONFIG_DISABLED_MESSAGE));
  },
};

const configClient = SUPABASE_CONFIG_MISSING
  ? disabledConfigClient
  : activeConfigClient;

export const { getFlag, setFlag, preview, publish, rollback } = configClient;
export { configClient };
