import test from "node:test";
import { strict as assert } from "node:assert";
import { freshImport } from "./utils/freshImport.ts";

const queueUrl = new URL("../queue/index.ts", import.meta.url);
const processorsUrl = new URL(
  "../queue/processors/dct-events.ts",
  import.meta.url,
);

type QueueModule = typeof import("../queue/index.ts");
type ProcessorModule = typeof import("../queue/processors/dct-events.ts");

async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 1000,
  intervalMs = 10,
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Timed out waiting for condition");
}

function restoreEnv(key: string, value: string | undefined) {
  if (typeof Deno === "undefined") return;
  if (value === undefined) {
    try {
      Deno.env.delete(key);
    } catch (_) {
      // ignore
    }
  } else {
    Deno.env.set(key, value);
  }
}

test("payment.recorded event retries on webhook failure", async () => {
  const previousNodeEnv = typeof Deno !== "undefined"
    ? Deno.env.get("NODE_ENV")
    : undefined;
  const previousWebhook = typeof Deno !== "undefined"
    ? Deno.env.get("DCT_EVENTS_WEBHOOK_URL")
    : undefined;
  if (typeof Deno !== "undefined") {
    Deno.env.set("NODE_ENV", "test");
    Deno.env.set("DCT_EVENTS_WEBHOOK_URL", "https://example.com/hooks");
  }
  const queue = (await freshImport(queueUrl)) as QueueModule;
  const processors = (await freshImport(processorsUrl)) as ProcessorModule;
  queue.setBackoffBase(10);
  await queue.clearQueue();
  queue.startWorker(processors.createDctEventProcessors());

  let attempts = 0;
  const bodies: unknown[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    attempts += 1;
    if (init?.body) {
      bodies.push(JSON.parse(String(init.body)));
    }
    if (attempts === 1) {
      return new Response("error", { status: 500 });
    }
    return new Response("ok", { status: 200 });
  };

  try {
    await queue.enqueue(
      "payment.recorded",
      { subscriptionId: "sub_evt", tonAmount: 10 },
      { maxAttempts: 3 },
    );
    await waitFor(() => attempts >= 2, 2000, 20);
    assert.equal(attempts, 2);
    assert.equal((bodies[0] as { type: string }).type, "payment.recorded");
    const second = bodies[1] as {
      type: string;
      payload: { subscriptionId: string };
      attempt: number;
    };
    assert.equal(second.type, "payment.recorded");
    assert.equal(second.payload.subscriptionId, "sub_evt");
    assert.equal(second.attempt, 2);
  } finally {
    globalThis.fetch = originalFetch;
    queue.stopWorker();
    await queue.clearQueue();
    restoreEnv("NODE_ENV", previousNodeEnv);
    restoreEnv("DCT_EVENTS_WEBHOOK_URL", previousWebhook);
  }
});

test("burn.executed event stops retrying on client error", async () => {
  const previousNodeEnv = typeof Deno !== "undefined"
    ? Deno.env.get("NODE_ENV")
    : undefined;
  const previousWebhook = typeof Deno !== "undefined"
    ? Deno.env.get("DCT_EVENTS_WEBHOOK_URL")
    : undefined;
  if (typeof Deno !== "undefined") {
    Deno.env.set("NODE_ENV", "test");
    Deno.env.set("DCT_EVENTS_WEBHOOK_URL", "https://example.com/hooks");
  }
  const queue = (await freshImport(queueUrl)) as QueueModule;
  const processors = (await freshImport(processorsUrl)) as ProcessorModule;
  queue.setBackoffBase(10);
  await queue.clearQueue();
  queue.startWorker(processors.createDctEventProcessors());

  let attempts = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    attempts += 1;
    return new Response("bad", { status: 400 });
  };

  try {
    await queue.enqueue(
      "burn.executed",
      { subscriptionId: "sub_evt", burnTon: 1 },
      { maxAttempts: 3 },
    );
    await waitFor(() => attempts >= 1, 1000, 20);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(attempts, 1);
    const pending = await queue.pendingJobs();
    assert.equal(pending.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    queue.stopWorker();
    await queue.clearQueue();
    restoreEnv("NODE_ENV", previousNodeEnv);
    restoreEnv("DCT_EVENTS_WEBHOOK_URL", previousWebhook);
  }
});
