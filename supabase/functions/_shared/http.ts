// Access Node's process via globalThis to avoid TypeScript errors when `process`
// is not defined (e.g. in Deno environments)
type NodeProcessLike = {
  env?: Record<string, string | undefined>;
};

type DenoEnvNamespace = {
  env?: {
    get?: (key: string) => string | undefined;
  };
};

type GlobalWithRuntimes = typeof globalThis & {
  process?: NodeProcessLike;
  Deno?: DenoEnvNamespace;
};

const runtimeGlobal = globalThis as GlobalWithRuntimes;
const nodeProcess = runtimeGlobal.process;

const getEnv = (key: string): string | undefined => {
  if ("Deno" in globalThis) {
    const denoEnv = runtimeGlobal.Deno?.env;
    const value = denoEnv?.get?.(key);
    if (value !== undefined) {
      return value;
    }
  }

  return nodeProcess?.env?.[key];
};

const rawAllowedOrigins = getEnv("ALLOWED_ORIGINS");

const LOCALHOST_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

const coerceOrigin = (raw?: string | null): string | undefined => {
  if (!raw) return undefined;
  const trimmed = `${raw}`.trim();
  if (!trimmed) return undefined;
  try {
    const hasScheme = trimmed.includes("://");
    const candidate = hasScheme ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (!hasScheme) {
      const hostname = parsed.hostname.toLowerCase();
      if (
        LOCALHOST_HOSTNAMES.has(hostname) ||
        hostname.endsWith(".localhost")
      ) {
        parsed.protocol = "http:";
      }
    }
    return parsed.origin;
  } catch {
    return undefined;
  }
};

const splitVaryValues = (input: string | null | undefined): string[] => {
  if (typeof input !== "string") return [];
  return input.split(",").map((item) => item.trim()).filter(Boolean);
};

const appendUniqueCaseInsensitive = (
  target: string[],
  values: string[],
) => {
  const seen = new Set(target.map((item) => item.toLowerCase()));
  for (const candidate of values) {
    const normalized = candidate.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    target.push(candidate);
  }
};

const mergeVary = (existing: string | null | undefined, value: string) => {
  const merged: string[] = [];
  appendUniqueCaseInsensitive(merged, splitVaryValues(existing));
  appendUniqueCaseInsensitive(merged, splitVaryValues(value));
  return merged.join(", ");
};

const mergeHeaders = (target: Headers, source?: HeadersInit) => {
  if (!source) return;
  const normalized = source instanceof Headers ? source : new Headers(source);
  normalized.forEach((value, key) => {
    if (key.toLowerCase() === "vary") {
      target.set("vary", mergeVary(target.get("vary"), value));
    } else {
      target.set(key, value);
    }
  });
};

const vercelUrl = getEnv("VERCEL_URL");

const inferredOriginSources: Array<[string, string | undefined]> = [
  ["SITE_URL", getEnv("SITE_URL")],
  ["NEXT_PUBLIC_SITE_URL", getEnv("NEXT_PUBLIC_SITE_URL")],
  ["URL", getEnv("URL")],
  ["APP_URL", getEnv("APP_URL")],
  ["PUBLIC_URL", getEnv("PUBLIC_URL")],
  ["DEPLOY_URL", getEnv("DEPLOY_URL")],
  ["DEPLOYMENT_URL", getEnv("DEPLOYMENT_URL")],
  ["DIGITALOCEAN_APP_URL", getEnv("DIGITALOCEAN_APP_URL")],
  ["DIGITALOCEAN_APP_SITE_DOMAIN", getEnv("DIGITALOCEAN_APP_SITE_DOMAIN")],
  ["VERCEL_URL", vercelUrl ? `https://${vercelUrl}` : undefined],
];

const inferredOrigins: string[] = [];
const seenOrigins = new Set<string>();

for (const [, value] of inferredOriginSources) {
  const origin = coerceOrigin(value);
  if (origin && !seenOrigins.has(origin)) {
    seenOrigins.add(origin);
    inferredOrigins.push(origin);
  }
}

let defaultOrigin = inferredOrigins[0];
if (!defaultOrigin) {
  defaultOrigin = "http://localhost:3000";
  inferredOrigins.push(defaultOrigin);
}

let allowedOrigins: string[];

