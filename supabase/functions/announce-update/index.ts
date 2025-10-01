import { envOrSetting } from "../_shared/config.ts";
import { registerHandler } from "../_shared/serve.ts";

interface AnnouncePayload {
  version?: unknown;
  features?: unknown;
}

interface TelegramResponse {
  ok?: boolean;
  description?: string;
  result?: unknown;
}

const DEFAULT_VERSION = "v1.0";
const DEFAULT_FEATURE = "Bug fixes and improvements";
const DEFAULT_MINI_APP_URL = "https://mini.dynamic.capital/miniapp/";
const PROTOCOL_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;

function ensureProtocol(value: string): string {
  return PROTOCOL_PATTERN.test(value) ? value : `https://${value}`;
}

function normalizeMiniAppUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate = ensureProtocol(trimmed);

  try {
    const parsed = new URL(candidate);
    const isHttps = parsed.protocol === "https:";
    if (!parsed.pathname) {
      parsed.pathname = "/";
    } else if (
      isHttps &&
      !parsed.pathname.endsWith("/") &&
      !parsed.search &&
      !parsed.hash
    ) {
      parsed.pathname = `${parsed.pathname}/`;
    }
    return parsed.toString();
  } catch (_error) {
    return null;
  }
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
};

function normalizeVersion(version: unknown): string {
  if (typeof version !== "string") return DEFAULT_VERSION;
  const trimmed = version.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_VERSION;
}

function normalizeFeatures(features: unknown): string[] {
  if (!Array.isArray(features)) return [];

  return features
    .map((feature) => (typeof feature === "string" ? feature.trim() : ""))
    .filter((feature) => feature.length > 0);
}

export async function resolveMiniAppUrl(): Promise<string> {
  const configured = normalizeMiniAppUrl(
    await envOrSetting<string>("MINI_APP_URL"),
  );
  if (configured) {
    return configured;
  }

  return DEFAULT_MINI_APP_URL;
}

async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  miniAppUrl: string,
): Promise<TelegramResponse> {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "Open Mini App 🌐", url: miniAppUrl }]],
        },
      }),
    },
  );

  let payload: TelegramResponse | null = null;
  try {
    payload = await response.json();
  } catch (_error) {
    // ignore json parse error and fall through to error handler below
  }

  if (!response.ok || !payload?.ok) {
    const reason = payload?.description ??
      `Telegram API error ${response.status}`;
    throw new Error(reason);
  }

  return payload;
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { version, features } = (await req.json()) as AnnouncePayload;

    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    const chatId = Deno.env.get("ANNOUNCE_CHAT_ID");
    if (!chatId) {
      throw new Error("ANNOUNCE_CHAT_ID is not configured");
    }

    const miniAppUrl = await resolveMiniAppUrl();
    const versionLabel = normalizeVersion(version);
    const featureList = normalizeFeatures(features);
    const featuresForResponse = featureList.length > 0
      ? featureList
      : [DEFAULT_FEATURE];

    const featuresBlock = featuresForResponse
      .map((item) => `- ${item}`)
      .join("\n");

    const message =
      `🚀 *Dynamic Capital Mini App ${versionLabel} is Live!*\n\n` +
      `✨ What’s New:\n${featuresBlock}\n\n` +
      `👉 [Open Mini App](${miniAppUrl})`;

    const telegramResponse = await sendTelegramMessage(
      token,
      chatId,
      message,
      miniAppUrl,
    );

    return new Response(
      JSON.stringify({
        success: true,
        version: versionLabel,
        features: featuresForResponse,
        miniAppUrl,
        telegramResponse,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("announce-update error", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

export default handler;
