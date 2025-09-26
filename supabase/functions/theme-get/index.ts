// >>> DC BLOCK: theme-get-core (start)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getSetting } from "../_shared/config.ts";

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

function parseThemePreference(
  value: unknown,
): { mode: ThemeMode; themePass?: { id: string; metadata?: unknown } | null } {
  const fallback: ThemeMode = "auto";

  if (typeof value === "string") {
    try {
      return parseThemePreference(JSON.parse(value));
    } catch {
      return { mode: isThemeMode(value) ? value : fallback };
    }
  }

  if (value && typeof value === "object") {
    const candidate = value as { mode?: unknown; themePass?: unknown };
    const mode = isThemeMode(candidate.mode) ? candidate.mode : fallback;
    let themePass = null;
    const rawThemePass = candidate.themePass;
    if (rawThemePass && typeof rawThemePass === "object") {
      const { id, metadata } = rawThemePass as {
        id?: unknown;
        metadata?: unknown;
      };
      if (typeof id === "string" && id.length > 0) {
        if (metadata && typeof metadata === "object") {
          themePass = { id, metadata };
        } else {
          themePass = { id };
        }
      }
    }
    return { mode, themePass };
  }

  return { mode: fallback };
}

export async function handler(req: Request): Promise<Response> {
  const uid = parseToken(req.headers.get("authorization") || "");
  if (!uid) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
    });
  }
  const stored = await getSetting<unknown>(`theme:${uid}`);
  const preference = parseThemePreference(stored ?? "auto");
  return new Response(JSON.stringify(preference), {
    headers: { "content-type": "application/json" },
  });
}

if (import.meta.main) serve(handler);

export default handler;
// <<< DC BLOCK: theme-get-core (end)
