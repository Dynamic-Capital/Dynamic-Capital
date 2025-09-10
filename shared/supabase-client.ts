import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase.ts";

// Deno runtime doesn't provide Node's `process` global; declare a minimal shape
// so type checking passes in both environments.
declare const process: { env: Record<string, string | undefined> } | undefined;

function getEnvVar(name: string, aliases: string[] = []): string | undefined {
  const prefixes = ["", "NEXT_PUBLIC_"];
  const names = [name, ...aliases];
  if (typeof process !== 'undefined' && process.env) {
    for (const n of names) {
      for (const p of prefixes) {
        const v = process.env[`${p}${n}`];
        if (v) return v;
      }
    }
  }
  return undefined;
}

const PLACEHOLDER_URL = "https://example.supabase.co";
const PLACEHOLDER_ANON_KEY = "anon-key-placeholder";

const SUPABASE_URL = getEnvVar("SUPABASE_URL") ?? PLACEHOLDER_URL;
const SUPABASE_ANON_KEY =
  getEnvVar("SUPABASE_ANON_KEY", ["SUPABASE_KEY"]) ?? PLACEHOLDER_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = getEnvVar("SUPABASE_SERVICE_ROLE_KEY") ?? "";
let SUPABASE_ENV_ERROR = "";

if (
  SUPABASE_URL === PLACEHOLDER_URL ||
  SUPABASE_ANON_KEY === PLACEHOLDER_ANON_KEY
) {
  SUPABASE_ENV_ERROR = "Missing required Supabase env vars";
  console.warn("Configuration warning:", SUPABASE_ENV_ERROR);
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
  if (SUPABASE_ENV_ERROR) {
    throw new Error(SUPABASE_ENV_ERROR);
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
