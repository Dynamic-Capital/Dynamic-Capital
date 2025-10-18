import { Buffer } from "node:buffer";
import type { NextRequest } from "next/server";

import { callEdgeFunction } from "@/config/supabase";
import { withApiMetrics } from "@/observability/server-metrics.ts";
import {
  type AdminVerificationFailure,
  isAdminVerificationFailure,
  verifyAdminRequest,
} from "@/utils/admin-auth.ts";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE_NAME = "/api/admin/session";
const ADMIN_SESSION_COOKIE = "dc_admin_session";
const DEFAULT_SESSION_MAX_AGE = 60 * 60; // 1 hour

const CALL_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.admin-session.call-override",
);

type AdminSessionFunctionPayload = {
  readonly initData: string;
};

type AdminSessionFunctionResult = {
  readonly token?: unknown;
  readonly exp?: unknown;
  readonly user_id?: unknown;
  readonly userId?: unknown;
  readonly initData?: unknown;
  readonly init_data?: unknown;
};

type AdminSessionFunctionCallResult = {
  readonly data?: AdminSessionFunctionResult;
  readonly error?: { status: number; message: string };
  readonly status?: number;
};

type AdminSessionFunctionCaller = (
  payload: AdminSessionFunctionPayload,
  request: Request,
) => Promise<AdminSessionFunctionCallResult>;

interface AdminTokenClaims {
  readonly sub?: unknown;
  readonly exp?: unknown;
  readonly admin?: unknown;
  readonly initData?: unknown;
  readonly init_data?: unknown;
}

const NO_STORE_HEADERS = { "cache-control": "no-store" } as const;

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseCookies(
  header: string | null | undefined,
): Record<string, string> {
  if (!header) {
    return {};
  }

  const result: Record<string, string> = {};
  const pieces = header.split(/;\s*/u);
  for (const piece of pieces) {
    if (!piece) continue;
    const [name, ...rest] = piece.split("=");
    if (!name) continue;
    const key = name.trim();
    if (!key) continue;
    const value = rest.join("=").trim();
    result[key] = value;
  }
  return result;
}

function readAdminSessionCookie(req: Request): string | null {
  const cookiesHeader = req.headers.get("cookie");
  const cookies = parseCookies(cookiesHeader);
  const token = cookies[ADMIN_SESSION_COOKIE];
  return token ? token : null;
}

function normalizeBase64Url(segment: string): string {
  const sanitized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padding = sanitized.length % 4;
  if (padding === 0) {
    return sanitized;
  }
  return sanitized + "=".repeat(4 - padding);
}

function decodeJwtClaims(token: string): AdminTokenClaims | null {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }

  const payloadSegment = segments[1];

  try {
    const decoded = Buffer.from(
      normalizeBase64Url(payloadSegment),
      "base64",
    ).toString("utf-8");
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as AdminTokenClaims;
  } catch {
    return null;
  }
}

function computeMaxAge(exp: number | null | undefined): number {
  if (typeof exp !== "number" || !Number.isFinite(exp)) {
    return DEFAULT_SESSION_MAX_AGE;
  }
  const secondsUntilExpiry = Math.floor(exp - Date.now() / 1000);
  if (secondsUntilExpiry <= 0) {
    return 0;
  }
  return secondsUntilExpiry;
}

