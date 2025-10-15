import {
  FALLBACK_PLANS_RESPONSE,
  FALLBACK_PROMOTIONS,
  getFallbackEducationPackages,
  getFallbackPlan,
  getFallbackPromotion,
  getFallbackTonRate,
} from "@/data/pricing-fallback";
import type {
  PlansFunctionResponse,
  PromotionRecord,
} from "@/types/subscription-service";
import type { SupabaseFunctionKey } from "@shared/supabase/functions";

interface FallbackResult<T> {
  data?: T;
  error?: { status: number; message: string };
  status: number;
}

type JsonPayload = Record<string, unknown> | null | undefined;

const clonePlansResponse = (): PlansFunctionResponse => {
  const base = FALLBACK_PLANS_RESPONSE;
  const plans = base.plans?.map((plan) => ({
    ...plan,
    features: Array.isArray(plan.features) ? [...plan.features] : plan.features,
    performance_snapshot: plan.performance_snapshot
      ? { ...plan.performance_snapshot }
      : plan.performance_snapshot ?? null,
  })) ?? null;

  const educationPackages =
    base.service_pricing?.education_packages?.map((pkg) => ({
      ...pkg,
    })) ?? null;

  const tonRate = base.tonRate ? { ...base.tonRate } : null;

  return {
    ok: true,
    plans,
    tonRate,
    service_pricing: base.service_pricing
      ? {
        blueprint: base.service_pricing.blueprint ?? null,
        computed_at: base.service_pricing.computed_at ?? null,
        education_packages: educationPackages,
      }
      : null,
  };
};

const clonePromotions = (promos: PromotionRecord[]) =>
  promos.map((promo) => ({ ...promo }));

const coerceNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const computeFinalAmount = (
  price: number,
  type: "percentage" | "fixed",
  value: number,
) => {
  const discount = type === "percentage" ? price * (value / 100) : value;
  const final = price - discount;
  return final <= 0 ? 0 : Math.round(final * 100) / 100;
};

const buildInvalidPromoResponse = (
  reason: string,
): FallbackResult<unknown> => ({
  data: { valid: false, reason },
  status: 200,
});

const resolvePromoValidation = (body: JsonPayload): FallbackResult<unknown> => {
  const code = typeof body?.code === "string"
    ? body.code.trim().toUpperCase()
    : "";
  const planId = typeof body?.plan_id === "string" ? body.plan_id.trim() : "";

  if (!code) {
    return buildInvalidPromoResponse("Promo code is required");
  }

  if (!planId) {
    return buildInvalidPromoResponse("Plan selection is required");
  }

  const plan = getFallbackPlan(planId);
  if (!plan) {
    return buildInvalidPromoResponse("Selected plan is not available");
  }

  const promo = getFallbackPromotion(code);
  if (!promo) {
    return buildInvalidPromoResponse("Invalid promo code");
  }

  if (promo.plan_ids?.length && !promo.plan_ids.includes(planId)) {
    return buildInvalidPromoResponse("Promo code is not valid for this plan");
  }

  const discountValue = coerceNumber(promo.discount_value);
  if (!discountValue || discountValue <= 0) {
    return buildInvalidPromoResponse("Promo code is inactive");
  }

  const discountType = promo.discount_type?.toLowerCase() === "percentage"
    ? "percentage"
    : "fixed";

  const planPrice = coerceNumber(plan.price) ?? coerceNumber(plan.base_price) ??
    0;

  if (planPrice <= 0) {
    return buildInvalidPromoResponse("Plan pricing unavailable");
  }

  const finalAmount = computeFinalAmount(
    planPrice,
    discountType,
    discountValue,
  );

  return {
    data: {
      valid: true,
      discount_type: discountType,
      discount_value: discountValue,
      final_amount: finalAmount,
    },
    status: 200,
  };
};

const resolvePlans = (): FallbackResult<PlansFunctionResponse> => ({
  data: clonePlansResponse(),
  status: 200,
});

const resolveActivePromos = (): FallbackResult<unknown> => {
  const now = Date.now();
  const activePromos = clonePromotions(
    FALLBACK_PROMOTIONS.filter((promo) => {
      if (!promo.valid_until) return true;
      const expiry = Date.parse(promo.valid_until);
      return Number.isFinite(expiry) ? expiry >= now : true;
    }),
  );

  return {
    data: { ok: true, promotions: activePromos },
    status: 200,
  };
};

export function resolveSupabaseFunctionFallback(
  functionName: SupabaseFunctionKey,
  method: string,
  body?: JsonPayload,
): FallbackResult<unknown> | null {
  const normalizedMethod = method.toUpperCase();

  if (functionName === "PLANS" && normalizedMethod === "GET") {
    return resolvePlans();
  }

  if (functionName === "ACTIVE_PROMOS" && normalizedMethod === "GET") {
    return resolveActivePromos();
  }

  if (functionName === "PROMO_VALIDATE" && normalizedMethod === "POST") {
    return resolvePromoValidation(body);
  }

  if (functionName === "CONTENT_BATCH" && normalizedMethod === "POST") {
    const keys = Array.isArray(body?.keys)
      ? (body!.keys as unknown[]).filter((key): key is string =>
        typeof key === "string"
      )
      : [];

    const contents = keys.map((key) => ({
      content_key: key,
      content_value: null,
    }));

    return {
      data: { ok: true, contents },
      status: 200,
    };
  }

  if (functionName === "LANDING_HERO_METRICS" && normalizedMethod === "GET") {
    return {
      data: {
        ok: true,
        metrics: {
          tonRate: getFallbackTonRate(),
          educationPackages: getFallbackEducationPackages(),
        },
      },
      status: 200,
    };
  }

  return null;
}
