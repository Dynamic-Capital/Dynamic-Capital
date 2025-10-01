import { envOrSetting } from "./config.ts";
import { functionUrl } from "./edge.ts";
import { optionalEnv } from "./env.ts";

interface MiniAppEnv {
  url: string | null;
  short: string | null;
  ready?: boolean;
}

export async function readMiniAppEnv(): Promise<MiniAppEnv> {
  const urlRaw = await envOrSetting<string>("MINI_APP_URL");
  const short = await envOrSetting<string>("MINI_APP_SHORT_NAME");

  let url = urlRaw?.startsWith("https://")
    ? (urlRaw.endsWith("/") ? urlRaw : `${urlRaw}/`)
    : null;

  // Auto-derive URL from project ref if not configured
  if (!url && !short) {
    const autoUrl = functionUrl("miniapp");
    url = autoUrl ? (autoUrl.endsWith("/") ? autoUrl : `${autoUrl}/`) : null;
  }

  return { url, short: short ?? null, ready: Boolean(url || short) };
}

/** Ensure that either MINI_APP_URL or MINI_APP_SHORT_NAME is configured. */
export function requireMiniAppEnv(): void {
  const hasUrl = Boolean(optionalEnv("MINI_APP_URL"));
  const hasShort = Boolean(optionalEnv("MINI_APP_SHORT_NAME"));
  if (hasUrl || hasShort) {
    return;
  }

  // Fall back to auto-derived function URL when Supabase project metadata is set.
  if (functionUrl("miniapp")) {
    return;
  }

  throw new Error("MINI_APP_URL or MINI_APP_SHORT_NAME must be set");
}
