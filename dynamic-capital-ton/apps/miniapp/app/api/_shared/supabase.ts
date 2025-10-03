import process from "node:process";

function normalizeEnvString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function pickFirstEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = normalizeEnvString(process.env[key]);
    if (value) {
      return value;
    }
  }
  return undefined;
}

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

export function resolveSupabaseFunctionUrl(): string | undefined {
  const explicitUrl = pickFirstEnv(["SUPABASE_FN_URL"]);
  if (explicitUrl) {
    try {
      return stripTrailingSlash(new URL(explicitUrl).toString());
    } catch {
      return stripTrailingSlash(explicitUrl);
    }
  }

  const projectUrlCandidate = pickFirstEnv([
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
  ]);

  if (!projectUrlCandidate) {
    return undefined;
  }

  try {
    const projectUrl = new URL(projectUrlCandidate);
    return stripTrailingSlash(deriveFunctionsDomain(projectUrl));
  } catch {
    return undefined;
  }
}

export function buildSupabaseFunctionHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const anonKey = pickFirstEnv([
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ]);

  if (anonKey) {
    headers.Authorization = `Bearer ${anonKey}`;
    headers.apikey = anonKey;
  }

  return headers;
}

export function missingSupabaseConfigResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "Supabase Edge Function endpoint is not configured",
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    },
  );
}
