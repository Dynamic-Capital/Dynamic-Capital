import type { SupabaseClient } from "@/integrations/supabase/client";
import { createClient } from "@/integrations/supabase/client";
import type { Plan } from "@/types/plan";
import { callEdgeFunction } from "@/config/supabase";
import { SUPABASE_CONFIG_FROM_ENV } from "@/config/supabase-runtime";
import {
  FALLBACK_PLANS_RESPONSE,
  getFallbackEducationPackages,
  getFallbackTonRate,
} from "@/data/pricing-fallback";
import type {
  EducationPackageRecord,
  PlansFunctionResponse,
  SubscriptionPlanRecord,
  TonRateRecord,
} from "@/types/subscription-service";

let cachedPlans: Plan[] | null = null;
let cachedError: string | null = null;
let pendingRequest: Promise<Plan[]> | null = null;

let fallbackClient: SupabaseClient | null = null;

export interface TonRateSnapshot {
  rate: number;
  source?: string | null;
  updatedAt?: string | null;
}

export interface EducationPackage {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationWeeks: number | null;
  isLifetime: boolean;
  tonAmount: number | null;
  dctAmount: number;
}

export interface ServicePricingSnapshot {
  blueprint: unknown | null;
  computedAt: string | null;
  educationPackages: EducationPackage[];
}

let cachedServicePricing: ServicePricingSnapshot | null = null;
let cachedTonRate: TonRateSnapshot | null = null;

const SUPABASE_MISSING_MESSAGE =
  "Supabase credentials are not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to load subscription plans.";

const CAN_DIRECT_QUERY_SUPABASE = SUPABASE_CONFIG_FROM_ENV;

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

function extractSnapshotNumber(
  snapshot: Record<string, unknown> | null | undefined,
  key: string,
): number | string | null {
  if (!snapshot) {
    return null;
  }
  const value = snapshot[key];
  return typeof value === "number" || typeof value === "string" ? value : null;
}

