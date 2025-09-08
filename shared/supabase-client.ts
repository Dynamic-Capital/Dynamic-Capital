import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase.ts";

// Deno runtime doesn't provide Node's `process` global; declare a minimal shape
// so type checking passes in both environments.
declare const process: { env: Record<string, string | undefined> } | undefined;

function getEnvVar(name: string): string | undefined {
  const prefixes = ["", "NEXT_PUBLIC_", "VITE_", "REACT_APP_"];
  if (typeof Deno !== "undefined" && typeof Deno.env?.get === "function") {
    for (const p of prefixes) {
      const v = Deno.env.get(`${p}${name}`);
      if (v) return v;
    }
  }
  if (typeof process !== "undefined" && typeof process.env !== "undefined") {
    for (const p of prefixes) {
      const v = process.env[`${p}${name}`];
      if (v) return v;
    }
  }
  if (typeof import.meta !== "undefined" && (import.meta as any).env) {
    const env = (import.meta as any).env as Record<string, string | undefined>;
    for (const p of prefixes) {
      const v = env[`${p}${name}`];
      if (v) return v;
    }
  }
  return undefined;
}

function requireEnvVar(name: string): string {
  const v = getEnvVar(name);
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

let SUPABASE_URL = "";
let SUPABASE_ANON_KEY = "";
let SUPABASE_SERVICE_ROLE_KEY = "";
let SUPABASE_ENV_ERROR = "";

try {
  SUPABASE_URL = requireEnvVar("SUPABASE_URL");
  SUPABASE_ANON_KEY = requireEnvVar("SUPABASE_ANON_KEY");
  SUPABASE_SERVICE_ROLE_KEY = getEnvVar("SUPABASE_SERVICE_ROLE_KEY") ?? "";
} catch (e) {
  SUPABASE_ENV_ERROR = (e as Error).message;
  console.error("Configuration error:", SUPABASE_ENV_ERROR);
}

const queryCounts: Record<string, number> = {};

const loggingFetch: typeof fetch = async (input, init) => {
  const start = Date.now();
  const res = await fetch(input as RequestInfo, init);
  const end = Date.now();
  try {
    let url: string;
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof Request) {
      url = input.url;
    } else {
      url = input.toString();
    }
    const path = new URL(url).pathname;
    queryCounts[path] = (queryCounts[path] || 0) + 1;
    console.log(`[Supabase] ${path} - ${res.status} - ${end - start}ms`);
  } catch {
    // ignore logging errors
  }
  return res;
};

export function getQueryCounts() {
  return { ...queryCounts };
}

export function createClient(key: "anon" | "service" = "anon"): any {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase configuration");
  }
  const k = key === "service" && SUPABASE_SERVICE_ROLE_KEY
    ? SUPABASE_SERVICE_ROLE_KEY
    : SUPABASE_ANON_KEY;
  const isBrowser = typeof window !== "undefined";
  const storage = isBrowser
    ? window.localStorage
    : {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };

  return createSupabaseClient(SUPABASE_URL, k, {
    auth: {
      storage,
      persistSession: isBrowser,
      autoRefreshToken: true,
    },
    global: { fetch: loggingFetch },
  });
}

export { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ENV_ERROR };
export type SupabaseClient = any;
