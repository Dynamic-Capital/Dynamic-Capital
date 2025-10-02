import { assertEquals } from "std/assert/mod.ts";

(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

const REQUIRED_ENV = [
  "ONEDRIVE_TENANT_ID",
  "ONEDRIVE_CLIENT_ID",
  "ONEDRIVE_CLIENT_SECRET",
  "ONEDRIVE_PROXY_SECRET",
] as const;

function setRequiredEnv() {
  REQUIRED_ENV.forEach((key) => {
    Deno.env.set(key, `test-${key.toLowerCase()}`);
  });
}

function clearRequiredEnv() {
  REQUIRED_ENV.forEach((key) => {
    try {
      Deno.env.delete(key);
    } catch {
      // Ignore if permissions are not available in certain environments.
    }
  });
}

Deno.test("onedrive-proxy lists drive items", async () => {
  setRequiredEnv();

  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch =
    (async (input: Request | URL | string, init?: RequestInit) => {
      await Promise.resolve(); // satisfy require-await

      const url = typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;
      calls.push({ url, init });

      if (url.includes("/oauth2/v2.0/token")) {
        return new Response(
          JSON.stringify({ access_token: "fake-token", expires_in: 3600 }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.includes("/children")) {
        return new Response(
          JSON.stringify({
            value: [
              {
                id: "item-1",
                name: "Docs",
                folder: { childCount: 2 },
                parentReference: { id: "root", path: "/drive/root:" },
                webUrl: "https://example.com/docs",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

  try {
    const { handler } = await import(
      `../onedrive-proxy/index.ts?cache=${crypto.randomUUID()}`
    );

    const request = new Request(
      "http://localhost/functions/v1/onedrive-proxy",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Authorization": "Bearer test-onedrive_proxy_secret",
        },
        body: JSON.stringify({
          action: "list",
          driveId: "drive-123",
          path: "knowledge",
        }),
      },
    );

    const response = await handler(request);
    assertEquals(response.status, 200);

    const payload = await response.json() as {
      items: Array<
        {
          id: string;
          name: string;
          isFolder: boolean;
          childCount: number | null;
        }
      >;
    };

    assertEquals(payload.items.length, 1);
    assertEquals(payload.items[0].id, "item-1");
    assertEquals(payload.items[0].name, "Docs");
    assertEquals(payload.items[0].isFolder, true);
    assertEquals(payload.items[0].childCount, 2);

    assertEquals(calls.length, 2);
    assertEquals(
      calls[0].url,
      "https://login.microsoftonline.com/test-onedrive_tenant_id/oauth2/v2.0/token",
    );
    assertEquals(
      calls[1].url,
      "https://graph.microsoft.com/v1.0/drives/drive-123/root:/knowledge:/children",
    );
  } finally {
    clearRequiredEnv();
    globalThis.fetch = originalFetch;
  }
});

Deno.test("onedrive-proxy rejects unauthorized requests", async () => {
  setRequiredEnv();
  try {
    const { handler } = await import(
      `../onedrive-proxy/index.ts?cache=${crypto.randomUUID()}`
    );

    const request = new Request(
      "http://localhost/functions/v1/onedrive-proxy",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      },
    );

    const response = await handler(request);
    assertEquals(response.status, 401);
  } finally {
    clearRequiredEnv();
  }
});
