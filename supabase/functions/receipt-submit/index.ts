import { createClient, createSupabaseClient } from "../_shared/client.ts";
import { json, bad, unauth, oops } from "../_shared/http.ts";
import { getEnv } from "../_shared/env.ts";
import { verifyInitData } from "../_shared/telegram_init.ts";
import { registerHandler } from "../_shared/serve.ts";
import { hashBlob } from "../_shared/hash.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const handler = registerHandler(async (req) => {
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

  const supa = createClient("service");

  try {
    const { data: payment, error: paymentLookupError } = await supa
      .from("payments")
      .select("id,user_id,webhook_data")
      .eq("id", payment_id)
      .maybeSingle();

    if (paymentLookupError) {
      console.error("Payment lookup error:", paymentLookupError);
    }
    if (!payment) {
      return oops("Payment not found");
    }

    const storageBucket = typeof bucket === "string" && bucket
      ? bucket
      : "payment-receipts";
    const { data: downloaded, error: downloadError } = await supa.storage
      .from(storageBucket)
      .download(file_path);

    if (downloadError || !downloaded) {
      console.error("Receipt download error:", downloadError);
      return oops("Failed to read receipt");
    }

    const imageHash = await hashBlob(downloaded);

    const { data: existing, error: duplicateCheckError } = await supa
      .from("receipts")
      .select("id,payment_id,user_id,file_url")
      .eq("image_sha256", imageHash)
      .limit(1)
      .maybeSingle();

    if (duplicateCheckError) {
      console.error("Receipt duplicate check error:", duplicateCheckError);
    }

    if (existing) {
      await supa.storage.from(storageBucket).remove([file_path]).catch((err) => {
        console.warn("Failed to remove duplicate receipt upload", err);
      });
      return json({
        ok: false,
        error: "duplicate_receipt",
        message:
          "This receipt was already submitted. Please upload a new image.",
      }, 409, corsHeaders);
    }

    const baseWebhookData =
      typeof payment.webhook_data === "object" && payment.webhook_data !== null
        ? payment.webhook_data
        : {};
    const submittedAt = new Date().toISOString();
    const webhookData = {
      ...baseWebhookData,
      file_path,
      bucket: storageBucket,
      storage_path: file_path,
      storage_bucket: storageBucket,
      image_sha256: imageHash,
      submitted_at: submittedAt,
    };

    const { error: paymentError } = await supa
      .from("payments")
      .update({
        status: "pending",
        webhook_data: webhookData,
      })
      .eq("id", payment_id);

    if (paymentError) {
      console.error("Payment update error:", paymentError);
      return oops("Failed to update payment");
    }

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

    const { error: receiptInsertError } = await supa.from("receipts").insert({
      payment_id,
      user_id: payment.user_id,
      file_url: file_path,
      image_sha256: imageHash,
    });

    if (receiptInsertError) {
      console.error("Receipt insert error:", receiptInsertError);
      return oops("Failed to register receipt");
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

export default handler;
