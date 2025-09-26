// >>> DC BLOCK: theme-save-core (start)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { optionalEnv, requireEnv } from "../_shared/env.ts";
import {
  DEFAULT_THEME_PASS_ID,
  isThemePassId,
} from "../../../shared/theme/passes.ts";

function parseToken(bearer: string | undefined) {
  if (!bearer?.startsWith("Bearer ")) return 0;
  const raw = atob(bearer.slice(7).split(".")[0] || "");
  try {
    return JSON.parse(raw).sub || 0;
  } catch {
    return 0;
  }
}

type ThemeSavePayload = {
  mode: "auto" | "light" | "dark";
  themePassId: string | null;
  updatedAt: string;
};

export async function handler(req: Request): Promise<Response> {
  const uid = parseToken(req.headers.get("authorization") || "");
  if (!uid) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
    });
  }
  const { mode, themePassId } = await req.json().catch(() => ({}));
  if (!["auto", "light", "dark"].includes(mode)) {
    return new Response(JSON.stringify({ ok: false, error: "bad mode" }), {
      status: 400,
    });
  }
  const rawThemePass = typeof themePassId === "string"
    ? themePassId.trim()
    : themePassId === null
    ? null
    : undefined;
  if (
    typeof rawThemePass === "string" && rawThemePass.length > 0 &&
    !isThemePassId(rawThemePass)
  ) {
    return new Response(
      JSON.stringify({ ok: false, error: "invalid themePassId" }),
      {
        status: 400,
      },
    );
  }
  const normalizedThemePass = rawThemePass === undefined
    ? null
    : rawThemePass === null || rawThemePass === ""
    ? null
    : isThemePassId(rawThemePass)
    ? rawThemePass
    : DEFAULT_THEME_PASS_ID;
  const payload: ThemeSavePayload = {
    mode,
    themePassId: normalizedThemePass,
    updatedAt: new Date().toISOString(),
  };
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
      setting_value: JSON.stringify(payload),
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
    return new Response(
      JSON.stringify({ ok, mode, themePassId: payload.themePassId }),
      {
        headers: { "content-type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
    });
  }
}

if (import.meta.main) serve(handler);

export default handler;
// <<< DC BLOCK: theme-save-core (end)