function normalizePlan(
  plan: SubscriptionPlanRecord | null | undefined,
): Plan | null {
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

  const snapshot = plan.performance_snapshot ?? null;
  const tonAmount = coerceNumber(plan.ton_amount) ??
    coerceNumber(extractSnapshotNumber(snapshot, "ton_amount"));
  const dctAmount = coerceNumber(plan.dct_amount) ??
    coerceNumber(extractSnapshotNumber(snapshot, "dct_amount")) ?? displayPrice;

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

function normalizePlans(plans: PlansFunctionResponse["plans"]): Plan[] {
  if (!Array.isArray(plans)) {
    return [];
  }

  return plans
    .map((plan) => normalizePlan(plan))
    .filter((plan): plan is Plan => plan !== null);
}

function normalizeTonRate(
  record: TonRateRecord | null | undefined,
): TonRateSnapshot | null {
  if (!record) {
    return null;
  }

  const rate = coerceNumber(record.rate);
  if (rate === null || rate <= 0) {
    return null;
  }

  const snapshot: TonRateSnapshot = { rate };

  if (typeof record.source === "string" && record.source.trim().length > 0) {
    snapshot.source = record.source.trim();
  }

  if (
    typeof record.updatedAt === "string" && record.updatedAt.trim().length > 0
  ) {
    snapshot.updatedAt = record.updatedAt.trim();
  }

  return snapshot;
}

function normalizeEducationPackage(
  pkg: EducationPackageRecord | null | undefined,
  tonRateValue: number | null,
): EducationPackage | null {
  if (!pkg || typeof pkg.id !== "string" || pkg.id.trim().length === 0) {
    return null;
  }

  if (typeof pkg.name !== "string" || pkg.name.trim().length === 0) {
    return null;
  }

  const price = coerceNumber(pkg.price);
  if (price === null || price < 0) {
    return null;
  }

  const currency =
    typeof pkg.currency === "string" && pkg.currency.trim().length > 0
      ? pkg.currency.trim().toUpperCase()
      : "USD";

  const isLifetime = pkg.is_lifetime === true;
  const durationWeeks = isLifetime ? null : (() => {
    const value = coerceNumber(pkg.duration_weeks);
    return value !== null && value > 0 ? value : null;
  })();

  const tonAmount = coerceNumber(pkg.ton_amount) ??
    (tonRateValue && tonRateValue > 0
      ? Number((price / tonRateValue).toFixed(3))
      : null);

  const dctAmount = coerceNumber(pkg.dct_amount) ?? price;

  return {
    id: pkg.id,
    name: pkg.name,
    price,
    currency,
    durationWeeks,
    isLifetime,
    tonAmount,
    dctAmount,
  };
}

function normalizeEducationPackages(
  packages: EducationPackageRecord[] | null | undefined,
  tonRateValue: number | null,
): EducationPackage[] {
  if (!Array.isArray(packages)) {
    return [];
  }

  return packages
    .map((pkg) => normalizeEducationPackage(pkg, tonRateValue))
    .filter((pkg): pkg is EducationPackage => pkg !== null);
}

function applyPlansResponseMetadata(
  response: PlansFunctionResponse | null | undefined,
): void {
  const tonRate = normalizeTonRate(response?.tonRate ?? null);
  cachedTonRate = tonRate;

  const educationPackages = normalizeEducationPackages(
    response?.service_pricing?.education_packages ?? null,
    tonRate?.rate ?? null,
  );

  if (response?.service_pricing || educationPackages.length > 0) {
    cachedServicePricing = {
      blueprint: response?.service_pricing?.blueprint ?? null,
      computedAt: response?.service_pricing?.computed_at ?? null,
      educationPackages,
    };
  } else {
    cachedServicePricing = null;
  }
}

function buildStaticFallbackPlans(): Plan[] {
  const response: PlansFunctionResponse = {
    ...FALLBACK_PLANS_RESPONSE,
    plans: FALLBACK_PLANS_RESPONSE.plans?.map((plan) => ({
      ...plan,
      features: Array.isArray(plan.features)
        ? [...plan.features]
        : plan.features,
      performance_snapshot: plan.performance_snapshot
        ? { ...plan.performance_snapshot }
        : plan.performance_snapshot ?? null,
    })) ?? null,
    tonRate: getFallbackTonRate(),
    service_pricing: {
      blueprint: FALLBACK_PLANS_RESPONSE.service_pricing?.blueprint ?? null,
      computed_at: FALLBACK_PLANS_RESPONSE.service_pricing?.computed_at ?? null,
      education_packages: getFallbackEducationPackages(),
    },
  };

  applyPlansResponseMetadata(response);
  return normalizePlans(response.plans ?? null);
}

async function fetchPlansFromSupabase(): Promise<Plan[]> {
  if (!CAN_DIRECT_QUERY_SUPABASE) {
    throw new Error(SUPABASE_MISSING_MESSAGE);
  }

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

  return normalizePlans(data as SubscriptionPlanRecord[] | null);
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
    if (!SUPABASE_CONFIG_FROM_ENV) {
      console.info(
        "Using static fallback plans because Supabase env is missing",
      );
      return buildStaticFallbackPlans();
    }

    try {
      const { data, error } = await callEdgeFunction<PlansFunctionResponse>(
        "PLANS",
      );
      if (error) {
        throw new Error(error.message || "Unable to load subscription plans");
      }

      applyPlansResponseMetadata(data);

      const normalized = normalizePlans(data?.plans ?? null);
      if (normalized.length > 0) {
        return normalized;
      }

      const directPlans = await fetchPlansFromSupabase();
      if (directPlans.length > 0) {
        return directPlans;
      }

      return buildStaticFallbackPlans();
    } catch (edgeError) {
      console.warn(
        "Edge function `plans` failed, attempting direct Supabase query",
        edgeError,
      );

      try {
        applyPlansResponseMetadata(null);
        const directPlans = await fetchPlansFromSupabase();
        if (directPlans.length > 0) {
          return directPlans;
        }
      } catch (supabaseError) {
        console.warn(
          "Direct Supabase query for plans failed, using fallback dataset",
          supabaseError,
        );
      }

      return buildStaticFallbackPlans();
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
  cachedServicePricing = null;
  cachedTonRate = null;
}

export function isFetchingSubscriptionPlans(): boolean {
  return pendingRequest !== null;
}

export function getCachedServicePricing(): ServicePricingSnapshot | null {
  return cachedServicePricing;
}

export function getCachedTonRate(): TonRateSnapshot | null {
  return cachedTonRate;
}
