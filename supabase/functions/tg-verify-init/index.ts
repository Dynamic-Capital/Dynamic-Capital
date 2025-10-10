// >>> DC BLOCK: tg-verify-core (start)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { internalError, toSafeError } from "../_shared/http.ts";
import { getEnv } from "../_shared/env.ts";
import { signHS256 } from "../_shared/jwt.ts";
import { verifyInitData } from "../_shared/telegram_init.ts";

async function signSession(user_id: number, ttlSeconds = 1800) {
  const secret = getEnv("SESSION_JWT_SECRET");
  const now = Math.floor(Date.now() / 1000);
  return await signHS256({
    sub: user_id,
    iat: now,
    exp: now + ttlSeconds,
  }, secret);
}

async function handler(req: Request): Promise<Response> {
  try {
    const { initData } = await req.json();
    if (!initData) {
      return new Response(
        JSON.stringify({ ok: false, error: "initData required" }),
        { status: 400 },
      );
    }
    const p = new URLSearchParams(initData);
    const auth = Number(p.get("auth_date") || "0");
    const age = Math.floor(Date.now() / 1000) - auth;
    const MAX_AGE = 15 * 60; // 15 minutes
    if (isNaN(auth) || age > MAX_AGE) {
      return new Response(
        JSON.stringify({ ok: false, error: "initData expired" }),
        { status: 401 },
      );
    }
    const ok = await verifyInitData(initData, 0);
    if (!ok) {
      return new Response(
        JSON.stringify({ ok: false, error: "bad signature" }),
        { status: 401 },
      );
    }
    const user = JSON.parse(p.get("user") || "{}");
    const uid = Number(user?.id || 0);
    if (!uid) {
      return new Response(JSON.stringify({ ok: false, error: "no user id" }), {
        status: 400,
      });
    }
    const token = await signSession(uid);
    return new Response(
      JSON.stringify({
        ok: true,
        user_id: uid,
        username: user?.username,
        session_token: token,
      }),
      {
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    const safeError = toSafeError(error);
    console.error("Failed to initialize Telegram verification", safeError);
    return internalError(error, {
      message: "Failed to initialize verification session.",
      safeError,
    });
  }
}

if (import.meta.main) serve(handler);

export default handler;
// <<< DC BLOCK: tg-verify-core (end)
