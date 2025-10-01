import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Plan } from "@/types/plan";
import type { CallEdgeFunction } from "@/config/supabase";
import { fetchSubscriptionPlans, resetSubscriptionPlansCache } from "../plans";

const buildPlan = (overrides: Partial<Plan> = {}): Plan => ({
  id: "test-plan",
  name: "Test Plan",
  price: 100,
  currency: "USD",
  duration_months: 1,
  is_lifetime: false,
  features: ["Feature"],
  base_price: 100,
  dynamic_price_usdt: null,
  ton_amount: null,
  dct_amount: 100,
  pricing_formula: null,
  last_priced_at: null,
  performance_snapshot: null,
  pricing: {
    basePrice: 100,
    displayPrice: 100,
    dynamicPrice: null,
    lastPricedAt: null,
    formula: null,
    tonAmount: null,
    dctAmount: 100,
    performanceSnapshot: null,
  },
  ...overrides,
});

describe("fetchSubscriptionPlans", () => {
  beforeEach(() => {
    resetSubscriptionPlansCache();
    vi.restoreAllMocks();
  });

  it("returns the default VIP catalogue when upstream responses are empty", async () => {
    const fallbackPlans = [
      buildPlan({ id: "fallback", name: "Fallback" }),
      buildPlan({ id: "fallback-2", name: "Fallback Two" }),
    ];

    const callEdgeMock = vi.fn(async () => ({ data: { plans: [] } }));
    const fetchFromSupabaseMock = vi.fn(async () => [] as Plan[]);
    const getFallbackPlansMock = vi.fn(() => fallbackPlans);

    const plans = await fetchSubscriptionPlans({
      force: true,
      callEdge: callEdgeMock as unknown as CallEdgeFunction,
      fetchFromSupabase: fetchFromSupabaseMock as unknown as () => Promise<
        Plan[]
      >,
      getFallbackPlans: getFallbackPlansMock as unknown as () => Plan[],
    });

    expect(callEdgeMock).toHaveBeenCalledWith("PLANS");
    expect(fetchFromSupabaseMock).toHaveBeenCalledTimes(1);
    expect(getFallbackPlansMock).toHaveBeenCalledTimes(1);
    expect(plans).toEqual(fallbackPlans);
  });

  it("preserves TON and DCT amounts when resolving plans from Supabase", async () => {
    const supabasePlan = buildPlan({
      id: "supabase-ton",
      name: "Supabase TON",
      price: 150,
      ton_amount: 23.5,
      dct_amount: 150,
      pricing: {
        basePrice: 150,
        displayPrice: 150,
        dynamicPrice: null,
        lastPricedAt: null,
        formula: null,
        tonAmount: 23.5,
        dctAmount: 150,
        performanceSnapshot: null,
      },
    });

    const callEdgeMock = vi.fn(async () => ({ data: { plans: [] } }));
    const fetchFromSupabaseMock = vi.fn(async () => [supabasePlan]);

    const plans = await fetchSubscriptionPlans({
      force: true,
      callEdge: callEdgeMock as unknown as CallEdgeFunction,
      fetchFromSupabase: fetchFromSupabaseMock as unknown as () => Promise<
        Plan[]
      >,
    });

    expect(callEdgeMock).toHaveBeenCalledWith("PLANS");
    expect(fetchFromSupabaseMock).toHaveBeenCalledTimes(1);
    expect(plans).toHaveLength(1);
    expect(plans[0].ton_amount).toBe(23.5);
    expect(plans[0].dct_amount).toBe(150);
    expect(plans[0].pricing?.tonAmount).toBe(23.5);
    expect(plans[0].pricing?.dctAmount).toBe(150);
  });

  it("falls back to the default VIP catalogue when both upstream calls fail", async () => {
    const fallbackPlans = [buildPlan({ id: "resilient", name: "Resilient" })];

    const callEdgeMock = vi.fn(async () => {
      throw new Error("Edge function offline");
    });
    const fetchFromSupabaseMock = vi.fn(async () => {
      throw new Error("Supabase unavailable");
    });
    const getFallbackPlansMock = vi.fn(() => fallbackPlans);

    const plans = await fetchSubscriptionPlans({
      force: true,
      callEdge: callEdgeMock as unknown as CallEdgeFunction,
      fetchFromSupabase: fetchFromSupabaseMock as unknown as () => Promise<
        Plan[]
      >,
      getFallbackPlans: getFallbackPlansMock as unknown as () => Plan[],
    });

    expect(callEdgeMock).toHaveBeenCalledWith("PLANS");
    expect(fetchFromSupabaseMock).toHaveBeenCalledTimes(1);
    expect(getFallbackPlansMock).toHaveBeenCalledTimes(1);
    expect(plans).toEqual(fallbackPlans);
  });
});
