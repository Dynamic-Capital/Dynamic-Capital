import { NextRequest } from "next/server";

import {
  resolveTonSiteGatewayBaseForHost,
  resolveTonSiteGatewayOrigin,
} from "@shared/ton/site";
const PROXY_HEADER = "x-dynamic-ton-gateway";
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

  const gatewayBase = resolveTonSiteGatewayBaseForHost(req.headers.get("host"));
  const tonSiteBase = resolveTonSiteGatewayOrigin(gatewayBase);
  const gatewayHost = new URL(gatewayBase).host;
  const upstreamUrl = buildUpstreamUrl(
    tonSiteBase,
    params.path,
    req.nextUrl.search,
  );
  const upstreamResponse = await fetch(upstreamUrl, {
    method: req.method,
    headers: filterRequestHeaders(req.headers, gatewayHost),
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = filterResponseHeaders(
    upstreamResponse.headers,
    req,
    tonSiteBase,
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
