const globalAny = globalThis as {
  __SUPABASE_SKIP_AUTO_SERVE__?: boolean;
  __SUPABASE_FORCE_REMOTE__?: boolean;
};

globalAny.__SUPABASE_SKIP_AUTO_SERVE__ = true;

async function withForcedRemote<T>(fn: () => Promise<T>): Promise<T> {
  const previousForceRemote = globalAny.__SUPABASE_FORCE_REMOTE__;
  const previousUrl = Deno.env.get("SUPABASE_URL");
  const previousPublicUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
  globalAny.__SUPABASE_FORCE_REMOTE__ = true;
  Deno.env.set("SUPABASE_URL", "https://stub.supabase.co");
  Deno.env.set("NEXT_PUBLIC_SUPABASE_URL", "https://stub.supabase.co");
  try {
    return await fn();
  } finally {
    if (previousForceRemote === undefined) {
      delete globalAny.__SUPABASE_FORCE_REMOTE__;
    } else {
      globalAny.__SUPABASE_FORCE_REMOTE__ = previousForceRemote;
    }
    if (previousUrl === undefined) {
      Deno.env.delete("SUPABASE_URL");
    } else {
      Deno.env.set("SUPABASE_URL", previousUrl);
    }
    if (previousPublicUrl === undefined) {
      Deno.env.delete("NEXT_PUBLIC_SUPABASE_URL");
    } else {
      Deno.env.set("NEXT_PUBLIC_SUPABASE_URL", previousPublicUrl);
    }
  }
}

import { assertEquals, assertStrictEquals } from "std/assert/mod.ts";

Deno.test("analysis-ingest stores valid analyst insight", async () => {
  await withForcedRemote(async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: URL; init: RequestInit | undefined }> = [];

    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");

    globalThis.fetch = async (
      input: Request | URL | string,
      init?: RequestInit,
    ) => {
      await Promise.resolve();

      const url = typeof input === "string"
        ? new URL(input)
        : input instanceof Request
        ? new URL(input.url)
        : new URL(input);

      if (
        url.hostname === "stub.supabase.co" &&
        url.pathname.startsWith("/rest/v1/analyst_insights")
      ) {
        requests.push({ url, init });
        return new Response(
          JSON.stringify([{
            id: crypto.randomUUID(),
            created_at: "2024-05-01",
          }]),
          {
            status: 201,
            headers: { "content-type": "application/json" },
          },
        );
      }

      return originalFetch(input, init);
    };

    try {
      const { handler } = await import(
        `../analysis-ingest/index.ts?cache=${crypto.randomUUID()}`
      );

      const payload = {
        symbol: "xauusd",
        bias: "buy",
        content: "Gold long setup on breakout",
        chart_url: "https://www.tradingview.com/x/abcd1234/",
      };

      const response = await handler(
        new Request("http://localhost/functions/v1/analysis-ingest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );

      assertEquals(response.status, 200);
      const body = await response.json() as {
        status: string;
        id: string | null;
      };
      assertEquals(body.status, "ok");
      assertStrictEquals(requests.length, 1);
      const [{ init }] = requests;
      const rawBody = JSON.parse(init?.body as string);
      const submitted = Array.isArray(rawBody)
        ? (rawBody[0] ?? {}) as Record<string, unknown>
        : rawBody as Record<string, unknown>;
      assertEquals(submitted.symbol, "XAUUSD");
      assertEquals(submitted.bias, "BUY");
      assertEquals(submitted.content, "Gold long setup on breakout");
      assertEquals(
        submitted.chart_url,
        "https://www.tradingview.com/x/abcd1234/",
      );
      assertEquals(submitted.author, "DynamicCapital-FX");
    } finally {
      globalThis.fetch = originalFetch;
      Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    }
  });
});

Deno.test("analysis-ingest rejects invalid bias", async () => {
  await withForcedRemote(async () => {
    const { handler } = await import(
      `../analysis-ingest/index.ts?cache=${crypto.randomUUID()}`
    );

    const response = await handler(
      new Request("http://localhost/functions/v1/analysis-ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbol: "BTCUSD",
          bias: "strong-buy",
          content: "Moon",
        }),
      }),
    );

    assertEquals(response.status, 400);
    const body = await response.json() as { error: string };
    assertEquals(body.error, "invalid_bias");
  });
});

Deno.test("analysis-ingest rejects malformed chart URLs", async () => {
  await withForcedRemote(async () => {
    const { handler } = await import(
      `../analysis-ingest/index.ts?cache=${crypto.randomUUID()}`
    );

    const response = await handler(
      new Request("http://localhost/functions/v1/analysis-ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbol: "EURUSD",
          content: "Range-bound",
          chart_url: "notaurl",
        }),
      }),
    );

    assertEquals(response.status, 400);
    const body = await response.json() as { error: string };
    assertEquals(body.error, "invalid_chart_url");
  });
});

Deno.test("analysis-ingest surfaces database errors", async () => {
  await withForcedRemote(async () => {
    const originalFetch = globalThis.fetch;
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    globalThis.fetch = async (
      input: Request | URL | string,
      init?: RequestInit,
    ) => {
      await Promise.resolve();

      const url = typeof input === "string"
        ? new URL(input)
        : input instanceof Request
        ? new URL(input.url)
        : new URL(input);

      if (
        url.hostname === "stub.supabase.co" &&
        url.pathname.startsWith("/rest/v1/analyst_insights")
      ) {
        return new Response(JSON.stringify({ message: "duplicate" }), {
          status: 409,
          headers: { "content-type": "application/json" },
        });
      }

      return originalFetch(input, init);
    };

    try {
      const { handler } = await import(
        `../analysis-ingest/index.ts?cache=${crypto.randomUUID()}`
      );

      const response = await handler(
        new Request("http://localhost/functions/v1/analysis-ingest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            symbol: "ETHUSD",
            content: "test",
          }),
        }),
      );

      assertEquals(response.status, 500);
      const body = await response.json() as { status: string; message: string };
      assertEquals(body.status, "error");
      assertEquals(body.message, "database_error");
    } finally {
      globalThis.fetch = originalFetch;
      Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    }
  });
});
