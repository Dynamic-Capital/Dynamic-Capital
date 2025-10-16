import { getEnvVar } from "@/utils/env.ts";

export const DEFAULT_SUPABASE_URL = "https://stub.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "stub-anon-key";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/u, "");
}

function deriveFunctionsDomain(baseUrl: URL): string {
  const host = baseUrl.hostname;
  if (host.includes(".supabase.")) {
    const functionsHost = host.replace(
      ".supabase.",
      ".functions.supabase.",
    );
    return `${baseUrl.protocol}//${functionsHost}`;
  }

  const portSegment = baseUrl.port ? `:${baseUrl.port}` : "";
  return `${baseUrl.protocol}//${host}${portSegment}/functions/v1`;
}

function deriveDefaultFunctionsUrl(): string {
  try {
    return stripTrailingSlash(
      deriveFunctionsDomain(new URL(DEFAULT_SUPABASE_URL)),
    );
  } catch {
    return "https://stub.functions.supabase.co";
  }
}

export const DEFAULT_SUPABASE_FUNCTIONS_URL = deriveDefaultFunctionsUrl();

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
  publicFunctionsUrl: {
    primary: "NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL",
    aliases: ["SUPABASE_FN_URL", "SUPABASE_FUNCTIONS_URL"] as const,
  },
  serverFunctionsUrl: {
    primary: "SUPABASE_FN_URL",
    aliases: [
      "NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL",
      "SUPABASE_FUNCTIONS_URL",
    ] as const,
  },
} satisfies Record<string, SupabaseEnvEntry>;

export type SupabaseEnvKey = keyof typeof SUPABASE_ENV_KEYS;

export function readSupabaseEnv(key: SupabaseEnvKey): string | undefined {
  const entry = SUPABASE_ENV_KEYS[key];
  return getEnvVar(entry.primary, entry.aliases);
}

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

export const SUPABASE_PUBLIC_FUNCTIONS_URL_KEY =
  SUPABASE_ENV_KEYS.publicFunctionsUrl.primary;
export const SUPABASE_PUBLIC_FUNCTIONS_URL_ALIASES =
  SUPABASE_ENV_KEYS.publicFunctionsUrl.aliases;

export const SUPABASE_SERVER_FUNCTIONS_URL_KEY =
  SUPABASE_ENV_KEYS.serverFunctionsUrl.primary;
export const SUPABASE_SERVER_FUNCTIONS_URL_ALIASES =
  SUPABASE_ENV_KEYS.serverFunctionsUrl.aliases;

type ResolvedValue = {
  value: string;
  fromEnv: boolean;
};

function resolveValue(
  key: SupabaseEnvKey,
  fallback: string,
): ResolvedValue {
  const resolved = readSupabaseEnv(key);
  if (resolved && resolved.length > 0) {
    return { value: resolved, fromEnv: true };
  }

  return { value: fallback, fromEnv: false };
}

export const SUPABASE_URL_RESOLUTION = resolveValue(
  "publicUrl",
  DEFAULT_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY_RESOLUTION = resolveValue(
  "publicAnonKey",
  DEFAULT_SUPABASE_ANON_KEY,
);

export const SUPABASE_URL = SUPABASE_URL_RESOLUTION.value;
export const SUPABASE_ANON_KEY = SUPABASE_ANON_KEY_RESOLUTION.value;

function resolveFunctionsUrl(): ResolvedValue {
  const explicit =
    readSupabaseEnv("publicFunctionsUrl") ??
    readSupabaseEnv("serverFunctionsUrl");

  if (explicit && explicit.length > 0) {
    try {
      return {
        value: stripTrailingSlash(new URL(explicit).toString()),
        fromEnv: true,
      };
    } catch {
      return { value: stripTrailingSlash(explicit), fromEnv: true };
    }
  }

  try {
    const derived = stripTrailingSlash(
      deriveFunctionsDomain(new URL(SUPABASE_URL)),
    );
    return { value: derived, fromEnv: SUPABASE_URL_RESOLUTION.fromEnv };
  } catch {
    return { value: DEFAULT_SUPABASE_FUNCTIONS_URL, fromEnv: false };
  }
}

export const SUPABASE_FUNCTIONS_URL_RESOLUTION = resolveFunctionsUrl();
export const SUPABASE_FUNCTIONS_URL =
  SUPABASE_FUNCTIONS_URL_RESOLUTION.value;

export const SUPABASE_CONFIG_FROM_ENV = SUPABASE_URL_RESOLUTION.fromEnv &&
  SUPABASE_ANON_KEY_RESOLUTION.fromEnv;
