import process from "node:process";

import { SUPABASE_CONFIG } from "@/config/supabase";

type EnvValue = string | undefined;

export type SupabaseFunctionKey = keyof typeof SUPABASE_CONFIG.FUNCTIONS;

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

let cachedSupabaseFunctionHeaders:
  | Readonly<Record<string, string>>
  | undefined;

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

function isReadableStream(
  value: unknown,
): value is ReadableStream<Uint8Array> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ReadableStream<Uint8Array>).getReader === "function"
  );
}

function isInvalidSupabasePath(path: string): boolean {
  return path.length === 0 || path.includes("..") || path.includes("://");
}

const missingConfigLogContexts = new Set<string>();

export function resetSupabaseFunctionCacheForTesting(): void {
  cachedSupabaseFunctionUrl = undefined;
  hasResolvedSupabaseFunctionUrl = false;
  cachedSupabaseFunctionHeaders = undefined;
  missingConfigLogContexts.clear();
}

interface ProxySupabaseOptions {
  readonly request?: Request;
  readonly path: string;
  readonly method: string;
  readonly context: string;
  readonly cache?: RequestCache;
  readonly body?: BodyInit | null;
  readonly headers?: HeadersInit;
}

export interface ProxySupabaseFunctionOptions
  extends Omit<ProxySupabaseOptions, "path" | "context"> {
  readonly functionKey: SupabaseFunctionKey;
  readonly context?: string;
}

interface BodyResolutionSuccess {
  readonly ok: true;
  readonly body: BodyInit | null | undefined;
  readonly contentType?: string;
  readonly requiresDuplex: boolean;
}

interface BodyResolutionFailure {
  readonly ok: false;
  readonly response: Response;
}

type BodyResolutionResult = BodyResolutionSuccess | BodyResolutionFailure;

function invalidProxyPathResponse(context: string): Response {
  console.error(
    `[web] Refusing to proxy invalid Supabase path when ${context}`,
  );
  return new Response(
    JSON.stringify({ error: "Invalid Supabase function path" }),
    { status: 400, headers: { "Content-Type": "application/json" } },
  );
}

function bodyAlreadyConsumedResponse(context: string): Response {
  console.error(`[web] Request body already consumed when ${context}`);
  return new Response(
    JSON.stringify({ error: "Request payload was already consumed" }),
    { status: 400, headers: { "Content-Type": "application/json" } },
  );
}

async function resolveProxyBody(
  options: ProxySupabaseOptions,
  normalizedMethod: string,
): Promise<BodyResolutionResult> {
  const { body, request, context } = options;

  if (!methodAllowsBody(normalizedMethod)) {
    return { ok: true, body: undefined, requiresDuplex: false };
  }

  if (body !== undefined) {
    return {
      ok: true,
      body,
      requiresDuplex: isReadableStream(body),
    };
  }

  if (!request) {
    return { ok: true, body: undefined, requiresDuplex: false };
  }

  if (request.bodyUsed) {
    return { ok: false, response: bodyAlreadyConsumedResponse(context) };
  }

  const requestContentType = request.headers.get("Content-Type") ?? undefined;
  const streamBody = request.body;

  if (isReadableStream(streamBody)) {
    return {
      ok: true,
      body: streamBody,
      contentType: requestContentType,
      requiresDuplex: true,
    };
  }

  try {
    const clone = request.clone();
    const arrayBuffer = await clone.arrayBuffer();

    if (arrayBuffer.byteLength === 0) {
      return { ok: true, body: null, requiresDuplex: false };
    }

    const fallbackContentType = requestContentType ?? "application/json";

    return {
      ok: true,
      body: arrayBuffer,
      contentType: fallbackContentType,
      requiresDuplex: false,
    };
  } catch (error) {
    console.error(`[web] Failed to read request body when ${context}`, error);
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Invalid request payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    };
  }
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
      console.error(`[web] Missing Supabase function URL when ${context}`);
    }

    return missingSupabaseConfigResponse();
  }

  if (isInvalidSupabasePath(path)) {
    return invalidProxyPathResponse(context);
  }

  const normalizedMethod = method.toUpperCase();
  const headers = new Headers(buildSupabaseFunctionHeaders());

  if (extraHeaders) {
    for (const [key, value] of new Headers(extraHeaders)) {
      headers.set(key, value);
    }
  }

  const bodyResolution = await resolveProxyBody(
    { request, path, method, context, cache, body, headers: extraHeaders },
    normalizedMethod,
  );

  if (bodyResolution.ok === false) {
    return bodyResolution.response;
  }

  const { body: resolvedBody, contentType, requiresDuplex } = bodyResolution;
  const requestBody = resolvedBody ?? undefined;

  if (
    !headers.has("Content-Type") &&
    contentType &&
    requestBody !== undefined &&
    requestBody !== null
  ) {
    headers.set("Content-Type", contentType);
  }

  const endpoint = new URL(
    ensureLeadingSlash(path),
    `${supabaseFnUrl}/`,
  ).toString();

  const fetchOptions:
    & RequestInit
    & { cache?: RequestCache; duplex?: "half" } = {
      method: normalizedMethod,
      headers,
      body: requestBody ?? null,
      cache,
    };

  if (requiresDuplex) {
    fetchOptions.duplex = "half";
  }

  try {
    const response = await fetch(endpoint, fetchOptions);

    if (!response.ok && response.status >= 500) {
      console.error(
        `[web] Supabase function ${path} returned ${response.status} during ${context}`,
      );
    }

    return response;
  } catch (error) {
    console.error(
      `[web] Failed to call Supabase function when ${context}`,
      error,
    );
    return new Response(
      JSON.stringify({ error: "Supabase Edge Function request failed" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}

export function proxySupabaseFunction({
  functionKey,
  context,
  ...options
}: ProxySupabaseFunctionOptions): Promise<Response> {
  const path = SUPABASE_CONFIG.FUNCTIONS[functionKey];
  const normalizedContext = context ??
    `${options.method.toUpperCase()} /supabase/functions/${path}`;

  return proxySupabaseEdgeFunction({
    ...options,
    path,
    context: normalizedContext,
  });
}
