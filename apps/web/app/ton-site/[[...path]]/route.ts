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
    const tonSiteBase = resolveTonSiteGatewayOrigin(candidateBase);
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
    if (!response.ok) {
      return null;
    }

    const headers = new Headers(response.headers);
    headers.set(PROXY_HEADER, "fallback");
    headers.set(PROXY_SOURCE_HEADER, "local-static");
    headers.set(PROXY_ATTEMPTS_HEADER, [...attempts, "fallback:success"].join(","));
    headers.set(PROXY_FALLBACK_HEADER, fallbackPath);

    if (req.method === "HEAD") {
      headers.delete("content-length");
      return new Response(null, { status: 200, headers });
    }

    return new Response(response.body, {
      status: 200,
      headers,
    });
  } catch {
    return null;
  }
}
