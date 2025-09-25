// Supabase client and helpers
import {
  createClient as createBrowserClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";
import { getEnvVar } from "@/utils/env.ts";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_CONFIG_FROM_ENV,
  SUPABASE_URL,
} from "@/config/supabase-runtime";

export const SUPABASE_ENV_ERROR = "";

if (!SUPABASE_CONFIG_FROM_ENV) {
  console.info(
    "[Supabase] Using baked-in project credentials because env vars are not set.",
  );
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

export type SupabaseCreateOptions = SupabaseClientOptions<"public">;

export function createClient(
  role: "anon" | "service" = "anon",
  options: SupabaseCreateOptions = {},
) {
  const key = role === "service"
    ? getEnvVar("SUPABASE_SERVICE_ROLE_KEY", ["SUPABASE_SERVICE_ROLE"])
    : SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      role === "service"
        ? "Missing Supabase service role key"
        : SUPABASE_ENV_ERROR || "Missing Supabase anon key",
    );
  }
  const mergedGlobal = {
    fetch: loggingFetch,
    ...(options.global ?? {}),
  };

  return createBrowserClient(SUPABASE_URL, key, {
    ...options,
    global: mergedGlobal,
  });
}

export type SupabaseClient = ReturnType<typeof createClient>;

export const supabase: SupabaseClient = typeof window !== "undefined"
  ? createClient()
  : ({} as SupabaseClient);

export function getQueryCounts() {
  return { ...queryCounts };
}

export { SUPABASE_ANON_KEY, SUPABASE_URL };