if (rawAllowedOrigins === undefined) {
  allowedOrigins = [...inferredOrigins];
  const configuredSiteUrl = coerceOrigin(getEnv("SITE_URL"));
  if (!configuredSiteUrl && defaultOrigin === "http://localhost:3000") {
    console.warn(
      `[CORS] ALLOWED_ORIGINS is missing; defaulting to ${defaultOrigin}`,
    );
  }
} else if (rawAllowedOrigins.trim() === "") {
  // Empty string means allow all origins
  allowedOrigins = ["*"];
} else {
  const parsedOrigins = rawAllowedOrigins
    .split(",")
    .map((o: string) => o.trim())
    .filter(Boolean);

  if (parsedOrigins.length === 0) {
    console.warn(
      `[CORS] ALLOWED_ORIGINS is empty; defaulting to ${defaultOrigin}`,
    );
    allowedOrigins = [...inferredOrigins];
  } else {
    const normalizedOrigins: string[] = [];
    const invalidOrigins: string[] = [];
    let allowAll = false;

    for (const origin of parsedOrigins) {
      if (origin === "*") {
        allowAll = true;
        break;
      }

      const normalized = coerceOrigin(origin);
      if (normalized) {
        normalizedOrigins.push(normalized);
      } else {
        invalidOrigins.push(origin);
      }
    }

    if (allowAll) {
      allowedOrigins = ["*"];
    } else if (normalizedOrigins.length === 0) {
      if (invalidOrigins.length > 0) {
        console.warn(
          `[CORS] Ignoring invalid ALLOWED_ORIGINS entries: ${
            invalidOrigins.join(", ")
          }`,
        );
      }
      console.warn(
        `[CORS] ALLOWED_ORIGINS is empty; defaulting to ${defaultOrigin}`,
      );
      allowedOrigins = [...inferredOrigins];
    } else {
      if (invalidOrigins.length > 0) {
        console.warn(
          `[CORS] Ignoring invalid ALLOWED_ORIGINS entries: ${
            invalidOrigins.join(", ")
          }`,
        );
      }
      const uniqueOrigins: string[] = [];
      const parsedSet = new Set<string>();
      for (const origin of normalizedOrigins) {
        if (!parsedSet.has(origin)) {
          parsedSet.add(origin);
          uniqueOrigins.push(origin);
        }
      }
      allowedOrigins = uniqueOrigins;
    }
  }
}

if (!allowedOrigins.includes("*")) {
  for (const origin of inferredOrigins) {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  }
}

export function buildCorsHeaders(origin: string | null, methods?: string) {
  const headers: Record<string, string> = {
    "access-control-allow-headers":
      "authorization, x-client-info, apikey, content-type, x-admin-token, x-telegram-init-data",
    "access-control-allow-methods": methods ||
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  };
  if (allowedOrigins.includes("*")) {
    headers["access-control-allow-origin"] = "*";
  } else if (origin) {
    const normalizedOrigin = coerceOrigin(origin);
    if (normalizedOrigin && allowedOrigins.includes(normalizedOrigin)) {
      headers["access-control-allow-origin"] = origin;
      headers["vary"] = mergeVary(headers["vary"], "Origin");
    }
  }
  return headers;
}

export function corsHeaders(req: Request, methods?: string) {
  return buildCorsHeaders(req.headers.get("origin"), methods);
}

export function jsonResponse(
  data: unknown,
  init: ResponseInit = {},
  req?: Request,
) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
  });
  mergeHeaders(headers, init.headers);
  if (req) {
    mergeHeaders(headers, corsHeaders(req));
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function json(
  data: unknown,
  status = 200,
  extra: Record<string, string> = {},
  req?: Request,
) {
  return jsonResponse(data, { status, headers: extra }, req);
}

export const ok = (data: unknown = {}, req?: Request) =>
  jsonResponse(
    { ok: true, ...((typeof data === "object" && data) || {}) },
    { status: 200 },
    req,
  );

export const bad = (
  message = "Bad Request",
  hint?: unknown,
  req?: Request,
) => jsonResponse({ ok: false, error: message, hint }, { status: 400 }, req);

export const unauth = (message = "Unauthorized", req?: Request) =>
  jsonResponse({ ok: false, error: message }, { status: 401 }, req);

export const nf = (message = "Not Found", req?: Request) =>
  jsonResponse({ ok: false, error: message }, { status: 404 }, req);

export const methodNotAllowed = (req?: Request) =>
  jsonResponse({ error: "Method Not Allowed" }, { status: 405 }, req);

export const mna = () =>
  jsonResponse({ ok: false, error: "Method Not Allowed" }, { status: 405 });

export const oops = (message: string, hint?: unknown, req?: Request) =>
  jsonResponse({ ok: false, error: message, hint }, { status: 500 }, req);

let errorReferenceCounter = 0;

const nextErrorReference = () => {
  if (
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  errorReferenceCounter = (errorReferenceCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `err-${Date.now().toString(36)}-${errorReferenceCounter}`;
};

export const createErrorReference = () => nextErrorReference();

type InternalErrorOptions = {
  req?: Request;
  message?: string;
  extra?: Record<string, unknown>;
  headers?: HeadersInit;
  reference?: string;
  safeError?: SafeError;
};

export type SafeError = {
  message: string;
  name?: string;
};

export const toSafeError = (error: unknown): SafeError => {
  if (error instanceof Error) {
    const message = error.message?.trim();
    const name = error.name?.trim();
    return {
      message: message || "Unexpected error",
      ...(name && name !== "Error" ? { name } : {}),
    };
  }

  if (typeof error === "string") {
    const message = error.trim();
    return { message: message || "Unexpected error" };
  }

  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; name?: unknown };
    const message =
      typeof candidate.message === "string" && candidate.message.trim()
        ? candidate.message.trim()
        : "Unexpected error";
    const name = typeof candidate.name === "string" && candidate.name.trim()
      ? candidate.name.trim()
      : undefined;
    return {
      message,
      ...(name && name !== "Error" ? { name } : {}),
    };
  }

  return { message: String(error ?? "Unexpected error") };
};

export const internalError = (
  error: unknown,
  options: InternalErrorOptions = {},
) => {
  const reference = options.reference ?? nextErrorReference();
  const safeError = options.safeError ?? toSafeError(error);
  console.error(`[internal-error:${reference}]`, safeError);
  const { req, message = "Internal server error", extra, headers } = options;
  return jsonResponse(
    { ok: false, error: message, reference, ...(extra ?? {}) },
    { status: 500, headers },
    req,
  );
};
