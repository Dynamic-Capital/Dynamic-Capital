import type { JobRecord, ProcessorMap } from "../index.ts";

function getEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && typeof process.env !== "undefined") {
    const value = process.env[name];
    if (value !== undefined) return value;
  }
  if (typeof Deno !== "undefined") {
    try {
      const value = Deno.env?.get?.(name);
      if (value !== undefined) return value;
    } catch (_) {
      // env access might be restricted
    }
  }
  return undefined;
}

function resolveWebhookUrl(): string | null {
  return getEnv("DCT_EVENTS_WEBHOOK_URL") ?? getEnv("DCT_EVENT_WEBHOOK_URL") ??
    null;
}

function shouldRetry(status: number): boolean {
  if (status === 429) return true;
  return status >= 500;
}

function buildBody(
  eventType: string,
  job: JobRecord,
  payload: unknown,
): string {
  const attempt = job.attempts + 1;
  const base = {
    type: eventType,
    attempt,
    jobId: job.id,
    maxAttempts: job.maxAttempts,
    payload,
    sentAt: new Date().toISOString(),
  };
  try {
    return JSON.stringify(base);
  } catch (error) {
    const fallback = {
      ...base,
      payload: {
        error: "serialization_failed",
        message: error instanceof Error ? error.message : String(error),
      },
    };
    return JSON.stringify(fallback);
  }
}

async function dispatchWebhook(
  eventType: string,
  payload: unknown,
  job: JobRecord,
) {
  const url = resolveWebhookUrl();
  if (!url) {
    console.warn(`No webhook configured for ${eventType}; skipping.`);
    return;
  }

  const attempt = job.attempts + 1;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-dct-event": eventType,
      "x-dct-attempt": String(attempt),
    },
    body: buildBody(eventType, job, payload),
  });

  if (!response.ok) {
    if (shouldRetry(response.status)) {
      throw new Error(`Webhook ${eventType} failed with ${response.status}`);
    }
    console.warn(
      `Webhook ${eventType} responded with status ${response.status}`,
    );
  }
}

export function createDctEventProcessors(): ProcessorMap {
  return {
    "payment.recorded": async (payload, job) => {
      await dispatchWebhook("payment.recorded", payload, job);
    },
    "burn.executed": async (payload, job) => {
      await dispatchWebhook("burn.executed", payload, job);
    },
  };
}
