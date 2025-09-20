import type { Plan } from "@/types/plan";
import { callEdgeFunction } from "@/config/supabase";

interface PlansResponse {
  plans?: Plan[] | null;
  ok?: boolean;
}

let cachedPlans: Plan[] | null = null;
let cachedError: string | null = null;
let pendingRequest: Promise<Plan[]> | null = null;

function normalizePlans(plans: PlansResponse["plans"]): Plan[] {
  if (!Array.isArray(plans)) {
    return [];
  }

  return plans.filter((plan): plan is Plan => {
    return (
      !!plan &&
      typeof plan.id === "string" &&
      typeof plan.name === "string" &&
      typeof plan.price === "number" &&
      typeof plan.currency === "string" &&
      typeof plan.duration_months === "number" &&
      typeof plan.is_lifetime === "boolean"
    );
  });
}

export async function fetchSubscriptionPlans(options: { force?: boolean } = {}): Promise<Plan[]> {
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

  const request = callEdgeFunction<PlansResponse>("PLANS");

  pendingRequest = request
    .then(({ data, error }) => {
      if (error) {
        throw new Error(error.message || "Unable to load subscription plans");
      }

      const normalized = normalizePlans(data?.plans ?? null);
      cachedPlans = normalized;
      cachedError = null;
      return normalized;
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
