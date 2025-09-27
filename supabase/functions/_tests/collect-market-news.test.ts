import {
  assert,
  assertEquals,
} from "std/assert/mod.ts";

function fnv1a64(input: string): number {
  let hash = 1469598103934665603n;
  const prime = 1099511628211n;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return Number(hash);
}

Deno.test("collect-market-news upserts normalized rows", async () => {
  const originalFetch = globalThis.fetch;
  const serviceKey = "service-role-test";
  const requests: Array<{ url: URL; body: unknown; headers: Headers }> = [];

  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", serviceKey);
  Deno.env.set("NEWSAPI_API_KEY", "news-token");

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

    if (url.hostname === "newsapi.org") {
      const body = JSON.stringify({
        articles: [
          {
            title: "Dollar surges as yields climb",
            publishedAt: "2024-05-01T12:00:00Z",
            source: { name: "Financial Times" },
          },
          {
            title: "Oil prices steady on supply optimism",
            publishedAt: "2024-05-01T13:15:00Z",
            source: { name: "Reuters" },
          },
        ],
      });
      return new Response(body, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (
      url.hostname === "stub.supabase.co" &&
      url.pathname.startsWith("/rest/v1/market_news")
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
      `../collect-market-news/index.ts?cache=${crypto.randomUUID()}`
    );

    const response = await handler(
      new Request("http://localhost/functions/v1/collect-market-news", {
        method: "POST",
      }),
    );

    assertEquals(response.status, 200);
    const payload = await response.json() as { inserted: number };
    assertEquals(payload.inserted, 2);
    assertEquals(requests.length, 1);
    const [request] = requests;
    assertEquals(request.url.searchParams.get("on_conflict"), "id");
    const body = request.body as Array<Record<string, unknown>>;
    assert(Array.isArray(body));
    assertEquals(body.length, 2);

    const first = body[0];
    assertEquals(first["source"], "Financial Times");
    assertEquals(first["headline"], "Dollar surges as yields climb");
    assertEquals(first["event_time"], "2024-05-01T12:00:00.000Z");
    assertEquals(first["impact"], "high");
    const expectedId = fnv1a64(
      "Financial Times|Dollar surges as yields climb|2024-05-01T12:00:00.000Z",
    );
    assertEquals(first["id"], expectedId);
  } finally {
    globalThis.fetch = originalFetch;
    Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    Deno.env.delete("NEWSAPI_API_KEY");
  }
});
