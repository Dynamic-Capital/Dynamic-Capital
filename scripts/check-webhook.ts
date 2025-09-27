// scripts/check-webhook.ts
/**
 * Prints Telegram getWebhookInfo:
 * - current URL
 * - has_custom_certificate
 * - pending updates
 * - last error message & date
 *
 * Requires: TELEGRAM_BOT_TOKEN in env (Supabase Edge or local).
 * Never commit secrets. For local, export TELEGRAM_BOT_TOKEN before running.
 *
 * Usage:
 *   deno run -A scripts/check-webhook.ts
 */

import { createHttpClientWithEnvCa } from "./utils/http-client.ts";

type TelegramWebhookInfo = {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_message?: string;
  last_error_date?: number;
};

type TelegramWebhookResponse = {
  ok?: boolean;
  result?: TelegramWebhookInfo;
};

async function loadFixture(path: string): Promise<TelegramWebhookInfo> {
  const text = await Deno.readTextFile(path);
  const parsed = JSON.parse(text);
  if (parsed && typeof parsed === "object" && "result" in parsed) {
    return (parsed as TelegramWebhookResponse).result ?? {};
  }
  return (parsed ?? {}) as TelegramWebhookInfo;
}

async function fetchWebhookInfo(): Promise<TelegramWebhookInfo> {
  const fixturePath = Deno.env.get("TELEGRAM_WEBHOOK_INFO_PATH");
  if (fixturePath) {
    console.log(
      `Using TELEGRAM_WEBHOOK_INFO_PATH fixture: ${fixturePath}`,
    );
    return await loadFixture(fixturePath);
  }

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) {
    console.error("Missing TELEGRAM_BOT_TOKEN");
    Deno.exit(1);
  }

  const apiBase =
    (Deno.env.get("TELEGRAM_API_BASE") ?? "https://api.telegram.org")
      .replace(/\/$/, "");
  const tlsContext = await createHttpClientWithEnvCa();
  if (tlsContext) {
    console.log(`[tls] Using ${tlsContext.description}`);
  }
  try {
    const response = await fetch(`${apiBase}/bot${token}/getWebhookInfo`, {
      client: tlsContext?.client,
    });
    const json = (await response.json()) as TelegramWebhookResponse;

    if (!json.ok) {
      console.error("Telegram API error:", json);
      Deno.exit(1);
    }

    return json.result ?? {};
  } catch (error) {
    if (
      error instanceof TypeError &&
      /UnknownIssuer/i.test(error.message ?? String(error))
    ) {
      console.error(
        "TLS validation failed: UnknownIssuer. Provide TELEGRAM_CA_CERT, ",
        "TELEGRAM_CA_BUNDLE, or set SSL_CERT_FILE to a trusted bundle.",
      );
    }
    throw error;
  } finally {
    tlsContext?.client.close();
  }
}

const info = await fetchWebhookInfo();
console.log("Webhook URL:", info.url || "(none)");
console.log("Has custom cert:", !!info.has_custom_certificate);
console.log("Pending updates:", info.pending_update_count ?? 0);
if (info.last_error_message) {
  const ts = info.last_error_date
    ? new Date(info.last_error_date * 1000).toISOString()
    : "";
  console.log("Last error:", info.last_error_message, ts ? `@ ${ts}` : "");
} else {
  console.log("No recent webhook errors recorded.");
}
