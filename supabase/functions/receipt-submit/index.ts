import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { getEnv } from "../_shared/env.ts";
import { json } from "../_shared/http.ts";
import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AMOUNT_TOLERANCE = Number(Deno.env.get("AMOUNT_TOLERANCE") ?? "0.02");

async function activateSubscription(
  supa: ReturnType<typeof createClient>,
  paymentId: string,
) {
  try {
    const { error } = await supa.rpc("finalize_completed_payment", {
      p_payment_id: paymentId,
    });
    if (error) {
      console.error("finalize_completed_payment failed", error);
    }
  } catch (err) {
    console.error("finalize_completed_payment threw", err);
  }
}

type Body = {
  payment_id: string;
  storage_path?: string;
  file_path?: string;
  storage_bucket?: string;
  telegram_id?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  // Check for web auth first
  const authHeader = req.headers.get("Authorization");
  let telegramId: string | null = null;
  
  if (authHeader) {
    // Web user authentication
    const supaAuth = createSupabaseClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_ANON_KEY"),
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );

    const { data: { user } } = await supaAuth.auth.getUser();
    if (user) {
      telegramId = user.user_metadata?.telegram_id || user.id;
    }
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400, headers: corsHeaders });
  }

  // Use telegram_id from auth or from body (for bot usage)
  const finalTelegramId = telegramId || body.telegram_id;
  if (!finalTelegramId) {
    return json({ error: "unauthorized" }, 401, corsHeaders);
  }

  const supa = createClient();
  
  // Support both old (storage_path) and new (file_path) parameter names
  const storagePath = body.file_path || body.storage_path;
  if (!storagePath) {
    return new Response("Missing file path", { status: 400, headers: corsHeaders });
  }

  const { error } = await supa
    .from("payments")
    .update({
      status: "pending",
      webhook_data: {
        storage_bucket: body.storage_bucket || "payment-receipts",
        storage_path: storagePath,
      },
    })
    .eq("id", body.payment_id);
  if (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: corsHeaders },
    );
  }

  // Trigger OCR of the uploaded receipt
  const ref = (Deno.env.get("SUPABASE_URL") || "");
  let ocr: Record<string, unknown> | null = null;
  try {
    const host = new URL(ref).hostname.split(".")[0];
    const r = await fetch(`https://${host}.functions.supabase.co/receipt-ocr`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payment_id: body.payment_id }),
    });
    const j = await r.json().catch(() => ({}));
    ocr = j.ocr || null;
  } catch {
    ocr = null;
  }

  // Load payment and plan for comparison
  const { data: pay } = await supa.from("payments")
    .select("id, plan_id, amount, currency, webhook_data")
    .eq("id", body.payment_id)
    .maybeSingle();
  if (!pay) {
    return new Response(
      JSON.stringify({ ok: false, error: "Payment not found" }),
      { status: 404 },
    );
  }

  const { data: plan } = await supa.from("subscription_plans")
    .select("price,currency")
    .eq("id", pay.plan_id)
    .maybeSingle();

  const amt = Number(ocr?.amount);
  const expAmt = Number(plan?.price ?? pay.amount);
  const within = isFinite(amt) && isFinite(expAmt)
    ? Math.abs(amt - expAmt) <= (expAmt * AMOUNT_TOLERANCE + 0.01)
    : false;
  const curOK = (ocr?.currency || "").toUpperCase() ===
    (plan?.currency ?? pay.currency ?? "").toUpperCase();
  const merged = {
    ...(pay.webhook_data || {}),
    ocr,
    ocr_at: new Date().toISOString(),
  };

  if (ocr && within && curOK) {
    await supa.from("payments").update({
      status: "completed",
      webhook_data: merged,
    }).eq("id", pay.id);
    await activateSubscription(supa, pay.id);
    return new Response(
      JSON.stringify({ ok: true, status: "completed" }),
      { headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  }

  await supa.from("payments").update({ webhook_data: merged }).eq(
    "id",
    pay.id,
  );
  await supa.from("admin_logs").insert({
    admin_telegram_id: "system",
    action_type: "ocr_mismatch",
    action_description: `OCR mismatch for payment ${pay.id}`,
    affected_table: "payments",
    affected_record_id: pay.id,
    new_values: { ocr },
  });

  return new Response(
    JSON.stringify({ ok: true, status: "pending" }),
    { headers: { ...corsHeaders, "content-type": "application/json" } },
  );
});
