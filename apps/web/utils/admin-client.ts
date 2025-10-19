import { SUPABASE_CONFIG } from "@/config/supabase";
import { getEnvVar } from "@/utils/env";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseFunctionKey } from "@shared/supabase/functions";

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type SearchParamValue = string | number | boolean | null | undefined;

type JsonLike =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

type RequestBody =
  | JsonLike
  | FormData
  | URLSearchParams
  | Blob
  | ArrayBufferView
  | ArrayBuffer;

type AdminFunctionOptions = {
  method?: string;
  body?: RequestBody;
  headers?: Record<string, string>;
  searchParams?: Record<string, SearchParamValue>;
  signal?: AbortSignal;
  cache?: RequestCache;
};

type AdminFunctionError = { status: number; message: string };

type AdminFunctionResult<T> = {
  data?: T;
  error?: AdminFunctionError;
  status?: number;
};

let cachedInitData: string | null = null;
let cachedAdminToken: string | null = null;

export type AdminClientAuth = {
  initData: string | null;
  adminToken: string | null;
};

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof FormData) &&
    !(value instanceof Blob) &&
    !(value instanceof URLSearchParams) &&
    !(value instanceof ArrayBuffer) &&
    !(ArrayBuffer.isView(value))
  );
}

function shouldAttachBody(method: string): boolean {
  return METHODS_WITH_BODY.has(method.toUpperCase());
}

function appendSearchParams(
  target: URLSearchParams,
  params?: Record<string, SearchParamValue>,
) {
  if (!params) return;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    target.set(key, String(value));
  }
}

function resolveBaseUrl(): string {
  if (typeof window !== "undefined" && window.location) {
    return window.location.origin;
  }
  const siteUrl =
    normalizeString(getEnvVar("SITE_URL", ["NEXT_PUBLIC_SITE_URL"])) ??
      normalizeString(getEnvVar("NEXT_PUBLIC_SITE_URL"));
  return siteUrl ?? "http://localhost:3000";
}

function resolveInitData(): string | null {
  if (cachedInitData) {
    return cachedInitData;
  }
  if (typeof window !== "undefined") {
    const telegramInitData = normalizeString(
      window.Telegram?.WebApp?.initData ?? null,
    );
    if (telegramInitData) {
      cachedInitData = telegramInitData;
      return telegramInitData;
    }
  }
  return null;
}

function resolveAdminToken(): string | null {
  return cachedAdminToken;
}

export function getAdminClientAuth(): AdminClientAuth {
  return {
    initData: resolveInitData(),
    adminToken: resolveAdminToken(),
  };
}

function mergeInitData(body: RequestBody | undefined, initData: string) {
  if (body === undefined || body === null) {
    return { initData } satisfies JsonLike;
  }
  if (
    isPlainObject(body) &&
    body.initData === undefined &&
    (body as { init_data?: unknown }).init_data === undefined
  ) {
    return { ...body, initData } satisfies JsonLike;
  }
  return body;
}

async function ensureAuthHeader(headers: Headers) {
  if (headers.has("Authorization")) {
    return;
  }
  if (typeof window === "undefined") {
    return;
  }
  try {
    const sessionResult = await supabase.auth.getSession();
    const accessToken = sessionResult.data?.session?.access_token;
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  } catch (error) {
    console.warn("[admin-client] Failed to resolve Supabase session", error);
  }
}

function buildEndpoint(
  functionName: SupabaseFunctionKey,
  searchParams?: Record<string, SearchParamValue>,
): URL | null {
  const path = SUPABASE_CONFIG.FUNCTIONS[functionName];
  if (!path) {
    return null;
  }
  const baseUrl = resolveBaseUrl();
  const endpoint = new URL(`/api/functions/${path}`, baseUrl);
  appendSearchParams(endpoint.searchParams, searchParams);
  return endpoint;
}

async function executeAdminRequest<T>(
  functionName: SupabaseFunctionKey,
  options: AdminFunctionOptions,
): Promise<AdminFunctionResult<T>> {
  const method = options.method?.toUpperCase() ?? "GET";
  const headers = new Headers(options.headers);
  const endpoint = buildEndpoint(functionName, options.searchParams);

  if (!endpoint) {
    return {
      error: {
        status: 0,
        message: `Unknown Supabase function: ${String(functionName)}`,
      },
      status: 0,
    };
  }

  const initData = resolveInitData();
  const adminToken = resolveAdminToken();

  if (initData && !headers.has("x-telegram-init-data")) {
    headers.set("x-telegram-init-data", initData);
  }

  if (adminToken && !headers.has("x-admin-token")) {
    headers.set("x-admin-token", adminToken);
  }

  let payload = options.body;
  if (initData && shouldAttachBody(method)) {
    payload = mergeInitData(payload, initData);
  }

  const requestInit: RequestInit = {
    method,
    headers,
    credentials: "include",
    signal: options.signal,
    cache: options.cache,
  };

  if (shouldAttachBody(method) && payload !== undefined) {
    if (
      payload instanceof FormData ||
      payload instanceof URLSearchParams ||
      payload instanceof Blob ||
      payload instanceof ArrayBuffer ||
      ArrayBuffer.isView(payload)
    ) {
      requestInit.body = payload as BodyInit;
    } else {
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      requestInit.body = JSON.stringify(payload as JsonLike);
    }
  }

  await ensureAuthHeader(headers);

  try {
    const response = await fetch(endpoint.toString(), requestInit);
    const status = response.status;
    const contentType = response.headers.get("Content-Type") ?? "";
    const isJson = contentType.includes("application/json");
    const data = isJson
      ? await response.json().catch(() => undefined)
      : undefined;

    if (!response.ok) {
      const message = typeof data?.error === "string"
        ? data.error
        : typeof data?.message === "string"
        ? data.message
        : response.statusText || "Admin request failed";
      return { error: { status, message }, status };
    }

    return { data: data as T, status };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Failed to call admin function";
    return { error: { status: 0, message }, status: 0 };
  }
}

export async function callAdminFunction<T = unknown>(
  functionName: SupabaseFunctionKey,
  options: AdminFunctionOptions = {},
): Promise<AdminFunctionResult<T>> {
  return await executeAdminRequest<T>(functionName, options);
}

export function setAdminClientInitData(value: string | null | undefined) {
  cachedInitData = normalizeString(value);
}

export function setAdminClientToken(value: string | null | undefined) {
  cachedAdminToken = normalizeString(value);
}

export function clearAdminClientAuth() {
  cachedInitData = null;
  cachedAdminToken = null;
}
