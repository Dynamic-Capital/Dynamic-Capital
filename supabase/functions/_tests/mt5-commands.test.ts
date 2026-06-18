import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

async function withStubbedServe<T>(loader: () => Promise<T>): Promise<T> {
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
          // close sockets
        }
      }) as typeof originalServe;
  } else if (denoGlobal.Deno) {
    denoGlobal.Deno.serve = (() => ({ abort() {} })) as typeof originalServe;
  }
  try {
    return await loader();
  } finally {
    if (denoGlobal.Deno) {
      if (originalServe) {
        denoGlobal.Deno.serve = originalServe;
      } else {
        delete denoGlobal.Deno.serve;
      }
    }
  }
}

Deno.test("mt5-commands requires webhook auth", async () => {
  setTestEnv({
    SUPABASE_URL: "https://stub.supabase.co",
    MT5_COMMANDS_WEBHOOK_SECRET: "secret",
  });

  try {
    const { handler } = await withStubbedServe(async () =>
      await import(`../mt5-commands/index.ts?cache=${crypto.randomUUID()}`)
    );

    const res = await handler(
      new Request("http://localhost/functions/v1/mt5-commands", {
        method: "POST",
        body: JSON.stringify({ action: "open", symbol: "XAUUSD" }),
      }),
    );

    assertEquals(res.status, 401);
  } finally {
    clearTestEnv();
  }
});

Deno.test("mt5-commands enqueues and fetches commands", async () => {
  setTestEnv({
    SUPABASE_URL: "https://stub.supabase.co",
    MT5_COMMANDS_WEBHOOK_SECRET: "secret",
    MT5_TERMINAL_KEY: "terminal",
  });

  const inserted: Array<Record<string, unknown>> = [];
  const updateCalls: Array<{ status: string }> = [];
  const fetchedRows = [{
    id: "cmd-1",
    command_type: "open",
    symbol: "XAUUSD",
    side: "buy",
    volume: 1.2,
    price: 0,
    stop_loss: 1900,
    take_profit: 1950,
    trailing_stop: null,
    ticket: null,
    account_login: "123",
    payload: { action: "open" },
    comment: null,
  }];

  const mockSupabase = {
    from(table: string) {
      if (table !== "mt5_commands") {
        throw new Error("Unexpected table " + table);
      }
      return {
        insert(records: Record<string, unknown>[]) {
          inserted.push(...records);
          return {
            async select() {
              return {
                data: records.map((record) => ({
                  id: record.id,
                  external_id: record.external_id,
                })),
                error: null,
              };
            },
          };
        },
        select() {
          return {
            eq() {
              return this;
            },
            order() {
              return this;
            },
            limit: async () => ({ data: fetchedRows, error: null }),
          };
        },
        update(values: { status: string }) {
          updateCalls.push(values);
          return {
            in: async () => ({ data: null, error: null }),
            eq: async () => ({ data: null, error: null }),
          };
        },
      };
    },
  };

  try {
    const globalAny = globalThis as { __SUPABASE_SERVICE_CLIENT__?: unknown };
    globalAny.__SUPABASE_SERVICE_CLIENT__ = mockSupabase as unknown;

    const { handler } = await withStubbedServe(async () =>
      await import(`../mt5-commands/index.ts?cache=${crypto.randomUUID()}`)
    );

    const enqueue = await handler(
      new Request("http://localhost/functions/v1/mt5-commands", {
        method: "POST",
        headers: { Authorization: "Bearer secret" },
        body: JSON.stringify({
          action: "open",
          symbol: "XAUUSD",
          side: "buy",
          volume: 1.2,
        }),
      }),
    );
    assertEquals(enqueue.status, 202);
    assertEquals(inserted.length, 1);

    const getRes = await handler(
      new Request("http://localhost/functions/v1/mt5-commands?account=123", {
        method: "GET",
        headers: { Authorization: "Bearer terminal" },
      }),
    );
    assertEquals(getRes.status, 200);
    const body = await getRes.json() as {
      commands: Array<Record<string, unknown>>;
    };
    assertEquals(body.commands.length, 1);
    assertEquals(updateCalls.length, 1);

    const patchRes = await handler(
      new Request("http://localhost/functions/v1/mt5-commands", {
        method: "PATCH",
        headers: { Authorization: "Bearer terminal" },
        body: JSON.stringify({ results: [{ id: "cmd-1", status: "filled" }] }),
      }),
    );
    assertEquals(patchRes.status, 200);
  } finally {
    const globalAny = globalThis as { __SUPABASE_SERVICE_CLIENT__?: unknown };
    delete globalAny.__SUPABASE_SERVICE_CLIENT__;
    clearTestEnv();
  }
});
