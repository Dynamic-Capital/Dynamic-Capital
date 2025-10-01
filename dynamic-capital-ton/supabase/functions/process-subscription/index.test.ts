function assert(
  condition: unknown,
  message = "Assertion failed",
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function serialize(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function assertEquals<T>(actual: T, expected: T, message?: string): void {
  const isEqual = (() => {
    if (Object.is(actual, expected)) return true;
    if (
      typeof actual === "object" && actual !== null &&
      typeof expected === "object" && expected !== null
    ) {
      return serialize(actual) === serialize(expected);
    }
    return false;
  })();

  if (!isEqual) {
    const suffix = `Expected ${serialize(expected)}, received ${
      serialize(actual)
    }`;
    throw new Error(message ? `${message}: ${suffix}` : suffix);
  }
}

function assertStringIncludes(
  actual: string,
  expected: string,
  message?: string,
): void {
  if (!actual.includes(expected)) {
    const suffix = `Expected "${expected}" to be contained within "${actual}"`;
    throw new Error(message ? `${message}: ${suffix}` : suffix);
  }
}

Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
Deno.env.set("SUPABASE_SERVICE_KEY", "service-key");
Deno.env.set("TELEGRAM_BOT_TOKEN", "bot-token");
Deno.env.set("ANNOUNCE_CHAT_ID", "chat-id");
Deno.env.set("APP_URL", "https://app.example");
Deno.env.set("TON_INDEXER_URL", "https://indexer.example");
Deno.env.set("TON_USD_OVERRIDE", "2");

const { handler, verifyTonPayment } = await import("./index.ts");
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

type SupabaseStubState = {
  subscriptions: Array<unknown>;
  stakes: Array<unknown>;
  txLogs: Array<unknown>;
};

function createSupabaseStub(
  config: AppConfigRow,
  options: {
    user?: { id: string } | null;
    wallet?: { address?: string } | null;
    planPricing?: Record<string, {
      price: number;
      currency?: string;
      dynamic_price_usdt?: number | null;
      pricing_formula?: string | null;
      last_priced_at?: string | null;
      performance_snapshot?: Record<string, unknown> | null;
    }>;
  } = {},
) {
  const state: SupabaseStubState = {
    subscriptions: [],
    stakes: [],
    txLogs: [],
  };

  const plans = options.planPricing ?? {
    vip_bronze: {
      price: 120,
      currency: "USD",
      performance_snapshot: { ton_amount: 1.2, dct_amount: 120 },
    },
  };

  const client = {
    from(table: string) {
      switch (table) {
        case "app_config":
          return {
            select() {
              return {
                eq() {
                  return {
                    single: () =>
                      Promise.resolve({ data: config, error: null }),
                  };
                },
              };
            },
          };
        case "subscription_plans":
          return {
            select() {
              return {
                eq(_column: string, value: string) {
                  return {
                    single: () =>
                      Promise.resolve({
                        data: plans[value] ?? null,
                        error: plans[value]
                          ? null
                          : { message: "Plan not found" },
                      }),
                  };
                },
              };
            },
          };
        case "users":
          return {
            select() {
              return {
                eq() {
                  return {
                    single: () =>
                      Promise.resolve({
                        data: options.user ?? null,
                        error: options.user
                          ? null
                          : { message: "User not found" },
                      }),
                  };
                },
              };
            },
          };
        case "wallets":
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: () =>
                      Promise.resolve({
                        data: options.wallet ?? null,
                        error: null,
                      }),
                  };
                },
              };
            },
          };
        case "subscriptions":
          return {
            insert(values: unknown) {
              state.subscriptions.push(values);
              return {
                select() {
                  return {
                    single: () =>
                      Promise.resolve({
                        data: {
                          id: "sub-1",
                          ...(values as Record<string, unknown>),
                        },
                        error: null,
                      }),
                  };
                },
              };
            },
          };
        case "stakes":
          return {
            insert: (values: unknown) => {
              state.stakes.push(values);
              return Promise.resolve({ error: null });
            },
          };
        case "tx_logs":
          return {
            insert: (values: Array<unknown>) => {
              state.txLogs.push(...values);
              return Promise.resolve({ error: null });
            },
          };
        default:
          throw new Error(`Unexpected table access: ${table}`);
      }
    },
  };

  return { client, state };
}

