(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assert, assertEquals } from "std/assert/mod.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch() {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const stub = async (input: Request | string, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.url;
    calls.push({ url, init });
    if (url.includes("/accountStates")) {
      return new Response(
        JSON.stringify({
          accounts: [
            {
              address: "0:ABCDEF",
              balance: 2_000_000_000,
              status: "active",
              extra_currencies: {},
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (url.includes("tonapi.io")) {
      return new Response(
        JSON.stringify({ rates: { TON: { prices: { USD: 5.25 } } } }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  globalThis.fetch = stub as typeof fetch;
  return { calls };
}

Deno.test("ton-wallet-snapshot persists summaries and alerts", async () => {
  setTestEnv({
    SUPABASE_URL: "https://stub.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
  });
  const wallets = [
    {
      address: "0:ABCDEF",
      owner: "Treasury",
      riskTier: "standard",
      tags: ["ops"],
    },
  ];
  Deno.env.set("TON_TREASURY_WALLETS", JSON.stringify(wallets));
  Deno.env.delete("TON_WALLET_EXPOSURE_LIMITS");
  const { calls } = mockFetch();

  const summaries: unknown[] = [];
  const alerts: unknown[] = [];
  const supabaseMock = {
    from(table: string) {
      if (table === "ton_wallet_summaries") {
        return {
          upsert(payload: unknown[]) {
            summaries.push(...payload);
            return Promise.resolve({ data: payload, error: null });
          },
        };
      }
      if (table === "ton_wallet_alerts") {
        return {
          upsert(payload: unknown[]) {
            alerts.push(...payload);
            return Promise.resolve({ data: payload, error: null });
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
  (globalThis as { __SUPABASE_SERVICE_CLIENT__?: typeof supabaseMock })
    .__SUPABASE_SERVICE_CLIENT__ = supabaseMock as never;

  try {
    const { handler } = await import(
      `../ton-wallet-snapshot/index.ts?cache=${crypto.randomUUID()}`
    );
    const res = await handler(
      new Request("http://localhost/functions/v1/ton-wallet-snapshot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ observedAt: "2025-01-01T00:00:00.000Z" }),
      }),
    );
    assertEquals(res.status, 200);
    const payload = await res.json() as {
      walletsProcessed: number;
      tonPriceUsd: number | null;
    };
    assertEquals(payload.walletsProcessed, 1);
    assertEquals(payload.tonPriceUsd, 5.25);
    assertEquals(summaries.length, 1);
    const record = summaries[0] as Record<string, unknown>;
    assertEquals(record.wallet_address, "0:ABCDEF");
    assertEquals(record.total_value_usd, 10.5);
    assert(Array.isArray(record.exposures));
    assertEquals(alerts.length, 1);
    assert(Array.isArray(calls));
    assert(calls.some((call) => call.url.includes("accountStates")));
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
    delete (globalThis as { __SUPABASE_SERVICE_CLIENT__?: unknown })
      .__SUPABASE_SERVICE_CLIENT__;
    Deno.env.delete("TON_TREASURY_WALLETS");
    clearTestEnv();
  }
});

Deno.test("ton-wallet-snapshot rejects missing wallet config", async () => {
  setTestEnv({});
  globalThis.fetch = ORIGINAL_FETCH;
  try {
    const { handler } = await import(
      `../ton-wallet-snapshot/index.ts?cache=${crypto.randomUUID()}`
    );
    const res = await handler(
      new Request("http://localhost/functions/v1/ton-wallet-snapshot", {
        method: "POST",
      }),
    );
    assertEquals(res.status, 400);
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
    clearTestEnv();
  }
});
