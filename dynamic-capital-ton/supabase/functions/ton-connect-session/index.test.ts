import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import nacl from "https://esm.sh/tweetnacl@1.0.3";

Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
Deno.env.set("SUPABASE_SERVICE_KEY", "service-key");

const { handler, __testUtils } = await import("./index.ts");
type HandlerDependencies = NonNullable<Parameters<typeof handler>[1]>;

type SessionRow = {
  id: string;
  telegram_id: string;
  payload: string;
  expires_at: string;
  verified_at: string | null;
  wallet_address: string | null;
  wallet_public_key: string | null;
  proof_timestamp: string | null;
  wallet_app_name: string | null;
  proof_signature: string | null;
  created_at: string;
};

type UserRow = { id: string; telegram_id: string };

type WalletRow = { id: string; user_id: string; address: string; public_key: string | null };

type SupabaseState = {
  sessions: SessionRow[];
  users: UserRow[];
  wallets: WalletRow[];
  userSeq: number;
  walletSeq: number;
};

function createSupabaseStub(state: SupabaseState) {
  return {
    from(table: string) {
      if (table === "ton_connect_sessions") {
        return {
          delete() {
            return {
              eq(_: string, telegramId: string) {
                return {
                  lt(__: string, cutoff: string) {
                    return {
                      is() {
                        state.sessions = state.sessions.filter((session) => {
                          if (session.telegram_id !== telegramId) return true;
                          return session.expires_at >= cutoff;
                        });
                        return Promise.resolve({ error: null });
                      },
                    };
                  },
                };
              },
            };
          },
          insert(data: Record<string, unknown>) {
            const row: SessionRow = {
              id: `session-${state.sessions.length + 1}`,
              telegram_id: String(data.telegram_id),
              payload: String(data.payload),
              expires_at: String(data.expires_at),
              verified_at: null,
              wallet_address: null,
              wallet_public_key: null,
              proof_timestamp: null,
              wallet_app_name: null,
              proof_signature: null,
              created_at: new Date().toISOString(),
            };
            state.sessions.push(row);
            return Promise.resolve({ error: null });
          },
          select() {
            const filters: Record<string, string> = {};
            return {
              eq(column: string, value: string) {
                filters[column] = value;
                return this;
              },
              order() {
                return this;
              },
              limit() {
                return this;
              },
              maybeSingle() {
                const match = state.sessions.find((session) => {
                  return Object.entries(filters).every(([key, value]) =>
                    (session as Record<string, unknown>)[key] === value
                  );
                }) ?? null;
                return Promise.resolve({ data: match, error: null });
              },
            };
          },
          update(data: Record<string, unknown>) {
            return {
              eq(_: string, id: string) {
                const session = state.sessions.find((row) => row.id === id);
                if (session) {
                  if (typeof data.verified_at === "string") {
                    session.verified_at = data.verified_at;
                  }
                  if (typeof data.wallet_address === "string") {
                    session.wallet_address = data.wallet_address;
                  }
                  if (typeof data.wallet_public_key === "string") {
                    session.wallet_public_key = data.wallet_public_key;
                  }
                  if (typeof data.proof_timestamp === "string") {
                    session.proof_timestamp = data.proof_timestamp;
                  }
                  if (typeof data.wallet_app_name === "string") {
                    session.wallet_app_name = data.wallet_app_name;
                  }
                  if (typeof data.proof_signature === "string") {
                    session.proof_signature = data.proof_signature;
                  }
                }
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }

      if (table === "users") {
        return {
          upsert(data: Record<string, unknown>) {
            return {
              select() {
                return {
                  single<T>() {
                    const telegramId = String(data.telegram_id);
                    let user = state.users.find((row) => row.telegram_id === telegramId);
                    if (!user) {
                      user = { id: `user-${++state.userSeq}`, telegram_id: telegramId };
                      state.users.push(user);
                    }
                    return Promise.resolve({ data: { id: user.id } as T, error: null });
                  },
                };
              },
            };
          },
        };
      }

      if (table === "wallets") {
        return {
          select() {
            const filters: Record<string, string> = {};
            return {
              eq(column: string, value: string) {
                filters[column] = value;
                return this;
              },
              maybeSingle<T>() {
                const match = state.wallets.find((row) => {
                  return Object.entries(filters).every(([key, value]) =>
                    (row as Record<string, unknown>)[key] === value
                  );
                }) ?? null;
                return Promise.resolve({ data: match as unknown as T ?? null, error: null });
              },
            };
          },
          update(data: Record<string, unknown>) {
            return {
              eq(_: string, id: string) {
                const wallet = state.wallets.find((row) => row.id === id);
                if (wallet) {
                  if (typeof data.address === "string") {
                    wallet.address = data.address;
                  }
                  if (typeof data.public_key === "string") {
                    wallet.public_key = data.public_key;
                  }
                }
                return Promise.resolve({ error: null });
              },
            };
          },
          insert(data: Record<string, unknown>) {
            const wallet: WalletRow = {
              id: `wallet-${++state.walletSeq}`,
              user_id: String(data.user_id),
              address: String(data.address),
              public_key: typeof data.public_key === "string" ? data.public_key : null,
            };
            state.wallets.push(wallet);
            return Promise.resolve({ error: null });
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  } as HandlerDependencies["supabase"];
}

Deno.test("issues a TON proof challenge", async () => {
  const state: SupabaseState = { sessions: [], users: [], wallets: [], userSeq: 0, walletSeq: 0 };
  const response = await handler(
    new Request("https://example/functions/ton-connect-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "challenge", telegram_id: "123" }),
    }),
    { supabase: createSupabaseStub(state) },
  );

  assertEquals(response.status, 200);
  const payload = await response.json() as { payload?: string; expires_at?: string };
  assertExists(payload.payload);
  assertExists(payload.expires_at);
  assertEquals(state.sessions.length, 1);
  assertEquals(state.sessions[0].telegram_id, "123");
});

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createProofPayload({
  keyPair,
  address,
  payload,
  domainValue,
  timestamp = Math.floor(Date.now() / 1000),
}: {
  keyPair: nacl.SignKeyPair;
  address: string;
  payload: string;
  domainValue: string;
  timestamp?: number;
}) {
  const domainLength = new TextEncoder().encode(domainValue).length;
  const proof = {
    timestamp,
    domain: { value: domainValue, lengthBytes: domainLength },
    payload,
    signature: "",
  };

  const message = await __testUtils.buildVerificationMessage(address, proof);
  const signature = nacl.sign.detached(message, keyPair.secretKey);
  proof.signature = btoa(String.fromCharCode(...signature));
  return proof;
}

Deno.test("verifies ton_proof and links wallet", async () => {
  const state: SupabaseState = {
    sessions: [{
      id: "session-1",
      telegram_id: "321",
      payload: "challenge-payload",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      verified_at: null,
      wallet_address: null,
      wallet_public_key: null,
      proof_timestamp: null,
      wallet_app_name: null,
      proof_signature: null,
      created_at: new Date().toISOString(),
    }],
    users: [],
    wallets: [],
    userSeq: 0,
    walletSeq: 0,
  };

  const keyPair = nacl.sign.keyPair();
  const rawAddress = "0:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const proof = await createProofPayload({
    keyPair,
    address: rawAddress,
    payload: "challenge-payload",
    domainValue: "dynamiccapital.ton",
  });

  const response = await handler(
    new Request("https://example/functions/ton-connect-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        telegram_id: "321",
        address: rawAddress,
        publicKey: bytesToHex(keyPair.publicKey),
        proof,
      }),
    }),
    { supabase: createSupabaseStub(state) },
  );

  assertEquals(response.status, 200);
  assertEquals(state.users.length, 1);
  assertEquals(state.wallets.length, 1);
  assertEquals(state.sessions[0].verified_at === null, false);
  const result = await response.json() as Record<string, unknown>;
  assertEquals(result.ok, true);
  assertEquals(result.address, rawAddress);
});

Deno.test("rejects proofs from unauthorized domains", async () => {
  const state: SupabaseState = {
    sessions: [{
      id: "session-1",
      telegram_id: "777",
      payload: "challenge-payload",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      verified_at: null,
      wallet_address: null,
      wallet_public_key: null,
      proof_timestamp: null,
      wallet_app_name: null,
      proof_signature: null,
      created_at: new Date().toISOString(),
    }],
    users: [],
    wallets: [],
    userSeq: 0,
    walletSeq: 0,
  };

  const keyPair = nacl.sign.keyPair();
  const address = "0:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const proof = await createProofPayload({
    keyPair,
    address,
    payload: "challenge-payload",
    domainValue: "malicious.ton",
  });

  const response = await handler(
    new Request("https://example/functions/ton-connect-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        telegram_id: "777",
        address,
        publicKey: bytesToHex(keyPair.publicKey),
        proof,
      }),
    }),
    { supabase: createSupabaseStub(state) },
  );

  assertEquals(response.status, 403);
});

