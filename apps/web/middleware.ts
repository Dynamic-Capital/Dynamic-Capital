import { NextRequest, NextResponse } from "next/server";
import { buildCorsHeaders, mergeVary } from "@/utils/http.ts";
import {
  isTonSiteAliasHost,
  isTonSitePath,
  normalizeTonGatewayPath,
  TON_SITE_GATEWAY_HOSTS,
} from "@shared/ton/site";

const TON_GATEWAY_HOSTS = new Set(TON_SITE_GATEWAY_HOSTS);

const LEGACY_LOCALE_PREFIX = "/en";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api")) {
    const origin = req.headers.get("origin");
    const headers = buildCorsHeaders(origin);

    if (req.method === "OPTIONS") {
      if (origin && !headers["access-control-allow-origin"]) {
        return new NextResponse(null, { status: 403 });
      }
      return new NextResponse(null, { status: 204, headers });
    }

    if (origin && !headers["access-control-allow-origin"]) {
      return new NextResponse("Origin not allowed", { status: 403 });
    }

    const res = NextResponse.next();
    Object.entries(headers).forEach(([k, v]) => {
      if (k.toLowerCase() === "vary") {
        res.headers.set("vary", mergeVary(res.headers.get("vary"), v));
      } else {
        res.headers.set(k, v);
      }
    });
    return res;
  }

  const { pathname } = req.nextUrl;
  const rawHost = req.headers.get("host");
  const host = rawHost?.split(":")[0]?.toLowerCase() ?? "";

  if (
    (TON_GATEWAY_HOSTS.has(host) || isTonSiteAliasHost(rawHost)) &&
    !pathname.startsWith("/ton-site")
  ) {
    const rewritten = req.nextUrl.clone();
    const suffix = normalizeTonGatewayPath(pathname);
    rewritten.pathname = suffix ? `/ton-site${suffix}` : "/ton-site";
    return NextResponse.rewrite(rewritten);
  }

  if (isTonSitePath(pathname) && !pathname.startsWith("/ton-site")) {
    const rewritten = req.nextUrl.clone();
    const suffix = normalizeTonGatewayPath(pathname);
    rewritten.pathname = suffix ? `/ton-site${suffix}` : "/ton-site";
    return NextResponse.rewrite(rewritten);
  }

  if (
    pathname === LEGACY_LOCALE_PREFIX ||
    pathname.startsWith(`${LEGACY_LOCALE_PREFIX}/`)
  ) {
    const rewrited = req.nextUrl.clone();
    const nextPath = pathname.slice(LEGACY_LOCALE_PREFIX.length) || "/";
    rewrited.pathname = nextPath;
    return NextResponse.rewrite(rewrited);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
    "/api/:path*",
  ],
};
