import test from "node:test";
import {
  ok as assert,
  strictEqual as assertStrictEqual,
} from "node:assert/strict";
import { freshImport } from "./utils/freshImport.ts";
import {
  __resetAnalyticsDataStubState,
  __setAnalyticsDataStubState,
} from "./analytics-data-supabase-stub.ts";

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

test("analytics-data aggregates string payment amounts without scaling", async () => {
  __resetAnalyticsDataStubState();
  const createdAt = isoMinutesAgo(5);

  __setAnalyticsDataStubState({
    payments: [
      {
        id: "pay-basic",
        amount: "123.45",
        status: "completed",
        created_at: createdAt,
        plan_id: "basic",
        currency: "USD",
      },
      {
        id: "pay-pro",
        amount: "200",
        status: "completed",
        created_at: createdAt,
        plan_id: "pro",
        currency: "USD",
      },
      {
        id: "pay-pending",
        amount: "50.5",
        status: "pending",
        created_at: createdAt,
        plan_id: "basic",
        currency: "USD",
      },
    ],
    userSubscriptions: [
      { plan_id: "basic", payment_status: "completed", created_at: createdAt },
      { plan_id: "pro", payment_status: "completed", created_at: createdAt },
    ],
    subscriptionPlans: [
      { id: "basic", name: "Basic Plan", currency: "USD" },
      { id: "pro", name: "Pro Plan", currency: "USD" },
    ],
    botUsers: [{ id: "user-1", created_at: createdAt }],
    currentVip: [{ telegram_id: "vip-1", is_vip: true, created_at: createdAt }],
  });

  let patched: URL | undefined;
  try {
    const original = new URL(
      "../supabase/functions/analytics-data/index.ts",
      import.meta.url,
    );
    patched = new URL(
      "../supabase/functions/analytics-data/index.test.ts",
      import.meta.url,
    );
    let source = await Deno.readTextFile(original);
    source = source.replace(
      "../_shared/client.ts",
      "../../../tests/analytics-data-supabase-stub.ts",
    );
    source = source.replace(
      "../_shared/serve.ts",
      "../../../tests/serve-stub.ts",
    );
    await Deno.writeTextFile(patched, source);

    const { handler } = await freshImport(patched);
    const request = new Request("http://localhost/analytics-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeframe: "today" }),
    });

    const response = await handler(request);
    assertStrictEqual(response.status, 200);
    const payload = await response.json();

    assertStrictEqual(typeof payload.total_revenue, "number");
    assertStrictEqual(payload.total_revenue, 323.45);
    assertStrictEqual(payload.pending_payments, 1);

    const performance = payload.package_performance;
    assert(Array.isArray(performance));
    const revenueByPlan = new Map(
      performance.map((
        plan: { id: string; revenue: number },
      ) => [plan.id, plan.revenue]),
    );
    assert(revenueByPlan.has("basic"));
    assert(revenueByPlan.has("pro"));
    assertStrictEqual(revenueByPlan.get("basic"), 123.45);
    assertStrictEqual(revenueByPlan.get("pro"), 200);
    assertStrictEqual(
      payload.total_revenue,
      Number(revenueByPlan.get("basic")) + Number(revenueByPlan.get("pro")),
    );
  } finally {
    if (patched) {
      await Deno.remove(patched).catch(() => {});
    }
    __resetAnalyticsDataStubState();
  }
});
