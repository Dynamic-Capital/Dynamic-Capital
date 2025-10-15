import { optionalEnv } from "../_shared/env.ts";
import { bad, json, mna, ok, oops } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import {
  buildDataCheckString,
  extractHashFromEntries,
  parseInitDataEntries,
  parseTgUser,
} from "../_shared/telegram.ts";

const allowList = new Set(
  (Deno.env.get("MINIAPP_ORIGIN") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

const allowHeaders = "authorization, x-client-info, apikey, content-type";

function corsHeaders(origin: string | null): HeadersInit {
  return origin
    ? {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": allowHeaders,
    }
    : {};
}

function withCors(r: Response, origin: string | null) {
  Object.entries(corsHeaders(origin)).forEach(([k, v]) =>
    r.headers.set(k, v as string)
  );
  return r;
}

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function verifyInitData(initData: string) {
  const encoder = new TextEncoder();
  const botToken = optionalEnv("TELEGRAM_BOT_TOKEN") || "";
  if (!botToken) {
    return { ok: false, error: "BOT_TOKEN_NOT_SET" } as const;
  }

  const entries = parseInitDataEntries(initData);
  if (!entries) {
    return { ok: false, error: "INVALID_INIT_DATA" } as const;
  }

  const providedHash = extractHashFromEntries(entries);
  if (!providedHash) return { ok: false, error: "MISSING_HASH" } as const;

  const dataCheckString = buildDataCheckString(entries);

  const secretKey = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(botToken),
  );
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    encoder.encode(dataCheckString),
  );
  const signatureHex = hex(signature).toLowerCase();
  const normalizedHash = providedHash.toLowerCase();
  if (!timingSafeEqual(signatureHex, normalizedHash)) {
    return { ok: false, error: "HASH_MISMATCH" } as const;
  }

  const params = new URLSearchParams(initData);
  const authDate = Number(params.get("auth_date") || "0");
  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 60 * 60 * 24) {
    return { ok: false, error: "AUTH_DATE_EXPIRED" } as const;
  }

  let user: unknown = null;
  const userJson = params.get("user");
  if (userJson) {
    user = parseTgUser(userJson);
  }

  return { ok: true, user } as const;
}

export default async function handler(req: Request) {
  const origin = req.headers.get("Origin");
  if (origin && !allowList.has(origin)) {
    return json({ ok: false, error: "Forbidden" }, 403);
  }
  const url = new URL(req.url);
  if (req.method === "OPTIONS") {
    return json({}, 200, corsHeaders(origin) as Record<string, string>);
  }
  if (req.method === "HEAD" && url.pathname.endsWith("/version")) {
    return withCors(ok(), origin);
  }
  if (req.method === "GET" && url.pathname.endsWith("/version")) {
    return withCors(
      ok({ name: "verify-telegram", ts: new Date().toISOString() }),
      origin,
    );
  }
  if (req.method !== "POST") return withCors(mna(), origin);

  try {
    const { initData } = await req.json().catch(() => ({ initData: "" }));
    if (!initData || typeof initData !== "string") {
      return withCors(bad("MISSING_INIT_DATA"), origin);
    }

    const result = await verifyInitData(initData);
    if (!result.ok) return withCors(bad(result.error), origin);
    return withCors(ok({ user: result.user }), origin);
  } catch (err) {
    console.error("verify-telegram error", err);
    return withCors(oops("SERVER_ERROR", String(err)), origin);
  }
}

registerHandler(handler);
