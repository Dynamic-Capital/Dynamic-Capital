import { getEnv, optionalEnv } from "../_shared/env.ts";
import { createLogger } from "../_shared/logger.ts";
import {
  cloneTelegramAllowedUpdates,
  ensureWebhookSecret,
} from "../_shared/telegram_secret.ts";
import { registerHandler } from "../_shared/serve.ts";
import { createClient } from "../_shared/client.ts";
import { json, mna, oops, unauth } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function getLogger(req: Request) {
  return createLogger({
    function: "setup-webhook",
    requestId: req.headers.get("sb-request-id") ||
      req.headers.get("x-request-id") ||
      crypto.randomUUID(),
  });
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return json({}, 200, corsHeaders);
  }
  const v = version(req, "setup-webhook");
  if (v) return v;
  if (req.method !== "POST") return mna();

  const logger = getLogger(req);

  const providedSecret = req.headers.get("X-Admin-Secret")?.trim() ?? "";
  const expectedSecret = optionalEnv("ADMIN_API_SECRET");
  if (!expectedSecret) {
    logger.error("ADMIN_API_SECRET is not configured; refusing request");
    return oops("Server misconfigured", undefined, req);
  }
  if (!providedSecret || !timingSafeEqual(providedSecret, expectedSecret)) {
    logger.warn("unauthorized setup-webhook attempt", {
      hasSecret: Boolean(providedSecret),
    });
    return unauth("Missing or invalid admin secret", req);
  }

  try {
    const botToken = getEnv("TELEGRAM_BOT_TOKEN");

    logger.info("Setting up Telegram webhook...");

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supa = createClient();
    const secret = await ensureWebhookSecret(supa);
    const allowedUpdates = cloneTelegramAllowedUpdates();

    const webhookUrl = `${supabaseUrl}/functions/v1/telegram-bot`;

    logger.info("Webhook URL prepared");

    const deleteResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/deleteWebhook`,
      { method: "POST" },
    );
    const deleteResult = await deleteResponse.json();
    logger.info("Delete webhook result:", deleteResult);

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret,
          allowed_updates: allowedUpdates,
          drop_pending_updates: true,
        }),
      },
    );

    const result = await response.json();
    logger.info("Webhook setup result:", result);

    if (!result.ok) {
      throw new Error(`Failed to set webhook: ${result.description}`);
    }

    const infoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`,
    );
    const webhookInfo = await infoResponse.json();
    logger.info("Webhook info:", webhookInfo);

    const botInfoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`,
    );
    const botInfo = await botInfoResponse.json();
    logger.info("Bot info:", botInfo);

    return json(
      {
        success: true,
        message: "Webhook configured successfully",
        webhook_set: result,
        webhook_info: webhookInfo.result,
        bot_info: botInfo.result,
      },
      200,
      { ...corsHeaders },
    );
  } catch (error) {
    logger.error("Error setting up webhook:", error);
    return oops(error.message);
  }
}

registerHandler(handler);

export default handler;
