import { assert, assertEquals } from "std/assert/mod.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

Deno.test("startReceiptPipeline stores parsed bank slip on payment", async () => {
  setTestEnv({
    SUPABASE_URL: "https://stub.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
    TELEGRAM_BOT_TOKEN: "bot-token",
    TELEGRAM_BOT_USERNAME: "dynamic_bot",
  });

  const globalAny = globalThis as {
    __SUPABASE_SKIP_AUTO_SERVE__?: boolean;
  };
  const previousAutoServe = globalAny.__SUPABASE_SKIP_AUTO_SERVE__;
  globalAny.__SUPABASE_SKIP_AUTO_SERVE__ = true;

  const storedBlobs = new Map<string, Blob>();
  const payments = new Map<string, any>();
  const receipts: any[] = [];
  const supabaseUrl = "https://stub.supabase.co/functions/v1/receipt-submit";
  const bankAccounts = [
    {
      id: "acct-1",
      bank_name: "Maldives Islamic Bank",
      account_name: "Dynamic Capital",
      account_number: "9876543210",
      currency: "MVR",
      is_active: true,
      display_order: 1,
    },
  ];
  const orders: any[] = [];

  function createTableQuery(rows: any[]) {
    let working = rows.slice();
    let limitCount: number | null = null;

    function execute() {
      const snapshot = limitCount !== null
        ? working.slice(0, limitCount)
        : working.slice();
      return snapshot;
    }

    const builder: any = {
      eq(column: string, value: unknown) {
        working = working.filter((row) =>
          (row as Record<string, unknown>)[column] === value
        );
        return builder;
      },
      order(column: string, options?: { ascending?: boolean }) {
        const ascending = options?.ascending !== false;
        working = working.slice().sort((a, b) => {
          const av = (a as Record<string, number>)[column] ?? 0;
          const bv = (b as Record<string, number>)[column] ?? 0;
          return ascending ? av - bv : bv - av;
        });
        return builder;
      },
      limit(count: number) {
        limitCount = count;
        return builder;
      },
      maybeSingle: async () => {
        const [first] = execute();
        return { data: first ?? null, error: null };
      },
      single: async () => {
        const [first] = execute();
        return { data: first ?? null, error: null };
      },
      then(
        onFulfilled?: (value: { data: unknown[]; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        try {
          const result = { data: execute(), error: null as null };
          return Promise.resolve(onFulfilled ? onFulfilled(result) : result);
        } catch (err) {
          if (onRejected) {
            return Promise.resolve(onRejected(err));
          }
          return Promise.reject(err);
        }
      },
    };

    return {
      select() {
        return builder;
      },
    };
  }

  const fakeSupabase: any = {
    auth: {
      async getUser() {
        return {
          data: {
            user: {
              id: "user-1",
              user_metadata: { telegram_id: "4242" },
            },
          },
          error: null,
        };
      },
    },
    functions: {
      async invoke() {
        return { data: null, error: new Error("not implemented") };
      },
    },
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
        case "bank_accounts":
          return createTableQuery(bankAccounts);
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
        case "orders":
          return createTableQuery(orders);
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
  clientModule.__setCreateClientOverrideForTests(() => fakeSupabase);

  const configModule = await import("../_shared/config.ts");
  const originalGetFlag = configModule.getFlag;
  configModule.__setGetFlag(async () => true);
  const originalGetContent = configModule.getContent;
  configModule.__setGetContent(async () => null);

  const { default: receiptSubmitHandler } = await import(
    "../receipt-submit/index.ts"
  );
  fakeSupabase.functions.invoke = async (
    name: string,
    options?: {
      body?: unknown;
      headers?: Record<string, string>;
      method?: string;
    },
  ) => {
    if (name !== "receipt-submit") {
      return { data: null, error: new Error(`unsupported function: ${name}`) };
    }
    const headers = new Headers({
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    });
    const request = new Request(supabaseUrl, {
      method: options?.method ?? "POST",
      headers,
      body: JSON.stringify(options?.body ?? {}),
    });
    const response = await receiptSubmitHandler(request);
    let data: unknown = null;
    try {
      data = await response.clone().json();
    } catch {
      data = null;
    }
    if (!response.ok) {
      return {
        data,
        error: new Error(`status ${response.status}`),
      };
    }
    return { data, error: null };
  };
  const telegramModule = await import("../telegram-bot/index.ts");
  telegramModule.__setSupabaseForTests(fakeSupabase);

  const sampleSlipText =
    `Maldives Islamic Bank\nTransaction Date : 2024-02-01 10:00:00\nStatus : Successful\nTo Account 9876543210 Dynamic Capital\nReference # REF999\nAmount MVR 750.00`;
  telegramModule.__setReceiptParsingOverrides({
    ocrTextFromBlob: async () => sampleSlipText,
  });

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
    telegramModule.__resetSupabaseForTests();
    clientModule.__resetCreateClientOverrideForTests();
    configModule.__setGetContent(originalGetContent);
    configModule.__setGetFlag(originalGetFlag);
    clearTestEnv();
    globalAny.__SUPABASE_SKIP_AUTO_SERVE__ = previousAutoServe;
  }
});
