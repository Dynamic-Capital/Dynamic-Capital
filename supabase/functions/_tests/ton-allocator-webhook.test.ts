(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assert, assertEquals } from "std/assert/mod.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

const ORIGINAL_FETCH = globalThis.fetch;

const SECRET = "allocator-secret";

async function loadHandler() {
  return await import(
    `../ton-allocator-webhook/index.ts?cache=${crypto.randomUUID()}`
  );
}

async function sign(body: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function setAllocatorSecret(value: string) {
  try {
    Deno.env.set("TON_ALLOCATOR_WEBHOOK_SECRET", value);
  } catch {
    // ignore permission errors in restricted envs
  }
}

function clearAllocatorSecret() {
  try {
    Deno.env.delete("TON_ALLOCATOR_WEBHOOK_SECRET");
  } catch {
    // ignore when env cannot be mutated
  }
}

function stubTransactionFetch(
  options: {
    amountNano?: number;
    investor?: string;
    status?: number;
    blockSeq?: number;
    timestamp?: number;
  },
) {
  const {
    amountNano = 2_000_000_000,
    investor = "0:ABCDEF",
    status = 200,
    blockSeq = 12345,
    timestamp = 1_700_000_000,
  } = options;
  globalThis.fetch = (async (input: Request | string) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("/transactions/")) {
      if (status !== 200) {
        return new Response(JSON.stringify({ error: "failed" }), { status });
      }
      return new Response(
        JSON.stringify({
          hash: "ABC123",
          account: { address: investor },
          in_msg: { source: investor, value: amountNano },
          mc_block_seqno: blockSeq,
          now: timestamp,
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
}

Deno.test("ton-allocator-webhook rejects missing signature", async () => {
  setTestEnv({
    SUPABASE_URL: "https://stub.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
  });
  setAllocatorSecret(SECRET);
  try {
    const { handler } = await loadHandler();
    const res = await handler(
      new Request("http://localhost/functions/v1/ton-allocator-webhook", {
        method: "POST",
        body: "{}",
      }),
    );
    assertEquals(res.status, 401);
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
    clearAllocatorSecret();
    clearTestEnv();
  }
});

Deno.test("ton-allocator-webhook stores event and triggers notifier", async () => {
  setTestEnv({
    SUPABASE_URL: "https://stub.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
  });
  setAllocatorSecret(SECRET);
  stubTransactionFetch({
    amountNano: 2_100_000_000,
    investor: "0:ABCDEF",
    blockSeq: 54321,
    timestamp: 1_700_000_123,
  });

  const inserted: Record<string, unknown>[] = [];
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const supabaseMock = {
    from(table: string) {
      assertEquals(table, "ton_pool_events");
      return {
        insert(payload: Record<string, unknown>) {
          inserted.push(payload);
          return {
            select() {
              return {
                async maybeSingle() {
                  return { data: { id: "evt-123" }, error: null };
                },
              };
            },
          };
        },
      };
    },
    async rpc(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args });
      return { data: null, error: null };
    },
  };

  const globalAny = globalThis as {
    __SUPABASE_SERVICE_CLIENT__?: typeof supabaseMock;
  };
  globalAny.__SUPABASE_SERVICE_CLIENT__ = supabaseMock as unknown;

  const body = {
    event: {
      depositId: 42,
      investorKey: "0:ABCDEF",
      usdtAmount: 1000.5,
      dctAmount: 950.25,
      fxRate: 1.05,
      tonTxHash: "ABC123",
      valuationUsdt: 1001,
    },
    proof: {
      blockId: "-1:1:abc",
      shardProof: "boc://payload",
      signature: "0xdeadbeef",
      routerTxHash: "ff00",
    },
    observedAt: "2025-01-01T00:00:00.000Z",
  };

  const payload = JSON.stringify(body);
  const signature = await sign(payload, SECRET);

  try {
    const { handler } = await loadHandler();
    const res = await handler(
      new Request("http://localhost/functions/v1/ton-allocator-webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-allocator-signature": signature,
        },
        body: payload,
      }),
    );

    assertEquals(res.status, 200);
    const json = await res.json() as { ok: boolean; eventId: string | null };
    assertEquals(json.ok, true);
    assertEquals(json.eventId, "evt-123");

    assertEquals(inserted.length, 1);
    const record = inserted[0];
    assertEquals(record.deposit_id, "42");
    assertEquals(record.investor_key, "0:abcdef");
    assertEquals(record.usdt_amount, 1000.5);
    assertEquals(record.dct_amount, 950.25);
    assertEquals(record.fx_rate, 1.05);
    assertEquals(record.ton_tx_hash, "ABC123");
    assertEquals(record.valuation_usdt, 1001);
    assertEquals(record.proof_payload, body.proof);
    assertEquals(record.event_payload, body.event);
    assertEquals(record.observed_at, body.observedAt);
    assert(typeof record.verified_at === "string");
    assert(!Number.isNaN(Date.parse(record.verified_at as string)));
    assertEquals(record.on_chain_investor, "0:abcdef");
    assertEquals(record.on_chain_amount_ton, 2.1);
    assertEquals(record.on_chain_block_seqno, 54321);
    assert(typeof record.on_chain_timestamp === "string");

    assertEquals(rpcCalls.length, 1);
    assertEquals(rpcCalls[0], {
      name: "notify_ton_pool_event",
      args: { p_event_id: "evt-123" },
    });
  } finally {
    delete globalAny.__SUPABASE_SERVICE_CLIENT__;
    globalThis.fetch = ORIGINAL_FETCH;
    clearAllocatorSecret();
    clearTestEnv();
  }
});

Deno.test("ton-allocator-webhook rejects mismatched transaction", async () => {
  setTestEnv({
    SUPABASE_URL: "https://stub.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
  });
  setAllocatorSecret(SECRET);
  stubTransactionFetch({ investor: "0:FFFF" });

  const body = {
    event: {
      depositId: 1,
      investorKey: "0:ABCDEF",
      usdtAmount: 100,
      dctAmount: 95,
      fxRate: 1.0,
      tonTxHash: "ABC123",
    },
    proof: {
      blockId: "-1:1:1",
      shardProof: "payload",
      signature: "0xdead",
    },
  };
  const payload = JSON.stringify(body);
  const signature = await sign(payload, SECRET);

  try {
    const { handler } = await loadHandler();
    const res = await handler(
      new Request("http://localhost/functions/v1/ton-allocator-webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-allocator-signature": signature,
        },
        body: payload,
      }),
    );
    assertEquals(res.status, 400);
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
    clearAllocatorSecret();
    clearTestEnv();
  }
});

Deno.test("ton-allocator-webhook handles indexer failure", async () => {
  setTestEnv({
    SUPABASE_URL: "https://stub.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
  });
  setAllocatorSecret(SECRET);
  stubTransactionFetch({ status: 500 });

  const body = {
    event: {
      depositId: 1,
      investorKey: "0:ABCDEF",
      usdtAmount: 100,
      dctAmount: 95,
      fxRate: 1.0,
      tonTxHash: "ABC123",
    },
    proof: {
      blockId: "-1:1:1",
      shardProof: "payload",
      signature: "0xdead",
    },
  };
  const payload = JSON.stringify(body);
  const signature = await sign(payload, SECRET);

  try {
    const { handler } = await loadHandler();
    const res = await handler(
      new Request("http://localhost/functions/v1/ton-allocator-webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-allocator-signature": signature,
        },
        body: payload,
      }),
    );
    assertEquals(res.status, 400);
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
    clearAllocatorSecret();
    clearTestEnv();
  }
});
