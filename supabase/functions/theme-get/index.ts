// >>> DC BLOCK: theme-get-core (start)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getSetting } from "../_shared/config.ts";
import { isThemePassId } from "../../../shared/theme/passes.ts";

type StoredThemeSetting = {
  mode?: "auto" | "light" | "dark";
  themePassId?: string | null;
  updatedAt?: string;
};

function parseStoredSetting(raw: unknown): StoredThemeSetting {
  if (!raw) return { mode: "auto", themePassId: null };
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "auto" || trimmed === "light" || trimmed === "dark") {
      return { mode: trimmed, themePassId: null };
    }
    try {
      const parsed = JSON.parse(trimmed) as StoredThemeSetting;
      return {
        mode: parsed.mode ?? "auto",
        themePassId: parsed.themePassId ?? null,
        updatedAt: parsed.updatedAt,
      };
    } catch {
      return { mode: "auto", themePassId: null };
    }
  }
  if (typeof raw === "object") {
    const record = raw as StoredThemeSetting;
    const mode = record.mode;
    const themePassId = record.themePassId ?? null;
    return {
      mode: mode === "light" || mode === "dark" || mode === "auto"
        ? mode
        : "auto",
      themePassId,
      updatedAt: record.updatedAt,
    };
  }
  return { mode: "auto", themePassId: null };
}

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
  const stored = await getSetting<string | StoredThemeSetting>(`theme:${uid}`);
  const { mode, themePassId, updatedAt } = parseStoredSetting(stored);
  return new Response(
    JSON.stringify({
      mode,
      themePassId: isThemePassId(themePassId) ? themePassId : null,
      updatedAt: updatedAt ?? null,
    }),
    {
      headers: { "content-type": "application/json" },
    },
  );
}

if (import.meta.main) serve(handler);

export default handler;
// <<< DC BLOCK: theme-get-core (end)
