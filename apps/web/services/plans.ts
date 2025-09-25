import type { SupabaseClient } from "@/integrations/supabase/client";
import { createClient } from "@/integrations/supabase/client";
import type { Plan } from "@/types/plan";
import { callEdgeFunction } from "@/config/supabase";

interface PlansResponse {
  plans?: RawPlan[] | null;
  ok?: boolean;
}

type RawPlan = {
  id?: string | null;
  name?: string | null;
  price?: number | string | null;
  currency?: string | null;
  duration_months?: number | string | null;
  is_lifetime?: boolean | null;
  features?: unknown;
  created_at?: string | null;
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

  const price = coerceNumber(plan.price);
  if (price === null) {
    return null;
  }

  const isLifetime = plan.is_lifetime === true;
  const duration = coerceNumber(plan.duration_months);

  const features = Array.isArray(plan.features)
    ? plan.features.filter((feature): feature is string =>
      typeof feature === "string" && feature.trim().length > 0
    )
    : [];

  return {
    id: plan.id,
    name: plan.name,
    price,
    currency:
      typeof plan.currency === "string" && plan.currency.trim().length > 0
        ? plan.currency
        : "USD",
    duration_months: isLifetime ? 0 : duration ?? 0,
    is_lifetime: isLifetime,
    features,
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
  const { data, error } = await client
    .from("subscription_plans")
    .select(
      "id,name,price,currency,duration_months,is_lifetime,features,created_at",
    )
    .order("price", { ascending: true });

  if (error) {
    throw new Error(error.message || "Unable to load subscription plans");
  }

  return normalizePlans(data as RawPlan[] | null);
}

export async function fetchSubscriptionPlans(
  options: { force?: boolean } = {},
): Promise<Plan[]> {
  const { force = false } = options;

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
      const { data, error } = await callEdgeFunction<PlansResponse>("PLANS");
      if (error) {
        throw new Error(error.message || "Unable to load subscription plans");
      }

      const normalized = normalizePlans(data?.plans ?? null);
      if (normalized.length > 0) {
        return normalized;
      }

      // If we received an empty result, fall back to a direct query to ensure
      // live plans still render for admins and the landing page.
      return await fetchPlansFromSupabase();
    } catch (edgeError) {
      console.warn(
        "Edge function `plans` failed, falling back to direct Supabase query",
        edgeError,
      );
      return await fetchPlansFromSupabase();
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
