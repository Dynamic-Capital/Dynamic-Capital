// >>> DC BLOCK: theme-save-core (start)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { optionalEnv, requireEnv } from "../_shared/env.ts";

function parseToken(bearer: string | undefined) {
  if (!bearer?.startsWith("Bearer ")) return 0;
  const raw = atob(bearer.slice(7).split(".")[0] || "");
  try {
    return JSON.parse(raw).sub || 0;
  } catch {
    return 0;
  }
}

type ThemeMode = "auto" | "light" | "dark";

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "auto" || value === "light" || value === "dark";
}

function sanitizeThemePass(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const { id, metadata } = value as { id?: unknown; metadata?: unknown };
  if (typeof id !== "string" || id.length === 0) {
    return null;
  }
  if (metadata && typeof metadata === "object") {
    return { id, metadata };
  }
  return { id };
}

export async function handler(req: Request): Promise<Response> {
  const uid = parseToken(req.headers.get("authorization") || "");
  if (!uid) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
    });
  }
  const { mode, themePass } = await req.json().catch(() => ({}));
  if (!isThemeMode(mode)) {
    return new Response(JSON.stringify({ ok: false, error: "bad mode" }), {
      status: 400,
    });
  }
  const normalizedThemePass = sanitizeThemePass(themePass);
  const payload = JSON.stringify({ mode, themePass: normalizedThemePass });
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = requireEnv(
      [
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
      ] as const,
    );
    const key = optionalEnv("SUPABASE_SERVICE_ROLE_KEY") || SUPABASE_ANON_KEY;
    // upsert into bot_settings
    const body = [{
      setting_key: `theme:${uid}`,
      setting_value: payload,
      description: "miniapp theme",
      is_system: false,
    }];
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bot_settings`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(body),
    });
    const ok = r.ok;
    return new Response(JSON.stringify({ ok }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
    });
  }
}

if (import.meta.main) serve(handler);

export default handler;
// <<< DC BLOCK: theme-save-core (end)
