(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assert, assertEquals } from "std/assert/mod.ts";

const TARGETS = [
  "https://primary.example/dynamiccapital.ton",
  "https://backup.example/dynamiccapital.ton",
];

function setEnv(overrides: Record<string, string>) {
  for (const [key, value] of Object.entries(overrides)) {
    Deno.env.set(key, value);
  }
}

function clearEnv(keys: string[]) {
  for (const key of keys) {
    try {
      Deno.env.delete(key);
    } catch {
      // ignore when running without env permissions
    }
  }
}

Deno.test("ton-site-proxy forwards responses from the primary gateway", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  setEnv({
    TON_SITE_PROXY_TARGETS: TARGETS.join(","),
    TON_SITE_PROXY_CACHE_SECONDS: "120",
    TON_SITE_PROXY_TIMEOUT_MS: "1000",
    ALLOWED_ORIGINS: "*",
  });

  globalThis.fetch =
    (async (input: Request | URL | string, init?: RequestInit) => {
      await Promise.resolve();
      const url = typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;
      calls.push({ url, init });
      return new Response("PNG", {
        status: 200,
        headers: {
          "content-type": "image/png",
          "etag": "test-etag",
        },
      });
    }) as typeof fetch;

  try {
    const { handler } = await import(
      `../ton-site-proxy/index.ts?cache=${crypto.randomUUID()}`
    );

    const request = new Request(
      "https://edge.functions.supabase.co/ton-site-proxy/icon.png?rev=1",
      {
        method: "GET",
        headers: {
          "Origin": "https://app.example",
          "Range": "bytes=0-100",
        },
      },
    );

    const response = await handler(request);

    assertEquals(response.status, 200);
    assertEquals(await response.text(), "PNG");
    assertEquals(
      response.headers.get("x-ton-proxy-upstream"),
      TARGETS[0],
    );
    assertEquals(response.headers.get("x-ton-proxy-attempts"), "1");
    assertEquals(response.headers.get("access-control-allow-origin"), "*");
    assertEquals(
      response.headers.get("access-control-expose-headers"),
      "cache-control, content-length, content-type, etag, last-modified, x-ton-proxy-attempts, x-ton-proxy-upstream",
    );

    const [{ url, init }] = calls;
    assertEquals(
      url,
      "https://primary.example/dynamiccapital.ton/icon.png?rev=1",
    );
    const forwardedHeaders = new Headers(init?.headers);
    assertEquals(forwardedHeaders.get("range"), "bytes=0-100");
    assertEquals(forwardedHeaders.get("accept-encoding"), "identity");
    assert(!forwardedHeaders.has("host"));
  } finally {
    clearEnv([
      "TON_SITE_PROXY_TARGETS",
      "TON_SITE_PROXY_CACHE_SECONDS",
      "TON_SITE_PROXY_TIMEOUT_MS",
      "ALLOWED_ORIGINS",
    ]);
    globalThis.fetch = originalFetch;
  }
});

Deno.test("ton-site-proxy retries the next gateway on errors", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  setEnv({
    TON_SITE_PROXY_TARGETS: TARGETS.join(","),
    ALLOWED_ORIGINS: "https://app.example",
  });

  globalThis.fetch =
    (async (input: Request | URL | string, init?: RequestInit) => {
      await Promise.resolve();
      const url = typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;
      calls.push({ url, init });
      if (url.startsWith(TARGETS[0])) {
        return new Response("bad", { status: 502 });
      }
      return new Response("ok", { status: 200 });
    }) as typeof fetch;

  try {
    const { handler } = await import(
      `../ton-site-proxy/index.ts?cache=${crypto.randomUUID()}`
    );

    const request = new Request(
      "https://edge.functions.supabase.co/ton-site-proxy/social/preview.svg",
      {
        method: "GET",
        headers: { "Origin": "https://app.example" },
      },
    );

    const response = await handler(request);

    assertEquals(response.status, 200);
    assertEquals(await response.text(), "ok");
    assertEquals(response.headers.get("x-ton-proxy-upstream"), TARGETS[1]);
    assertEquals(response.headers.get("x-ton-proxy-attempts"), "2");
    assertEquals(calls.length, 2);
    assertEquals(
      calls[1].url,
      "https://backup.example/dynamiccapital.ton/social/preview.svg",
    );
  } finally {
    clearEnv(["TON_SITE_PROXY_TARGETS", "ALLOWED_ORIGINS"]);
    globalThis.fetch = originalFetch;
  }
});

Deno.test("ton-site-proxy returns 502 when all gateways fail", async () => {
  const originalFetch = globalThis.fetch;
  setEnv({ TON_SITE_PROXY_TARGETS: TARGETS.join(",") });

  globalThis.fetch = (async () => {
    await Promise.resolve();
    throw new Error("network failure");
  }) as typeof fetch;

  try {
    const { handler } = await import(
      `../ton-site-proxy/index.ts?cache=${crypto.randomUUID()}`
    );

    const request = new Request(
      "https://edge.functions.supabase.co/ton-site-proxy/",
      { method: "GET" },
    );

    const response = await handler(request);
    assertEquals(response.status, 502);
    const payload = await response.json() as {
      error: string;
      attempts: Array<{ target: { base: string } }>;
    };
    assertEquals(payload.error, "All TON gateways failed");
    assertEquals(payload.attempts.length, TARGETS.length);
    assertEquals(payload.attempts[0].target.base, TARGETS[0]);
  } finally {
    clearEnv(["TON_SITE_PROXY_TARGETS"]);
    globalThis.fetch = originalFetch;
  }
});

Deno.test("ton-site-proxy honours HEAD requests", async () => {
  const originalFetch = globalThis.fetch;
  setEnv({ TON_SITE_PROXY_TARGETS: TARGETS[0] });

  globalThis.fetch =
    (async (input: Request | URL | string, init?: RequestInit) => {
      await Promise.resolve();
      return new Response("ignored", {
        status: 200,
        headers: { "content-length": "123" },
      });
    }) as typeof fetch;

  try {
    const { handler } = await import(
      `../ton-site-proxy/index.ts?cache=${crypto.randomUUID()}`
    );

    const request = new Request(
      "https://edge.functions.supabase.co/ton-site-proxy/icon.png",
      { method: "HEAD" },
    );

    const response = await handler(request);
    assertEquals(response.status, 200);
    assertEquals(await response.text(), "");
    assertEquals(response.headers.get("content-length"), "123");
  } finally {
    clearEnv(["TON_SITE_PROXY_TARGETS"]);
    globalThis.fetch = originalFetch;
  }
});
