import { Buffer } from "node:buffer";
import { createHmac } from "node:crypto";

import { afterEach, beforeEach, expect, test } from "vitest";

import {
  getAdminHeaders,
  isAdminVerificationFailure,
  verifyAdminRequest,
} from "./admin-auth.ts";

const ADMIN_SECRET = "test-admin-secret";
const originalAdminSecret = process.env.ADMIN_API_SECRET;

function base64UrlEncode(input: string | Buffer): string {
  const buffer = typeof input === "string" ? Buffer.from(input) : input;
  return buffer
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
  const signature = createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${signingInput}.${signature}`;
}

beforeEach(() => {
  process.env.ADMIN_API_SECRET = ADMIN_SECRET;
});

afterEach(() => {
  if (originalAdminSecret === undefined) {
    delete process.env.ADMIN_API_SECRET;
  } else {
    process.env.ADMIN_API_SECRET = originalAdminSecret;
  }
});

test("accepts bearer admin token from Authorization header", async () => {
  const token = createAdminToken(ADMIN_SECRET, { sub: "admin-123" });
  const request = new Request("https://example.com/api", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await verifyAdminRequest(request);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.userId).toBe("admin-123");
  }
});

test("rejects invalid bearer token", async () => {
  const request = new Request("https://example.com/api", {
    headers: { Authorization: "Bearer invalid" },
  });

  const result = await verifyAdminRequest(request);
  expect(isAdminVerificationFailure(result)).toBe(true);
  if (isAdminVerificationFailure(result)) {
    expect(result.status).toBe(401);
    expect(result.message).toBe("Invalid or expired admin token.");
  }
});

test("requires bearer prefix when Authorization header is present", async () => {
  const request = new Request("https://example.com/api", {
    headers: { Authorization: "Token something" },
  });

  const result = await verifyAdminRequest(request);
  expect(isAdminVerificationFailure(result)).toBe(true);
  if (isAdminVerificationFailure(result)) {
    expect(result.status).toBe(401);
    expect(result.message).toBe("Admin authentication required.");
  }
});

test("accepts bearer tokens with varied casing and spacing", async () => {
  const token = createAdminToken(ADMIN_SECRET, { sub: "admin-456" });
  const request = new Request("https://example.com/api", {
    headers: { authorization: `  bEaReR   ${token}  ` },
  });

  const result = await verifyAdminRequest(request);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.userId).toBe("admin-456");
  }
});

test("rejects bearer tokens containing invalid characters", async () => {
  const request = new Request("https://example.com/api", {
    headers: { Authorization: "Bearer abc.def.ghi$" },
  });

  const result = await verifyAdminRequest(request);
  expect(isAdminVerificationFailure(result)).toBe(true);
  if (isAdminVerificationFailure(result)) {
    expect(result.status).toBe(401);
    expect(result.message).toBe("Invalid or expired admin token.");
  }
});

test("rejects bearer tokens that exceed the maximum length", async () => {
  const request = new Request("https://example.com/api", {
    headers: { Authorization: `Bearer ${"a".repeat(5000)}` },
  });

  const result = await verifyAdminRequest(request);
  expect(isAdminVerificationFailure(result)).toBe(true);
  if (isAdminVerificationFailure(result)) {
    expect(result.status).toBe(401);
    expect(result.message).toBe("Invalid or expired admin token.");
  }
});

test("accepts legacy admin token header", async () => {
  const token = createAdminToken(ADMIN_SECRET, { sub: "admin-legacy" });
  const request = new Request("https://example.com/api", {
    headers: { "x-admin-token": token },
  });

  const result = await verifyAdminRequest(request);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.userId).toBe("admin-legacy");
  }
});

test("exposes admin headers including Authorization", () => {
  expect(getAdminHeaders()).toEqual([
    "x-admin-token",
    "x-telegram-init-data",
    "authorization",
  ]);
});
