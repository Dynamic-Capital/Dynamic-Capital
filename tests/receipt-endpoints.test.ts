import test from "node:test";
import {
  deepEqual as assertDeepEqual,
  equal as assertEquals,
  match as assertMatch,
  ok as assert,
} from "node:assert/strict";
import { freshImport } from "./utils/freshImport.ts";
import {
  __resetSupabaseState,
  __testSupabaseState,
} from "./supabase-client-stub.ts";
import { hashBlob } from "../supabase/functions/_shared/hash.ts";

function setEnv() {
  process.env.SUPABASE_URL = "http://example.com";
  process.env.SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
}

function cleanupEnv() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

test("receipt-upload-url returns signed URL", async () => {
  __resetSupabaseState();
  setEnv();
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (
    input: Request | string | URL,
    init?: RequestInit,
  ) => {
    const url = typeof input === "string"
      ? input
      : input instanceof Request
      ? input.url
      : String(input);
    calls.push(url);
    if (url.includes("/storage/v1/object/upload/sign/")) {
      return new Response(
        JSON.stringify({
          url:
            "/storage/v1/object/upload/sign/payment-receipts/test?token=token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  let patched: URL | undefined;
  try {
    const orig = new URL(
      "../supabase/functions/receipt-upload-url/index.ts",
      import.meta.url,
    );
    patched = new URL(
      "../supabase/functions/receipt-upload-url/index.test.ts",
      import.meta.url,
    );
    const src = await Deno.readTextFile(orig);
    await Deno.writeTextFile(
      patched,
      src
        .replace(
          "../_shared/client.ts",
          "../../../tests/supabase-client-stub.ts",
        )
        .replace("../_shared/serve.ts", "../../../tests/serve-stub.ts"),
    );
    const { handler } = await freshImport(patched);
    const body = { payment_id: "p1", telegram_id: "123", filename: "r.png" };
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    const res = await handler(req);
    assertEquals(res.status, 200);
    const data = await res.json();
    assertEquals(data.bucket, "payment-receipts");
    assertMatch(data.file_path, /^receipts\/123\//);
    assertMatch(data.upload_url, /token=token$/);
    // No actual network calls due to stubbed client
  } finally {
    globalThis.fetch = originalFetch;
    if (patched) await Deno.remove(patched).catch(() => {});
    cleanupEnv();
  }
});

test("receipt-submit updates payment and subscription", async () => {
  __resetSupabaseState();
  setEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  const filePath = "receipts/123/file.png";
  const receiptBlob = new Blob(["fake-image"]);
  __testSupabaseState.storageFiles.set(filePath, receiptBlob);
  __testSupabaseState.payments.set("p1", {
    id: "p1",
    user_id: "user-1",
    webhook_data: {},
  });
  __testSupabaseState.userSubscriptions.set("123", {
    telegram_user_id: "123",
    payment_status: "none",
  });
  let handler: (req: Request) => Promise<Response> | Response;
  let patched: URL | undefined;
  try {
    const orig = new URL(
      "../supabase/functions/receipt-submit/index.ts",
      import.meta.url,
    );
    patched = new URL(
      "../supabase/functions/receipt-submit/index.test.ts",
      import.meta.url,
    );
    let src = await Deno.readTextFile(orig);
    src = src.replace(
      "../_shared/client.ts",
      "../../../tests/supabase-client-stub.ts",
    );
    src = src.replace("../_shared/serve.ts", "../../../tests/serve-stub.ts");
    await Deno.writeTextFile(patched, src);
    const mod = await freshImport(patched);
    handler = mod.handler;
    assert(typeof handler === "function");
    const body = { payment_id: "p1", file_path: filePath, telegram_id: "123" };
    const req = new Request("http://localhost/receipt-submit", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    const res = await handler!(req);
    assertEquals(res.status, 200);
    const data = await res.json();
    assertEquals(data.success, true);
    assertEquals(data.payment_id, "p1");
    const payment = __testSupabaseState.payments.get("p1");
    assert(payment);
    assertEquals(payment!.status, "pending");
    const hash = await hashBlob(receiptBlob);
    assertEquals(payment!.webhook_data?.image_sha256, hash);
    assertEquals(payment!.webhook_data?.storage_bucket, "payment-receipts");
    const receiptRecord = __testSupabaseState.receiptsByHash.get(hash);
    assert(receiptRecord);
    assertEquals(receiptRecord!.payment_id, "p1");
    const subscription = __testSupabaseState.userSubscriptions.get("123");
    assert(subscription);
    assertEquals(subscription!.payment_status, "pending");
  } finally {
    globalThis.fetch = originalFetch;
    if (patched) await Deno.remove(patched).catch(() => {});
    cleanupEnv();
  }
});

test("receipt-submit rejects duplicate receipt uploads", async () => {
  __resetSupabaseState();
  setEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  const fileBlob = new Blob(["duplicate-image"]);
  const initialPath = "receipts/123/original.png";
  __testSupabaseState.storageFiles.set(initialPath, fileBlob);
  __testSupabaseState.payments.set("p1", {
    id: "p1",
    user_id: "user-1",
    webhook_data: {},
  });
  __testSupabaseState.userSubscriptions.set("123", {
    telegram_user_id: "123",
    payment_status: "none",
  });
  let handler: (req: Request) => Promise<Response> | Response;
  let patched: URL | undefined;
  try {
    const orig = new URL(
      "../supabase/functions/receipt-submit/index.ts",
      import.meta.url,
    );
    patched = new URL(
      "../supabase/functions/receipt-submit/index.test.ts",
      import.meta.url,
    );
    let src = await Deno.readTextFile(orig);
    src = src.replace(
      "../_shared/client.ts",
      "../../../tests/supabase-client-stub.ts",
    );
    src = src.replace("../_shared/serve.ts", "../../../tests/serve-stub.ts");
    await Deno.writeTextFile(patched, src);
    const mod = await freshImport(patched);
    handler = mod.handler;
    assert(typeof handler === "function");

    const firstReq = new Request("http://localhost/receipt-submit", {
      method: "POST",
      body: JSON.stringify({
        payment_id: "p1",
        file_path: initialPath,
        telegram_id: "123",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const firstRes = await handler!(firstReq);
    assertEquals(firstRes.status, 200);

    const duplicatePath = "receipts/123/duplicate.png";
    __testSupabaseState.storageFiles.set(duplicatePath, fileBlob);
    const dupReq = new Request("http://localhost/receipt-submit", {
      method: "POST",
      body: JSON.stringify({
        payment_id: "p1",
        file_path: duplicatePath,
        telegram_id: "123",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const dupRes = await handler!(dupReq);
    assertEquals(dupRes.status, 409);
    const dupBody = await dupRes.json();
    assertEquals(dupBody.error, "duplicate_receipt");
    const hash = await hashBlob(fileBlob);
    assert(__testSupabaseState.receiptsByHash.has(hash));
    assert(!__testSupabaseState.storageFiles.has(duplicatePath));
  } finally {
    globalThis.fetch = originalFetch;
    if (patched) await Deno.remove(patched).catch(() => {});
    cleanupEnv();
  }
});
