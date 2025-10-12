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
import { getConfig } from "../_shared/config.ts";
import type { PricingBlueprint } from "../_shared/service-pricing.ts";

interface EducationPackageRow {
  id: string;
  name: string;
  price: number;
  currency: string | null;
  duration_weeks: number | null;
  is_lifetime: boolean | null;
}

interface EducationPackagePricing {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_weeks: number | null;
  is_lifetime: boolean;
  ton_amount: number | null;
  dct_amount: number;
}

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

  let educationPackages: EducationPackagePricing[] = [];
  try {
    const { data: educationData, error: educationError } = await supa
      .from("education_packages")
      .select("id,name,price,currency,duration_weeks,is_lifetime")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (!educationError && Array.isArray(educationData)) {
      educationPackages = (educationData as EducationPackageRow[]).map(
        (pkg) => {
          const rawPrice = Number(pkg.price ?? 0);
          const safePrice = Number.isFinite(rawPrice) && rawPrice > 0
            ? Number(rawPrice.toFixed(2))
            : 0;
          const currency = typeof pkg.currency === "string" &&
              pkg.currency.trim().length > 0
            ? pkg.currency.trim()
            : "USD";

          return {
            id: pkg.id,
            name: pkg.name,
            price: safePrice,
            currency,
            duration_weeks: pkg.duration_weeks,
            is_lifetime: Boolean(pkg.is_lifetime),
            ton_amount: safePrice > 0
              ? calculateTonAmount(safePrice, tonRate.rate)
              : null,
            dct_amount: calculateDctAmount(safePrice),
          };
        },
      );
    }
  } catch (educationError) {
    console.warn("plans: failed to load education packages", educationError);
  }

  let blueprintSnapshot:
    | { computed_at?: string; data?: PricingBlueprint }
    | null = null;
  try {
    blueprintSnapshot = await getConfig<
      { computed_at?: string; data?: PricingBlueprint } | null
    >("pricing:service-blueprint", null);
  } catch (configError) {
    console.warn("plans: failed to load pricing blueprint", configError);
  }

  const servicePricing = {
    blueprint: blueprintSnapshot?.data ?? null,
    computed_at: blueprintSnapshot?.computed_at ?? null,
    education_packages: educationPackages,
  };

  return new Response(
    JSON.stringify({
      ok: true,
      plans,
      tonRate,
      service_pricing: servicePricing,
    }),
    {
      headers: { ...headers, "Content-Type": "application/json" },
    },
  );
}

registerHandler(handler);

export default handler;
