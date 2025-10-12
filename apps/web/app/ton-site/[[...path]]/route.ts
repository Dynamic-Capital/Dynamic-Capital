import { NextRequest } from "next/server";

import {
  resolveTonSiteGatewayBasesForHost,
  resolveTonSiteGatewayOrigin,
} from "@shared/ton/site";
const PROXY_HEADER = "x-dynamic-ton-gateway";
const PROXY_SOURCE_HEADER = "x-dynamic-ton-gateway-host";
const PROXY_ATTEMPTS_HEADER = "x-dynamic-ton-gateway-attempts";
const PROXY_FALLBACK_HEADER = "x-dynamic-ton-gateway-fallback";
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

export const runtime = "edge";
export const dynamic = "force-dynamic";

function buildUpstreamUrl(
  tonSiteBase: string,
  pathSegments: string[] | undefined,
  searchParams: string,
): URL {
  const upstream = new URL(tonSiteBase);
  const sanitizedSegments = (pathSegments ?? [])
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) =>
      encodeURIComponent(segment)
        .replace(/%2F/gi, "/")
        .replace(/%3A/gi, ":")
    );

  if (sanitizedSegments.length > 0) {
    const joined = sanitizedSegments.join("/");
    upstream.pathname = `${upstream.pathname.replace(/\/$/, "")}/${joined}`;
  }

  upstream.search = searchParams ?? "";
  return upstream;
}

function filterRequestHeaders(headers: Headers, gatewayHost: string): Headers {
  const filtered = new Headers();

  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase();
    if (lower === "host") continue;
    if (HOP_BY_HOP_HEADERS.has(lower)) continue;
    filtered.append(key, value);
  }

  filtered.set("accept-encoding", "gzip, deflate, br");
  filtered.set("host", gatewayHost);
  return filtered;
}

function filterResponseHeaders(
  headers: Headers,
  req: NextRequest,
  tonSiteBase: string,
  gatewayHost: string,
): Headers {
  const filtered = new Headers();
  const origin = req.nextUrl.origin;

  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) continue;

    if (lower === "location") {
      const rewritten = rewriteLocation(value, origin, tonSiteBase);
      filtered.set(key, rewritten);
      continue;
    }

    filtered.append(key, value);
  }

  filtered.set(PROXY_HEADER, "1");
  filtered.set(PROXY_SOURCE_HEADER, gatewayHost);

  return filtered;
}

function rewriteLocation(
  location: string,
  origin: string,
  tonSiteBase: string,
): string {
  try {
    const tonSiteBaseUrl = new URL(tonSiteBase);
    const target = new URL(location, tonSiteBaseUrl.toString() + "/");
    const basePath = tonSiteBaseUrl.pathname;
    if (
      target.origin === tonSiteBaseUrl.origin &&
      target.pathname.startsWith(basePath)
    ) {
      const relative = target.pathname.slice(basePath.length) || "/";
      const rebuilt = new URL(`/ton-site${relative}`, origin);
      rebuilt.search = target.search;
      rebuilt.hash = target.hash;
      return rebuilt.toString();
    }
    return target.toString();
  } catch {
    return location;
  }
}

type TonSiteRouteParams = { path?: string[] };

type TonSiteRouteContext = { params: Promise<TonSiteRouteParams> };

const RETRIABLE_UPSTREAM_STATUSES = new Set([404, 502, 503, 504]);

function shouldRetryGatewayResponse(response: Response): boolean {
  if (RETRIABLE_UPSTREAM_STATUSES.has(response.status)) {
    return true;
  }
  return response.status >= 500;
}

async function proxyTonSite(
  req: NextRequest,
  params: TonSiteRouteParams = {},
): Promise<Response> {
  if (
    ![
      "GET",
      "HEAD",
    ].includes(req.method)
  ) {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  const candidateGatewayBases = resolveTonSiteGatewayBasesForHost(
    req.headers.get("host"),
  );
  const attemptSummaries: string[] = [];

  for (const candidateBase of candidateGatewayBases) {
    const tonSiteBase = resolveTonSiteGatewayOrigin(candidateBase, {
      canonicalizeStandby: false,
    });
    const gatewayHost = new URL(candidateBase).host;
    const upstreamUrl = buildUpstreamUrl(
      tonSiteBase,
      params.path,
      req.nextUrl.search,
    );

    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(upstreamUrl, {
        method: req.method,
        headers: filterRequestHeaders(req.headers, gatewayHost),
        redirect: "manual",
        cache: "no-store",
      });
    } catch {
      attemptSummaries.push(`${gatewayHost}:error`);
      continue;
    }

    if (shouldRetryGatewayResponse(upstreamResponse)) {
      attemptSummaries.push(`${gatewayHost}:${upstreamResponse.status}`);
      upstreamResponse.body?.cancel();
      continue;
    }

    const responseHeaders = filterResponseHeaders(
      upstreamResponse.headers,
      req,
      tonSiteBase,
      gatewayHost,
    );
    return new Response(
      req.method === "HEAD" ? null : upstreamResponse.body,
      {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      },
    );
  }

  const failureMessage = attemptSummaries.length
    ? `Unable to load TON site via configured gateways (${
      attemptSummaries.join(
        ", ",
      )
    }).`
    : "Unable to load TON site via configured gateways.";
  const fallbackResponse = await serveFallbackFromStatic(req, attemptSummaries);
  if (fallbackResponse) {
    return fallbackResponse;
  }

  const attemptsHeader = attemptSummaries.join(",");

  return new Response(req.method === "HEAD" ? null : failureMessage, {
    status: 502,
    statusText: "Bad Gateway",
    headers: {
      "content-type": "text/plain; charset=utf-8",
      [PROXY_HEADER]: "0",
      ...(attemptsHeader ? { [PROXY_ATTEMPTS_HEADER]: attemptsHeader } : {}),
    },
  });
}

