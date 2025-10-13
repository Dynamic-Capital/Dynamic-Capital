(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assert, assertEquals } from "std/assert/mod.ts";

Deno.test("economic calendar function returns normalized events", async () => {
  const originalFetch = globalThis.fetch;
  const serviceKey = "service-role-test";

  const g = globalThis as {
    process?: { env: Record<string, string | undefined> };
  };
  if (!g.process) {
    g.process = { env: {} };
  } else if (!g.process.env) {
    g.process.env = {};
  }

  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", serviceKey);
  g.process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;

  const capturedRequests: Array<{ url: URL; headers: Headers }> = [];
  const sentimentRequests: URL[] = [];

  globalThis.fetch = async (
    input: Request | URL | string,
    init?: RequestInit,
  ) => {
    await Promise.resolve(); // satisfy require-await

    const url = typeof input === "string"
      ? new URL(input)
      : input instanceof Request
      ? new URL(input.url)
      : new URL(input);

    if (
      url.hostname === "stub.supabase.co" &&
      url.pathname.startsWith("/rest/v1/market_news")
    ) {
      capturedRequests.push({ url, headers: new Headers(init?.headers) });
      const rows = [
        {
          id: 1,
          source: "FRED",
          headline: "CPI Release",
          event_time: "2024-03-19T18:00:00Z",
          impact: "high",
          currency: "USD, Rates",
          forecast: "3.4%",
          actual: "3.6%",
          created_at: "2024-03-18T00:00:00Z",
        },
      ];
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-range": "0-0/1",
        },
      });
    }

    if (
      url.hostname === "stub.supabase.co" &&
      url.pathname.startsWith("/rest/v1/sentiment")
    ) {
      sentimentRequests.push(url);
      const rows = [
        {
          source: "alternative.me",
          symbol: "FNG",
          sentiment: 65,
          long_percent: 65,
          short_percent: 35,
          created_at: "2024-03-19T00:00:00Z",
        },
      ];
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-range": "0-0/1",
        },
      });
    }

    if (url.hostname === "stub.supabase.co") {
      return new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return originalFetch(input as Request | URL | string, init);
  };

  try {
    const { handler } = await import(
      `../economic-calendar/index.ts?cache=${crypto.randomUUID()}`
    );

    const response = await handler(
      new Request("http://localhost/functions/v1/economic-calendar?limit=5"),
    );

    assertEquals(response.status, 200);
    const payload = await response.json() as {
      events: Array<Record<string, unknown>>;
      headlines: Array<Record<string, unknown>>;
      sentiment: Array<Record<string, unknown>>;
    };

    assert(Array.isArray(payload.events));
    assertEquals(payload.events.length, 1);

    const event = payload.events[0];
    assertEquals(event.id, "1");
    assertEquals(event.title, "CPI Release");
    assertEquals(event.scheduled_at, "2024-03-19T18:00:00.000Z");
    assertEquals(event.impact, "high");
    assertEquals(event.market_focus, ["USD", "Rates"]);
    assertEquals(event.commentary, "Forecast: 3.4% · Actual: 3.6%");
    assertEquals(event.source, "FRED");
    assertEquals(event.notes, "Source: FRED");

    assertEquals(capturedRequests.length, 1);
    const [request] = capturedRequests;
    assertEquals(
      request.url.searchParams.get("select"),
      "id,source,headline,event_time,impact,currency,forecast,actual,created_at",
    );
    assertEquals(request.url.searchParams.get("limit"), "5");
    assertEquals(request.url.searchParams.get("order"), "event_time.asc");

    const apiKey = request.headers.get("apikey");
    const authHeader = request.headers.get("authorization");
    assert(apiKey && apiKey.length > 0);
    assert(authHeader && authHeader.startsWith("Bearer "));

    assertEquals(sentimentRequests.length, 1);
    const [sentimentRequest] = sentimentRequests;
    assertEquals(sentimentRequest.searchParams.get("order"), "created_at.desc");
    assert(Array.isArray(payload.sentiment));
    assertEquals(payload.sentiment.length, 1);
    const [signal] = payload.sentiment;
    assertEquals(signal.source, "alternative.me");
    assertEquals(signal.symbol, "FNG");
    assertEquals(signal.sentiment, 65);
    assert(Array.isArray(payload.headlines));
    assertEquals(payload.headlines.length, 1);
    const [headline] = payload.headlines;
    assertEquals(headline.headline, "CPI Release");
  } finally {
    globalThis.fetch = originalFetch;
    Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    if (g.process?.env) {
      delete g.process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  }
});
