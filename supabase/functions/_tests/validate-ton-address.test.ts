(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assertEquals } from "std/assert/mod.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

const ORIGINAL_FETCH = globalThis.fetch;

function setFetchResponse(status: number, body: unknown) {
  globalThis.fetch = (async (input: Request | string) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("/accountStates")) {
      return new Response(JSON.stringify(body), { status });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }) as typeof fetch;
}

Deno.test("validate-ton-address returns normalized address", async () => {
  setTestEnv({});
  setFetchResponse(200, {
    accounts: [
      {
        address:
          "0:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        balance: 123_000_000_000,
        status: "active",
      },
    ],
  });
  try {
    const { handler } = await import(
      `../validate-ton-address/index.ts?cache=${crypto.randomUUID()}`
    );
    const res = await handler(
      new Request("http://localhost/functions/v1/validate-ton-address", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address:
            "0:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        }),
      }),
    );
    assertEquals(res.status, 200);
    const payload = await res.json() as {
      normalizedAddress: string;
      balanceTon: number;
    };
    assertEquals(
      payload.normalizedAddress,
      "0:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        .toLowerCase(),
    );
    assertEquals(payload.balanceTon, 123);
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
    clearTestEnv();
  }
});

Deno.test("validate-ton-address rejects malformed input", async () => {
  setTestEnv({});
  globalThis.fetch = ORIGINAL_FETCH;
  try {
    const { handler } = await import(
      `../validate-ton-address/index.ts?cache=${crypto.randomUUID()}`
    );
    const res = await handler(
      new Request("http://localhost/functions/v1/validate-ton-address", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: "not-an-address" }),
      }),
    );
    assertEquals(res.status, 400);
  } finally {
    clearTestEnv();
  }
});

Deno.test("validate-ton-address handles indexer failures", async () => {
  setTestEnv({});
  setFetchResponse(500, { error: "boom" });
  try {
    const { handler } = await import(
      `../validate-ton-address/index.ts?cache=${crypto.randomUUID()}`
    );
    const res = await handler(
      new Request("http://localhost/functions/v1/validate-ton-address", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address:
            "0:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        }),
      }),
    );
    assertEquals(res.status, 500);
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
    clearTestEnv();
  }
});
