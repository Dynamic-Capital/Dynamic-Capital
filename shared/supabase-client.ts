import { createClient as createSupabaseClient, type SupabaseClient as SBClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase.ts";

function getEnvVar(name: string): string | undefined {
  if (typeof Deno !== "undefined" && typeof Deno.env?.get === "function") {
    const v = Deno.env.get(name);
    if (v) return v;
  }
  if (typeof process !== "undefined" && typeof process.env !== "undefined") {
    if (process.env[name]) return process.env[name];
    const nextKey = `NEXT_PUBLIC_${name}`;
    if (process.env[nextKey]) return process.env[nextKey];
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
  console.warn("Configuration error:", SUPABASE_ENV_ERROR);
}

const queryCounts: Record<string, number> = {};

const loggingFetch: typeof fetch = async (input, init) => {
  const start = Date.now();
  const res = await fetch(input as RequestInfo, init);
  const end = Date.now();
  try {
    const url = typeof input === "string" ? input : input.url;
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

export function createClient(key: "anon" | "service" = "anon"): SBClient<Database> {
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

  return createSupabaseClient<Database>(SUPABASE_URL, k, {
    auth: {
      storage,
      persistSession: isBrowser,
      autoRefreshToken: true,
    },
    global: { fetch: loggingFetch },
  });
}

export { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ENV_ERROR };
export type SupabaseClient = SBClient<Database>;
