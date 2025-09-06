import { envOrSetting } from "./config.ts";
import { functionUrl } from "./edge.ts";

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
