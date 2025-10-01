import { createSupabaseClient } from "../_shared/client.ts";
import { registerHandler } from "../_shared/serve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface TelegramBotSyncRequest {
  action:
    | "sync_user"
    | "sync_payment"
    | "sync_subscription"
    | "get_user_status";
  telegram_user_id: string;
  data?: any;
}

export const handler = registerHandler(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { action, telegram_user_id, data }: TelegramBotSyncRequest = await req
      .json();

    if (!telegram_user_id) {
      return new Response(
        JSON.stringify({ error: "telegram_user_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `Processing telegram bot sync: ${action} for user ${telegram_user_id}`,
    );

    switch (action) {
      case "sync_user":
        return await syncUser(supabase, telegram_user_id, data);

      case "sync_payment":
        return await syncPayment(supabase, telegram_user_id, data);

      case "sync_subscription":
        return await syncSubscription(supabase, telegram_user_id, data);

      case "get_user_status":
        return await getUserStatus(supabase, telegram_user_id);

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
    }
  } catch (error) {
    console.error("Error in telegram-bot-sync:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

async function syncUser(
  supabase: any,
  telegram_user_id: string,
  userData: any,
) {
  try {
    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from("bot_users")
      .select("*")
      .eq("telegram_id", telegram_user_id)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (existingUser) {
      // Update existing user
      const { data, error } = await supabase
        .from("bot_users")
        .update({
          first_name: userData.first_name,
          last_name: userData.last_name,
          username: userData.username,
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_id", telegram_user_id)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, user: data, action: "updated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      // Create new user
      const { data, error } = await supabase
        .from("bot_users")
        .insert({
          telegram_id: telegram_user_id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          username: userData.username,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, user: data, action: "created" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("Error syncing user:", error);
    return new Response(
      JSON.stringify({ error: "Failed to sync user" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

async function syncPayment(
  supabase: any,
  telegram_user_id: string,
  paymentData: any,
) {
  try {
    // Get user ID
    const { data: user, error: userError } = await supabase
      .from("bot_users")
      .select("id")
      .eq("telegram_id", telegram_user_id)
      .single();

    if (userError || !user) {
      throw new Error("User not found");
    }

    // Create or update payment record
    const { data, error } = await supabase
      .from("payments")
      .upsert({
        user_id: user.id,
        plan_id: paymentData.plan_id,
        amount: paymentData.amount,
        currency: paymentData.currency || "USD",
        payment_method: paymentData.payment_method,
        payment_provider_id: paymentData.payment_provider_id,
        status: paymentData.status || "pending",
        webhook_data: paymentData.webhook_data || {},
      })
      .select()
      .single();

    if (error) throw error;

    // Log the payment sync
    await supabase.from("admin_logs").insert({
      admin_telegram_id: "telegram_bot",
      action_type: "payment_sync",
      action_description: `Payment synced for user ${telegram_user_id}`,
      affected_table: "payments",
      affected_record_id: data.id,
    });

    return new Response(
      JSON.stringify({ success: true, payment: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error syncing payment:", error);
    return new Response(
      JSON.stringify({ error: "Failed to sync payment" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

async function syncSubscription(
  supabase: any,
  telegram_user_id: string,
  subscriptionData: any,
) {
  try {
    // Create or update subscription
    const { data, error } = await supabase
      .from("user_subscriptions")
      .upsert({
        telegram_user_id: telegram_user_id,
        plan_id: subscriptionData.plan_id,
        payment_status: subscriptionData.payment_status || "pending",
        is_active: subscriptionData.is_active || false,
        subscription_start_date: subscriptionData.subscription_start_date,
        subscription_end_date: subscriptionData.subscription_end_date,
        payment_method: subscriptionData.payment_method,
        payment_instructions: subscriptionData.payment_instructions,
        bank_details: subscriptionData.bank_details,
      }, { onConflict: "telegram_user_id" })
      .select()
      .single();

    if (error) throw error;

    // Update bot_users table if subscription is active
    if (subscriptionData.is_active) {
      await supabase
        .from("bot_users")
        .update({
          is_vip: true,
          current_plan_id: subscriptionData.plan_id,
          subscription_expires_at: subscriptionData.subscription_end_date,
        })
        .eq("telegram_id", telegram_user_id);
    }

    // Log the subscription sync
    await supabase.from("admin_logs").insert({
      admin_telegram_id: "telegram_bot",
      action_type: "subscription_sync",
      action_description: `Subscription synced for user ${telegram_user_id}`,
      affected_table: "user_subscriptions",
      affected_record_id: data.id,
    });

    return new Response(
      JSON.stringify({ success: true, subscription: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error syncing subscription:", error);
    return new Response(
      JSON.stringify({ error: "Failed to sync subscription" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

async function getUserStatus(supabase: any, telegram_user_id: string) {
  try {
    // Get comprehensive user status
    const { data: userData, error: userError } = await supabase
      .from("bot_users")
      .select(`
        *,
        user_subscriptions (
          *,
          subscription_plans (*)
        )
      `)
      .eq("telegram_id", telegram_user_id)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    if (!userData) {
      return new Response(
        JSON.stringify({
          exists: false,
          is_vip: false,
          subscription_status: "none",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get recent payments
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userData.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
    }

    const status = {
      exists: true,
      user: userData,
      payments: payments || [],
      is_vip: userData.is_vip,
      subscription_status: userData.user_subscriptions?.[0]?.payment_status ||
        "none",
      subscription_expires_at: userData.subscription_expires_at,
    };

    return new Response(
      JSON.stringify(status),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error getting user status:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get user status" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

export default handler;
