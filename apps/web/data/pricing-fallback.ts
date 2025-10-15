import type {
  EducationPackageRecord,
  PlansFunctionResponse,
  PromotionRecord,
  SubscriptionPlanRecord,
  TonRateRecord,
} from "@/types/subscription-service";

const FALLBACK_TON_RATE_VALUE = 6.15;

const toTonAmount = (price: number) =>
  Number.isFinite(price)
    ? Number((price / FALLBACK_TON_RATE_VALUE).toFixed(3))
    : null;

const lastPricedAt = "2025-03-18T09:30:00.000Z";

const fallbackPlans: SubscriptionPlanRecord[] = [
  {
    id: "vip-monthly",
    name: "VIP Monthly",
    price: 349,
    base_price: 349,
    currency: "USD",
    duration_months: 1,
    is_lifetime: false,
    features: [
      "Live trade signals with desk annotations",
      "VIP Telegram room and execution alerts",
      "Weekly mentor office hours",
      "Automation presets for MT5 and cTrader",
    ],
    dynamic_price_usdt: 349,
    pricing_formula: "base * (1 - loyalty_boost)",
    last_priced_at: lastPricedAt,
    performance_snapshot: {
      win_rate_30d: 0.64,
      sharpe_ratio: 1.82,
    },
    ton_amount: toTonAmount(349),
    dct_amount: 349,
  },
  {
    id: "vip-quarterly",
    name: "VIP Quarterly",
    price: 899,
    base_price: 899,
    currency: "USD",
    duration_months: 3,
    is_lifetime: false,
    features: [
      "Everything in VIP Monthly",
      "Quarterly desk review and strategy calibration",
      "Priority support during major market events",
      "Mentorship sprint planning toolkit",
    ],
    dynamic_price_usdt: 879,
    pricing_formula: "monthly * 3 * 0.84",
    last_priced_at: lastPricedAt,
    performance_snapshot: {
      win_rate_90d: 0.67,
      average_rr: 1.92,
    },
    ton_amount: toTonAmount(899),
    dct_amount: 899,
  },
  {
    id: "vip-annual",
    name: "VIP Annual",
    price: 2999,
    base_price: 2999,
    currency: "USD",
    duration_months: 12,
    is_lifetime: false,
    features: [
      "Dedicated mentor channel with quarterly retros",
      "Desk analytics dashboard with seat licences",
      "Automation lab access and sandbox capital",
      "Institutional risk and compliance templates",
    ],
    dynamic_price_usdt: 2849,
    pricing_formula: "monthly * 12 * 0.68",
    last_priced_at: lastPricedAt,
    performance_snapshot: {
      win_rate_180d: 0.7,
      average_rr: 2.05,
    },
    ton_amount: toTonAmount(2999),
    dct_amount: 2999,
  },
  {
    id: "vip-lifetime",
    name: "VIP Lifetime",
    price: 6499,
    base_price: 6499,
    currency: "USD",
    duration_months: 0,
    is_lifetime: true,
    features: [
      "Lifetime VIP signal and automation access",
      "Founders Circle mentorship residency",
      "Priority allocation to desk experiments",
      "White-glove onboarding for trading teams",
    ],
    dynamic_price_usdt: 6125,
    pricing_formula: "annual * 2.1",
    last_priced_at: lastPricedAt,
    performance_snapshot: {
      retention_24m: 0.88,
      mentor_nps: 72,
    },
    ton_amount: toTonAmount(6499),
    dct_amount: 6499,
  },
];

const fallbackEducationPackages: EducationPackageRecord[] = [
  {
    id: "mentorship-sprint",
    name: "Mentorship Sprint",
    price: 1499,
    currency: "USD",
    duration_weeks: 4,
    is_lifetime: false,
    ton_amount: toTonAmount(1499),
    dct_amount: 1499,
  },
  {
    id: "desk-onboarding",
    name: "Desk Onboarding Intensive",
    price: 2799,
    currency: "USD",
    duration_weeks: 8,
    is_lifetime: false,
    ton_amount: toTonAmount(2799),
    dct_amount: 2799,
  },
  {
    id: "founders-circle",
    name: "Founders Circle Residency",
    price: 5400,
    currency: "USD",
    duration_weeks: 12,
    is_lifetime: false,
    ton_amount: toTonAmount(5400),
    dct_amount: 5400,
  },
];

const fallbackTonRate: TonRateRecord = {
  rate: FALLBACK_TON_RATE_VALUE,
  source: "fallback-static",
  updatedAt: "2025-03-15T00:00:00.000Z",
};

export const FALLBACK_PLANS_RESPONSE: PlansFunctionResponse = {
  ok: true,
  plans: fallbackPlans,
  tonRate: fallbackTonRate,
  service_pricing: {
    blueprint: null,
    computed_at: "2025-03-18T09:00:00.000Z",
    education_packages: fallbackEducationPackages,
  },
};

export const FALLBACK_PROMOTIONS: PromotionRecord[] = [
  {
    code: "VIPLAUNCH25",
    description: "25% off your first month of VIP access",
    discount_type: "percentage",
    discount_value: 25,
    valid_until: "2025-12-31T23:59:59.000Z",
    plan_ids: ["vip-monthly", "vip-quarterly"],
  },
  {
    code: "DESK300",
    description: "$300 off quarterly or annual desk automation",
    discount_type: "fixed",
    discount_value: 300,
    valid_until: "2025-09-30T23:59:59.000Z",
    plan_ids: ["vip-quarterly", "vip-annual"],
  },
  {
    code: "LIFETIME750",
    description: "$750 off lifetime VIP residency",
    discount_type: "fixed",
    discount_value: 750,
    valid_until: "2026-12-31T23:59:59.000Z",
    plan_ids: ["vip-lifetime"],
  },
];

const planLookup = new Map(
  fallbackPlans
    .filter((plan) => typeof plan.id === "string")
    .map((plan) => [plan.id as string, plan]),
);

export const FALLBACK_PLAN_IDS = Object.freeze(
  fallbackPlans
    .filter((plan) => typeof plan.id === "string")
    .map((plan) => plan.id as string),
);

export function getFallbackPlan(planId: string): SubscriptionPlanRecord | null {
  const plan = planLookup.get(planId);
  return plan ?? null;
}

export function getFallbackPromotion(code: string): PromotionRecord | null {
  const normalized = code.trim().toUpperCase();
  return (
    FALLBACK_PROMOTIONS.find((promo) => promo.code === normalized) ?? null
  );
}

export function getFallbackEducationPackages(): EducationPackageRecord[] {
  return [...fallbackEducationPackages];
}

export function getFallbackTonRate(): TonRateRecord {
  return { ...fallbackTonRate };
}
