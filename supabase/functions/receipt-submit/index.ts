import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { json, bad, unauth, oops } from "../_shared/http.ts";
import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getEnv } from "../_shared/env.ts";
import { verifyInitData } from "../_shared/telegram_init.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Attempt to identify user via Supabase session
  const authHeader = req.headers.get("Authorization");
  let telegramId: string | null = null;
  if (authHeader) {
    try {
      const supaAuth = createSupabaseClient(
        getEnv("SUPABASE_URL"),
        getEnv("SUPABASE_ANON_KEY"),
        { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
      );
      const { data: { user } } = await supaAuth.auth.getUser();
      if (user) {
        telegramId = user.user_metadata?.telegram_id || user.id;
      }
    } catch (e) {
      console.warn("Auth check failed", e);
    }
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON");
  }

  const { payment_id, file_path, bucket, initData, telegram_id } = body;

  // If no auth, try Telegram initData
  if (!telegramId && initData) {
    try {
      const valid = await verifyInitData(initData);
      if (valid) {
        const params = new URLSearchParams(initData);
        const user = JSON.parse(params.get("user") || "{}");
        telegramId = String(user.id || "");
      } else {
        return unauth("Invalid Telegram initData");
      }
    } catch (err) {
      console.error("Error verifying Telegram initData:", err);
      return unauth("Telegram verification failed");
    }
  }

  // Fallback to explicit telegram_id (e.g., from bot)
  if (!telegramId && telegram_id) {
    telegramId = String(telegram_id);
  }

  if (!payment_id || !file_path) {
    return bad("Missing required fields");
  }

  console.log("Receipt submission:", { telegramId, payment_id, file_path, bucket });

  const supa = createClient();

  try {
    // Update payment with receipt information
    const { error: paymentError } = await supa
      .from("payments")
      .update({
        status: "pending",
        webhook_data: {
          file_path,
          bucket,
          submitted_at: new Date().toISOString(),
        },
      })
      .eq("id", payment_id);

    if (paymentError) {
      console.error("Payment update error:", paymentError);
      return oops("Failed to update payment");
    }

    // Update user subscription if we know the user
    if (telegramId) {
      const { error: subscriptionError } = await supa
        .from("user_subscriptions")
        .update({
          payment_status: "pending",
          receipt_file_path: file_path,
        })
        .eq("telegram_user_id", telegramId);

      if (subscriptionError) {
        console.log("Subscription update error (non-critical):", subscriptionError);
      }
    }

    console.log("Receipt submitted successfully for payment:", payment_id);

    return json({
      ok: true,
      success: true,
      message: "Receipt submitted successfully",
      payment_id,
    }, 200, corsHeaders);
  } catch (error) {
    console.error("Receipt submission error:", error);
    return oops("Internal server error");
  }
});