function buildSessionCookie(token: string, exp?: number | null): string {
  const maxAge = computeMaxAge(exp ?? undefined);
  const segments = [
    `${ADMIN_SESSION_COOKIE}=${token}`,
    "Path=/",
    `Max-Age=${Math.max(0, maxAge)}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (exp && Number.isFinite(exp)) {
    const expires = new Date(exp * 1000).toUTCString();
    segments.push(`Expires=${expires}`);
  }
  if (process.env.NODE_ENV === "production") {
    segments.push("Secure");
  }
  return segments.join("; ");
}

function buildExpiredSessionCookie(): string {
  const segments = [
    `${ADMIN_SESSION_COOKIE}=`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") {
    segments.push("Secure");
  }
  return segments.join("; ");
}

function appendSessionCookie(response: Response, value: string) {
  response.headers.append("set-cookie", value);
}

function resolveAdminSessionFunction(): AdminSessionFunctionCaller {
  const override = (globalThis as Record<PropertyKey, unknown>)[
    CALL_OVERRIDE_SYMBOL
  ];
  if (override) {
    return override as AdminSessionFunctionCaller;
  }

  return async (payload) =>
    await callEdgeFunction<AdminSessionFunctionResult>("ADMIN_SESSION", {
      method: "POST",
      body: payload,
    });
}

async function verifyAdminToken(token: string): Promise<
  | { ok: true; userId?: string }
  | AdminVerificationFailure
> {
  const verificationRequest = new Request("http://localhost/admin-token", {
    headers: new Headers({ "x-admin-token": token }),
  });
  const result = await verifyAdminRequest(verificationRequest);
  return result;
}

function extractUserId(
  data: AdminSessionFunctionResult,
  claims: AdminTokenClaims | null,
  verificationResult: { ok: true; userId?: string },
): string | undefined {
  const { userId, user_id } = data;
  if (typeof userId === "string" && userId.trim().length > 0) {
    return userId;
  }
  if (typeof user_id === "string" && user_id.trim().length > 0) {
    return user_id;
  }
  if (verificationResult.userId) {
    return verificationResult.userId;
  }
  const subject = claims?.sub;
  return typeof subject === "string" && subject.trim().length > 0
    ? subject
    : undefined;
}

function extractExp(
  data: AdminSessionFunctionResult,
  claims: AdminTokenClaims | null,
): number | undefined {
  const candidate = data.exp ?? claims?.exp;
  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return candidate;
  }
  if (typeof candidate === "string") {
    const parsed = Number.parseInt(candidate, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function extractInitData(
  data: AdminSessionFunctionResult,
  requestInitData: string | null,
  claims: AdminTokenClaims | null,
): string | undefined {
  const initDataFromBody = data.initData ?? data.init_data;
  if (
    typeof initDataFromBody === "string" && initDataFromBody.trim().length > 0
  ) {
    return initDataFromBody;
  }
  if (
    typeof claims?.initData === "string" && claims.initData.trim().length > 0
  ) {
    return claims.initData;
  }
  if (
    typeof claims?.init_data === "string" &&
    claims.init_data.trim().length > 0
  ) {
    return claims.init_data;
  }
  return requestInitData ?? undefined;
}

async function handleTokenBasedSession(
  req: NextRequest,
  token: string,
  initData: string | null,
) {
  const verification = await verifyAdminToken(token);
  if (isAdminVerificationFailure(verification)) {
    const response = jsonResponse(
      { ok: false, error: verification.message },
      { status: verification.status, headers: NO_STORE_HEADERS },
      req,
    );
    appendSessionCookie(response, buildExpiredSessionCookie());
    return response;
  }

  const claims = decodeJwtClaims(token);
  const exp = typeof claims?.exp === "number" ? claims.exp : undefined;
  const userId = verification.userId ??
    (typeof claims?.sub === "string" ? claims.sub : undefined);
  const response = jsonResponse(
    {
      ok: true,
      userId,
      exp,
      ...(initData ? { initData } : {}),
    },
    { headers: NO_STORE_HEADERS },
    req,
  );
  appendSessionCookie(response, buildSessionCookie(token, exp));
  return response;
}

async function handleInitDataSession(
  req: NextRequest,
  initData: string,
) {
  const callFunction = resolveAdminSessionFunction();
  const result = await callFunction({ initData }, req);

  if (!result || (result.error && result.error.status === 0)) {
    const message = result?.error?.message ??
      "Failed to reach admin session service";
    return jsonResponse(
      { ok: false, error: message },
      { status: 502, headers: NO_STORE_HEADERS },
      req,
    );
  }

  if (result.error) {
    const status = result.error.status || 401;
    const response = jsonResponse(
      { ok: false, error: result.error.message },
      { status, headers: NO_STORE_HEADERS },
      req,
    );
    if (status === 401) {
      appendSessionCookie(response, buildExpiredSessionCookie());
    }
    return response;
  }

  const data = result.data ?? {};
  const token = normalizeString(data.token);
  if (!token) {
    return jsonResponse(
      { ok: false, error: "Admin session token missing from response" },
      { status: 502, headers: NO_STORE_HEADERS },
      req,
    );
  }

  const verification = await verifyAdminToken(token);
  if (isAdminVerificationFailure(verification)) {
    const response = jsonResponse(
      { ok: false, error: verification.message },
      { status: verification.status, headers: NO_STORE_HEADERS },
      req,
    );
    appendSessionCookie(response, buildExpiredSessionCookie());
    return response;
  }

  const claims = decodeJwtClaims(token);
  const exp = extractExp(data, claims);
  const userId = extractUserId(data, claims, verification);
  const resolvedInitData = extractInitData(data, initData, claims);

  const response = jsonResponse(
    {
      ok: true,
      userId,
      exp,
      ...(resolvedInitData ? { initData: resolvedInitData } : {}),
    },
    { headers: NO_STORE_HEADERS },
    req,
  );

  appendSessionCookie(response, buildSessionCookie(token, exp));
  return response;
}

export async function POST(req: NextRequest) {
  return withApiMetrics(req, ROUTE_NAME, async () => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { ok: false, error: "Invalid JSON body" },
        { status: 400, headers: NO_STORE_HEADERS },
        req,
      );
    }

    const payload = body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};
    const initData = normalizeString(
      payload.initData ?? (payload.init_data as unknown),
    );
    const token = normalizeString(payload.token);

    if (!initData && !token) {
      return jsonResponse(
        { ok: false, error: "Provide initData or token" },
        { status: 400, headers: NO_STORE_HEADERS },
        req,
      );
    }

    if (token) {
      return await handleTokenBasedSession(req, token, initData);
    }

    if (!initData) {
      return jsonResponse(
        { ok: false, error: "initData is required" },
        { status: 400, headers: NO_STORE_HEADERS },
        req,
      );
    }

    return await handleInitDataSession(req, initData);
  });
}

export async function GET(req: NextRequest) {
  return withApiMetrics(req, ROUTE_NAME, async () => {
    const token = readAdminSessionCookie(req);
    if (!token) {
      return jsonResponse(
        { ok: false, error: "Admin session not found" },
        { status: 401, headers: NO_STORE_HEADERS },
        req,
      );
    }

    const verification = await verifyAdminToken(token);
    if (isAdminVerificationFailure(verification)) {
      const response = jsonResponse(
        { ok: false, error: verification.message },
        { status: verification.status, headers: NO_STORE_HEADERS },
        req,
      );
      appendSessionCookie(response, buildExpiredSessionCookie());
      return response;
    }

    const claims = decodeJwtClaims(token);
    const exp = extractExp({}, claims);
    const userId = verification.userId ??
      (typeof claims?.sub === "string" ? claims.sub : undefined);

    const response = jsonResponse(
      { ok: true, userId, exp },
      { headers: NO_STORE_HEADERS },
      req,
    );
    appendSessionCookie(response, buildSessionCookie(token, exp));
    return response;
  });
}

export async function DELETE(req: NextRequest) {
  return withApiMetrics(req, ROUTE_NAME, async () => {
    const response = jsonResponse(
      { ok: true },
      { headers: NO_STORE_HEADERS },
      req,
    );
    appendSessionCookie(response, buildExpiredSessionCookie());
    return response;
  });
}

export function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req, "GET, POST, DELETE"),
  });
}

export function PUT(req: NextRequest) {
  return methodNotAllowed(req);
}

export function PATCH(req: NextRequest) {
  return methodNotAllowed(req);
}

export function HEAD(req: NextRequest) {
  return methodNotAllowed(req);
}
