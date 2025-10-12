import { registerHandler } from "../_shared/serve.ts";
import { createSupabaseClient } from "../_shared/client.ts";
import { functionsHost } from "../_shared/edge.ts";
import { normalizeMiniAppUrl } from "./url.ts";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN not configured");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const fallbackMiniAppUrl = (() => {
      const host = functionsHost();
      return host
        ? `https://${host}/miniapp/`
        : "https://stub.functions.supabase.co/miniapp/";
    })();
    const lovableMiniAppUrl = normalizeMiniAppUrl(
      Deno.env.get("MINI_APP_URL") ?? fallbackMiniAppUrl,
    );

    console.log("Setting up Dynamic Mini App with URL:", lovableMiniAppUrl);

    // Initialize Supabase client
    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

    // Store the Dynamic URL as a bot setting
    const { error: settingError } = await supabase
      .from("bot_settings")
      .upsert({
        setting_key: "MINI_APP_URL",
        setting_value: lovableMiniAppUrl,
        description: "Dynamic Mini App URL for Telegram integration",
        is_active: true,
        updated_at: new Date().toISOString(),
      });

    if (settingError) {
      console.error("Failed to store bot setting:", settingError);
      throw new Error(`Failed to store bot setting: ${settingError.message}`);
    }

    // Set the chat menu button to open the Dynamic mini app
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
              url: lovableMiniAppUrl,
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
        message: "Dynamic Mini App setup completed successfully",
        botInfo: {
          username: botInfo.result?.username,
          first_name: botInfo.result?.first_name,
          id: botInfo.result?.id,
        },
        miniAppUrl: lovableMiniAppUrl,
        menuButtonSet: menuButtonResult.ok,
        commandsSet: commandsResult.ok,
        botSettingStored: !settingError,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Dynamic Mini App setup error:", error);
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
