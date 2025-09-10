// Utilities for accessing feature flag configuration via secure edge function

import { requireEnvVar } from "./env.ts";
import { withRetry } from "./retry.ts";

type FlagSnapshot = { ts: number; data: Record<string, boolean> };

const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
const SUPABASE_KEY = requireEnvVar("SUPABASE_ANON_KEY", ["SUPABASE_KEY"]);

const DEFAULT_TIMEOUT_MS = 10_000;

async function call<T>(
  action: string,
  payload: Record<string, unknown> = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
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

const configClient = {
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

export const { getFlag, setFlag, preview, publish, rollback } = configClient;
export { configClient };
