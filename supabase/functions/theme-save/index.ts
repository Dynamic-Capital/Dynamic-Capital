// >>> DC BLOCK: theme-save-core (start)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { internalError, toSafeError } from "../_shared/http.ts";
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

export async function handler(req: Request): Promise<Response> {
  const uid = parseToken(req.headers.get("authorization") || "");
  if (!uid) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
    });
  }
  const { mode } = await req.json().catch(() => ({}));
  if (!["auto", "light", "dark"].includes(mode)) {
    return new Response(JSON.stringify({ ok: false, error: "bad mode" }), {
      status: 400,
    });
  }
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
      setting_value: mode,
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
  } catch (error) {
    const safeError = toSafeError(error);
    console.error("Failed to persist theme preference", safeError);
    return internalError(safeError.message, {
      message: "Unable to persist theme preference.",
    });
  }
}

if (import.meta.main) serve(handler);

export default handler;
// <<< DC BLOCK: theme-save-core (end)
