// scripts/update-telegram-miniapp.ts
// Ensures Telegram chat menu button always points to the latest mini app version
// Usage: deno run -A scripts/update-telegram-miniapp.ts

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const PROJECT_REF = Deno.env.get("SUPABASE_PROJECT_REF") ||
  Deno.env.get("SUPABASE_PROJECT_ID");

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is required");
  Deno.exit(1);
}

if (!PROJECT_REF) {
  console.error("❌ SUPABASE_PROJECT_REF or SUPABASE_PROJECT_ID is required");
  Deno.exit(1);
}

type TelegramRequestBody = Record<string, unknown>;

interface TelegramAPIResponse {
  ok: boolean;
  description?: string;
  result?: {
    web_app?: { url?: string };
    username?: string;
    first_name?: string;
  };
}

async function callTelegramAPI(
  method: string,
  body?: TelegramRequestBody,
): Promise<TelegramAPIResponse> {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  return await response.json() as TelegramAPIResponse;
}

try {
  console.log("🔄 Updating Telegram Mini App URL...");

  // Auto-detect the current mini app URL
  const miniAppUrl = `https://${PROJECT_REF}.functions.supabase.co/miniapp/`;
  console.log("🎯 Target Mini App URL:", miniAppUrl);

  // Get current menu button
  console.log("📋 Checking current menu button...");
  const currentMenuResponse = await callTelegramAPI("getChatMenuButton");

  if (!currentMenuResponse.ok) {
    throw new Error(
      `Failed to get current menu button: ${currentMenuResponse.description}`,
    );
  }

  const currentUrl = currentMenuResponse.result?.web_app?.url;
  console.log("📍 Current URL:", currentUrl || "(none)");

  if (currentUrl === miniAppUrl) {
    console.log("✅ Mini App URL is already up to date!");
    Deno.exit(0);
  }

  // Update the menu button
  console.log("🔧 Updating menu button...");
  const updateResponse = await callTelegramAPI("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "Open VIP App",
      web_app: {
        url: miniAppUrl,
      },
    },
  });

  if (!updateResponse.ok) {
    throw new Error(
      `Failed to update menu button: ${updateResponse.description}`,
    );
  }

  // Verify the update
  console.log("✅ Verifying update...");
  const verifyResponse = await callTelegramAPI("getChatMenuButton");

  if (verifyResponse.ok && verifyResponse.result?.web_app?.url === miniAppUrl) {
    console.log("🎉 Successfully updated Telegram Mini App URL!");
    console.log("🔗 New URL:", miniAppUrl);
  } else {
    console.warn(
      "⚠️  Update may not have taken effect immediately. Please check manually.",
    );
  }

  // Get bot info for confirmation
  const botInfoResponse = await callTelegramAPI("getMe");
  if (botInfoResponse.ok) {
    console.log(
      `🤖 Bot: @${botInfoResponse.result.username} (${botInfoResponse.result.first_name})`,
    );
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("❌ Error updating Telegram Mini App URL:", message);
  Deno.exit(1);
}