async function resolveRouteParams(
  params: TonSiteRouteContext["params"],
): Promise<TonSiteRouteParams> {
  return await params;
}

export async function GET(
  req: NextRequest,
  context: TonSiteRouteContext,
): Promise<Response> {
  const params = await resolveRouteParams(context.params);
  return await proxyTonSite(req, params);
}

export async function HEAD(
  req: NextRequest,
  context: TonSiteRouteContext,
): Promise<Response> {
  const params = await resolveRouteParams(context.params);
  return await proxyTonSite(req, params);
}

function resolveFallbackAssetPath(): string {
  return "/_ton-site-fallback/index.html";
}

async function serveFallbackFromStatic(
  req: NextRequest,
  attempts: string[],
): Promise<Response | null> {
  const fallbackPath = resolveFallbackAssetPath();
  const fallbackUrl = new URL(fallbackPath, req.nextUrl.origin);

  try {
    const response = await fetch(fallbackUrl, { cache: "no-store" });
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set(PROXY_HEADER, "fallback");
      headers.set(PROXY_SOURCE_HEADER, "local-static");
      headers.set(
        PROXY_ATTEMPTS_HEADER,
        [...attempts, "fallback:success"].join(","),
      );
      headers.set(PROXY_FALLBACK_HEADER, fallbackPath);

      if (req.method === "HEAD") {
        headers.delete("content-length");
        return new Response(null, { status: 200, headers });
      }

      return new Response(response.body, {
        status: 200,
        headers,
      });
    }
  } catch {
    // Ignore errors when fetching the static fallback; we'll return an inline
    // response instead so the caller still receives a helpful payload.
  }

  return buildInlineFallbackResponse(req, attempts);
}

function buildInlineFallbackResponse(
  req: NextRequest,
  attempts: string[],
): Response {
  const attemptsHeader = [...attempts, "fallback:inline"].join(",");
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    [PROXY_HEADER]: "fallback",
    [PROXY_SOURCE_HEADER]: "inline",
    [PROXY_FALLBACK_HEADER]: "inline",
  });
  if (attemptsHeader) {
    headers.set(PROXY_ATTEMPTS_HEADER, attemptsHeader);
  }

  if (req.method === "HEAD") {
    headers.delete("content-length");
    return new Response(null, { status: 200, headers });
  }

  const attemptsContent = attempts.length
    ? `<p class="attempts">Gateway attempts: ${attempts.join(", ")}</p>`
    : "";
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dynamic Capital TON gateway</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 2.5rem 1.5rem; background: #0a0f1c; color: #f8fafc; }
      main { max-width: 42rem; margin: 0 auto; background: rgba(15, 23, 42, 0.72); border-radius: 1.25rem; padding: 2rem; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.55); border: 1px solid rgba(59, 130, 246, 0.25); }
      h1 { font-size: 1.75rem; line-height: 1.2; margin: 0 0 1rem; }
      p { margin: 0 0 1rem; line-height: 1.6; }
      .attempts { font-size: 0.875rem; color: rgba(148, 163, 184, 0.9); word-break: break-word; }
      a.button { display: inline-flex; align-items: center; justify-content: center; padding: 0.75rem 1.25rem; border-radius: 999px; text-decoration: none; font-weight: 600; color: #0f172a; background: linear-gradient(135deg, #38bdf8, #818cf8); box-shadow: 0 20px 30px -15px rgba(56, 189, 248, 0.65); transition: transform 0.2s ease, box-shadow 0.2s ease; }
      a.button:hover { transform: translateY(-1px); box-shadow: 0 25px 40px -20px rgba(129, 140, 248, 0.75); }
      footer { margin-top: 1.5rem; font-size: 0.75rem; color: rgba(148, 163, 184, 0.8); }
    </style>
  </head>
  <body>
    <main>
      <h1>DigitalOcean gateway is offline</h1>
      <p>
        The Dynamic Capital TON experience is temporarily unavailable from the DigitalOcean edge cluster.
        Switch to the foundation-managed bridge or retry after the origin redeploys.
      </p>
      <p>
        <a class="button" href="https://ton.site/dynamiccapital.ton" rel="noopener noreferrer">Open via TON Foundation gateway</a>
      </p>
      ${attemptsContent}
      <footer>Generated fallback &middot; Dynamic Capital</footer>
    </main>
  </body>
</html>`;

  return new Response(html, { status: 200, headers });
}
