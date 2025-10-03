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

const HAS_REMOTE_CONFIG = SUPABASE_CONFIG_FROM_ENV && Boolean(SUPABASE_URL) &&
  Boolean(SUPABASE_ANON_KEY);

if (!HAS_REMOTE_CONFIG) {
  console.warn("Configuration warning:", CONFIG_DISABLED_MESSAGE);
}

const DEFAULT_TIMEOUT_MS = 10_000;

async function call<T>(
  action: string,
  payload: Record<string, unknown> = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  if (!HAS_REMOTE_CONFIG) {
    throw new Error(CONFIG_DISABLED_MESSAGE);
  }
  const supabaseKey = SUPABASE_ANON_KEY;
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
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
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
    const effectiveDefault = getFeatureFlagDefault(name, def);
    const data = await call<{ data: boolean }>("getFlag", {
      name,
      def: effectiveDefault,
    });
    return data?.data ?? effectiveDefault;
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
    const effectiveDefault = getFeatureFlagDefault(name, def);
    console.warn(
      `[config] ${CONFIG_DISABLED_MESSAGE} Returning default for "${name}".`,
    );
    return Promise.resolve(effectiveDefault);
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

const configClient = HAS_REMOTE_CONFIG
  ? activeConfigClient
  : disabledConfigClient;

export const { getFlag, setFlag, preview, publish, rollback } = configClient;
export { configClient };
