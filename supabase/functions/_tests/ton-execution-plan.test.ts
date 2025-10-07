(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assert, assertEquals } from "std/assert/mod.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

const ORIGINAL_FETCH = globalThis.fetch;

function stubTonApi(rate: number) {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ rates: { TON: { prices: { USD: rate } } } }),
      { status: 200 },
    )) as typeof fetch;
}

Deno.test("ton-execution-plan builds and persists plan", async () => {
  setTestEnv({
    SUPABASE_URL: "https://stub.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
  });
  stubTonApi(4.75);
  const inserted: unknown[] = [];
  const supabaseMock = {
    from(table: string) {
      assertEquals(table, "ton_execution_plans");
      return {
        insert(payload: unknown) {
          inserted.push(payload);
          return Promise.resolve({ data: { id: "plan-1" }, error: null });
        },
      };
    },
  };
  (globalThis as { __SUPABASE_SERVICE_CLIENT__?: typeof supabaseMock })
    .__SUPABASE_SERVICE_CLIENT__ = supabaseMock as never;

  try {
    const { handler } = await import(
      `../ton-execution-plan/index.ts?cache=${crypto.randomUUID()}`
    );
    const res = await handler(
      new Request("http://localhost/functions/v1/ton-execution-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          liquidity: [
            {
              venue: "STONFI",
              pair: "TON/USDT",
              tonDepth: 400000,
              quoteDepth: 800000,
              utilisation: 0.6,
            },
            {
              venue: "DeDust",
              pair: "TON/USDT",
              tonDepth: 200000,
              quoteDepth: 400000,
              utilisation: 0.85,
            },
          ],
          telemetry: {
            tonPriceUsd: 5,
            bridgeLatencyMs: 1200,
            settlementBacklog: 3,
            tonInflow24h: 50000,
            tonOutflow24h: 120000,
          },
          treasury: {
            tonReserve: 600000,
            stableReserve: 400000,
            targetTonRatio: 0.55,
          },
        }),
      }),
    );
    assertEquals(res.status, 200);
    const payload = await res.json() as {
      plan: { actions: unknown[]; hasHighPriorityActions: boolean };
    };
    assert(payload.plan.actions.length > 0);
    assertEquals(payload.plan.hasHighPriorityActions, true);
    assertEquals(inserted.length, 1);
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
    delete (globalThis as { __SUPABASE_SERVICE_CLIENT__?: unknown })
      .__SUPABASE_SERVICE_CLIENT__;
    clearTestEnv();
  }
});

Deno.test("ton-execution-plan uses defaults when body missing", async () => {
  setTestEnv({});
  stubTonApi(4.1);
  const defaults = {
    liquidity: [{
      venue: "STONFI",
      pair: "TON/USDT",
      tonDepth: 900000,
      quoteDepth: 900000,
    }],
    telemetry: { tonPriceUsd: 3.5, bridgeLatencyMs: 400 },
    treasury: {
      tonReserve: 1000000,
      stableReserve: 500000,
      targetTonRatio: 0.5,
    },
  };
  Deno.env.set("TON_EXECUTION_DEFAULTS", JSON.stringify(defaults));
  const inserted: unknown[] = [];
  const supabaseMock = {
    from(table: string) {
      assertEquals(table, "ton_execution_plans");
      return {
        insert(payload: unknown) {
          inserted.push(payload);
          return Promise.resolve({ data: payload, error: null });
        },
      };
    },
  };
  (globalThis as { __SUPABASE_SERVICE_CLIENT__?: typeof supabaseMock })
    .__SUPABASE_SERVICE_CLIENT__ = supabaseMock as never;
  try {
    const { handler } = await import(
      `../ton-execution-plan/index.ts?cache=${crypto.randomUUID()}`
    );
    const res = await handler(
      new Request("http://localhost/functions/v1/ton-execution-plan", {
        method: "POST",
      }),
    );
    assertEquals(res.status, 200);
    assertEquals(inserted.length, 1);
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
    delete (globalThis as { __SUPABASE_SERVICE_CLIENT__?: unknown })
      .__SUPABASE_SERVICE_CLIENT__;
    Deno.env.delete("TON_EXECUTION_DEFAULTS");
    clearTestEnv();
  }
});
