import { createHmac, timingSafeEqual } from "node:crypto";

import { buildFunctionUrl } from "@/config/supabase";
import { SUPABASE_ANON_KEY } from "@/config/supabase-runtime";
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

function verifyAdminToken(
  token: string,
  secret: string,
): AdminTokenClaims | null {
  const segments = splitJwt(token);
  if (!segments) {
    return null;
  }
  const [headerSegment, payloadSegment, signatureSegment] = segments;

  let headerRaw: unknown;
  try {
    const decodedHeader = base64UrlDecodeStrict(headerSegment);
    if (!decodedHeader) {
      return null;
    }
    headerRaw = JSON.parse(decodedHeader.toString("utf-8"));
  } catch {
    return null;
  }

  if (!headerRaw || typeof headerRaw !== "object" || Array.isArray(headerRaw)) {
    return null;
  }

  const header = headerRaw as { alg?: string };

  if (header.alg !== "HS256") {
    return null;
  }

  const signingInput = `${headerSegment}.${payloadSegment}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(signingInput)
    .digest();
  const providedSignature = base64UrlDecodeStrict(signatureSegment);
  if (!providedSignature) {
    return null;
  }

  if (
    expectedSignature.length !== providedSignature.length ||
    !timingSafeEqual(
      new Uint8Array(expectedSignature),
      new Uint8Array(providedSignature),
    )
  ) {
    return null;
  }

  let payloadRaw: unknown;
  try {
    const decodedPayload = base64UrlDecodeStrict(payloadSegment);
    if (!decodedPayload) {
      return null;
    }
    payloadRaw = JSON.parse(decodedPayload.toString("utf-8"));
  } catch {
    return null;
  }

  if (
    !payloadRaw || typeof payloadRaw !== "object" || Array.isArray(payloadRaw)
  ) {
    return null;
  }

  const payload = payloadRaw as AdminTokenClaims;

  if (payload.admin !== true) {
    return null;
  }

  if (
    typeof payload.exp === "number" &&
    payload.exp <= Math.floor(Date.now() / 1000)
  ) {
    return null;
  }

  return payload;
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
    const secret = getEnvVar("ADMIN_API_SECRET");
    if (!secret) {
      console.error(
        "ADMIN_API_SECRET is not configured; refusing admin-only request.",
      );
      return {
        ok: false,
        status: 500,
        message: "Admin verification unavailable.",
      };
    }

    const payload = verifyAdminToken(token, secret);
    if (!payload) {
      return {
        ok: false,
        status: 401,
        message: "Invalid or expired admin token.",
      };
    }

    return {
      ok: true,
      userId: typeof payload.sub === "string" ? payload.sub : undefined,
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
