import { Buffer } from "node:buffer";
import { createHmac, generateKeyPairSync, sign as signData } from "node:crypto";

import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  getAdminHeaders,
  isAdminVerificationFailure,
  resetSupabaseJwksCacheForTests,
  verifyAdminRequest,
} from "./admin-auth.ts";

const ADMIN_SECRET = "test-admin-secret";
const originalAdminSecret = process.env.ADMIN_API_SECRET;
const originalFetch = global.fetch;

function base64UrlEncode(input: string | Buffer): string {
  const buffer = typeof input === "string" ? Buffer.from(input) : input;
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

type MutableJsonWebKey = JsonWebKey & Record<string, unknown>;

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
  global.fetch = originalFetch;
  resetSupabaseJwksCacheForTests();
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

test("accepts Supabase ES256 admin token", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });

  const header = {
    alg: "ES256",
    typ: "JWT",
    kid: "f44cf763-502b-41b3-a015-058a00d210fa",
  } as const;
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: "ecc-admin",
    admin: true,
    iat: now,
    exp: now + 3600,
  } as const;

  const headerSegment = base64UrlEncode(JSON.stringify(header));
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = signData("sha256", Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
  const token = `${signingInput}.${base64UrlEncode(signature)}`;

  const jwk = publicKey.export({ format: "jwk" }) as MutableJsonWebKey;
  jwk.kid = header.kid;
  jwk.alg = header.alg;
  jwk.use = "sig";

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ keys: [jwk] }),
  });

  global.fetch = fetchMock as unknown as typeof fetch;

  const request = new Request("https://example.com/api", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await verifyAdminRequest(request);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.userId).toBe("ecc-admin");
  }
  expect(fetchMock).toHaveBeenCalled();
});

test("accepts Supabase ES256 admin token when legacy secret missing", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });

  const header = {
    alg: "ES256",
    typ: "JWT",
    kid: "f44cf763-502b-41b3-a015-058a00d210fa",
  } as const;
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: "ecc-admin",
    admin: true,
    iat: now,
    exp: now + 3600,
  } as const;

  const headerSegment = base64UrlEncode(JSON.stringify(header));
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = signData("sha256", Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
  const token = `${signingInput}.${base64UrlEncode(signature)}`;

  const jwk = publicKey.export({ format: "jwk" }) as MutableJsonWebKey;
  jwk.kid = header.kid;
  jwk.alg = header.alg;
  jwk.use = "sig";

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ keys: [jwk] }),
  });

  global.fetch = fetchMock as unknown as typeof fetch;
  delete process.env.ADMIN_API_SECRET;

  const request = new Request("https://example.com/api", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await verifyAdminRequest(request);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.userId).toBe("ecc-admin");
  }
  expect(fetchMock).toHaveBeenCalled();
});

test("fails with 500 when legacy secret missing for HS256 tokens", async () => {
  delete process.env.ADMIN_API_SECRET;

  const token = createAdminToken(ADMIN_SECRET, { sub: "admin-hs" });
  const request = new Request("https://example.com/api", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await verifyAdminRequest(request);
  expect(isAdminVerificationFailure(result)).toBe(true);
  if (isAdminVerificationFailure(result)) {
    expect(result.status).toBe(500);
    expect(result.message).toBe("Admin verification unavailable.");
  }
});

test("exposes admin headers including Authorization", () => {
  expect(getAdminHeaders()).toEqual([
    "x-admin-token",
    "x-telegram-init-data",
    "authorization",
  ]);
});
