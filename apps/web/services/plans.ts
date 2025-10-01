import type { SupabaseClient } from "@/integrations/supabase/client";
import { createClient } from "@/integrations/supabase/client";
import type { Plan } from "@/types/plan";
import { callEdgeFunction } from "@/config/supabase";
import { getDefaultVipPlans } from "@/data/vip-plans";

interface PlansResponse {
  plans?: RawPlan[] | null;
  ok?: boolean;
}

type RawPlan = {
  id?: string | null;
  name?: string | null;
  price?: number | string | null;
  base_price?: number | string | null;
  dynamic_price_usdt?: number | string | null;
  currency?: string | null;
  duration_months?: number | string | null;
  is_lifetime?: boolean | null;
  features?: unknown;
  created_at?: string | null;
  pricing_formula?: string | null;
  last_priced_at?: string | null;
  performance_snapshot?: Record<string, unknown> | null;
  ton_amount?: number | string | null;
  dct_amount?: number | string | null;
};

let cachedPlans: Plan[] | null = null;
let cachedError: string | null = null;
let pendingRequest: Promise<Plan[]> | null = null;

let fallbackClient: SupabaseClient | null = null;

function getFallbackClient() {
  if (!fallbackClient) {
    fallbackClient = createClient();
  }
  return fallbackClient;
}

function coerceNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizePlan(plan: RawPlan | null | undefined): Plan | null {
  if (!plan || typeof plan.id !== "string" || plan.id.trim() === "") {
    return null;
  }

  if (typeof plan.name !== "string" || plan.name.trim() === "") {
    return null;
  }

  const basePrice = coerceNumber(plan.base_price ?? plan.price);
  const displayPrice = coerceNumber(plan.price) ?? basePrice;
  const dynamicPrice = coerceNumber(plan.dynamic_price_usdt);

  if (displayPrice === null || basePrice === null) {
    return null;
  }

  const isLifetime = plan.is_lifetime === true;
  const duration = coerceNumber(plan.duration_months);

  const features = Array.isArray(plan.features)
    ? plan.features.filter((feature): feature is string =>
      typeof feature === "string" && feature.trim().length > 0
    )
    : [];

  const tonAmount = coerceNumber(plan.ton_amount);
  const dctAmount = coerceNumber(plan.dct_amount) ?? displayPrice;

  return {
    id: plan.id,
    name: plan.name,
    price: displayPrice,
    currency:
      typeof plan.currency === "string" && plan.currency.trim().length > 0
        ? plan.currency
        : "USD",
    duration_months: isLifetime ? 0 : duration ?? 0,
    is_lifetime: isLifetime,
    features,
    base_price: basePrice,
    dynamic_price_usdt: dynamicPrice,
    pricing_formula: plan.pricing_formula ?? null,
    last_priced_at: plan.last_priced_at ?? null,
    performance_snapshot: plan.performance_snapshot ?? null,
    ton_amount: tonAmount,
    dct_amount: dctAmount,
    pricing: {
      basePrice,
      displayPrice,
      dynamicPrice,
      lastPricedAt: plan.last_priced_at ?? null,
      formula: plan.pricing_formula ?? null,
      tonAmount,
      dctAmount,
      performanceSnapshot: plan.performance_snapshot ?? null,
    },
  };
}

function normalizePlans(plans: PlansResponse["plans"]): Plan[] {
  if (!Array.isArray(plans)) {
    return [];
  }

  return plans
    .map((plan) => normalizePlan(plan))
    .filter((plan): plan is Plan => plan !== null);
}

async function fetchPlansFromSupabase(): Promise<Plan[]> {
  const client = getFallbackClient();
  const planFields = [
    "id",
    "name",
    "price",
    "base_price",
    "currency",
    "duration_months",
    "is_lifetime",
    "features",
    "created_at",
    "dynamic_price_usdt",
    "pricing_formula",
    "last_priced_at",
    "performance_snapshot",
    "ton_amount",
    "dct_amount",
  ].join(",");

  const { data, error } = await client
    .from("subscription_plans")
    .select(planFields)
    .order("price", { ascending: true });

  if (error) {
    throw new Error(error.message || "Unable to load subscription plans");
  }

  return normalizePlans(data as RawPlan[] | null);
}

export async function fetchSubscriptionPlans(
  options: {
    force?: boolean;
    callEdge?: typeof callEdgeFunction;
    fetchFromSupabase?: () => Promise<Plan[]>;
    getFallbackPlans?: () => Plan[];
  } = {},
): Promise<Plan[]> {
  const {
    force = false,
    callEdge = callEdgeFunction,
    fetchFromSupabase: fetchFromDatabase = fetchPlansFromSupabase,
    getFallbackPlans = getDefaultVipPlans,
  } = options;

  if (force) {
    cachedPlans = null;
    cachedError = null;
  } else {
    if (cachedPlans) {
      return cachedPlans;
    }

    if (pendingRequest) {
      return pendingRequest;
    }
  }

  const request = (async () => {
    try {
      const { data, error } = await callEdge<PlansResponse>("PLANS");
      if (error) {
        throw new Error(error.message || "Unable to load subscription plans");
      }

      const normalized = normalizePlans(data?.plans ?? null);
      if (normalized.length > 0) {
        return normalized;
      }

      const supabasePlans = await fetchFromDatabase();
      if (supabasePlans.length > 0) {
        return supabasePlans;
      }

      console.info(
        "No live subscription plans returned, using default VIP packages",
      );
      return getFallbackPlans();
    } catch (edgeError) {
      console.warn(
        "Edge function `plans` failed, attempting direct Supabase query",
        edgeError,
      );

      try {
        const supabasePlans = await fetchFromDatabase();
        if (supabasePlans.length > 0) {
          return supabasePlans;
        }
      } catch (supabaseError) {
        console.error(
          "Direct Supabase query failed while loading subscription plans",
          supabaseError,
        );
      }

      console.info(
        "Serving default VIP packages while live pricing propagates",
      );
      return getFallbackPlans();
    }
  })();

  pendingRequest = request
    .then((plans) => {
      cachedPlans = plans;
      cachedError = null;
      return plans;
    })
    .catch((err) => {
      const message = err instanceof Error
        ? err.message
        : "Unable to load subscription plans";

      cachedPlans = [];
      cachedError = message;

      throw err instanceof Error ? err : new Error(message);
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export function getCachedSubscriptionPlans(): Plan[] {
  return cachedPlans ?? [];
}

export function getCachedSubscriptionPlansError(): string | null {
  return cachedError;
}

export function resetSubscriptionPlansCache() {
  cachedPlans = null;
  cachedError = null;
  pendingRequest = null;
}

export function isFetchingSubscriptionPlans(): boolean {
  return pendingRequest !== null;
}
