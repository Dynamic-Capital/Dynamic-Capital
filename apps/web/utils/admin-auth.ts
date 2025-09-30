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

function base64UrlDecode(segment: string): Buffer {
  return Buffer.from(normalizeBase64Url(segment), "base64");
}

function verifyAdminToken(
  token: string,
  secret: string,
): AdminTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [headerSegment, payloadSegment, signatureSegment] = parts;

  let header: { alg?: string };
  try {
    header = JSON.parse(base64UrlDecode(headerSegment).toString("utf-8"));
  } catch {
    return null;
  }

  if (header.alg !== "HS256") {
    return null;
  }

  const signingInput = `${headerSegment}.${payloadSegment}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(signingInput)
    .digest();
  const providedSignature = base64UrlDecode(signatureSegment);

  if (
    expectedSignature.length !== providedSignature.length ||
    !timingSafeEqual(expectedSignature, providedSignature)
  ) {
    return null;
  }

  let payload: AdminTokenClaims;
  try {
    payload = JSON.parse(base64UrlDecode(payloadSegment).toString("utf-8"));
  } catch {
    return null;
  }

  if (!payload || payload.admin !== true) {
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

async function verifyAdminInitData(initData: string): Promise<AdminVerificationResult> {
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
  const token = req.headers.get(ADMIN_TOKEN_HEADER)?.trim();
  const initData = req.headers.get(ADMIN_INIT_DATA_HEADER)?.trim();

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
  return [ADMIN_TOKEN_HEADER, ADMIN_INIT_DATA_HEADER];
}

export function isAdminVerificationFailure(
  result: AdminVerificationResult,
): result is AdminVerificationFailure {
  return result.ok === false;
}
