import process from "node:process";

import type { SupabaseFunctionKey } from "./functions";

type EnvValue = string | undefined;

type ReadonlyHeaders = Readonly<Record<string, string>>;

type MaybeBody = BodyInit | null | undefined;

function normalizeEnvString(value: unknown): EnvValue {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function pickFirstEnv(keys: readonly string[]): EnvValue {
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

interface BodyResolutionSuccess {
  readonly ok: true;
  readonly body: MaybeBody;
  readonly contentType?: string;
  readonly requiresDuplex: boolean;
}

interface BodyResolutionFailure {
  readonly ok: false;
  readonly response: Response;
}

type BodyResolutionResult = BodyResolutionSuccess | BodyResolutionFailure;

type SearchParamValue = string | number | boolean | null | undefined;

function appendSearchParams(
  target: URLSearchParams,
  params?: Record<string, SearchParamValue>,
) {
  if (!params) return;

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    target.set(key, String(value));
  }
}

export interface ProxySupabaseOptions {
  readonly request?: Request;
  readonly path: string;
  readonly method: string;
  readonly context: string;
  readonly cache?: RequestCache;
  readonly body?: BodyInit | null;
  readonly headers?: HeadersInit;
  readonly searchParams?: Record<string, SearchParamValue>;
}

export interface ProxySupabaseFunctionOptions
  extends Omit<ProxySupabaseOptions, "path" | "context"> {
  readonly functionKey: SupabaseFunctionKey;
  readonly context?: string;
}

export interface SupabaseProxyEnvironment {
  readonly resolveSupabaseFunctionUrl: () => EnvValue;
  readonly buildSupabaseFunctionHeaders: () => Record<string, string>;
  readonly missingSupabaseConfigResponse: () => Response;
  readonly resetSupabaseFunctionCacheForTesting: () => void;
  readonly proxySupabaseEdgeFunction: (
    options: ProxySupabaseOptions,
  ) => Promise<Response>;
  readonly proxySupabaseFunction: (
    options: ProxySupabaseFunctionOptions,
  ) => Promise<Response>;
}

export interface CreateSupabaseProxyEnvironmentOptions {
  readonly logPrefix: string;
  readonly resolveFunctionPath: (key: SupabaseFunctionKey) => string;
  readonly missingConfigMessage?: string;
}

export function createSupabaseProxyEnvironment({
  logPrefix,
  resolveFunctionPath,
  missingConfigMessage = "Supabase Edge Function endpoint is not configured",
}: CreateSupabaseProxyEnvironmentOptions): SupabaseProxyEnvironment {
  let cachedSupabaseFunctionUrl: EnvValue;
  let hasResolvedSupabaseFunctionUrl = false;
  let cachedSupabaseFunctionHeaders: ReadonlyHeaders | undefined;
  const missingConfigLogContexts = new Set<string>();

  const logTag = `[${logPrefix}]`;

  function resolveSupabaseFunctionUrl(): EnvValue {
    if (!hasResolvedSupabaseFunctionUrl) {
      cachedSupabaseFunctionUrl = computeSupabaseFunctionUrl();
      hasResolvedSupabaseFunctionUrl = true;
    }

    return cachedSupabaseFunctionUrl;
  }

  function buildSupabaseFunctionHeaders(): Record<string, string> {
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

  function missingSupabaseConfigResponse(): Response {
    return new Response(
      JSON.stringify({
        error: missingConfigMessage,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  function resetSupabaseFunctionCacheForTesting(): void {
    cachedSupabaseFunctionUrl = undefined;
    hasResolvedSupabaseFunctionUrl = false;
    cachedSupabaseFunctionHeaders = undefined;
    missingConfigLogContexts.clear();
  }

  function invalidProxyPathResponse(context: string): Response {
    console.error(
      `${logTag} Refusing to proxy invalid Supabase path when ${context}`,
    );
    return new Response(
      JSON.stringify({ error: "Invalid Supabase function path" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  function bodyAlreadyConsumedResponse(context: string): Response {
    console.error(`${logTag} Request body already consumed when ${context}`);
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
      console.error(
        `${logTag} Failed to read request body when ${context}`,
        error,
      );
      return {
        ok: false,
        response: new Response(
          JSON.stringify({ error: "Invalid request payload" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      };
    }
  }

  async function proxySupabaseEdgeFunction({
    request,
    path,
    method,
    context,
    cache,
    body,
    headers: extraHeaders,
    searchParams,
  }: ProxySupabaseOptions): Promise<Response> {
    const supabaseFnUrl = resolveSupabaseFunctionUrl();

    if (!supabaseFnUrl) {
      if (!missingConfigLogContexts.has(context)) {
        missingConfigLogContexts.add(context);
        console.error(`${logTag} Missing Supabase function URL when ${context}`);
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

    const endpointUrl = new URL(
      ensureLeadingSlash(path),
      `${supabaseFnUrl}/`,
    );

    if (request) {
      try {
        const requestUrl = new URL(request.url);
        for (const [key, value] of requestUrl.searchParams.entries()) {
          endpointUrl.searchParams.set(key, value);
        }
      } catch (error) {
        console.error(
          `${logTag} Failed to read request URL when ${context}`,
          error,
        );
      }
    }

    appendSearchParams(endpointUrl.searchParams, searchParams);

    const endpoint = endpointUrl.toString();

    const fetchOptions:
      & RequestInit
      & { cache?: RequestCache; duplex?: "half" } = {
        method: normalizedMethod,
        headers,
        body: requestBody ?? null,
        cache,
        signal: request?.signal,
      };

    if (requiresDuplex) {
      fetchOptions.duplex = "half";
    }

    try {
      const response = await fetch(endpoint, fetchOptions);

      if (!response.ok && response.status >= 500) {
        console.error(
          `${logTag} Supabase function ${path} returned ${response.status} during ${context}`,
        );
      }

      return response;
    } catch (error) {
      console.error(
        `${logTag} Failed to call Supabase function when ${context}`,
        error,
      );
      return new Response(
        JSON.stringify({ error: "Supabase Edge Function request failed" }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  function proxySupabaseFunction({
    functionKey,
    context,
    ...options
  }: ProxySupabaseFunctionOptions): Promise<Response> {
    const path = resolveFunctionPath(functionKey);
    const normalizedContext =
      context ?? `${options.method.toUpperCase()} /supabase/functions/${path}`;

    return proxySupabaseEdgeFunction({
      ...options,
      path,
      context: normalizedContext,
    });
  }

  return {
    resolveSupabaseFunctionUrl,
    buildSupabaseFunctionHeaders,
    missingSupabaseConfigResponse,
    resetSupabaseFunctionCacheForTesting,
    proxySupabaseEdgeFunction,
    proxySupabaseFunction,
  };
}
