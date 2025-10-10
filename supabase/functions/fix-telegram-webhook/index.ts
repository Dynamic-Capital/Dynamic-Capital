import { requireEnv } from "../_shared/env.ts";
import {
  expectedSecret,
  TELEGRAM_ALLOWED_UPDATES_JSON,
} from "../_shared/telegram_secret.ts";
import { registerHandler } from "../_shared/serve.ts";
import { json } from "../_shared/http.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { TELEGRAM_BOT_TOKEN, SUPABASE_URL } = requireEnv(
      ["TELEGRAM_BOT_TOKEN", "SUPABASE_URL"] as const,
    );

    const secret = await expectedSecret();
    if (!secret) {
      return json(
        { error: "TELEGRAM_WEBHOOK_SECRET not configured" },
        500,
        corsHeaders,
      );
    }

    const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot`;

    // Step 1: Get current webhook info
    const infoRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`,
    );
    const currentInfo = await infoRes.json();

    // Step 2: Delete existing webhook
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`,
      { method: "POST" },
    );

    // Step 3: Set new webhook with correct secret
    const setRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret,
          allowed_updates: JSON.parse(TELEGRAM_ALLOWED_UPDATES_JSON),
          drop_pending_updates: true,
        }),
      },
    );

    const setResult = await setRes.json();

    // Step 4: Verify new webhook
    const verifyRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`,
    );
    const newInfo = await verifyRes.json();

    return json(
      {
        success: setResult.ok,
        previous_webhook: currentInfo.result?.url,
        new_webhook: webhookUrl,
        verification: newInfo.result,
        message: setResult.ok
          ? "✅ Webhook configured successfully! Send a test message to your bot."
          : `❌ Failed: ${setResult.description}`,
      },
      setResult.ok ? 200 : 500,
      corsHeaders,
    );
  } catch (error) {
    console.error("Error fixing webhook:", error);
    return json(
      { error: error instanceof Error ? error.message : String(error) },
      500,
      corsHeaders,
    );
  }
});

export default handler;
