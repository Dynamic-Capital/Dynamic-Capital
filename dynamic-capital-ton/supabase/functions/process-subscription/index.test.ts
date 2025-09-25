import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
Deno.env.set("SUPABASE_SERVICE_KEY", "service-key");
Deno.env.set("TELEGRAM_BOT_TOKEN", "bot-token");
Deno.env.set("ANNOUNCE_CHAT_ID", "chat-id");
Deno.env.set("APP_URL", "https://app.example");
Deno.env.set("TON_INDEXER_URL", "https://indexer.example");

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
  return {
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
      throw new Error(`Unexpected table access: ${table}`);
    },
  };
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

  const supabaseStub = createSupabaseStub({
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
    supabase: supabaseStub as HandlerDependencies["supabase"],
    fetch: fetchStub,
  });

  assertEquals(response.status, 400);
  const body = await response.text();
  assertStringIncludes(body, "Funds not received");
  assertEquals(fetchCalls.length, 1);
});
