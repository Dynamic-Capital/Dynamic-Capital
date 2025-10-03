import type { NextRequest } from "next/server";

import { withApiMetrics } from "@/observability/server-metrics.ts";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";
import {
  buildRouteGuardCookie,
  cookieToken,
  passwordsMatch,
} from "@/lib/route-guard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withApiMetrics(req, "/api/authenticate", async () => {
    const secret = process.env.ROUTE_GUARD_PASSWORD;

    if (!secret) {
      return jsonResponse(
        { ok: false, error: "Route guard password is not configured" },
        { status: 500 },
        req,
      );
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON body" }, {
        status: 400,
      }, req);
    }

    const payload = typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
    const password = typeof payload.password === "string"
      ? payload.password
      : undefined;

    if (!password) {
      return jsonResponse({ ok: false, error: "Password is required" }, {
        status: 400,
      }, req);
    }

    if (!passwordsMatch(password, secret)) {
      return jsonResponse({ ok: false, error: "Invalid password" }, {
        status: 401,
      }, req);
    }

    const response = jsonResponse({ ok: true }, {}, req);
    response.headers.append(
      "set-cookie",
      buildRouteGuardCookie(cookieToken(secret)),
    );

    return response;
  });
}

export function GET(req: NextRequest) {
  return methodNotAllowed(req);
}

export function PUT(req: NextRequest) {
  return methodNotAllowed(req);
}

export function PATCH(req: NextRequest) {
  return methodNotAllowed(req);
}

export function DELETE(req: NextRequest) {
  return methodNotAllowed(req);
}

export function HEAD(req: NextRequest) {
  return methodNotAllowed(req);
}
export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req, "POST") });
}
