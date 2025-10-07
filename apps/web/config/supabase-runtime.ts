import { getEnvVar } from "@/utils/env.ts";

export const DEFAULT_SUPABASE_URL = "https://stub.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "stub-anon-key";

type ResolvedValue = {
  value: string;
  fromEnv: boolean;
};

function resolveValue(
  primary: string,
  aliases: string[],
  fallback: string,
): ResolvedValue {
  const resolved = getEnvVar(primary, aliases);
  if (resolved && resolved.length > 0) {
    return { value: resolved, fromEnv: true };
  }

  return { value: fallback, fromEnv: false };
}

export const SUPABASE_URL_RESOLUTION = resolveValue(
  "NEXT_PUBLIC_SUPABASE_URL",
  ["SUPABASE_URL", "VITE_SUPABASE_URL"],
  DEFAULT_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY_RESOLUTION = resolveValue(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  [
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_ANON_KEY",
  ],
  DEFAULT_SUPABASE_ANON_KEY,
);

export const SUPABASE_URL = SUPABASE_URL_RESOLUTION.value;
export const SUPABASE_ANON_KEY = SUPABASE_ANON_KEY_RESOLUTION.value;

export const SUPABASE_CONFIG_FROM_ENV = SUPABASE_URL_RESOLUTION.fromEnv &&
  SUPABASE_ANON_KEY_RESOLUTION.fromEnv;
