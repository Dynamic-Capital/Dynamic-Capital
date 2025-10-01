import { assert, assertEquals } from "std/assert/mod.ts";
import { stub } from "std/testing/mock.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

Deno.test("startReceiptPipeline stores parsed bank slip on payment", async () => {
  setTestEnv({
    SUPABASE_URL: "https://stub.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
    TELEGRAM_BOT_TOKEN: "bot-token",
    TELEGRAM_BOT_USERNAME: "dynamic_bot",
  });

  const storedBlobs = new Map<string, Blob>();
  const payments = new Map<string, any>();
  const receipts: any[] = [];

  const fakeSupabase: any = {
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, blob: Blob) {
            storedBlobs.set(`${bucket}:${path}`, blob);
            return { data: { path }, error: null };
          },
          async download(path: string) {
            const blob = storedBlobs.get(`${bucket}:${path}`);
            if (!blob) return { data: null, error: new Error("missing") };
            return { data: blob, error: null };
          },
          async remove(paths: string[]) {
            for (const p of paths) storedBlobs.delete(`${bucket}:${p}`);
            return { data: null, error: null };
          },
        };
      },
    },
    from(table: string) {
      switch (table) {
        case "user_sessions":
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        id: "session-1",
                        awaiting_input: "receipt:plan-1",
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
            update(values: Record<string, unknown>) {
              return {
                eq: async () => ({
                  data: { id: "session-1", ...values },
                  error: null,
                }),
              };
            },
            delete() {
              return {
                eq: async () => ({ error: null }),
              };
            },
          };
        case "bot_users":
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: { id: "user-1" },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        case "subscription_plans":
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: { price: 500, currency: "MVR" },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        case "payments":
          return {
            insert(values: Record<string, unknown>) {
              const id = `pay-${payments.size + 1}`;
              payments.set(id, { ...values, id, webhook_data: null });
              return {
                select() {
                  return {
                    single: async () => ({ data: { id }, error: null }),
                  };
                },
              };
            },
            select() {
              return {
                eq(_col: string, value: string) {
                  return {
                    maybeSingle: async () => {
                      await Promise.resolve(); // satisfy require-await

                      const row = payments.get(value);
                      if (!row) return { data: null, error: null };
                      const { id, user_id, webhook_data } = row;
                      return {
                        data: { id, user_id, webhook_data },
                        error: null,
                      };
                    },
                  };
                },
              };
            },
            update(values: Record<string, unknown>) {
              return {
                eq(_col: string, value: string) {
                  const row = payments.get(value);
                  if (row) {
                    const next = { ...row, ...values };
                    payments.set(value, next);
                    return Promise.resolve({ data: next, error: null });
                  }
                  return Promise.resolve({ data: null, error: null });
                },
              };
            },
            delete() {
              return {
                eq: async (_col: string, value: string) => {
                  await Promise.resolve(); // satisfy require-await

                  payments.delete(value);
                  return { error: null };
                },
              };
            },
          };
        case "receipts":
          return {
            select() {
              return {
                eq(_col: string, value: string) {
                  return {
                    limit() {
                      return {
                        maybeSingle: async () => ({
                          data:
                            receipts.find((r) => r.image_sha256 === value) ??
                              null,
                          error: null,
                        }),
                      };
                    },
                    maybeSingle: async () => ({
                      data: receipts.find((r) => r.image_sha256 === value) ??
                        null,
                      error: null,
                    }),
                  };
                },
              };
            },
            insert(values: Record<string, unknown>) {
              receipts.push({
                ...values,
                id: `receipt-${receipts.length + 1}`,
              });
              return Promise.resolve({ data: null, error: null });
            },
          };
        case "user_subscriptions":
          return {
            update() {
              return {
                eq: async () => ({ data: null, error: null }),
              };
            },
          };
        default:
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({ data: null, error: null }),
                  };
                },
              };
            },
          };
      }
    },
  };

  const clientModule = await import("../_shared/client.ts");
  const createClientStub = stub(
    clientModule,
    "createClient",
    () => fakeSupabase,
  );

  const configModule = await import("../_shared/config.ts");
  const getFlagStub = stub(configModule, "getFlag", async () => true);
  const originalGetContent = configModule.getContent;
  configModule.__setGetContent(async () => null);

  const { default: receiptSubmitHandler } = await import(
    "../receipt-submit/index.ts"
  );
  const telegramModule = await import("../telegram-bot/index.ts");
  const getSupabaseStub = stub(
    telegramModule,
    "getSupabase",
    () => fakeSupabase,
  );

  const sampleSlipText =
    `Maldives Islamic Bank\nTransaction Date : 2024-02-01 10:00:00\nStatus : Successful\nTo Account 9876543210 Dynamic Capital\nReference # REF999\nAmount MVR 750.00`;
  telegramModule.__setReceiptParsingOverrides({
    ocrTextFromBlob: async () => sampleSlipText,
  });

  const supabaseUrl = "https://stub.supabase.co/functions/v1/receipt-submit";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: Request | string, init?: RequestInit) => {
    await Promise.resolve(); // satisfy require-await

    const url = typeof input === "string" ? input : input.url;
    if (url.includes("/getFile")) {
      return new Response(
        JSON.stringify({
          ok: true,
          result: { file_path: "receipts/image.png" },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    if (url.includes("/file/bot")) {
      return new Response(new Blob(["fake image"], { type: "image/png" }), {
        status: 200,
      });
    }
    if (url.includes("/sendMessage")) {
      return new Response(
        JSON.stringify({ ok: true, result: { message_id: 42 } }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    if (url === supabaseUrl) {
      const req = new Request(url, init);
      return receiptSubmitHandler(req);
    }
    return new Response("not found", { status: 404 });
  };

  try {
    const update = {
      message: {
        chat: { id: 4242 },
        photo: [{ file_id: "test-file" }],
      },
    };

    await telegramModule.startReceiptPipeline(update as any);

    const payment = payments.get("pay-1");
    assert(payment, "payment row should be created");
    assert(payment.webhook_data, "webhook data should be stored");
    const parsed = payment.webhook_data.parsed_slip;
    assert(parsed, "parsed slip should be attached");
    assertEquals(parsed.status, "SUCCESS");
    assertEquals(parsed.bank, "MIB");
    assertEquals(parsed.rawText, sampleSlipText);
  } finally {
    globalThis.fetch = originalFetch;
    telegramModule.__resetReceiptParsingOverrides();
    getSupabaseStub.restore();
    createClientStub.restore();
    getFlagStub.restore();
    configModule.__setGetContent(originalGetContent);
    clearTestEnv();
  }
});
