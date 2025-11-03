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
          // close sockets immediately after wiring handler
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

Deno.test("mt5-risk rejects unauthenticated webhook", async () => {
  setTestEnv({
    SUPABASE_URL: "https://stub.supabase.co",
    MT5_RISK_WEBHOOK_SECRET: "risk",
  });

  try {
    const { handler } = await withStubbedServe(async () =>
      await import(`../mt5-risk/index.ts?cache=${crypto.randomUUID()}`)
    );

    const res = await handler(
      new Request("http://localhost/functions/v1/mt5-risk", {
        method: "POST",
        body: JSON.stringify({ ticket: "1" }),
      }),
    );
    assertEquals(res.status, 401);
  } finally {
    clearTestEnv();
  }
});

Deno.test("mt5-risk queues and fetches adjustments", async () => {
  setTestEnv({
    SUPABASE_URL: "https://stub.supabase.co",
    MT5_RISK_WEBHOOK_SECRET: "risk",
    MT5_TERMINAL_KEY: "terminal",
  });

  const inserted: Array<Record<string, unknown>> = [];
  const updateCalls: Array<{ status: string }> = [];
  const fetchedRows = [{
    id: "adj-1",
    ticket: "123",
    account_login: "123",
    symbol: "XAUUSD",
    desired_stop_loss: 1900,
    desired_take_profit: 1950,
    trailing_stop_distance: null,
    payload: { ticket: "123" },
    notes: null,
  }];

  const mockSupabase = {
    from(table: string) {
      if (table !== "mt5_risk_adjustments") {
        throw new Error("Unexpected table " + table);
      }
      return {
        insert(records: Record<string, unknown>[]) {
          inserted.push(...records);
          return {
            async select() {
              return {
                data: records.map((record) => ({ id: record.id })),
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
      await import(`../mt5-risk/index.ts?cache=${crypto.randomUUID()}`)
    );

    const enqueue = await handler(
      new Request("http://localhost/functions/v1/mt5-risk", {
        method: "POST",
        headers: { Authorization: "Bearer risk" },
        body: JSON.stringify({ adjustments: [{ ticket: "123" }] }),
      }),
    );
    assertEquals(enqueue.status, 202);
    assertEquals(inserted.length, 1);

    const getRes = await handler(
      new Request("http://localhost/functions/v1/mt5-risk?account=123", {
        method: "GET",
        headers: { Authorization: "Bearer terminal" },
      }),
    );
    assertEquals(getRes.status, 200);
    const body = await getRes.json() as {
      adjustments: Array<Record<string, unknown>>;
    };
    assertEquals(body.adjustments.length, 1);
    assertEquals(updateCalls.length, 1);

    const patchRes = await handler(
      new Request("http://localhost/functions/v1/mt5-risk", {
        method: "PATCH",
        headers: { Authorization: "Bearer terminal" },
        body: JSON.stringify({ results: [{ id: "adj-1", status: "applied" }] }),
      }),
    );
    assertEquals(patchRes.status, 200);
  } finally {
    const globalAny = globalThis as { __SUPABASE_SERVICE_CLIENT__?: unknown };
    delete globalAny.__SUPABASE_SERVICE_CLIENT__;
    clearTestEnv();
  }
});
