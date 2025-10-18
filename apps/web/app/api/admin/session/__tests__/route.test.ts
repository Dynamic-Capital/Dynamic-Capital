import { Buffer } from "node:buffer";
import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

import {
  API_METRICS_OVERRIDE_SYMBOL,
  createNoopApiMetrics,
} from "@/observability/server-metrics.ts";

declare const Deno: {
  env: { set(key: string, value: string): void };
  test: (name: string, fn: () => void | Promise<void>) => void;
};

const CALL_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.admin-session.call-override",
);

const ADMIN_SECRET = "test-admin-secret";

function asNextRequest(request: Request): NextRequest {
  return request as unknown as NextRequest;
}

function base64UrlEncode(input: string | Uint8Array): string {
  const buffer = input instanceof Uint8Array
    ? input
    : new TextEncoder().encode(input);
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createAdminToken(
  secret: string,
  claims: Partial<{ sub: string; admin: boolean; exp: number; iat: number }> =
    {},
): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: "admin-user",
      admin: true,
      iat: now,
      exp: now + 3600,
      ...claims,
    }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = base64UrlEncode(
    createHmac("sha256", secret).update(signingInput).digest(),
  );
  return `${signingInput}.${signature}`;
}

Deno.test("POST /api/admin/session stores session cookie", async () => {
  Deno.env.set("ADMIN_API_SECRET", ADMIN_SECRET);
  (globalThis as Record<PropertyKey, unknown>)[API_METRICS_OVERRIDE_SYMBOL] =
    createNoopApiMetrics();

  const token = createAdminToken(ADMIN_SECRET, { sub: "cookie-admin" });
  const exp = Math.floor(Date.now() / 1000) + 3600;

  (globalThis as Record<PropertyKey, unknown>)[CALL_OVERRIDE_SYMBOL] =
    async () => ({
      data: { token, exp },
    });

  const { POST } = await import("../route.ts");

  const response = await POST(
    asNextRequest(
      new Request("http://localhost/api/admin/session", {
        method: "POST",
        body: JSON.stringify({ initData: "telegram" }),
      }),
    ),
  );

  const payload = await response.json() as {
    ok?: boolean;
    userId?: string;
    exp?: number;
  };
  const cookieHeader = response.headers.get("set-cookie") ?? "";

  if (!payload.ok) {
    throw new Error("Expected ok response");
  }
  if (!cookieHeader.includes("dc_admin_session")) {
    throw new Error("Expected session cookie to be set");
  }

  delete (globalThis as Record<PropertyKey, unknown>)[CALL_OVERRIDE_SYMBOL];
  delete (globalThis as Record<PropertyKey, unknown>)[
    API_METRICS_OVERRIDE_SYMBOL
  ];
});

Deno.test("GET /api/admin/session returns session details", async () => {
  Deno.env.set("ADMIN_API_SECRET", ADMIN_SECRET);
  (globalThis as Record<PropertyKey, unknown>)[API_METRICS_OVERRIDE_SYMBOL] =
    createNoopApiMetrics();

  const token = createAdminToken(ADMIN_SECRET, { sub: "cookie-admin" });
  const { GET } = await import("../route.ts");

  const response = await GET(
    asNextRequest(
      new Request("http://localhost/api/admin/session", {
        headers: { cookie: `dc_admin_session=${token}` },
      }),
    ),
  );

  const payload = await response.json() as { ok?: boolean; userId?: string };

  if (!payload.ok) {
    throw new Error("Expected ok response");
  }
  if (payload.userId !== "cookie-admin") {
    throw new Error("Expected userId from token");
  }

  delete (globalThis as Record<PropertyKey, unknown>)[
    API_METRICS_OVERRIDE_SYMBOL
  ];
});

Deno.test("GET /api/admin/session clears invalid cookie", async () => {
  Deno.env.set("ADMIN_API_SECRET", ADMIN_SECRET);
  (globalThis as Record<PropertyKey, unknown>)[API_METRICS_OVERRIDE_SYMBOL] =
    createNoopApiMetrics();

  const { GET } = await import("../route.ts");

  const response = await GET(
    asNextRequest(
      new Request("http://localhost/api/admin/session", {
        headers: { cookie: "dc_admin_session=invalid" },
      }),
    ),
  );

  if (response.status !== 401) {
    throw new Error("Expected 401 response");
  }

  const cookieHeader = response.headers.get("set-cookie") ?? "";
  if (!cookieHeader.includes("Max-Age=0")) {
    throw new Error("Expected session cookie to be cleared");
  }

  delete (globalThis as Record<PropertyKey, unknown>)[
    API_METRICS_OVERRIDE_SYMBOL
  ];
});
