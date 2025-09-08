import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { corsHeaders, ok, bad, unauth, oops } from "../_shared/http.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON");
  }

  const { telegram_id, payment_id, receipt_url, receipt_file_path } = body;

  if (!telegram_id || !payment_id) {
    return bad("Missing required fields");
  }

  console.log("Receipt submission:", { telegram_id, payment_id, receipt_url, receipt_file_path });

  const supa = createClient();

  try {
    // Update payment with receipt information
    const { error: paymentError } = await supa
      .from("payments")
      .update({
        status: "pending",
        webhook_data: {
          receipt_url,
          receipt_file_path,
          submitted_at: new Date().toISOString()
        }
      })
      .eq("id", payment_id);

    if (paymentError) {
      console.error("Payment update error:", paymentError);
      return oops("Failed to update payment");
    }

    // Update user subscription if exists
    const { error: subscriptionError } = await supa
      .from("user_subscriptions")
      .update({
        payment_status: "pending",
        receipt_file_path
      })
      .eq("telegram_user_id", telegram_id);

    if (subscriptionError) {
      console.log("Subscription update error (non-critical):", subscriptionError);
    }

    console.log("Receipt submitted successfully for payment:", payment_id);

    return ok({
      success: true,
      message: "Receipt submitted successfully",
      payment_id
    }, corsHeaders);

  } catch (error) {
    console.error("Receipt submission error:", error);
    return oops("Internal server error");
  }
});