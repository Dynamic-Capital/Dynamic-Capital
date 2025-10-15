import { describe, expect, it } from "vitest";

import { resolveSupabaseFunctionFallback } from "@/config/supabase-fallback";
import { FALLBACK_PLAN_IDS } from "@/data/pricing-fallback";

describe("resolveSupabaseFunctionFallback", () => {
  it("returns fallback plans with mentorship packages", () => {
    const response = resolveSupabaseFunctionFallback("PLANS", "GET");
    expect(response).not.toBeNull();
    expect(response?.status).toBe(200);

    const payload = response?.data as {
      plans?: unknown[];
      service_pricing?: { education_packages?: unknown[] };
    };
    expect(Array.isArray(payload?.plans)).toBe(true);
    expect((payload?.plans ?? []).length).toBeGreaterThanOrEqual(3);

    const educationPackages = payload?.service_pricing?.education_packages;
    expect(Array.isArray(educationPackages) && educationPackages.length > 0)
      .toBe(true);
  });

  it("validates fallback promo codes against eligible plans", () => {
    const planId = FALLBACK_PLAN_IDS[0];
    const result = resolveSupabaseFunctionFallback(
      "PROMO_VALIDATE",
      "POST",
      { code: "VIPLAUNCH25", plan_id: planId },
    );

    expect(result).not.toBeNull();
    expect(result?.status).toBe(200);
    expect(result?.data).toMatchObject({
      valid: true,
      discount_type: "percentage",
    });
  });

  it("rejects promo codes for ineligible plans", () => {
    const invalidResult = resolveSupabaseFunctionFallback(
      "PROMO_VALIDATE",
      "POST",
      { code: "VIPLAUNCH25", plan_id: "unknown-plan" },
    );

    expect(invalidResult).not.toBeNull();
    expect(invalidResult?.data).toMatchObject({ valid: false });
  });
});
