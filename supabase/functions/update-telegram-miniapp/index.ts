import { envOrSetting } from "../_shared/config.ts";
import { expectedSecret } from "../_shared/telegram_secret.ts";
import { functionUrl } from "../_shared/edge.ts";
import { registerHandler } from "../_shared/serve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

async function callTelegramAPI(
  botToken: string,
  method: string,
  body?: any,
): Promise<TelegramResponse> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  return await response.json();
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Admin authentication for manual updates
    if (req.method === "POST") {
      const adminSecret = req.headers.get("x-admin-secret");
      const expectedAdminSecret = await expectedSecret();

      if (adminSecret !== expectedAdminSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const botToken = await envOrSetting<string>("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN not configured");
    }

    // Auto-detect mini app URL or use configured one
    let miniAppUrl = await envOrSetting<string>("MINI_APP_URL");

    if (!miniAppUrl) {
      // Auto-derive from current project
      const autoUrl = functionUrl("miniapp");
      miniAppUrl = autoUrl
        ? (autoUrl.endsWith("/") ? autoUrl : `${autoUrl}/`)
        : null;
    }

    if (!miniAppUrl) {
      throw new Error("MINI_APP_URL not configured and cannot auto-detect");
    }

    console.log("Updating Telegram Mini App URL to:", miniAppUrl);

    // Get current menu button to check if update is needed
    const currentMenuResponse = await callTelegramAPI(
      botToken,
      "getChatMenuButton",
    );

    let needsUpdate = true;
    if (currentMenuResponse.ok && currentMenuResponse.result?.web_app?.url) {
      const currentUrl = currentMenuResponse.result.web_app.url;
      needsUpdate = currentUrl !== miniAppUrl;
      console.log(
        "Current URL:",
        currentUrl,
        "New URL:",
        miniAppUrl,
        "Needs update:",
        needsUpdate,
      );
    }

    let menuButtonResult: TelegramResponse = { ok: true };

    if (needsUpdate) {
      // Update the chat menu button
      menuButtonResult = await callTelegramAPI(botToken, "setChatMenuButton", {
        menu_button: {
          type: "web_app",
          text: "Open VIP App",
          web_app: {
            url: miniAppUrl,
          },
        },
      });

      if (!menuButtonResult.ok) {
        throw new Error(
          `Failed to update menu button: ${menuButtonResult.description}`,
        );
      }
    }

    // Get bot info for verification
    const botInfoResponse = await callTelegramAPI(botToken, "getMe");

    if (!botInfoResponse.ok) {
      throw new Error(`Failed to get bot info: ${botInfoResponse.description}`);
    }

    // Also update webhook if needed (for consistency)
    const webhookUrl = functionUrl("telegram-bot");
    const webhookSecret = await expectedSecret();

    let webhookResult: TelegramResponse = { ok: true };

    if (webhookUrl && webhookSecret) {
      const currentWebhookResponse = await callTelegramAPI(
        botToken,
        "getWebhookInfo",
      );

      if (currentWebhookResponse.ok) {
        const currentWebhookUrl = currentWebhookResponse.result?.url;

        if (currentWebhookUrl !== webhookUrl) {
          console.log(
            "Updating webhook URL from",
            currentWebhookUrl,
            "to",
            webhookUrl,
          );

          webhookResult = await callTelegramAPI(botToken, "setWebhook", {
            url: webhookUrl,
            secret_token: webhookSecret,
            drop_pending_updates: true,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: needsUpdate
          ? "Mini App URL updated successfully"
          : "Mini App URL already up to date",
        botInfo: {
          username: botInfoResponse.result?.username,
          first_name: botInfoResponse.result?.first_name,
          id: botInfoResponse.result?.id,
        },
        miniAppUrl,
        wasUpdated: needsUpdate,
        menuButtonSet: menuButtonResult.ok,
        webhookUpdated: webhookResult.ok,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Mini App update error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

export default handler;
