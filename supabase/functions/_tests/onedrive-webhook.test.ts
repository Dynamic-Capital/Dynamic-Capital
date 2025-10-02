import { assertEquals, assertStringIncludes } from "std/assert/mod.ts";

(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

const REQUIRED_ENV = [
  "ONEDRIVE_TENANT_ID",
  "ONEDRIVE_CLIENT_ID",
  "ONEDRIVE_CLIENT_SECRET",
  "ONEDRIVE_WEBHOOK_SECRET",
  "ONEDRIVE_WEBHOOK_CLIENT_STATE",
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
      // Ignore when env permissions are restricted.
    }
  });
  try {
    Deno.env.delete("ONEDRIVE_DEFAULT_DRIVE_ID");
  } catch {
    // Ignore.
  }
}

Deno.test("onedrive-webhook responds to validation handshake", async () => {
  setRequiredEnv();
  try {
    const { handler } = await import(
      `../onedrive-webhook/index.ts?cache=${crypto.randomUUID()}`
    );

    const request = new Request(
      "http://localhost/functions/v1/onedrive-webhook?validationToken=abc123",
      { method: "GET" },
    );

    const response = await handler(request);
    assertEquals(response.status, 200);
    assertEquals(
      response.headers.get("content-type"),
      "text/plain; charset=utf-8",
    );
    const text = await response.text();
    assertEquals(text, "abc123");
  } finally {
    clearRequiredEnv();
  }
});

Deno.test("onedrive-webhook rejects unauthorized action requests", async () => {
  setRequiredEnv();
  try {
    const { handler } = await import(
      `../onedrive-webhook/index.ts?cache=${crypto.randomUUID()}`
    );

    const request = new Request(
      "http://localhost/functions/v1/onedrive-webhook",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "read", path: "reports" }),
      },
    );

    const response = await handler(request);
    assertEquals(response.status, 401);
  } finally {
    clearRequiredEnv();
  }
});

Deno.test("onedrive-webhook can read drive item with content", async () => {
  setRequiredEnv();
  Deno.env.set("ONEDRIVE_DEFAULT_DRIVE_ID", "drive-123");

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

      if (
        url ===
          "https://graph.microsoft.com/v1.0/drives/drive-123/root:/reports"
      ) {
        return new Response(
          JSON.stringify({
            id: "item-789",
            name: "reports",
            file: { mimeType: "text/plain" },
            parentReference: { id: "root", path: "/drive/root:" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (
        url ===
          "https://graph.microsoft.com/v1.0/drives/drive-123/root:/reports:/content"
      ) {
        return new Response(new TextEncoder().encode("hello world"), {
          status: 200,
          headers: { "content-type": "application/octet-stream" },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

  try {
    const { handler } = await import(
      `../onedrive-webhook/index.ts?cache=${crypto.randomUUID()}`
    );

    const request = new Request(
      "http://localhost/functions/v1/onedrive-webhook",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Authorization": "Bearer test-onedrive_webhook_secret",
        },
        body: JSON.stringify({
          action: "read",
          path: "reports",
          includeContent: true,
        }),
      },
    );

    const response = await handler(request);
    assertEquals(response.status, 200);
    const payload = await response.json() as {
      item: { id: string; name: string };
      content: string;
      encoding: string;
    };
    assertEquals(payload.item.id, "item-789");
    assertEquals(payload.item.name, "reports");
    assertEquals(payload.encoding, "utf-8");
    assertEquals(payload.content, "hello world");

    assertEquals(calls.length, 3);
    assertStringIncludes(calls[1].url, "/drives/drive-123/root:/reports");
    assertStringIncludes(
      calls[2].url,
      "/drives/drive-123/root:/reports:/content",
    );
  } finally {
    clearRequiredEnv();
    globalThis.fetch = originalFetch;
  }
});

Deno.test("onedrive-webhook uploads content", async () => {
  setRequiredEnv();
  Deno.env.set("ONEDRIVE_DEFAULT_DRIVE_ID", "drive-456");

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

      if (
        url.startsWith(
          "https://graph.microsoft.com/v1.0/drives/drive-456/root:/notes:/content",
        )
      ) {
        const received = init?.body instanceof Uint8Array
          ? new TextDecoder().decode(init.body)
          : init?.body as string;
        if (received !== "memo") {
          throw new Error(`Unexpected body: ${received}`);
        }
        return new Response(
          JSON.stringify({ id: "item-999", name: "notes" }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

  try {
    const { handler } = await import(
      `../onedrive-webhook/index.ts?cache=${crypto.randomUUID()}`
    );

    const request = new Request(
      "http://localhost/functions/v1/onedrive-webhook",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Authorization": "Bearer test-onedrive_webhook_secret",
        },
        body: JSON.stringify({
          action: "write",
          path: "notes",
          content: "memo",
          contentType: "text/plain",
          conflictBehavior: "replace",
        }),
      },
    );

    const response = await handler(request);
    assertEquals(response.status, 200);
    const payload = await response.json() as { item: { id: string } };
    assertEquals(payload.item.id, "item-999");

    assertEquals(calls.length, 2);
    assertStringIncludes(
      calls[1].url,
      "/drives/drive-456/root:/notes:/content?@microsoft.graph.conflictBehavior=replace",
    );
  } finally {
    clearRequiredEnv();
    globalThis.fetch = originalFetch;
  }
});

Deno.test("onedrive-webhook processes notifications", async () => {
  setRequiredEnv();

  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string }> = [];

  globalThis.fetch = (async (input: Request | URL | string) => {
    await Promise.resolve(); // satisfy require-await

    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    calls.push({ url });

    if (url.includes("/oauth2/v2.0/token")) {
      return new Response(
        JSON.stringify({ access_token: "fake-token", expires_in: 3600 }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (
      url === "https://graph.microsoft.com/v1.0/drives/drive-777/items/item-abc"
    ) {
      return new Response(
        JSON.stringify({
          id: "item-abc",
          name: "report.pdf",
          file: { mimeType: "application/pdf" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const { handler } = await import(
      `../onedrive-webhook/index.ts?cache=${crypto.randomUUID()}`
    );

    const request = new Request(
      "http://localhost/functions/v1/onedrive-webhook",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          value: [
            {
              subscriptionId: "sub-1",
              resource: "drives/drive-777/items/item-abc",
              changeType: "updated",
              clientState: "test-onedrive_webhook_client_state",
            },
          ],
        }),
      },
    );

    const response = await handler(request);
    assertEquals(response.status, 200);
    const payload = await response.json() as {
      notifications: Array<
        { notification: { subscriptionId: string }; item: { id: string } }
      >;
    };
    assertEquals(payload.notifications.length, 1);
    assertEquals(payload.notifications[0].notification.subscriptionId, "sub-1");
    assertEquals(payload.notifications[0].item.id, "item-abc");

    assertEquals(calls.length, 2);
  } finally {
    clearRequiredEnv();
    globalThis.fetch = originalFetch;
  }
});
