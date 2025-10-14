import { getEnvVar } from "@/utils/env.ts";

export const DEFAULT_SUPABASE_URL = "https://stub.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "stub-anon-key";

export type SupabaseEnvEntry = {
  primary: string;
  aliases: readonly string[];
};

export const SUPABASE_ENV_KEYS = {
  publicUrl: {
    primary: "NEXT_PUBLIC_SUPABASE_URL",
    aliases: ["SUPABASE_URL", "VITE_SUPABASE_URL"] as const,
  },
  serverUrl: {
    primary: "SUPABASE_URL",
    aliases: ["NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL"] as const,
  },
  publicAnonKey: {
    primary: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    aliases: [
      "SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_KEY",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "VITE_SUPABASE_ANON_KEY",
    ] as const,
  },
  serverAnonKey: {
    primary: "SUPABASE_ANON_KEY",
    aliases: [
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "VITE_SUPABASE_ANON_KEY",
    ] as const,
  },
} satisfies Record<string, SupabaseEnvEntry>;

export const SUPABASE_PUBLIC_URL_KEY = SUPABASE_ENV_KEYS.publicUrl.primary;
export const SUPABASE_PUBLIC_URL_ALIASES = SUPABASE_ENV_KEYS.publicUrl.aliases;

export const SUPABASE_SERVER_URL_KEY = SUPABASE_ENV_KEYS.serverUrl.primary;
export const SUPABASE_SERVER_URL_ALIASES = SUPABASE_ENV_KEYS.serverUrl.aliases;

export const SUPABASE_PUBLIC_ANON_KEY = SUPABASE_ENV_KEYS.publicAnonKey.primary;
export const SUPABASE_PUBLIC_ANON_ALIASES =
  SUPABASE_ENV_KEYS.publicAnonKey.aliases;

export const SUPABASE_SERVER_ANON_KEY = SUPABASE_ENV_KEYS.serverAnonKey.primary;
export const SUPABASE_SERVER_ANON_ALIASES =
  SUPABASE_ENV_KEYS.serverAnonKey.aliases;

type ResolvedValue = {
  value: string;
  fromEnv: boolean;
};

function resolveValue(
  entry: SupabaseEnvEntry,
  fallback: string,
): ResolvedValue {
  const resolved = getEnvVar(entry.primary, entry.aliases);
  if (resolved && resolved.length > 0) {
    return { value: resolved, fromEnv: true };
  }

  return { value: fallback, fromEnv: false };
}

export const SUPABASE_URL_RESOLUTION = resolveValue(
  SUPABASE_ENV_KEYS.publicUrl,
  DEFAULT_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY_RESOLUTION = resolveValue(
  SUPABASE_ENV_KEYS.publicAnonKey,
  DEFAULT_SUPABASE_ANON_KEY,
);

export const SUPABASE_URL = SUPABASE_URL_RESOLUTION.value;
export const SUPABASE_ANON_KEY = SUPABASE_ANON_KEY_RESOLUTION.value;

export const SUPABASE_CONFIG_FROM_ENV = SUPABASE_URL_RESOLUTION.fromEnv &&
  SUPABASE_ANON_KEY_RESOLUTION.fromEnv;
