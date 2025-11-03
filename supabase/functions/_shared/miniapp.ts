import { envOrSetting } from "./config.ts";
import { functionUrl } from "./edge.ts";
import { optionalEnv } from "./env.ts";

interface MiniAppEnv {
  url: string | null;
  short: string | null;
  ready?: boolean;
}

const PROTOCOL_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;

function ensureProtocol(value: string): string {
  return PROTOCOL_PATTERN.test(value) ? value : `https://${value}`;
}

export function normalizeMiniAppUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate = ensureProtocol(trimmed);

  try {
    const parsed = new URL(candidate);
    if (!parsed.pathname) {
      parsed.pathname = "/";
    } else if (
      !parsed.pathname.endsWith("/") &&
      !parsed.search &&
      !parsed.hash &&
      parsed.protocol === "https:"
    ) {
      parsed.pathname = `${parsed.pathname}/`;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function readMiniAppEnv(): Promise<MiniAppEnv> {
  const urlRaw = await envOrSetting<string>("MINI_APP_URL");
  const shortRaw = await envOrSetting<string>("MINI_APP_SHORT_NAME");

  let url = normalizeMiniAppUrl(urlRaw);
  const short = shortRaw?.trim() ? shortRaw.trim() : null;

  // Auto-derive URL from project ref if not configured
  if (!url && !short) {
    url = normalizeMiniAppUrl(functionUrl("miniapp"));
  }

  return { url, short, ready: Boolean(url || short) };
}

/** Ensure that either MINI_APP_URL or MINI_APP_SHORT_NAME is configured. */
export function requireMiniAppEnv(): void {
  const hasUrl = Boolean(normalizeMiniAppUrl(optionalEnv("MINI_APP_URL")));
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
