import { createSupabaseClient } from "../_shared/client.ts";
import { registerHandler } from "../_shared/serve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const miniAppUrl = Deno.env.get("MINI_APP_URL");

    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN not configured");
    }

    if (!miniAppUrl) {
      throw new Error("MINI_APP_URL not configured");
    }

    console.log("Setting up Telegram Mini App with URL:", miniAppUrl);

    // Set the chat menu button to open the mini app
    const menuButtonResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/setChatMenuButton`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_button: {
            type: "web_app",
            text: "Open VIP App",
            web_app: {
              url: miniAppUrl,
            },
          },
        }),
      },
    );

    const menuButtonResult: TelegramResponse = await menuButtonResponse.json();

    if (!menuButtonResult.ok) {
      throw new Error(
        `Failed to set menu button: ${menuButtonResult.description}`,
      );
    }

    // Get bot info to verify setup
    const botInfoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`,
    );

    const botInfo: TelegramResponse = await botInfoResponse.json();

    if (!botInfo.ok) {
      throw new Error(`Failed to get bot info: ${botInfo.description}`);
    }

    // Set bot commands with mini app integration
    const commandsResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/setMyCommands`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commands: [
            {
              command: "start",
              description: "Start and open VIP Mini App",
            },
            {
              command: "app",
              description: "Open VIP Mini App",
            },
            {
              command: "status",
              description: "Check subscription status",
            },
            {
              command: "help",
              description: "Get help and support",
            },
          ],
        }),
      },
    );

    const commandsResult: TelegramResponse = await commandsResponse.json();

    if (!commandsResult.ok) {
      console.warn("Failed to set commands:", commandsResult.description);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Mini App setup completed successfully",
        botInfo: {
          username: botInfo.result?.username,
          first_name: botInfo.result?.first_name,
          id: botInfo.result?.id,
        },
        miniAppUrl,
        menuButtonSet: menuButtonResult.ok,
        commandsSet: commandsResult.ok,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Mini App setup error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

export default handler;
