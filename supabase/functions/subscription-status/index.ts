import { createClient } from "../_shared/client.ts";
import { corsHeaders } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    const headers = corsHeaders(req, "POST");
    return new Response(null, { headers });
  }

  try {
    const { telegram_user_id } = await req.json();

    if (!telegram_user_id) {
      return new Response(
        JSON.stringify({ error: "telegram_user_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient();

    // Get subscription status with details
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .rpc("get_user_subscription_status", { telegram_user_id });

    if (subscriptionError) {
      console.error("Subscription status error:", subscriptionError);
      return new Response(
        JSON.stringify({ error: "Failed to get subscription status" }),
        {
          status: 500,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    // Get subscription plans for upgrading
    const { data: plansData, error: plansError } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("price", { ascending: true });

    if (plansError) {
      console.error("Plans fetch error:", plansError);
    }

    const subscription = subscriptionData?.[0] || {
      is_vip: false,
      plan_name: null,
      subscription_end_date: null,
      days_remaining: null,
      payment_status: null,
      is_expired: true,
    };

    // Return the subscription data directly (not wrapped in another object)
    return new Response(
      JSON.stringify(subscription),
      {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in subscription-status:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }
});

export default handler;
