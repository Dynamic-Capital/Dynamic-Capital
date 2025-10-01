import type { Plan } from "@/types/plan";

interface StaticPlanInput {
  id: string;
  name: string;
  price: number;
  durationMonths: number;
  isLifetime?: boolean;
  features: string[];
}

function createStaticPlan({
  id,
  name,
  price,
  durationMonths,
  isLifetime = false,
  features,
}: StaticPlanInput): Plan {
  const duration = isLifetime ? 0 : durationMonths;

  return {
    id,
    name,
    price,
    currency: "USD",
    duration_months: duration,
    is_lifetime: isLifetime,
    features,
    base_price: price,
    dynamic_price_usdt: null,
    ton_amount: null,
    dct_amount: price,
    pricing_formula: null,
    last_priced_at: null,
    performance_snapshot: null,
    pricing: {
      basePrice: price,
      displayPrice: price,
      dynamicPrice: null,
      lastPricedAt: null,
      formula: null,
      tonAmount: null,
      dctAmount: price,
      performanceSnapshot: null,
    },
  };
}

const STATIC_VIP_PLANS: readonly Plan[] = [
  createStaticPlan({
    id: "vip-momentum-starter",
    name: "Momentum Starter",
    price: 89,
    durationMonths: 1,
    features: [
      "Intraday desk signals for BTC, ETH, and majors",
      "Auto-generated stop loss and take profit guardrails",
      "Daily New York open briefing and European session recap",
      "VIP lounge access with mentor office hours",
      "Priority desk support inside Telegram",
    ],
  }),
  createStaticPlan({
    id: "vip-breakout-pro",
    name: "Breakout Pro",
    price: 249,
    durationMonths: 3,
    features: [
      "All Momentum Starter utilities",
      "Midweek portfolio review with a senior analyst",
      "Automated trade journaling and P&L heatmaps",
      "Institutional order flow and liquidity dashboards",
      "Beta access to experimental automation playbooks",
    ],
  }),
  createStaticPlan({
    id: "vip-momentum-elite",
    name: "Momentum Elite",
    price: 449,
    durationMonths: 6,
    features: [
      "Everything in Breakout Pro",
      "Weekly war room with direct desk collaboration",
      "Advanced quant signals with volatility throttles",
      "1:1 strategy calibration call each month",
      "Real-time risk controls synced to Mini App portfolio",
    ],
  }),
  createStaticPlan({
    id: "vip-legend-lifetime",
    name: "Legends Lifetime",
    price: 1299,
    durationMonths: 0,
    isLifetime: true,
    features: [
      "All Momentum Elite benefits forever",
      "Lifetime access to every new automation upgrade",
      "Guaranteed seat in mentor accelerators and camps",
      "Direct escalation line to the desk leadership team",
      "Founding member recognition across the ecosystem",
    ],
  }),
];

function clonePlan(plan: Plan): Plan {
  return {
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
  };
}

export function getDefaultVipPlans(): Plan[] {
  return STATIC_VIP_PLANS.map((plan) => clonePlan(plan));
}

export { STATIC_VIP_PLANS as defaultVipPlans };
