// scripts/post-deploy-hook.ts
// Automatically updates Telegram mini app URL after deployment
// This can be called from CI/CD or manually after deployments

const PROJECT_REF = Deno.env.get("SUPABASE_PROJECT_REF") ||
  Deno.env.get("SUPABASE_PROJECT_ID");
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

console.log("🚀 Post-deployment hook: Updating Telegram configuration...");

if (!PROJECT_REF) {
  console.warn("⚠️  SUPABASE_PROJECT_REF not set, skipping Telegram update");
  Deno.exit(0);
}

if (!TELEGRAM_BOT_TOKEN) {
  console.warn("⚠️  TELEGRAM_BOT_TOKEN not set, skipping Telegram update");
  Deno.exit(0);
}

try {
  // Call the update function
  const updateUrl =
    `https://${PROJECT_REF}.functions.supabase.co/update-telegram-miniapp`;

  const response = await fetch(updateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": WEBHOOK_SECRET || "default-secret",
    },
  });

  const result = await response.json();

  if (result.success) {
    console.log("✅ Telegram configuration updated successfully!");
    console.log(`🔗 Mini App URL: ${result.miniAppUrl}`);
    console.log(`🤖 Bot: @${result.botInfo?.username}`);
    console.log(`📱 Updated: ${result.wasUpdated ? "Yes" : "Already current"}`);
  } else {
    console.error("❌ Failed to update Telegram configuration:", result.error);
    Deno.exit(1);
  }
} catch (error) {
  console.error("❌ Error in post-deployment hook:", error.message);
  Deno.exit(1);
}
