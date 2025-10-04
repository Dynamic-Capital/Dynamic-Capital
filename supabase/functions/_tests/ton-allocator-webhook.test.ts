(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assert, assertEquals } from "std/assert/mod.ts";
import { extractJettonMintSummary } from "../ton-allocator-webhook/tonapi.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

const SECRET = "allocator-secret";

const SAMPLE_TON_EVENT = {
  event_id: "9270a714f7d48fd51996c679348f7585338cd2dda6895afbd5685c9e8f6d26ed",
  actions: [
    {
      type: "SmartContractExec",
      status: "ok",
      SmartContractExec: {
        ton_attached: 250000000,
        operation: "0x00000015",
      },
      base_transactions: ["ABC123"],
    },
    {
      type: "JettonMint",
      status: "ok",
      JettonMint: {
        amount: "500000000000",
        jetton: { decimals: 9 },
      },
      base_transactions: ["ABC123"],
    },
  ],
};

const SAMPLE_TON_EVENT_WITH_ALT_HASHES = {
  ...SAMPLE_TON_EVENT,
  actions: SAMPLE_TON_EVENT.actions?.map((action) => {
    if (action.type === "JettonMint") {
      return { ...action, base_transactions: ["MINT_HASH"] };
    }
    if (action.type === "SmartContractExec") {
      return { ...action, base_transactions: ["EXEC_HASH"] };
    }
    return action;
  }),
};

const SAMPLE_TON_EVENT_ENVELOPE = {
  events: [
    {
      actions: [
        {
          type: "SmartContractExec",
          status: "ok",
          base_transactions: ["PREV_HASH"],
        },
      ],
    },
    SAMPLE_TON_EVENT_WITH_ALT_HASHES,
  ],
};

Deno.test("extractJettonMintSummary parses ton event mint", () => {
  const summary = extractJettonMintSummary(SAMPLE_TON_EVENT);
  assert(summary);
  assertEquals(summary.amountRaw, 500000000000n);
  assertEquals(summary.decimals, 9);
  assertEquals(summary.amount, 500);
  assertEquals(summary.txHash, "ABC123");
  assertEquals(summary.txHashes, ["ABC123"]);
});

Deno.test("extractJettonMintSummary collects multiple tx hashes", () => {
  const summary = extractJettonMintSummary(SAMPLE_TON_EVENT_WITH_ALT_HASHES);
  assert(summary);
  assertEquals(summary.txHash, "MINT_HASH");
  assertEquals(summary.txHashes.sort(), ["EXEC_HASH", "MINT_HASH"]);
});

Deno.test("extractJettonMintSummary handles tonapi event envelopes", () => {
  const summary = extractJettonMintSummary(SAMPLE_TON_EVENT_ENVELOPE);
  assert(summary);
  assertEquals(summary.txHash, "MINT_HASH");
  assertEquals(summary.txHashes.sort(), [
    "EXEC_HASH",
    "MINT_HASH",
    "PREV_HASH",
  ]);
});

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
  globalAny.__SUPABASE_SERVICE_CLIENT__ = supabaseMock;

  const body = {
    event: {
      depositId: 42,
      investorKey: "0:ABCDEF",
      usdtAmount: 1000.5,
      dctAmount: 500,
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
    tonEvent: SAMPLE_TON_EVENT,
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
    assertEquals(record.dct_amount, 500);
    assertEquals(record.fx_rate, 1.05);
    assertEquals(record.ton_tx_hash, "ABC123");
    assertEquals(record.valuation_usdt, 1001);
    assertEquals(record.proof_payload, body.proof);
    assertEquals(record.event_payload, body.event);
    assertEquals(record.observed_at, body.observedAt);
    assert(typeof record.verified_at === "string");
    assert(!Number.isNaN(Date.parse(record.verified_at as string)));

    assertEquals(rpcCalls.length, 1);
    assertEquals(rpcCalls[0], {
      name: "notify_ton_pool_event",
      args: { p_event_id: "evt-123" },
    });
  } finally {
    delete globalAny.__SUPABASE_SERVICE_CLIENT__;
    clearAllocatorSecret();
    clearTestEnv();
  }
});

