import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
Deno.env.set("SUPABASE_SERVICE_KEY", "service-key");
Deno.env.set("TELEGRAM_BOT_TOKEN", "bot-token");
Deno.env.set("ANNOUNCE_CHAT_ID", "chat-id");
Deno.env.set("APP_URL", "https://app.example");
Deno.env.set("TON_INDEXER_URL", "https://indexer.example");
Deno.env.set("BURN_WEBHOOK_URL", "https://burn.example");

const { handler } = await import("./index.ts");
type HandlerDependencies = NonNullable<Parameters<typeof handler>[1]>;

type AppConfigRow = {
  operations_pct: number;
  autoinvest_pct: number;
  buyback_burn_pct: number;
  min_ops_pct: number;
  max_ops_pct: number;
  min_invest_pct: number;
  max_invest_pct: number;
  min_burn_pct: number;
  max_burn_pct: number;
  ops_treasury: string;
  dct_master: string;
  dex_router: string;
};

function createSupabaseStub(config: AppConfigRow) {
  const subscriptions: Array<Record<string, unknown>> = [];
  const logs: Array<Record<string, unknown>> = [];
  const stakes: Array<Record<string, unknown>> = [];

  const supabase = {
    from(table: string) {
      if (table === "app_config") {
        return {
          select() {
            return {
              eq: () => ({
                single: async () => ({ data: config, error: null }),
              }),
            };
          },
        };
      }

      if (table === "users") {
        return {
          select() {
            return {
              eq: () => ({
                single: async () => ({ data: { id: "user-1" }, error: null }),
              }),
            };
          },
        };
      }

      if (table === "subscriptions") {
        return {
          insert(payload: Record<string, unknown>) {
            return {
              select() {
                return {
                  single: async () => {
                    const record = { id: "sub-1", ...payload };
                    subscriptions.push(record);
                    return { data: record, error: null };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "stakes") {
        return {
          insert(payload: Record<string, unknown>) {
            stakes.push(payload);
            return { error: null };
          },
        };
      }

      if (table === "tx_logs") {
        return {
          insert(rows: Array<Record<string, unknown>>) {
            logs.push(...rows);
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table access: ${table}`);
    },
  };

  return { supabase: supabase as HandlerDependencies["supabase"], subscriptions, logs, stakes };
}

Deno.test("rejects subscription when TON transfer goes to different wallet", async () => {
  const request = new Request(
    "https://example/functions/process-subscription",
    {
      method: "POST",
      body: JSON.stringify({
        telegram_id: "1234",
        plan: "vip_bronze",
        tx_hash: "0xdeadbeef",
      }),
      headers: { "Content-Type": "application/json" },
    },
  );

  const { supabase } = createSupabaseStub({
    operations_pct: 60,
    autoinvest_pct: 30,
    buyback_burn_pct: 10,
    min_ops_pct: 40,
    max_ops_pct: 75,
    min_invest_pct: 15,
    max_invest_pct: 45,
    min_burn_pct: 5,
    max_burn_pct: 20,
    ops_treasury: "EQOPS",
    dct_master: "EQMASTER",
    dex_router: "EQROUTER",
  });

  const fetchCalls: Array<{ input: string | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (
    input: Request | URL | string,
    init?: RequestInit,
  ) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    fetchCalls.push({ input: url, init });

    if (url.includes("/transactions/")) {
      return new Response(
        JSON.stringify({
          destination: "EQWRONG",
          amount: 120_000_000_000,
        }),
        { status: 200 },
      );
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  };

  const response = await handler(request, {
    supabase,
    fetch: fetchStub,
  });

  assertEquals(response.status, 400);
  const body = await response.text();
  assertStringIncludes(body, "Funds not received");
  assertEquals(fetchCalls.length, 1);
});

Deno.test("rejects subscription when TON amount is insufficient", async () => {
  const request = new Request(
    "https://example/functions/process-subscription",
    {
      method: "POST",
      body: JSON.stringify({
        telegram_id: "1234",
        plan: "vip_bronze",
        tx_hash: "0xlowton",
      }),
      headers: { "Content-Type": "application/json" },
    },
  );

  const { supabase } = createSupabaseStub({
    operations_pct: 60,
    autoinvest_pct: 30,
    buyback_burn_pct: 10,
    min_ops_pct: 40,
    max_ops_pct: 75,
    min_invest_pct: 15,
    max_invest_pct: 45,
    min_burn_pct: 5,
    max_burn_pct: 20,
    ops_treasury: "EQOPS",
    dct_master: "EQMASTER",
    dex_router: "https://dex.example",
  });

  const fetchStub: typeof fetch = async (input) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

    if (url.includes("/transactions/")) {
      return new Response(
        JSON.stringify({
          destination: "EQOPS",
          amountTon: 119,
        }),
        { status: 200 },
      );
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  };

  const response = await handler(request, {
    supabase,
    fetch: fetchStub,
  });

  assertEquals(response.status, 400);
  const body = await response.text();
  assertStringIncludes(body, "less than expected");
});

Deno.test("processes TON subscription and records swap + burn hashes", async () => {
  const request = new Request(
    "https://example/functions/process-subscription",
    {
      method: "POST",
      body: JSON.stringify({
        telegram_id: "1234",
        plan: "vip_bronze",
        tx_hash: "0xfullton",
      }),
      headers: { "Content-Type": "application/json" },
    },
  );

  const stub = createSupabaseStub({
    operations_pct: 60,
    autoinvest_pct: 30,
    buyback_burn_pct: 10,
    min_ops_pct: 40,
    max_ops_pct: 75,
    min_invest_pct: 15,
    max_invest_pct: 45,
    min_burn_pct: 5,
    max_burn_pct: 20,
    ops_treasury: "EQOPS",
    dct_master: "EQMASTER",
    dex_router: "https://dex.example",
  });

  const fetchCalls: Array<{ url: string; body?: string }> = [];
  const fetchStub: typeof fetch = async (input, init) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const bodyText = typeof init?.body === "string"
      ? init.body
      : init?.body instanceof Uint8Array
      ? new TextDecoder().decode(init.body)
      : init?.body
      ? String(init.body)
      : undefined;
    fetchCalls.push({ url, body: bodyText });

    if (url.includes("/transactions/")) {
      return new Response(
        JSON.stringify({
          destination: "EQOPS",
          amountTon: 120,
          source: "EQUSER",
          timestamp: "2024-01-01T00:00:00Z",
        }),
        { status: 200 },
      );
    }

    if (url === "https://dex.example/swap") {
      const payload = bodyText ? JSON.parse(bodyText) : {};
      if (payload.tag === "auto-invest") {
        return new Response(
          JSON.stringify({
            dctAmount: 3600,
            swapTxHash: "swap-auto",
            swapId: "swap-auto-id",
            tonSpent: payload.amountTon,
          }),
          { status: 200 },
        );
      }

      if (payload.tag === "buyback-burn") {
        return new Response(
          JSON.stringify({
            dctAmount: 1200,
            swapTxHash: "swap-burn",
            swapId: "swap-burn-id",
            tonSpent: payload.amountTon,
          }),
          { status: 200 },
        );
      }

      throw new Error("Unexpected swap payload");
    }

    if (url === "https://burn.example") {
      return new Response(JSON.stringify({ burnTxHash: "burn-hash" }), {
        status: 200,
      });
    }

    if (url.startsWith("https://api.telegram.org")) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  };

  const response = await handler(request, {
    supabase: stub.supabase,
    fetch: fetchStub,
  });

  assertEquals(response.status, 200);
  const payload = await response.json();
  assertEquals(payload, { ok: true });

  assertEquals(stub.subscriptions.length, 1);
  const subscription = stub.subscriptions[0];
  assertEquals(subscription.plan, "vip_bronze");
  assertEquals(subscription.ton_paid, 120);
  assertEquals(subscription.dct_bought, 3600);
  assertEquals(subscription.dct_burned, 1200);

  assertEquals(stub.logs.length, 4);
  const buybackLog = stub.logs.find((log) => log.kind === "buyback");
  assertExists(buybackLog);
  const buybackMeta = (buybackLog?.meta ?? {}) as Record<string, unknown>;
  assertEquals(buybackMeta.swapTxHash as string, "swap-auto");
  assertEquals(buybackMeta.routerSwapId as string, "swap-auto-id");
  const burnLog = stub.logs.find((log) => log.kind === "burn");
  assertExists(burnLog);
  const burnMeta = (burnLog?.meta ?? {}) as Record<string, unknown>;
  assertEquals(burnMeta.burnTxHash as string, "burn-hash");
  assertEquals(burnMeta.swapTxHash as string, "swap-burn");

  const telegramCall = fetchCalls.find((call) =>
    call.url.startsWith("https://api.telegram.org")
  );
  assertExists(telegramCall);
});
