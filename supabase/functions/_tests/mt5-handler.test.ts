import { assert, assertEquals } from "std/assert/mod.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

function withStubbedServe<T>(fn: () => Promise<T>): Promise<T> {
  const denoGlobal = globalThis as {
    Deno?: { serve?: (...args: unknown[]) => unknown };
  };
  const originalServe = denoGlobal.Deno?.serve;
  if (denoGlobal.Deno && originalServe) {
    denoGlobal.Deno.serve =
      ((optionsOrHandler: unknown, maybeHandler?: unknown) => {
        const controller = new AbortController();
        try {
          if (typeof optionsOrHandler === "function") {
            const server = (originalServe as any).call(
              denoGlobal.Deno,
              { signal: controller.signal },
              optionsOrHandler,
            );
            controller.abort();
            return server;
          }
          const opts = {
            ...(optionsOrHandler as Record<string, unknown>),
            signal: controller.signal,
          };
          const server = (originalServe as any).call(
            denoGlobal.Deno,
            opts,
            maybeHandler,
          );
          controller.abort();
          return server;
        } finally {
          // controller abort ensures sockets close immediately
        }
      }) as typeof originalServe;
  } else if (denoGlobal.Deno) {
    denoGlobal.Deno.serve = (() => ({ abort() {} })) as typeof originalServe;
  }
  return fn().finally(() => {
    if (denoGlobal.Deno) {
      if (originalServe) {
        denoGlobal.Deno.serve = originalServe;
      } else {
        delete denoGlobal.Deno.serve;
      }
    }
  });
}

Deno.test("mt5 handler validates required fields", async () => {
  setTestEnv({ SUPABASE_URL: "https://stub.supabase.co" });

  try {
    const { handler } = await withStubbedServe(async () =>
      await import(`../mt5/index.ts?cache=${crypto.randomUUID()}`)
    );

    const res = await handler(
      new Request("http://localhost/functions/v1/mt5", {
        method: "POST",
        body: JSON.stringify({ symbol: "XAUUSD" }),
      }),
    );

    assertEquals(res.status, 400);
  } finally {
    clearTestEnv();
  }
});

Deno.test("mt5 handler upserts normalized log payload", async () => {
  setTestEnv({
    SUPABASE_URL: "https://stub.supabase.co",
    TELEGRAM_BOT_TOKEN: "bot-token",
    TELEGRAM_TRADES_CHAT_ID: "123",
  });

  const tables: string[] = [];
  const upserts: Array<{ record: Record<string, unknown>; options: unknown }> =
    [];
  const inserts: Array<{ table: string; record: Record<string, unknown> }> = [];
  const fetchCalls: Array<{ url: string; body: string }> = [];
  const mockSupabase = {
    from(table: string) {
      tables.push(table);
      return {
        async upsert(record: Record<string, unknown>, options: unknown) {
          upserts.push({ record, options });
          return { data: null, error: null };
        },
        async insert(record: Record<string, unknown>) {
          inserts.push({ table, record });
          return { data: null, error: null };
        },
      };
    },
  };

  try {
    const globalAny = globalThis as { __SUPABASE_SERVICE_CLIENT__?: unknown };
    globalAny.__SUPABASE_SERVICE_CLIENT__ = mockSupabase as unknown;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: string, init?: RequestInit) => {
      fetchCalls.push({ url, body: String(init?.body ?? "") });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    const { handler } = await withStubbedServe(async () =>
      await import(`../mt5/index.ts?cache=${crypto.randomUUID()}`)
    );

    const openedAt = 1_695_800_000;
    const res = await handler(
      new Request("http://localhost/functions/v1/mt5", {
        method: "POST",
        body: JSON.stringify({
          symbol: "XAUUSD",
          type: "BUY",
          lots: "1.25",
          open_price: "2350.5",
          profit: "12.34",
          ticket: "5555555",
          account: 123456,
          open_time: openedAt,
        }),
      }),
    );

    assertEquals(res.status, 200);
    const payload = await res.json() as { status: string };
    assertEquals(payload.status, "ok");

    assertEquals(tables, ["mt5_trade_logs"]);
    assertEquals(upserts.length, 1);

    const [{ record, options }] = upserts;
    assertEquals(options, { onConflict: "mt5_ticket_id" });

    const expectedOpened = new Date(openedAt * 1000).toISOString();

    assertEquals(record.symbol, "XAUUSD");
    assertEquals(record.side, "buy");
    assertEquals(record.mt5_ticket_id, "5555555");
    assertEquals(record.volume, 1.25);
    assertEquals(record.open_price, 2350.5);
    assertEquals(record.profit, 12.34);
    assertEquals(record.account_login, "123456");
    assertEquals(record.opened_at, expectedOpened);
    assertEquals(record.source, "mt5");

    const rawPayload = record.raw_payload as Record<string, unknown>;
    assert(rawPayload);
    assertEquals(rawPayload.symbol, "XAUUSD");
    assertEquals(rawPayload.ticket, "5555555");

    assertEquals(fetchCalls.length, 1);
    assert(
      fetchCalls[0].url.includes(
        "https://api.telegram.org/botbot-token/sendMessage",
      ),
    );
  } finally {
    const globalAny = globalThis as { __SUPABASE_SERVICE_CLIENT__?: unknown };
    delete globalAny.__SUPABASE_SERVICE_CLIENT__;
    globalThis.fetch = originalFetch;
    clearTestEnv();
  }
});

Deno.test("mt5 handler records heartbeat payloads", async () => {
  setTestEnv({ SUPABASE_URL: "https://stub.supabase.co" });

  const tables: string[] = [];
  const inserts: Array<{ table: string; record: Record<string, unknown> }> = [];
  const mockSupabase = {
    from(table: string) {
      tables.push(table);
      return {
        async insert(record: Record<string, unknown>) {
          inserts.push({ table, record });
          return { data: null, error: null };
        },
      };
    },
  };

  try {
    const globalAny = globalThis as { __SUPABASE_SERVICE_CLIENT__?: unknown };
    globalAny.__SUPABASE_SERVICE_CLIENT__ = mockSupabase as unknown;

    const { handler } = await withStubbedServe(async () =>
      await import(`../mt5/index.ts?cache=${crypto.randomUUID()}`)
    );

    const res = await handler(
      new Request("http://localhost/functions/v1/mt5", {
        method: "POST",
        body: JSON.stringify({
          status: "alive",
          account: "12345",
          balance: 1000,
          equity: 1010,
        }),
      }),
    );

    assertEquals(res.status, 200);
    assertEquals(tables, ["mt5_account_heartbeats"]);
    assertEquals(inserts.length, 1);
    const heartbeat = inserts[0].record;
    assertEquals(heartbeat.account_login, "12345");
    assertEquals(heartbeat.status, "alive");
    assertEquals(heartbeat.balance, 1000);
    assertEquals(heartbeat.equity, 1010);
  } finally {
    const globalAny = globalThis as { __SUPABASE_SERVICE_CLIENT__?: unknown };
    delete globalAny.__SUPABASE_SERVICE_CLIENT__;
    clearTestEnv();
  }
});
