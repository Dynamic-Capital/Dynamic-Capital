(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assertEquals } from "std/assert/mod.ts";

Deno.test("huggingface-image-captioning stores generated caption", async () => {
  const originalFetch = globalThis.fetch;
  const serviceKey = "service-role-test";

  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", serviceKey);
  Deno.env.set("HUGGINGFACE_ACCESS_TOKEN", "hf_test_token");

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
      url.pathname.includes("/storage/v1/object/sign")
    ) {
      return new Response(
        JSON.stringify({
          signedUrl: "https://signed.example/test.png?token=1",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }

    if (url.hostname === "signed.example") {
      const bytes = new Uint8Array([137, 80, 78, 71]);
      return new Response(bytes, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(bytes.byteLength),
        },
      });
    }

    if (url.hostname === "api-inference.huggingface.co") {
      return new Response(
        JSON.stringify({ generated_text: "a test caption" }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }

    if (
      url.hostname === "stub.supabase.co" &&
      url.pathname.startsWith("/rest/v1/image_caption")
    ) {
      return new Response("{}", {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }

    return originalFetch(input, init);
  };

  try {
    const { handler } = await import(
      `../huggingface-image-captioning/index.ts?cache=${crypto.randomUUID()}`
    );

    const payload = {
      type: "INSERT" as const,
      table: "objects",
      schema: "public",
      record: {
        id: "object-123",
        bucket_id: "images",
        name: "sample.png",
        path_tokens: ["sample.png"],
        mime_type: "image/png",
      },
      old_record: null,
    };

    const response = await handler(
      new Request(
        "http://localhost/functions/v1/huggingface-image-captioning",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      ),
    );

    assertEquals(response.status, 200);
    const body = await response.json() as { caption: string };
    assertEquals(body.caption, "a test caption");
  } finally {
    globalThis.fetch = originalFetch;
    Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    Deno.env.delete("HUGGINGFACE_ACCESS_TOKEN");
  }
});

Deno.test("huggingface-image-captioning skips non-image payloads", async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];

  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
  Deno.env.set("HUGGINGFACE_ACCESS_TOKEN", "hf_test_token");

  globalThis.fetch = async (input: Request | URL | string) => {
    await Promise.resolve();
    const url = typeof input === "string"
      ? new URL(input)
      : input instanceof Request
      ? new URL(input.url)
      : new URL(input);
    requests.push(url.toString());
    throw new Error(`Unexpected fetch call to ${url}`);
  };

  try {
    const { handler } = await import(
      `../huggingface-image-captioning/index.ts?cache=${crypto.randomUUID()}`
    );

    const payload = {
      type: "INSERT" as const,
      table: "objects",
      schema: "public",
      record: {
        id: "object-456",
        bucket_id: "docs",
        name: "document.pdf",
        path_tokens: ["document.pdf"],
        mime_type: "application/pdf",
      },
      old_record: null,
    };

    const response = await handler(
      new Request(
        "http://localhost/functions/v1/huggingface-image-captioning",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      ),
    );

    assertEquals(response.status, 200);
    const body = await response.json() as { skipped: boolean; reason: string };
    assertEquals(body.skipped, true);
    assertEquals(body.reason, "unsupported_mime_type");
    assertEquals(requests.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    Deno.env.delete("HUGGINGFACE_ACCESS_TOKEN");
  }
});

Deno.test("huggingface-image-captioning returns bad request for invalid JSON", async () => {
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
  Deno.env.set("HUGGINGFACE_ACCESS_TOKEN", "hf_test_token");

  try {
    const { handler } = await import(
      `../huggingface-image-captioning/index.ts?cache=${crypto.randomUUID()}`
    );

    const response = await handler(
      new Request(
        "http://localhost/functions/v1/huggingface-image-captioning",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "not-json",
        },
      ),
    );

    assertEquals(response.status, 400);
    const body = await response.json() as { ok: boolean; error: string };
    assertEquals(body.ok, false);
    assertEquals(body.error, "Invalid JSON body");
  } finally {
    Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    Deno.env.delete("HUGGINGFACE_ACCESS_TOKEN");
  }
});
