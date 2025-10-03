import process from "node:process";

type EnvValue = string | undefined;

function normalizeEnvString(value: unknown): EnvValue {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function pickFirstEnv(keys: string[]): EnvValue {
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

function computeSupabaseFunctionUrl(): EnvValue {
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

let cachedSupabaseFunctionUrl: EnvValue;
let hasResolvedSupabaseFunctionUrl = false;

export function resolveSupabaseFunctionUrl(): EnvValue {
  if (!hasResolvedSupabaseFunctionUrl) {
    cachedSupabaseFunctionUrl = computeSupabaseFunctionUrl();
    hasResolvedSupabaseFunctionUrl = true;
  }

  return cachedSupabaseFunctionUrl;
}

let cachedSupabaseFunctionHeaders: Readonly<Record<string, string>>;

export function buildSupabaseFunctionHeaders(): Record<string, string> {
  if (!cachedSupabaseFunctionHeaders) {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    const anonKey = pickFirstEnv([
      "SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);

    if (anonKey) {
      headers.Authorization = `Bearer ${anonKey}`;
      headers.apikey = anonKey;
    }

    cachedSupabaseFunctionHeaders = Object.freeze(headers);
  }

  return { ...cachedSupabaseFunctionHeaders };
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

function ensureLeadingSlash(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function methodAllowsBody(method: string): boolean {
  const upper = method.toUpperCase();
  return upper !== "GET" && upper !== "HEAD";
}

const missingConfigLogContexts = new Set<string>();

interface ProxySupabaseOptions {
  readonly request?: Request;
  readonly path: string;
  readonly method: string;
  readonly context: string;
  readonly cache?: RequestCache;
  readonly body?: BodyInit | null;
  readonly headers?: HeadersInit;
}

export async function proxySupabaseEdgeFunction({
  request,
  path,
  method,
  context,
  cache,
  body,
  headers: extraHeaders,
}: ProxySupabaseOptions): Promise<Response> {
  const supabaseFnUrl = resolveSupabaseFunctionUrl();

  if (!supabaseFnUrl) {
    if (!missingConfigLogContexts.has(context)) {
      missingConfigLogContexts.add(context);
      console.error(`[miniapp] Missing Supabase function URL when ${context}`);
    }

    return missingSupabaseConfigResponse();
  }

  const normalizedMethod = method.toUpperCase();
  const headers = new Headers(buildSupabaseFunctionHeaders());

  if (extraHeaders) {
    for (const [key, value] of new Headers(extraHeaders)) {
      headers.set(key, value);
    }
  }

  let requestBody = body ?? undefined;

  if (request && methodAllowsBody(normalizedMethod) && requestBody === undefined) {
    try {
      const rawBody = await request.text();
      requestBody = rawBody.length > 0 ? rawBody : undefined;
    } catch (error) {
      console.error(`[miniapp] Failed to read request body when ${context}`, error);
      return new Response(
        JSON.stringify({ error: "Invalid request payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!headers.has("Content-Type") && requestBody !== undefined) {
      const requestContentType = request.headers.get("Content-Type");
      headers.set("Content-Type", requestContentType ?? "application/json");
    }
  }

  const endpoint = new URL(
    ensureLeadingSlash(path),
    `${supabaseFnUrl}/`,
  ).toString();

  try {
    const response = await fetch(endpoint, {
      method: normalizedMethod,
      headers,
      body: requestBody ?? undefined,
      cache,
      signal: request?.signal,
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error(
      `[miniapp] Failed to reach Supabase function when ${context}`,
      error,
    );

    return new Response(
      JSON.stringify({ error: "Unable to reach Supabase Edge Function" }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
