import type { Plan } from "@/types/plan";

// Fallback plans used when Supabase credentials are not configured locally.
// This keeps the pricing UI functional during development and automated tests.
export const FALLBACK_SUBSCRIPTION_PLANS: Plan[] = [
  {
    id: "starter-demo",
    name: "Starter",
    price: 49,
    currency: "USD",
    duration_months: 1,
    is_lifetime: false,
    features: [
      "Live market recaps",
      "Signal notifications",
      "Trading desk newsletter",
    ],
    base_price: 49,
    dynamic_price_usdt: 49,
    ton_amount: null,
    dct_amount: 49,
    pricing_formula: null,
    last_priced_at: "2025-01-02T00:00:00.000Z",
    performance_snapshot: null,
    pricing: {
      basePrice: 49,
      displayPrice: 49,
      dynamicPrice: 49,
      lastPricedAt: "2025-01-02T00:00:00.000Z",
      formula: null,
      tonAmount: null,
      dctAmount: 49,
      performanceSnapshot: null,
    },
  },
  {
    id: "professional-demo",
    name: "Professional",
    price: 129,
    currency: "USD",
    duration_months: 1,
    is_lifetime: false,
    features: [
      "Starter benefits",
      "Desk analytics dashboards",
      "Priority strategy reviews",
    ],
    base_price: 129,
    dynamic_price_usdt: 129,
    ton_amount: 37.5,
    dct_amount: 129,
    pricing_formula: "dynamic_usd_to_ton",
    last_priced_at: "2025-01-02T00:00:00.000Z",
    performance_snapshot: {
      roi90d: "18.4%",
      sharpe: 1.9,
    },
    pricing: {
      basePrice: 129,
      displayPrice: 129,
      dynamicPrice: 129,
      lastPricedAt: "2025-01-02T00:00:00.000Z",
      formula: "dynamic_usd_to_ton",
      tonAmount: 37.5,
      dctAmount: 129,
      performanceSnapshot: {
        roi90d: "18.4%",
        sharpe: 1.9,
      },
    },
  },
  {
    id: "elite-lifetime-demo",
    name: "Elite Lifetime",
    price: 5990,
    currency: "USD",
    duration_months: 0,
    is_lifetime: true,
    features: [
      "Professional benefits",
      "Dedicated desk strategist",
      "Quarterly portfolio diagnostics",
      "Invitations to executive briefings",
    ],
    base_price: 5990,
    dynamic_price_usdt: 5990,
    ton_amount: 1730,
    dct_amount: 5990,
    pricing_formula: "lifetime_dynamic",
    last_priced_at: "2025-01-05T00:00:00.000Z",
    performance_snapshot: {
      clientsServed: 24,
      retention: "92%",
    },
    pricing: {
      basePrice: 5990,
      displayPrice: 5990,
      dynamicPrice: 5990,
      lastPricedAt: "2025-01-05T00:00:00.000Z",
      formula: "lifetime_dynamic",
      tonAmount: 1730,
      dctAmount: 5990,
      performanceSnapshot: {
        clientsServed: 24,
        retention: "92%",
      },
    },
  },
];

export function getFallbackSubscriptionPlans(): Plan[] {
  return FALLBACK_SUBSCRIPTION_PLANS.map((plan) => ({
    ...plan,
    features: [...plan.features],
    performance_snapshot: plan.performance_snapshot
      ? { ...plan.performance_snapshot }
      : null,
    pricing: plan.pricing
      ? {
        ...plan.pricing,
        performanceSnapshot: plan.pricing.performanceSnapshot
          ? { ...plan.pricing.performanceSnapshot }
          : null,
      }
      : undefined,
  }));
}
