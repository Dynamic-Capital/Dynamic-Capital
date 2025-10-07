import { createClient } from "../_shared/client.ts";
import { optionalEnv, requireEnv } from "../_shared/env.ts";
import { registerHandler } from "../_shared/serve.ts";

const { TELEGRAM_BOT_TOKEN: BOT_TOKEN } = requireEnv(
  [
    "TELEGRAM_BOT_TOKEN",
  ] as const,
);

const supabaseAdmin = createClient();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Session timeout settings
const SESSION_TIMEOUT_MINUTES = Number(
  optionalEnv("SESSION_TIMEOUT_MINUTES") ?? "30",
);
const FOLLOW_UP_DELAY_MINUTES = Number(
  optionalEnv("FOLLOW_UP_DELAY_MINUTES") ?? "10",
);
const MAX_FOLLOW_UPS = Number(
  optionalEnv("MAX_FOLLOW_UPS") ?? "3",
);

type SessionRow = {
  id: string;
  telegram_user_id: string;
};

type FollowUpUser = {
  id: string;
  telegram_id: string;
  follow_up_count: number | null;
};

async function sendTelegramMessage(chatId: number, text: string) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "Markdown",
        }),
      },
    );
    return await response.json();
  } catch (error) {
    console.error("Error sending telegram message:", error);
    return null;
  }
}

function normaliseError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function cleanupOldSessions(): Promise<number> {
  try {
    console.log("Starting session cleanup...");

    // Get sessions that haven't been active for more than SESSION_TIMEOUT_MINUTES
    const timeoutThreshold = new Date(
      Date.now() - SESSION_TIMEOUT_MINUTES * 60 * 1000,
    );

    const { data: inactiveSessions, error } = await supabaseAdmin
      .from("user_sessions")
      .select("id, telegram_user_id")
      .lt("last_activity", timeoutThreshold.toISOString())
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching inactive sessions:", error);
      return 0;
    }

    console.log(
      `Found ${inactiveSessions?.length || 0} inactive sessions to cleanup`,
    );

    // Process each inactive session
    const sessions = (inactiveSessions ?? []) as SessionRow[];
    for (const session of sessions) {
      // Mark session as inactive
      await supabaseAdmin
        .from("user_sessions")
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          end_reason: "timeout",
        })
        .eq("id", session.id);

      console.log(`Cleaned up session for user ${session.telegram_user_id}`);
    }

    return sessions.length;
  } catch (error) {
    console.error("Error in cleanupOldSessions:", error);
    return 0;
  }
}

async function sendFollowUpMessages(): Promise<number> {
  try {
    console.log("Checking for users needing follow-up messages...");

    // Get users who haven't been active for FOLLOW_UP_DELAY_MINUTES
    const followUpThreshold = new Date(
      Date.now() - FOLLOW_UP_DELAY_MINUTES * 60 * 1000,
    );

    const { data: inactiveUsers, error } = await supabaseAdmin
      .from("bot_users")
      .select("id, telegram_id, follow_up_count")
      .lt("updated_at", followUpThreshold.toISOString())
      .lt("follow_up_count", MAX_FOLLOW_UPS);

    if (error) {
      console.error("Error fetching inactive users:", error);
      return 0;
    }

    console.log(
      `Found ${inactiveUsers?.length || 0} users for follow-up messages`,
    );

    const followUpMessages = [
      "👋 Hey there! We noticed you were exploring our VIP packages. Need any help choosing the right plan for you?",
      "💡 Quick reminder: Our VIP packages offer exclusive trading signals and community access. Would you like to know more?",
      "🚀 Don't miss out! Our VIP community is waiting for you. Ready to take your trading to the next level?",
    ];

    // Send follow-up messages
    const users = (inactiveUsers ?? []) as FollowUpUser[];
    for (const user of users) {
      const messageIndex = Math.min(
        user.follow_up_count || 0,
        followUpMessages.length - 1,
      );
      const message = followUpMessages[messageIndex];

      const result = await sendTelegramMessage(
        parseInt(user.telegram_id),
        message,
      );

      if (result && result.ok) {
        // Update follow-up count
        await supabaseAdmin
          .from("bot_users")
          .update({
            follow_up_count: (user.follow_up_count || 0) + 1,
            last_follow_up: new Date().toISOString(),
          })
          .eq("id", user.id);

        console.log(
          `Sent follow-up ${
            (user.follow_up_count || 0) + 1
          } to user ${user.telegram_id}`,
        );
      }
    }

    return users.length;
  } catch (error) {
    console.error("Error in sendFollowUpMessages:", error);
    return 0;
  }
}

async function cleanupOldMessages(): Promise<number> {
  try {
    console.log("Cleaning up old messages...");

    // Delete messages older than 7 days
    const cleanupThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const { data: oldMessages, error } = await supabaseAdmin
      .from("user_interactions")
      .select("telegram_user_id")
      .lt("created_at", cleanupThreshold.toISOString())
      .eq("interaction_type", "message");

    if (error) {
      console.error("Error fetching old messages:", error);
      return 0;
    }

    // Delete old interaction records
    const { error: deleteError } = await supabaseAdmin
      .from("user_interactions")
      .delete()
      .lt("created_at", cleanupThreshold.toISOString());

    if (deleteError) {
      console.error("Error deleting old messages:", deleteError);
      return 0;
    }

    console.log(`Cleaned up ${oldMessages?.length || 0} old message records`);
    return oldMessages?.length || 0;
  } catch (error) {
    console.error("Error in cleanupOldMessages:", error);
    return 0;
  }
}

async function resetStuckSessions(): Promise<number> {
  try {
    console.log("Checking for stuck user sessions...");

    // Get users stuck in input flows for more than 1 hour
    const stuckThreshold = new Date(Date.now() - 60 * 60 * 1000);

    const { data: stuckSessions, error } = await supabaseAdmin
      .from("user_sessions")
      .select("id, telegram_user_id")
      .not("awaiting_input", "is", null)
      .lt("last_activity", stuckThreshold.toISOString())
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching stuck sessions:", error);
      return 0;
    }

    console.log(`Found ${stuckSessions?.length || 0} stuck sessions to reset`);

    // Reset stuck sessions
    const sessions = (stuckSessions ?? []) as SessionRow[];
    for (const session of sessions) {
      await supabaseAdmin
        .from("user_sessions")
        .update({
          awaiting_input: null,
          package_data: null,
          promo_data: null,
          last_activity: new Date().toISOString(),
        })
        .eq("id", session.id);

      // Send reset message to user
      await sendTelegramMessage(
        parseInt(session.telegram_user_id),
        "⏰ Your session has been reset due to inactivity. Type /start to begin again or /help for assistance.",
      );

      console.log(`Reset stuck session for user ${session.telegram_user_id}`);
    }

    return sessions.length;
  } catch (error) {
    console.error("Error in resetStuckSessions:", error);
    return 0;
  }
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting automated cleanup tasks...");

    const results = await Promise.all([
      cleanupOldSessions(),
      sendFollowUpMessages(),
      cleanupOldMessages(),
      resetStuckSessions(),
    ]);

    const [sessionsCleanedUp, followUpsSent, messagesCleanedUp, sessionsReset] =
      results;

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        sessions_cleaned_up: sessionsCleanedUp,
        follow_ups_sent: followUpsSent,
        messages_cleaned_up: messagesCleanedUp,
        sessions_reset: sessionsReset,
      },
    };

    console.log("Cleanup tasks completed:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in cleanup tasks:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: normaliseError(error),
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

export default handler;