Deno.test("rejects expired proof challenges", async () => {
  const state: SupabaseState = {
    sessions: [{
      id: "session-1",
      telegram_id: "888",
      payload: "challenge-payload",
      expires_at: new Date(Date.now() - 10_000).toISOString(),
      verified_at: null,
      wallet_address: null,
      wallet_public_key: null,
      proof_timestamp: null,
      wallet_app_name: null,
      proof_signature: null,
      created_at: new Date().toISOString(),
    }],
    users: [],
    wallets: [],
    userSeq: 0,
    walletSeq: 0,
  };

  const keyPair = nacl.sign.keyPair();
  const address = "0:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const proof = await createProofPayload({
    keyPair,
    address,
    payload: "challenge-payload",
    domainValue: "dynamiccapital.ton",
    timestamp: Math.floor(Date.now() / 1000),
  });

  const response = await handler(
    new Request("https://example/functions/ton-connect-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        telegram_id: "888",
        address,
        publicKey: bytesToHex(keyPair.publicKey),
        proof,
      }),
    }),
    { supabase: createSupabaseStub(state) },
  );

  assertEquals(response.status, 401);
});

Deno.test("rejects wallet links when address is owned by another user", async () => {
  const state: SupabaseState = {
    sessions: [{
      id: "session-1",
      telegram_id: "999",
      payload: "challenge-payload",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      verified_at: null,
      wallet_address: null,
      wallet_public_key: null,
      proof_timestamp: null,
      wallet_app_name: null,
      proof_signature: null,
      created_at: new Date().toISOString(),
    }],
    users: [{ id: "user-existing", telegram_id: "555" }],
    wallets: [{
      id: "wallet-existing",
      user_id: "user-existing",
      address: "0:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      public_key: null,
    }],
    userSeq: 0,
    walletSeq: 1,
  };

  const keyPair = nacl.sign.keyPair();
  const address = "0:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
  const proof = await createProofPayload({
    keyPair,
    address,
    payload: "challenge-payload",
    domainValue: "dynamiccapital.ton",
  });

  const response = await handler(
    new Request("https://example/functions/ton-connect-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        telegram_id: "999",
        address,
        publicKey: bytesToHex(keyPair.publicKey),
        proof,
      }),
    }),
    { supabase: createSupabaseStub(state) },
  );

  assertEquals(response.status, 403);
});

Deno.test("rejects verification attempts once the challenge is replaced", async () => {
  const state: SupabaseState = {
    sessions: [],
    users: [],
    wallets: [],
    userSeq: 0,
    walletSeq: 0,
  };

  const keyPair = nacl.sign.keyPair();
  const address = "0:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
  const proof = await createProofPayload({
    keyPair,
    address,
    payload: "stale-payload",
    domainValue: "dynamiccapital.ton",
  });

  const response = await handler(
    new Request("https://example/functions/ton-connect-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        telegram_id: "1000",
        address,
        publicKey: bytesToHex(keyPair.publicKey),
        proof,
      }),
    }),
    { supabase: createSupabaseStub(state) },
  );

  assertEquals(response.status, 401);
});
