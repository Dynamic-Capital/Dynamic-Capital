import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireEnv } from "../_shared/env.ts";
import { calcFinalAmount } from "../_shared/promo.ts";
import { bad, json, mna, ok } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const v = version(req, "promo-validate");
  if (v) return v;
  if (req.method !== "POST") return mna();

  const { code, telegram_id, plan_id } = await req.json().catch(() => ({}));
  console.log("Promo validation request:", { code, telegram_id, plan_id });

  // Check required fields
  if (!code) {
    console.log("Missing promo code");
    return new Response(
      JSON.stringify({
        valid: false,
        reason: "Promo code is required",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }

  if (!plan_id) {
    console.log("Missing plan ID");
    return new Response(
      JSON.stringify({
        valid: false,
        reason: "Plan selection is required",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }

  // For web users without telegram_id, we can still validate the promo code
  const user_id = telegram_id || "web-user";
  console.log("Using user_id for validation:", user_id);

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = requireEnv(
    ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const,
  );
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
  };

  console.log("Calling validate_promo_code function with:", {
    p_code: code,
    p_telegram_user_id: user_id,
  });

  const vr = await fetch(`${SUPABASE_URL}/rest/v1/rpc/validate_promo_code`, {
    method: "POST",
    headers,
    body: JSON.stringify({ p_code: code, p_telegram_user_id: user_id }),
  });
  const res = await vr.json();
  console.log("Validation response:", res);

  if (!Array.isArray(res) || res.length === 0) {
    console.log("No validation result returned");
    return new Response(
      JSON.stringify({
        valid: false,
        reason: "Invalid promo code",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }

  const [validationResult] = res;
  if (!validationResult?.valid) {
    console.log("Promo code invalid:", validationResult?.reason);
    return new Response(
      JSON.stringify({
        valid: false,
        reason: validationResult?.reason || "Invalid promo code",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }

  console.log("Fetching plan details for plan_id:", plan_id);
  const pr = await fetch(
    `${SUPABASE_URL}/rest/v1/subscription_plans?id=eq.${plan_id}&select=price`,
    { headers },
  );
  const plan = await pr.json();
  console.log("Plan response:", plan);

  const price = plan?.[0]?.price || 0;
  console.log(
    "Plan price:",
    price,
    "Discount:",
    validationResult.discount_type,
    validationResult.discount_value,
  );

  const final_amount = calcFinalAmount(
    price,
    validationResult.discount_type,
    validationResult.discount_value,
  );
  console.log("Final amount calculated:", final_amount);

  return new Response(
    JSON.stringify({
      valid: true,
      discount_type: validationResult.discount_type,
      discount_value: validationResult.discount_value,
      final_amount,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    },
  );
}

if (import.meta.main) serve(handler);

export default handler;