Deno.test(
  "ton-allocator-webhook accepts ton event alt transaction hash",
  async () => {
    setTestEnv({
      SUPABASE_URL: "https://stub.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    });
    setAllocatorSecret(SECRET);

    const inserted: Record<string, unknown>[] = [];
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
      async rpc() {
        return { data: null, error: null };
      },
    };

    (globalThis as { __SUPABASE_SERVICE_CLIENT__?: typeof supabaseMock })
      .__SUPABASE_SERVICE_CLIENT__ = supabaseMock;

    const payloadEvent = {
      ...SAMPLE_TON_EVENT_WITH_ALT_HASHES,
    };

    const body = {
      event: {
        depositId: 42,
        investorKey: "0:ABCDEF",
        usdtAmount: 1000.5,
        dctAmount: 500,
        fxRate: 1.05,
        tonTxHash: "EXEC_HASH",
        valuationUsdt: 1001,
      },
      proof: {
        blockId: "-1:1:abc",
        shardProof: "boc://payload",
        signature: "0xdeadbeef",
        routerTxHash: "ff00",
      },
      observedAt: "2025-01-01T00:00:00.000Z",
      tonEvent: payloadEvent,
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
      assertEquals(inserted.length, 1);
      const stored = inserted[0];
      assertEquals(stored.ton_tx_hash, "EXEC_HASH");
    } finally {
      delete (globalThis as { __SUPABASE_SERVICE_CLIENT__?: unknown })
        .__SUPABASE_SERVICE_CLIENT__;
      clearAllocatorSecret();
      clearTestEnv();
    }
  },
);

Deno.test(
  "ton-allocator-webhook accepts tonapi event envelope hashes",
  async () => {
    setTestEnv({
      SUPABASE_URL: "https://stub.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    });
    setAllocatorSecret(SECRET);

    const inserted: Record<string, unknown>[] = [];
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
                    return { data: { id: "evt-456" }, error: null };
                  },
                };
              },
            };
          },
        };
      },
      async rpc() {
        return { data: null, error: null };
      },
    };

    (globalThis as { __SUPABASE_SERVICE_CLIENT__?: typeof supabaseMock })
      .__SUPABASE_SERVICE_CLIENT__ = supabaseMock;

    const payloadEvent = structuredClone(SAMPLE_TON_EVENT_ENVELOPE);

    const body = {
      event: {
        depositId: 43,
        investorKey: "0:ABCDEF",
        usdtAmount: 1000.5,
        dctAmount: 500,
        fxRate: 1.05,
        tonTxHash: "PREV_HASH",
        valuationUsdt: 1001,
      },
      proof: {
        blockId: "-1:1:abc",
        shardProof: "boc://payload",
        signature: "0xdeadbeef",
        routerTxHash: "ff00",
      },
      observedAt: "2025-01-01T00:00:00.000Z",
      tonEvent: payloadEvent,
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
      assertEquals(inserted.length, 1);
      const stored = inserted[0];
      assertEquals(stored.ton_tx_hash, "PREV_HASH");
    } finally {
      delete (globalThis as { __SUPABASE_SERVICE_CLIENT__?: unknown })
        .__SUPABASE_SERVICE_CLIENT__;
      clearAllocatorSecret();
      clearTestEnv();
    }
  },
);

Deno.test("ton-allocator-webhook rejects ton event mint mismatch", async () => {
  setTestEnv({
    SUPABASE_URL: "https://stub.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
  });
  setAllocatorSecret(SECRET);

  const inserted: Record<string, unknown>[] = [];
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
    async rpc() {
      return { data: null, error: null };
    },
  };

  (globalThis as { __SUPABASE_SERVICE_CLIENT__?: typeof supabaseMock })
    .__SUPABASE_SERVICE_CLIENT__ = supabaseMock;

  const body = {
    event: {
      depositId: 42,
      investorKey: "0:ABCDEF",
      usdtAmount: 1000.5,
      dctAmount: 499.5,
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
    tonEvent: SAMPLE_TON_EVENT,
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
    assertEquals(inserted.length, 0);
  } finally {
    delete (globalThis as { __SUPABASE_SERVICE_CLIENT__?: unknown })
      .__SUPABASE_SERVICE_CLIENT__;
    clearAllocatorSecret();
    clearTestEnv();
  }
});

Deno.test("ton-allocator-webhook rejects ton event tx hash mismatch", async () => {
  setTestEnv({
    SUPABASE_URL: "https://stub.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
  });
  setAllocatorSecret(SECRET);

  const inserted: Record<string, unknown>[] = [];
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
    async rpc() {
      return { data: null, error: null };
    },
  };

  (globalThis as { __SUPABASE_SERVICE_CLIENT__?: typeof supabaseMock })
    .__SUPABASE_SERVICE_CLIENT__ = supabaseMock;

  const mismatchedEvent = {
    ...SAMPLE_TON_EVENT,
    actions: SAMPLE_TON_EVENT.actions?.map((action) => ({
      ...action,
      base_transactions: ["TX999"],
    })),
  };

  const body = {
    event: {
      depositId: 42,
      investorKey: "0:ABCDEF",
      usdtAmount: 1000.5,
      dctAmount: 500,
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
    tonEvent: mismatchedEvent,
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
    assertEquals(inserted.length, 0);
  } finally {
    delete (globalThis as { __SUPABASE_SERVICE_CLIENT__?: unknown })
      .__SUPABASE_SERVICE_CLIENT__;
    clearAllocatorSecret();
    clearTestEnv();
  }
});
