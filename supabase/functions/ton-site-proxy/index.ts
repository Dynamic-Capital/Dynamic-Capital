import { maybe } from "../_shared/env.ts";
import { corsHeaders } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import { TON_SITE_GATEWAY_ORIGIN } from "../../../shared/ton/site.ts";

const FUNCTION_PREFIX = "/ton-site-proxy";
const DEFAULT_CACHE_SECONDS = 180;
const DEFAULT_TIMEOUT_MS = 4500;
const RETRYABLE_STATUSES = new Set([
  408,
  425,
  429,
  500,
  502,
  503,
  504,
  522,
  524,
  598,
  599,
]);

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "access-control-allow-headers",
  "access-control-allow-methods",
  "access-control-expose-headers",
]);

const EXPOSE_HEADERS =
  "cache-control, content-length, content-type, etag, last-modified, x-ton-proxy-attempts, x-ton-proxy-upstream";

interface ProxyTarget {
  base: string;
  href: string;
}

function parseNumber(
  raw: string | null,
  fallback: number,
  min = 0,
  max = 86_400,
) {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;
  const clamped = Math.min(Math.max(parsed, min), max);
  return clamped;
}

function normaliseTarget(entry: string): ProxyTarget | null {
  const trimmed = entry.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    url.hash = "";
    url.search = "";
    const href = url.href.endsWith("/") ? url.href : `${url.href}/`;
    const base = href.endsWith("/") ? href.slice(0, -1) : href;
    return { base, href };
  } catch (error) {
    console.warn("[ton-site-proxy] Ignoring invalid target", entry, error);
    return null;
  }
}

function parseTargets(raw: string | null): ProxyTarget[] {
  if (!raw) return [];
  const candidates = raw
    .split(/[\s,]+/u)
    .map((value) => value.trim())
    .filter(Boolean);
  const results: ProxyTarget[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const target = normaliseTarget(candidate);
    if (target && !seen.has(target.href)) {
      seen.add(target.href);
      results.push(target);
    }
  }
  return results;
}

const configuredTargets = parseTargets(maybe("TON_SITE_PROXY_TARGETS"));
const DEFAULT_TARGETS = parseTargets(TON_SITE_GATEWAY_ORIGIN);
const PROXY_TARGETS = configuredTargets.length > 0
  ? configuredTargets
  : DEFAULT_TARGETS;

if (PROXY_TARGETS.length === 0) {
  console.error("[ton-site-proxy] No valid upstream targets configured");
}

const CACHE_SECONDS = parseNumber(
  maybe("TON_SITE_PROXY_CACHE_SECONDS"),
  DEFAULT_CACHE_SECONDS,
  0,
  31_536_000,
);
const TIMEOUT_MS = parseNumber(
  maybe("TON_SITE_PROXY_TIMEOUT_MS"),
  DEFAULT_TIMEOUT_MS,
  250,
  60_000,
);

function sanitiseRelativePath(pathname: string): string {
  const normalised = pathname.replace(/\/+$/u, "");
  if (!normalised || normalised === FUNCTION_PREFIX) {
    return "/";
  }
  if (normalised.startsWith(`${FUNCTION_PREFIX}/`)) {
    return normalised.slice(FUNCTION_PREFIX.length);
  }
  return normalised;
}

function buildUpstreamUrl(
  target: ProxyTarget,
  relativePath: string,
  search: string,
): URL {
  const cleanPath = relativePath.replace(/^\/+/, "");
  const upstream = new URL(cleanPath, target.href);
  if (!upstream.href.startsWith(target.href)) {
    throw new Error("Resolved path escapes configured base");
  }
  upstream.search = search;
  return upstream;
}

function filterRequestHeaders(request: Request): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    if (lower === "host") return;
    if (lower === "content-length") return;
    if (lower === "accept-encoding") return;
    headers.set(key, value);
  });
  headers.set("accept-encoding", "identity");
  return headers;
}

async function fetchWithTimeout(
  url: URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  if (!timeoutMs || timeoutMs <= 0) {
    return fetch(url, init);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function shouldRetry(status: number) {
  return RETRYABLE_STATUSES.has(status) || status >= 500;
}

function mergeHeaders(target: Headers, source: Headers) {
  source.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
    target.set(key, value);
  });
}

function applyCacheHeaders(headers: Headers) {
  if (CACHE_SECONDS <= 0 || headers.has("cache-control")) {
    return;
  }
  const staleWhileRevalidate = Math.max(Math.floor(CACHE_SECONDS / 2), 1);
  headers.set(
    "cache-control",
    `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=${staleWhileRevalidate}, stale-if-error=${CACHE_SECONDS}`,
  );
}

export const handler = registerHandler(async (req) => {
  const cors = corsHeaders(req, "GET,HEAD,OPTIONS");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...cors } });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      {
        status: 405,
        headers: { ...cors, "content-type": "application/json" },
      },
    );
  }

  if (PROXY_TARGETS.length === 0) {
    return new Response(
      JSON.stringify({ error: "No TON gateway targets configured" }),
      {
        status: 500,
        headers: { ...cors, "content-type": "application/json" },
      },
    );
  }

  const requestUrl = new URL(req.url);
  const relativePath = sanitiseRelativePath(requestUrl.pathname);
  if (!relativePath.startsWith("/")) {
    return new Response(JSON.stringify({ error: "Invalid path" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const attempts: Array<
    { target: ProxyTarget; error?: string; status?: number }
  > = [];

  for (let index = 0; index < PROXY_TARGETS.length; index += 1) {
    const target = PROXY_TARGETS[index];
    try {
      const upstreamUrl = buildUpstreamUrl(
        target,
        relativePath,
        requestUrl.search,
      );
      const upstreamResponse = await fetchWithTimeout(
        upstreamUrl,
        {
          method: req.method,
          headers: filterRequestHeaders(req),
        },
        TIMEOUT_MS,
      );

      attempts.push({ target, status: upstreamResponse.status });

      if (
        index < PROXY_TARGETS.length - 1 &&
        shouldRetry(upstreamResponse.status)
      ) {
        upstreamResponse.body?.cancel().catch(() => {});
        console.warn(
          "[ton-site-proxy] Upstream responded with retryable status",
          {
            target: target.base,
            status: upstreamResponse.status,
            path: relativePath,
          },
        );
        continue;
      }

      const headers = new Headers();
      mergeHeaders(headers, upstreamResponse.headers);
      applyCacheHeaders(headers);
      headers.set("x-ton-proxy-upstream", target.base);
      headers.set("x-ton-proxy-attempts", String(attempts.length));
      headers.set("access-control-expose-headers", EXPOSE_HEADERS);
      Object.entries(cors).forEach(([key, value]) => headers.set(key, value));

      const body = req.method === "HEAD" ? null : upstreamResponse.body;

      return new Response(body, {
        status: upstreamResponse.status,
        headers,
      });
    } catch (error) {
      attempts.push({
        target,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error("[ton-site-proxy] Upstream request failed", {
        target: target.base,
        path: relativePath,
        error,
      });
    }
  }

  return new Response(
    JSON.stringify({ error: "All TON gateways failed", attempts }),
    {
      status: 502,
      headers: { ...cors, "content-type": "application/json" },
    },
  );
});

export default handler;