Deno.test("returns 503 when TON pricing is unavailable", async () => {
  const originalOverride = Deno.env.get("TON_USD_OVERRIDE");
  try {
    if (originalOverride) {
      Deno.env.delete("TON_USD_OVERRIDE");
    }

    const request = new Request(
      "https://example/functions/process-subscription",
      {
        method: "POST",
        body: JSON.stringify({
          telegram_id: "9999",
          plan: "vip_bronze",
          tx_hash: "0xnope",
        }),
        headers: { "Content-Type": "application/json" },
      },
    );

    const { client: supabaseStub } = createSupabaseStub(
      {
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
      },
      {
        planPricing: {
          vip_bronze: {
            price: 120,
            currency: "USD",
            performance_snapshot: null,
          },
        },
      },
    );

    const fetchCalls: Array<string> = [];
    const fetchStub: typeof fetch = (input, _init) => {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;
      fetchCalls.push(url);

      if (url.includes("tonapi.io")) {
        return Promise.resolve(
          new Response(JSON.stringify({ rates: {} }), { status: 200 }),
        );
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    };

    const response = await handler(request, {
      supabase: supabaseStub as HandlerDependencies["supabase"],
      fetch: fetchStub,
    });

    assertEquals(response.status, 503);
    const payload = await response.json();
    assertEquals(payload.ok, false);
    assertStringIncludes(payload.error, "temporarily unavailable");
    assert(fetchCalls.some((url) => url.includes("tonapi.io")));
  } finally {
    if (originalOverride) {
      Deno.env.set("TON_USD_OVERRIDE", originalOverride);
    }
  }
});

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

  const { client: supabaseStub } = createSupabaseStub({
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
  const fetchStub: typeof fetch = (
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
      return Promise.resolve(
        new Response(
          JSON.stringify({
            destination: "EQWRONG",
            amount: 120_000_000_000,
          }),
          { status: 200 },
        ),
      );
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  };

  const response = await handler(request, {
    supabase: supabaseStub as HandlerDependencies["supabase"],
    fetch: fetchStub,
  });

  assertEquals(response.status, 400);
  const body = await response.text();
  assertStringIncludes(body, "Funds not received");
  assertEquals(fetchCalls.length, 1);
});

Deno.test("verifyTonPayment fails closed when indexer URL is missing", async () => {
  const original = Deno.env.get("TON_INDEXER_URL");
  try {
    if (original) Deno.env.delete("TON_INDEXER_URL");
    const result = await verifyTonPayment(
      "0xhash",
      "EQOPS",
      100,
      () => Promise.reject(new Error("fetch should not be called")),
    );
    assertEquals(result.ok, false);
    if (result.ok) {
      throw new Error(
        "Expected verification to fail when indexer is unavailable",
      );
    }
    assertEquals(result.error, "TON indexer unavailable");
    assertEquals(result.status, 503);
  } finally {
    if (original) {
      Deno.env.set("TON_INDEXER_URL", original);
    }
  }
});

Deno.test("rejects subscription when payer wallet mismatches linked wallet", async () => {
  const request = new Request(
    "https://example/functions/process-subscription",
    {
      method: "POST",
      body: JSON.stringify({
        telegram_id: "1234",
        plan: "vip_bronze",
        tx_hash: "0xfeedbeef",
      }),
      headers: { "Content-Type": "application/json" },
    },
  );

  const { client: supabaseStub, state } = createSupabaseStub(
    {
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
    },
    {
      user: { id: "user-1" },
      wallet: { address: "EQLINKED" },
    },
  );

  const fetchStub: typeof fetch = (input) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

    if (url.includes("/transactions/")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            destination: "EQOPS",
            amount: 120_000_000_000,
            source: "EQATTACKER",
          }),
          { status: 200 },
        ),
      );
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  };

  const response = await handler(request, {
    supabase: supabaseStub as HandlerDependencies["supabase"],
    fetch: fetchStub,
  });

  assertEquals(response.status, 400);
  const body = await response.text();
  assertStringIncludes(body, "Payer wallet does not match linked wallet");
  assertEquals(state.subscriptions.length, 0);
  assertEquals(state.stakes.length, 0);
  assertEquals(state.txLogs.length, 0);
});

Deno.test("processes subscription when payer wallet matches linked wallet", async () => {
  const request = new Request(
    "https://example/functions/process-subscription",
    {
      method: "POST",
      body: JSON.stringify({
        telegram_id: "5678",
        plan: "vip_bronze",
        tx_hash: "0xabc123",
      }),
      headers: { "Content-Type": "application/json" },
    },
  );

  const { client: supabaseStub, state } = createSupabaseStub(
    {
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
    },
    {
      user: { id: "user-2" },
      wallet: { address: "EQLINKED" },
    },
  );

  const notifications: Array<string> = [];
  const fetchCalls: Array<string> = [];
  const fetchStub: typeof fetch = (input, init) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    fetchCalls.push(url);

    if (url.includes("/transactions/")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            destination: "EQOPS",
            amount: 120_000_000_000,
            source: "EQLINKED",
          }),
          { status: 200 },
        ),
      );
    }

    if (url.includes("api.telegram.org")) {
      if (init?.body) {
        notifications.push(String(init.body));
      }
      return Promise.resolve(new Response("ok", { status: 200 }));
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  };

  const response = await handler(request, {
    supabase: supabaseStub as HandlerDependencies["supabase"],
    fetch: fetchStub,
  });

  assertEquals(response.status, 200);
  assert(fetchCalls.some((url) => url.includes("/transactions/")));
  assertEquals(state.subscriptions.length, 1);
  assertEquals(state.stakes.length, 1);
  assertEquals(state.txLogs.length, 4);

  const payload = await response.json();
  assertEquals(payload.ok, true);
  assertEquals(payload.ton_paid > 0, true);
  assertEquals(notifications.length, 1);
});
