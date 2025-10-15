import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSupabaseRuntime = (fromEnv: boolean) => {
  vi.doMock("@/config/supabase-runtime", () => ({
    SUPABASE_URL: "https://stub.supabase.co",
    SUPABASE_ANON_KEY: "stub-anon-key",
    SUPABASE_CONFIG_FROM_ENV: fromEnv,
    DEFAULT_SUPABASE_URL: "https://stub.supabase.co",
    DEFAULT_SUPABASE_ANON_KEY: "stub-anon-key",
  }));
};

describe("fetchSubscriptionPlans", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns fallback plans and mentorship packages when Supabase env is missing", async () => {
    mockSupabaseRuntime(false);

    const module = await import("../plans");
    const {
      fetchSubscriptionPlans,
      getCachedServicePricing,
      getCachedTonRate,
      resetSubscriptionPlansCache,
    } = module;

    resetSubscriptionPlansCache();

    const plans = await fetchSubscriptionPlans({ force: true });

    expect(plans.length).toBeGreaterThan(0);
    const servicePricing = getCachedServicePricing();
    expect(servicePricing).not.toBeNull();
    expect(servicePricing?.educationPackages.length).toBeGreaterThan(0);
    const tonRate = getCachedTonRate();
    expect(tonRate).not.toBeNull();
    expect(tonRate?.rate).toBeGreaterThan(0);
  });
});
