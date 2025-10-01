import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
Deno.env.set("SUPABASE_SERVICE_KEY", "service-key");

const { handler } = await import("./index.ts");
type HandlerDependencies = NonNullable<Parameters<typeof handler>[1]>;

type WalletRecord = {
  id: string;
  user_id: string;
  address: string;
  public_key?: string | null;
};

type SupabaseState = {
  userId: string;
  walletByAddress?: WalletRecord | null;
  walletByUser?: WalletRecord | null;
  inserted?: WalletRecord;
  updated?: { id: string; data: Partial<WalletRecord> };
};

function createSupabaseStub(state: SupabaseState) {
  return {
    from(table: string) {
      if (table === "users") {
        return {
          upsert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: state.userId },
                  error: null,
                }),
            }),
          }),
        };
      }

      if (table === "wallets") {
        return {
          select: () => ({
            eq: (_column: string, value: string) => ({
              maybeSingle: () => {
                if (_column === "address") {
                  return Promise.resolve({
                    data: state.walletByAddress ?? null,
                    error: null,
                  });
                }
                if (_column === "user_id" && value === state.userId) {
                  return Promise.resolve({
                    data: state.walletByUser ?? null,
                    error: null,
                  });
                }
                return Promise.resolve({ data: null, error: null });
              },
            }),
          }),
          update: (data: Partial<WalletRecord>) => ({
            eq: (_column: string, id: string) => {
              state.updated = { id, data };
              return Promise.resolve({ error: null });
            },
          }),
          insert: (data: Partial<WalletRecord>) => {
            state.inserted = {
              id: "wallet-new",
              user_id: data.user_id as string,
              address: data.address as string,
              public_key: data.public_key ?? null,
            };
            return Promise.resolve({ error: null });
          },
        };
      }

      throw new Error(`Unexpected table access: ${table}`);
    },
  };
}

Deno.test("rejects linking when address belongs to different user", async () => {
  const state: SupabaseState = {
    userId: "user-1",
    walletByAddress: {
      id: "wallet-2",
      user_id: "user-2",
      address: "EQABC",
      public_key: null,
    },
  };
  const response = await handler(
    new Request("https://example/functions/link-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_id: "42", address: "EQABC" }),
    }),
    { supabase: createSupabaseStub(state) as HandlerDependencies["supabase"] },
  );

  assertEquals(response.status, 409);
  assertEquals(await response.text(), "Address already linked to another user");
  assertEquals(state.inserted, undefined);
  assertEquals(state.updated, undefined);
});

Deno.test("links wallet for user when unassigned", async () => {
  const state: SupabaseState = {
    userId: "user-1",
    walletByAddress: null,
    walletByUser: null,
  };
  const response = await handler(
    new Request("https://example/functions/link-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegram_id: "42",
        address: "EQNEW",
        publicKey: "pub",
      }),
    }),
    { supabase: createSupabaseStub(state) as HandlerDependencies["supabase"] },
  );

  assertEquals(response.status, 200);
  assertEquals(state.inserted?.address, "EQNEW");
  assertEquals(state.inserted?.public_key, "pub");
  assertEquals(state.updated, undefined);
});
