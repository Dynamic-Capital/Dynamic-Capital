import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { getEnv } from "../_shared/env.ts";
import {
  expectedSecret,
  TELEGRAM_ALLOWED_UPDATES,
} from "../_shared/telegram_secret.ts";
import { json, mna, oops } from "../_shared/http.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return mna();
  }

  try {
    const supabase = createClient();
    const results = {
      payments_cleared: 0,
      subscriptions_cleared: 0,
      enrollments_cleared: 0,
      sessions_cleared: 0,
      bot_reset: false,
      webhook_info: null,
      bot_info: null,
    };

    console.log("=== ADMIN SYSTEM RESET STARTED ===");

    // STEP 1: Clear all pending payments and reset user data
    console.log("Step 1: Clearing pending payments...");

    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .update({ status: "cancelled" })
      .eq("status", "pending")
      .select();

    if (paymentsError) {
      console.error("Error clearing payments:", paymentsError);
    } else {
      results.payments_cleared = payments?.length || 0;
      console.log(`✓ Cleared ${results.payments_cleared} pending payments`);
    }

    // Clear pending user subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("user_subscriptions")
      .update({ payment_status: "cancelled" })
      .eq("payment_status", "pending")
      .select();

    if (!subscriptionsError) {
      results.subscriptions_cleared = subscriptions?.length || 0;
      console.log(
        `✓ Cleared ${results.subscriptions_cleared} pending subscriptions`,
      );
    }

    // Clear pending education enrollments
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("education_enrollments")
      .update({ payment_status: "cancelled" })
      .eq("payment_status", "pending")
      .select();

    if (!enrollmentsError) {
      results.enrollments_cleared = enrollments?.length || 0;
      console.log(
        `✓ Cleared ${results.enrollments_cleared} pending enrollments`,
      );
    }

    // Reset active user sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("user_sessions")
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
        end_reason: "admin_reset",
      })
      .eq("is_active", true)
      .select();

    if (!sessionsError) {
      results.sessions_cleared = sessions?.length || 0;
      console.log(`✓ Cleared ${results.sessions_cleared} active sessions`);
    }

    // STEP 2: Reset Telegram Bot
    console.log("Step 2: Resetting Telegram bot...");

    try {
      const botToken = getEnv("TELEGRAM_BOT_TOKEN");
      const supabaseUrl = getEnv("SUPABASE_URL");
      const secret = await expectedSecret();

      if (!secret) {
        throw new Error("TELEGRAM_WEBHOOK_SECRET not configured");
      }

      // Delete the current webhook
      const deleteResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/deleteWebhook`,
        { method: "POST" },
      );
      const deleteResult = await deleteResponse.json();
      console.log("✓ Webhook deleted:", deleteResult.ok);

      // Clear any pending updates
      const clearUpdatesResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/getUpdates?offset=-1`,
        { method: "POST" },
      );
      const clearUpdatesResult = await clearUpdatesResponse.json();
      console.log("✓ Pending updates cleared");

      // Re-establish the webhook
      const webhookUrl = `${supabaseUrl}/functions/v1/telegram-bot`;
      const allowedUpdates = Array.from(TELEGRAM_ALLOWED_UPDATES);

      const setWebhookResponse = await fetch(
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

      const webhookResult = await setWebhookResponse.json();
      console.log("✓ Webhook reestablished:", webhookResult.ok);

      if (webhookResult.ok) {
        results.bot_reset = true;

        // Get webhook info to confirm
        const infoResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/getWebhookInfo`,
        );
        const webhookInfo = await infoResponse.json();
        results.webhook_info = webhookInfo.result;

        // Test bot responsiveness
        const botInfoResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/getMe`,
        );
        const botInfo = await botInfoResponse.json();
        results.bot_info = botInfo.result;

        console.log("✓ Bot is responsive and ready");
      }
    } catch (botError) {
      console.error("Bot reset failed:", botError);
      results.bot_reset = false;
    }

    console.log("=== ADMIN SYSTEM RESET COMPLETED ===");

    return json(
      {
        success: true,
        message: "System reset completed successfully!",
        results,
        steps_completed: [
          `Cleared ${results.payments_cleared} pending payments`,
          `Cleared ${results.subscriptions_cleared} pending subscriptions`,
          `Cleared ${results.enrollments_cleared} pending enrollments`,
          `Reset ${results.sessions_cleared} active sessions`,
          results.bot_reset
            ? "Bot webhook reset successfully"
            : "Bot reset failed - check logs",
        ],
        timestamp: new Date().toISOString(),
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error("Error in admin-reset-system:", error);
    return oops(`System reset failed: ${(error as Error).message}`);
  }
}

if (import.meta.main) {
  serve(handler);
}

export default handler;
