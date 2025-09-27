import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
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

    console.log("Starting to clear pending payments...");

    // Clear all pending payments
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .update({ status: "cancelled" })
      .eq("status", "pending")
      .select();

    if (paymentsError) {
      console.error("Error clearing payments:", paymentsError);
      return oops(`Failed to clear payments: ${paymentsError.message}`);
    }

    console.log(`Cleared ${payments?.length || 0} pending payments`);

    // Clear pending user subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("user_subscriptions")
      .update({ payment_status: "cancelled" })
      .eq("payment_status", "pending")
      .select();

    if (subscriptionsError) {
      console.error("Error clearing subscriptions:", subscriptionsError);
    } else {
      console.log(
        `Cleared ${subscriptions?.length || 0} pending subscriptions`,
      );
    }

    // Clear pending education enrollments
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("education_enrollments")
      .update({ payment_status: "cancelled" })
      .eq("payment_status", "pending")
      .select();

    if (enrollmentsError) {
      console.error("Error clearing enrollments:", enrollmentsError);
    } else {
      console.log(`Cleared ${enrollments?.length || 0} pending enrollments`);
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

    if (sessionsError) {
      console.error("Error clearing sessions:", sessionsError);
    } else {
      console.log(`Cleared ${sessions?.length || 0} active sessions`);
    }

    console.log("Payment clearing completed successfully");

    return json(
      {
        success: true,
        cleared: {
          payments: payments?.length || 0,
          subscriptions: subscriptions?.length || 0,
          enrollments: enrollments?.length || 0,
          sessions: sessions?.length || 0,
        },
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error("Error in admin-clear-payments:", error);
    return oops((error as Error).message);
  }
}

if (import.meta.main) {
  serve(handler);
}

export default handler;
