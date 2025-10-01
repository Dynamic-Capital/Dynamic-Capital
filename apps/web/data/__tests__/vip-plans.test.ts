import { describe, expect, it } from "vitest";

import { getDefaultVipPlans } from "../vip-plans";

describe("getDefaultVipPlans", () => {
  it("returns deep clones so downstream mutations do not leak", () => {
    const firstCall = getDefaultVipPlans();
    const mutatedPlan = firstCall[0];

    expect(mutatedPlan).toBeDefined();
    mutatedPlan.features.push("Mutated feature");
    mutatedPlan.price = 999;
    if (mutatedPlan.pricing) {
      mutatedPlan.pricing.displayPrice = 999;
    }

    const secondCall = getDefaultVipPlans();

    expect(secondCall[0].features).not.toContain("Mutated feature");
    expect(secondCall[0].price).not.toBe(999);
    expect(secondCall[0].pricing?.displayPrice).not.toBe(999);
  });
});
