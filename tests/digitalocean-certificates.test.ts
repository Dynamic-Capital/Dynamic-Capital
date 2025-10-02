import test from "node:test";
import assert from "node:assert/strict";

import { createDigitalOceanCertificateProcessors } from "../queue/processors/digitalocean-certificates.ts";
import type { JobRecord } from "../queue/index.ts";

const processor =
  createDigitalOceanCertificateProcessors()["digitalocean.certificate"];

type CertificatePayload = {
  domain: string;
  certificateId?: string;
  dnsNames?: string[];
  certificateName?: string;
};

function createJob(payload: CertificatePayload): JobRecord {
  return {
    id: 1,
    type: "digitalocean.certificate",
    payload,
    status: "pending",
    attempts: 0,
    maxAttempts: 5,
    nextRunAt: Date.now(),
  };
}

test("creates certificate and stores id when missing", async () => {
  const previousToken = process.env.DIGITALOCEAN_TOKEN;
  process.env.DIGITALOCEAN_TOKEN = "token";

  const calls: { method: string; body: unknown }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    calls.push({
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    return new Response(
      JSON.stringify({ certificate: { id: "cert-123", state: "pending" } }),
      { status: 201, headers: { "content-type": "application/json" } },
    );
  };

  const job = createJob({ domain: "dynamiccapital.ton" });

  try {
    await assert.rejects(
      async () => await processor(job.payload, job),
      /pending/,
    );
    assert.equal(job.payload.certificateId, "cert-123");
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.method, "POST");
    const body = calls[0]?.body as { dns_names: string[] } | null;
    assert.deepEqual(body?.dns_names, [
      "dynamiccapital.ton",
      "www.dynamiccapital.ton",
      "api.dynamiccapital.ton",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousToken === undefined) {
      delete process.env.DIGITALOCEAN_TOKEN;
    } else {
      process.env.DIGITALOCEAN_TOKEN = previousToken;
    }
  }
});

test("resolves when certificate is issued", async () => {
  const previousToken = process.env.DIGITALOCEAN_TOKEN;
  process.env.DIGITALOCEAN_TOKEN = "token";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ certificate: { id: "cert-456", state: "issued" } }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const job = createJob({
    domain: "dynamiccapital.ton",
    certificateId: "cert-456",
  });

  try {
    await processor(job.payload, job);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousToken === undefined) {
      delete process.env.DIGITALOCEAN_TOKEN;
    } else {
      process.env.DIGITALOCEAN_TOKEN = previousToken;
    }
  }
});

test("retries while certificate pending", async () => {
  const previousToken = process.env.DIGITALOCEAN_TOKEN;
  process.env.DIGITALOCEAN_TOKEN = "token";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        certificate: { id: "cert-789", state: "pending_validation" },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const job = createJob({
    domain: "dynamiccapital.ton",
    certificateId: "cert-789",
  });

  try {
    await assert.rejects(
      async () => await processor(job.payload, job),
      /pending/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousToken === undefined) {
      delete process.env.DIGITALOCEAN_TOKEN;
    } else {
      process.env.DIGITALOCEAN_TOKEN = previousToken;
    }
  }
});

test("fails when certificate enters error state", async () => {
  const previousToken = process.env.DIGITALOCEAN_TOKEN;
  process.env.DIGITALOCEAN_TOKEN = "token";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        certificate: {
          id: "cert-err",
          state: "error",
          state_message: "dns validation failed",
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const job = createJob({
    domain: "dynamiccapital.ton",
    certificateId: "cert-err",
  });

  try {
    await assert.rejects(
      async () => await processor(job.payload, job),
      /dns validation failed/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousToken === undefined) {
      delete process.env.DIGITALOCEAN_TOKEN;
    } else {
      process.env.DIGITALOCEAN_TOKEN = previousToken;
    }
  }
});

test("throws when token missing", async () => {
  const previousToken = process.env.DIGITALOCEAN_TOKEN;
  delete process.env.DIGITALOCEAN_TOKEN;

  const job = createJob({ domain: "dynamiccapital.ton" });

  await assert.rejects(
    async () => await processor(job.payload, job),
    /token missing/i,
  );

  if (previousToken === undefined) {
    delete process.env.DIGITALOCEAN_TOKEN;
  } else {
    process.env.DIGITALOCEAN_TOKEN = previousToken;
  }
});
