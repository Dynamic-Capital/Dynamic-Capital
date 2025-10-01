import { assert, assertEquals } from "std/assert/mod.ts";

Deno.test("collect-market-sentiment aggregates multiple providers", async () => {
  const originalFetch = globalThis.fetch;
  const serviceKey = "service-role-test";
  const requests: Array<{ url: URL; body: unknown; headers: Headers }> = [];

  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", serviceKey);
  Deno.env.set("FINNHUB_API_KEY", "finnhub-token");
  Deno.env.set("SENTIMENT_SYMBOLS", "BTCUSD");
  Deno.env.set("REDDIT_SUBREDDITS", "forex");
  Deno.env.set("REDDIT_USER_AGENT", "dynamic-test/1.0");
  Deno.env.set("TWITTER_BEARER_TOKEN", "twitter-token");
  Deno.env.set("TWITTER_SENTIMENT_QUERY", "BTCUSD OR ETHUSD");

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

    if (url.hostname === "api.alternative.me") {
      const body = JSON.stringify({
        data: [{ value: "65", timestamp: "1711046400" }],
      });
      return new Response(body, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "finnhub.io") {
      const body = JSON.stringify({
        sentiment: { bullishPercent: 58.2, bearishPercent: 21.4 },
      });
      return new Response(body, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "www.reddit.com") {
      const body = JSON.stringify({
        data: {
          children: [
            {
              data: {
                title: "BTCUSD looks primed for breakout",
                selftext: "Going long",
              },
            },
          ],
        },
      });
      return new Response(body, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.hostname === "api.twitter.com") {
      const body = JSON.stringify({
        data: [
          { text: "BTCUSD bullish momentum" },
          { text: "Random market" },
        ],
      });
      return new Response(body, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (
      url.hostname === "stub.supabase.co" &&
      url.pathname.startsWith("/rest/v1/sentiment")
    ) {
      const cloned = init?.body ? JSON.parse(init.body as string) : null;
      requests.push({ url, body: cloned, headers: new Headers(init?.headers) });
      return new Response("{}", {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }

    return originalFetch(input, init);
  };

  try {
    const { handler } = await import(
      `../collect-market-sentiment/index.ts?cache=${crypto.randomUUID()}`
    );

    const response = await handler(
      new Request("http://localhost/functions/v1/collect-market-sentiment", {
        method: "POST",
      }),
    );

    assertEquals(response.status, 200);
    const payload = await response.json() as { inserted: number };
    assertEquals(payload.inserted, 4);
    assertEquals(requests.length, 1);
    const [request] = requests;
    assertEquals(request.url.searchParams.get("on_conflict"), "source,symbol");
    const rows = request.body as Array<Record<string, unknown>>;
    assert(Array.isArray(rows));
    assertEquals(rows.length, 4);
    const sources = new Set(rows.map((row) => row["source"]));
    assert(sources.has("alternative.me"));
    assert(sources.has("finnhub"));
    assert(sources.has("reddit"));
    assert(sources.has("twitter"));
    const redditRow = rows.find((row) => row["source"] === "reddit");
    assert(redditRow);
    assertEquals(redditRow?.symbol, "BTCUSD");
  } finally {
    globalThis.fetch = originalFetch;
    Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    Deno.env.delete("FINNHUB_API_KEY");
    Deno.env.delete("SENTIMENT_SYMBOLS");
    Deno.env.delete("REDDIT_SUBREDDITS");
    Deno.env.delete("REDDIT_USER_AGENT");
    Deno.env.delete("TWITTER_BEARER_TOKEN");
    Deno.env.delete("TWITTER_SENTIMENT_QUERY");
  }
});
