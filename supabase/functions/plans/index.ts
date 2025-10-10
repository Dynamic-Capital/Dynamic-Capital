import { createClient } from "../_shared/client.ts";
import { corsHeaders, mna, ok, oops } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";
import {
  calculateDctAmount,
  calculateTonAmount,
  fetchTonUsdRate,
  resolveDisplayPrice,
} from "../_shared/pricing.ts";
import { registerHandler } from "../_shared/serve.ts";

export async function handler(req: Request): Promise<Response> {
  const v = version(req, "plans");
  if (v) return v;

  // Handle CORS preflight requests
  const origin = req.headers.get("origin");
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") {
    if (origin && !headers["access-control-allow-origin"]) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, { headers });
  }
  if (origin && !headers["access-control-allow-origin"]) {
    return new Response(
      JSON.stringify({ ok: false, error: "Origin not allowed" }),
      {
        status: 403,
        headers,
      },
    );
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }

  const supa = createClient("anon");

  const planFields = [
    "id",
    "name",
    "duration_months",
    "price",
    "currency",
    "is_lifetime",
    "features",
    "created_at",
    "dynamic_price_usdt",
    "pricing_formula",
    "last_priced_at",
    "performance_snapshot",
  ].join(",");

  const { data, error } = await supa
    .from("subscription_plans")
    .select(planFields)
    .order("price", { ascending: true });

  if (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }

  const tonRate = await fetchTonUsdRate();

  const plans = (data ?? []).map((plan) => {
    const basePrice = Number(plan.price ?? 0);
    const dynamicPrice = typeof plan.dynamic_price_usdt === "number"
      ? Number(plan.dynamic_price_usdt)
      : null;
    const { price: displayPrice } = resolveDisplayPrice(
      basePrice,
      dynamicPrice,
    );
    const tonAmount = calculateTonAmount(displayPrice, tonRate.rate);
    const dctAmount = calculateDctAmount(displayPrice);

    return {
      ...plan,
      price: displayPrice,
      base_price: basePrice,
      dynamic_price_usdt: dynamicPrice,
      ton_amount: tonAmount,
      dct_amount: dctAmount,
    };
  });

  return new Response(
    JSON.stringify({ ok: true, plans, tonRate }),
    {
      headers: { ...headers, "Content-Type": "application/json" },
    },
  );
}

registerHandler(handler);

export default handler;
