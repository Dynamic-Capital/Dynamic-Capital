import {
  createHmac,
  createPublicKey,
  createVerify,
  type JsonWebKey as CryptoJsonWebKey,
  timingSafeEqual,
} from "node:crypto";

import { buildFunctionUrl } from "@/config/supabase";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/config/supabase-runtime";
import { getEnvVar } from "@/utils/env.ts";

type AdminVerificationSuccess = {
  ok: true;
  userId?: string;
};

export type AdminVerificationFailure = {
  ok: false;
  status: number;
  message: string;
};

export type AdminVerificationResult =
  | AdminVerificationSuccess
  | AdminVerificationFailure;

const ADMIN_TOKEN_HEADER = "x-admin-token";
const ADMIN_INIT_DATA_HEADER = "x-telegram-init-data";
const AUTHORIZATION_HEADER = "authorization";

const MAX_JWT_LENGTH = 4096;
const JWT_SEGMENT_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/;

interface AdminTokenClaims {
  sub?: string;
  exp?: number;
  admin?: boolean;
}

interface JwtHeader {
  alg?: string;
  kid?: string;
}

type SupabaseJwk = CryptoJsonWebKey & Record<string, unknown> & {
  kid?: string;
};

const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;

let jwksCache: { fetchedAt: number; keys: readonly SupabaseJwk[] } | null =
  null;
let jwksFetchPromise: Promise<readonly SupabaseJwk[]> | null = null;

export function resetSupabaseJwksCacheForTests(): void {
  jwksCache = null;
  jwksFetchPromise = null;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}

function buildSupabaseJwksUrl(): string | null {
  try {
    const base = new URL(SUPABASE_URL);
    const normalizedPath = stripTrailingSlash(base.pathname);
    base.pathname = normalizedPath.length > 0 ? normalizedPath : "/";
    return `${stripTrailingSlash(base.toString())}/auth/v1/keys`;
  } catch {
    return null;
  }
}

