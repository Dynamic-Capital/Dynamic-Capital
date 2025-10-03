import {
  createClient as createSupabaseClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "https://esm.sh/@supabase/supabase-js@2?dts";

declare const process:
  | { env: Record<string, string | undefined> }
  | undefined;
declare const Deno:
  | { env: { get(key: string): string | undefined } }
  | undefined;

type ResolvedValue = {
  value: string;
  fromEnv: boolean;
};

function sanitize(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (
    trimmed === "" ||
    trimmed.toLowerCase() === "undefined" ||
    trimmed.toLowerCase() === "null"
  ) {
    return undefined;
  }
  return trimmed;
}

function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process?.env) {
    const val = sanitize(process.env[key]);
    if (val !== undefined) return val;
  }
  if (typeof Deno !== "undefined" && typeof Deno.env?.get === "function") {
    try {
      const val = sanitize(Deno.env.get(key) ?? undefined);
      if (val !== undefined) return val;
    } catch {
      // Ignore permission errors in local dev or tests.
    }
  }
  return undefined;
}

function getEnvVar(name: string, aliases: string[] = []): string | undefined {
  for (const key of [name, ...aliases]) {
    const val = readEnv(key);
    if (val !== undefined) return val;
  }
  return undefined;
}

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

const DEFAULT_SUPABASE_URL = "https://stub.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "stub-anon-key";

const SUPABASE_URL_RESOLUTION = resolveValue(
  "SUPABASE_URL",
  ["NEXT_PUBLIC_SUPABASE_URL"],
  DEFAULT_SUPABASE_URL,
);

const SUPABASE_ANON_KEY_RESOLUTION = resolveValue(
  "SUPABASE_ANON_KEY",
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  DEFAULT_SUPABASE_ANON_KEY,
);

const SUPABASE_URL = SUPABASE_URL_RESOLUTION.value;
const SUPABASE_ANON_KEY = SUPABASE_ANON_KEY_RESOLUTION.value;
const SUPABASE_SERVICE_ROLE_KEY = getEnvVar("SUPABASE_SERVICE_ROLE_KEY", [
  "SUPABASE_SERVICE_ROLE",
]);

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

export type { SupabaseClient, SupabaseClientOptions };

export interface RequestClientOptions extends SupabaseClientOptions<"public"> {
  role?: "anon" | "service";
  requireAuthorization?: boolean;
}

export function createClient(
  role: "anon" | "service" = "anon",
  options?: SupabaseClientOptions<"public">,
): SupabaseClient {
  const key = role === "service"
    ? SUPABASE_SERVICE_ROLE_KEY
    : SUPABASE_ANON_KEY;

  if (!SUPABASE_URL) {
    throw new Error("Missing Supabase URL");
  }

  if (!key) {
    throw new Error(
      role === "service"
        ? "Missing Supabase service role key"
        : "Missing Supabase anon key",
    );
  }

  if (!options) {
    if (role === "anon") {
      if (!anonClient) {
        anonClient = createSupabaseClient(SUPABASE_URL, key);
      }
      return anonClient;
    }
    if (!serviceClient) {
      serviceClient = createSupabaseClient(SUPABASE_URL, key);
    }
    return serviceClient;
  }

  return createSupabaseClient(SUPABASE_URL, key, options);
}

export function createClientForRequest(
  req: Pick<Request, "headers">,
  options?: RequestClientOptions,
): SupabaseClient {
  const {
    role = "anon",
    requireAuthorization = false,
    ...clientOptions
  } = options ?? {};

  const { global, ...restOptions } = clientOptions;
  const authHeader = req.headers.get("Authorization")?.trim();

  if (requireAuthorization && (!authHeader || authHeader.length === 0)) {
    throw new Error("Missing Authorization header for createClientForRequest");
  }

  const mergedHeaders: Record<string, string> = {
    ...(global?.headers ?? {}),
    ...(authHeader ? { Authorization: authHeader } : {}),
  };

  const hasMergedHeaders = Object.keys(mergedHeaders).length > 0;
  const hasRestOptions = Object.keys(restOptions ?? {}).length > 0;
  const shouldAttachGlobal = global !== undefined || hasMergedHeaders;

  if (!hasRestOptions && !shouldAttachGlobal) {
    return createClient(role);
  }

  const finalOptions: SupabaseClientOptions<"public"> = {
    ...(hasRestOptions ? { ...restOptions } : {}),
    ...(shouldAttachGlobal
      ? {
        global: {
          ...global,
          ...(hasMergedHeaders ? { headers: mergedHeaders } : {}),
        },
      }
      : {}),
  };

  return createClient(role, finalOptions);
}

export function getServiceClient(): SupabaseClient {
  return createClient("service");
}

export function getAnonClient(): SupabaseClient {
  return createClient("anon");
}

export { createSupabaseClient };
