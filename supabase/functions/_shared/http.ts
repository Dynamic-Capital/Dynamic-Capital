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

const coerceOrigin = (raw?: string | null): string | undefined => {
  if (!raw) return undefined;
  const trimmed = `${raw}`.trim();
  if (!trimmed) return undefined;
  try {
    const candidate = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    return new URL(candidate).origin;
  } catch {
    return undefined;
  }
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
    const uniqueOrigins: string[] = [];
    const parsedSet = new Set<string>();
    for (const origin of parsedOrigins) {
      if (!parsedSet.has(origin)) {
        parsedSet.add(origin);
        uniqueOrigins.push(origin);
      }
    }
    allowedOrigins = uniqueOrigins;
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
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    ...(init.headers as Record<string, string> | undefined),
    ...(req ? corsHeaders(req) : {}),
  };
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