async function loadSupabaseJwks(): Promise<readonly SupabaseJwk[]> {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }

  if (!jwksFetchPromise) {
    const jwksUrl = buildSupabaseJwksUrl();
    if (!jwksUrl) {
      jwksFetchPromise = Promise.resolve([]);
    } else {
      jwksFetchPromise = (async () => {
        const response = await fetch(jwksUrl, {
          headers: { accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch Supabase JWKS: ${response.status}`);
        }
        const body = await response.json().catch(() => ({}));
        const keys = Array.isArray(body?.keys)
          ? (body.keys as SupabaseJwk[])
          : [];
        jwksCache = { fetchedAt: Date.now(), keys };
        return keys;
      })()
        .catch((error) => {
          console.error("Failed to refresh Supabase JWKS", error);
          if (jwksCache) {
            return jwksCache.keys;
          }
          throw error;
        })
        .finally(() => {
          jwksFetchPromise = null;
        });
    }
  }

  return await jwksFetchPromise;
}

async function getSupabaseJwk(
  kid: string | undefined,
): Promise<SupabaseJwk | null> {
  if (!kid) return null;
  try {
    const keys = await loadSupabaseJwks();
    const match = keys.find((key) => key.kid === kid);
    if (
      match &&
      match.kty === "EC" &&
      match.crv === "P-256" &&
      typeof match.x === "string" &&
      typeof match.y === "string"
    ) {
      return match;
    }
  } catch (error) {
    console.error("Failed to resolve Supabase JWK", error);
  }
  return null;
}

function stripKid(jwk: SupabaseJwk): CryptoJsonWebKey {
  const { kid: _kid, ...rest } = jwk;
  return rest as CryptoJsonWebKey;
}

async function verifyEs256Signature(
  signingInput: string,
  signatureSegment: string,
  header: JwtHeader,
): Promise<boolean> {
  const signature = base64UrlDecodeStrict(signatureSegment);
  if (!signature || signature.length === 0) {
    return false;
  }

  const jwk = await getSupabaseJwk(header.kid);
  if (!jwk) {
    return false;
  }

  try {
    const publicKey = createPublicKey({
      key: stripKid(jwk),
      format: "jwk",
    });
    const verifier = createVerify("sha256");
    verifier.update(signingInput);
    verifier.end();
    return verifier.verify({
      key: publicKey,
      dsaEncoding: "ieee-p1363",
    }, signature);
  } catch (error) {
    console.error("Failed to verify ES256 admin token", error);
    return false;
  }
}

function normalizeBase64Url(segment: string): string {
  const sanitized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padding = sanitized.length % 4;
  if (padding === 0) {
    return sanitized;
  }
  return sanitized + "=".repeat(4 - padding);
}

function base64UrlDecodeStrict(segment: string): Buffer | null {
  if (!JWT_SEGMENT_PATTERN.test(segment)) {
    return null;
  }

  try {
    const normalized = normalizeBase64Url(segment);
    const decoded = Buffer.from(normalized, "base64");
    const reencoded = decoded
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const sanitizedSegment = segment
      .replace(/=+$/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    if (reencoded !== sanitizedSegment) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

function normalizeHeaderValue(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extractBearerToken(value: string | null): string | undefined {
  if (!value) return undefined;
  const match = value.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return undefined;
  }
  return normalizeHeaderValue(match[1] ?? "");
}

function resolveAdminTokenHeader(req: Request): string | undefined {
  const explicitToken = normalizeHeaderValue(
    req.headers.get(ADMIN_TOKEN_HEADER),
  );
  if (explicitToken) {
    return explicitToken;
  }
  return extractBearerToken(req.headers.get(AUTHORIZATION_HEADER));
}

function splitJwt(token: string):
  | [header: string, payload: string, signature: string]
  | null {
  if (!token || token.length > MAX_JWT_LENGTH || /\s/.test(token)) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerSegment, payloadSegment, signatureSegment] = parts;
  if (!headerSegment || !payloadSegment || !signatureSegment) {
    return null;
  }

  return [headerSegment, payloadSegment, signatureSegment];
}

type AdminTokenVerificationSuccess = { ok: true; claims: AdminTokenClaims };
type AdminTokenVerificationFailure =
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "missing-secret" };

type AdminTokenVerificationResult =
  | AdminTokenVerificationSuccess
  | AdminTokenVerificationFailure;

async function verifyAdminToken(
  token: string,
  secret: string | null,
): Promise<AdminTokenVerificationResult> {
  const segments = splitJwt(token);
  if (!segments) {
    return { ok: false, reason: "invalid" };
  }
  const [headerSegment, payloadSegment, signatureSegment] = segments;

  let headerRaw: unknown;
  try {
    const decodedHeader = base64UrlDecodeStrict(headerSegment);
    if (!decodedHeader) {
      return { ok: false, reason: "invalid" };
    }
    headerRaw = JSON.parse(decodedHeader.toString("utf-8"));
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (!headerRaw || typeof headerRaw !== "object" || Array.isArray(headerRaw)) {
    return { ok: false, reason: "invalid" };
  }

  const header = headerRaw as JwtHeader;

  const signingInput = `${headerSegment}.${payloadSegment}`;

  switch (header.alg) {
    case "HS256": {
      if (!secret) {
        return { ok: false, reason: "missing-secret" };
      }
      const expectedSignature = createHmac("sha256", secret)
        .update(signingInput)
        .digest();
      const providedSignature = base64UrlDecodeStrict(signatureSegment);
      if (!providedSignature) {
        return { ok: false, reason: "invalid" };
      }

      if (
        expectedSignature.length !== providedSignature.length ||
        !timingSafeEqual(
          new Uint8Array(expectedSignature),
          new Uint8Array(providedSignature),
        )
      ) {
        return { ok: false, reason: "invalid" };
      }
      break;
    }
    case "ES256": {
      const ok = await verifyEs256Signature(
        signingInput,
        signatureSegment,
        header,
      );
      if (!ok) {
        return { ok: false, reason: "invalid" };
      }
      break;
    }
    default:
      return { ok: false, reason: "invalid" };
  }

  let payloadRaw: unknown;
  try {
    const decodedPayload = base64UrlDecodeStrict(payloadSegment);
    if (!decodedPayload) {
      return { ok: false, reason: "invalid" };
    }
    payloadRaw = JSON.parse(decodedPayload.toString("utf-8"));
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (
    !payloadRaw || typeof payloadRaw !== "object" || Array.isArray(payloadRaw)
  ) {
    return { ok: false, reason: "invalid" };
  }

  const payload = payloadRaw as AdminTokenClaims;

  if (payload.admin !== true) {
    return { ok: false, reason: "invalid" };
  }

  if (
    typeof payload.exp === "number" &&
    payload.exp <= Math.floor(Date.now() / 1000)
  ) {
    return { ok: false, reason: "invalid" };
  }

  return { ok: true, claims: payload };
}

async function verifyAdminInitData(
  initData: string,
): Promise<AdminVerificationResult> {
  const url = buildFunctionUrl("ADMIN_CHECK");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ initData }),
    });

    if (!response.ok) {
      const status = response.status === 401 ? 401 : 500;
      return {
        ok: false,
        status,
        message: status === 401
          ? "Admin verification failed."
          : "Admin verification service unavailable.",
      };
    }

    const data = await response.json().catch(() => ({}));
    if (data && data.ok === true) {
      const userIdValue = data.user_id ?? data.userId;
      return {
        ok: true,
        userId: userIdValue ? String(userIdValue) : undefined,
      };
    }

    return {
      ok: false,
      status: 401,
      message: "Admin verification failed.",
    };
  } catch (error) {
    console.error("Failed to verify admin initData", error);
    return {
      ok: false,
      status: 500,
      message: "Admin verification service unavailable.",
    };
  }
}

export async function verifyAdminRequest(
  req: Request,
): Promise<AdminVerificationResult> {
  const token = resolveAdminTokenHeader(req);
  const initData = normalizeHeaderValue(
    req.headers.get(ADMIN_INIT_DATA_HEADER),
  );

  if (token) {
    const secret = getEnvVar("ADMIN_API_SECRET") ?? null;

    const verification = await verifyAdminToken(token, secret);
    if (!verification.ok) {
      if (verification.reason === "missing-secret") {
        console.error(
          "ADMIN_API_SECRET is not configured; refusing admin-only request.",
        );
        return {
          ok: false,
          status: 500,
          message: "Admin verification unavailable.",
        };
      }
      return {
        ok: false,
        status: 401,
        message: "Invalid or expired admin token.",
      };
    }

    const { claims } = verification;
    return {
      ok: true,
      userId: typeof claims.sub === "string" ? claims.sub : undefined,
    };
  }

  if (initData) {
    return await verifyAdminInitData(initData);
  }

  return {
    ok: false,
    status: 401,
    message: "Admin authentication required.",
  };
}

export function getAdminHeaders(): string[] {
  return [ADMIN_TOKEN_HEADER, ADMIN_INIT_DATA_HEADER, AUTHORIZATION_HEADER];
}

export function isAdminVerificationFailure(
  result: AdminVerificationResult,
): result is AdminVerificationFailure {
  return result.ok === false;
}
