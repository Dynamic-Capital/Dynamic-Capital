import { createHmac } from "node:crypto";
import { Buffer } from "node:buffer";
import { EventEmitter } from "node:events";
import type { ChildProcessWithoutNullStreams } from "node:child_process";

import {
  API_METRICS_OVERRIDE_SYMBOL,
  createNoopApiMetrics,
} from "@/observability/server-metrics.ts";

const SPAWN_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.dynamic-cli.spawn-override",
);

class MockReadable extends EventEmitter {
  setEncoding() {}
  emitData(chunk: string) {
    this.emit("data", chunk);
  }
}

class MockWritable extends EventEmitter {
  chunks: string[] = [];
  setDefaultEncoding() {}
  write(chunk: string) {
    this.chunks.push(chunk);
    this.emit("write", chunk);
    return true;
  }
  end() {
    this.emit("end");
  }
}

class MockChildProcess extends EventEmitter {
  stdout = new MockReadable();
  stderr = new MockReadable();
  stdin = new MockWritable();

  close(code = 0) {
    this.emit("close", code);
  }

  error(error: Error) {
    this.emit("error", error);
  }
}

declare const Deno: {
  env: { set(key: string, value: string): void };
  test: (name: string, fn: () => void | Promise<void>) => void;
};

const ADMIN_SECRET = "test-admin-secret";

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createAdminToken(
  secret: string,
  claims: Partial<{ sub: string; admin: boolean; exp: number; iat: number }> =
    {},
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: "admin-user",
    admin: true,
    iat: now,
    exp: now + 3600,
    ...claims,
  };
  const headerSegment = base64UrlEncode(JSON.stringify(header));
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${signingInput}.${signature}`;
}

function resetOverrides() {
  delete (globalThis as Record<PropertyKey, unknown>)[
    SPAWN_OVERRIDE_SYMBOL
  ];
  delete (globalThis as Record<PropertyKey, unknown>)[
    API_METRICS_OVERRIDE_SYMBOL
  ];
}

Deno.test("POST /api/dynamic-cli returns CLI output", async () => {
  Deno.env.set("DYNAMIC_AGI_PYTHON", "python-agi");
  Deno.env.set("DYNAMIC_CLI_PYTHON", "python-cli");
  Deno.env.set("ADMIN_API_SECRET", ADMIN_SECRET);
  (globalThis as Record<PropertyKey, unknown>)[API_METRICS_OVERRIDE_SYMBOL] =
    createNoopApiMetrics();

  const spawnCalls: Array<{ command: string; args: string[] }> = [];
  let lastProcess: MockChildProcess | null = null;

  (globalThis as Record<PropertyKey, unknown>)[SPAWN_OVERRIDE_SYMBOL] = (
    command: string,
    args?: readonly string[],
  ) => {
    spawnCalls.push({ command, args: [...(args ?? [])] });
    lastProcess = new MockChildProcess();
    queueMicrotask(() => {
      lastProcess?.stdout.emitData('CLI report\n\n{"dataset":true}\n');
      lastProcess?.close(0);
    });
    return lastProcess as unknown as ChildProcessWithoutNullStreams;
  };

  const { POST } = await import("./route.ts");

  const body = {
    scenario: {
      history: 10,
      decay: 0.2,
      nodes: [{ key: "orchestration", title: "Orchestration" }],
      pulses: [
        {
          node: "orchestration",
          maturity: 0.8,
          timestamp: "2024-04-01T00:00:00Z",
        },
      ],
    },
    format: "text",
    indent: 2,
    fineTuneTags: ["launch"],
    exportDataset: true,
  } as const;

  const token = createAdminToken(ADMIN_SECRET);
  const response = await POST(
    new Request("http://localhost/api/dynamic-cli", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify(body),
    }),
  );

  const payload = await response.json() as {
    report?: string;
    reportFormat?: string;
    dataset?: Record<string, unknown>;
  };

  if (response.status !== 200) {
    throw new Error(`Expected success response, received ${response.status}`);
  }

  if (!payload.report || payload.report.trim() !== "CLI report") {
    throw new Error("Expected report text to be returned");
  }

  if (payload.reportFormat !== "text") {
    throw new Error("Expected reportFormat to echo the request format");
  }

  if (!payload.dataset || payload.dataset.dataset !== true) {
    throw new Error("Expected dataset payload to be parsed from stdout");
  }

  const [spawnCall] = spawnCalls;
  if (!spawnCall) {
    throw new Error("Expected Dynamic CLI process to be spawned");
  }

  if (spawnCall.command !== "python-agi") {
    throw new Error(
      "Expected DYNAMIC_AGI_PYTHON to override the interpreter path",
    );
  }

  if (!spawnCall.args.includes("--dataset")) {
    throw new Error("Expected --dataset flag to be forwarded");
  }

  if (!spawnCall.args.includes("dynamic.intelligence.agi.build")) {
    throw new Error(
      "Expected dynamic.intelligence.agi.build module to be used",
    );
  }

  const stdinData = lastProcess?.stdin.chunks.join("");
  if (!stdinData) {
    throw new Error("Expected scenario JSON to be written to stdin");
  }

  Deno.env.set("DYNAMIC_AGI_PYTHON", "python3");
  Deno.env.set("DYNAMIC_CLI_PYTHON", "python3");
  resetOverrides();
});

Deno.test("POST /api/dynamic-cli propagates CLI errors", async () => {
  Deno.env.set("DYNAMIC_CLI_PYTHON", "python3");
  Deno.env.set("ADMIN_API_SECRET", ADMIN_SECRET);
  (globalThis as Record<PropertyKey, unknown>)[API_METRICS_OVERRIDE_SYMBOL] =
    createNoopApiMetrics();

  (globalThis as Record<PropertyKey, unknown>)[SPAWN_OVERRIDE_SYMBOL] = () => {
    const child = new MockChildProcess();
    queueMicrotask(() => {
      child.stderr.emitData("error: bad scenario\n");
      child.close(2);
    });
    return child as unknown as ChildProcessWithoutNullStreams;
  };

  const { POST } = await import("./route.ts");

  const token = createAdminToken(ADMIN_SECRET);
  const response = await POST(
    new Request("http://localhost/api/dynamic-cli", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify({
        scenario: {
          nodes: [{ key: "orchestration", title: "Orchestration" }],
          pulses: [
            {
              node: "orchestration",
              maturity: 0.8,
              timestamp: "2024-04-01T00:00:00Z",
            },
          ],
        },
        format: "json",
        indent: 2,
        fineTuneTags: [],
        exportDataset: false,
      }),
    }),
  );

  if (response.status !== 400) {
    throw new Error(
      `Expected HTTP 400 for CLI error, received ${response.status}`,
    );
  }

  const payload = await response.json() as { error?: string };
  if (!payload.error || !payload.error.includes("error: bad scenario")) {
    throw new Error("Expected CLI stderr to be surfaced in error payload");
  }

  resetOverrides();
});

Deno.test("POST /api/dynamic-cli rejects missing admin credentials", async () => {
  Deno.env.set("DYNAMIC_CLI_PYTHON", "python3");
  Deno.env.set("ADMIN_API_SECRET", ADMIN_SECRET);
  (globalThis as Record<PropertyKey, unknown>)[API_METRICS_OVERRIDE_SYMBOL] =
    createNoopApiMetrics();

  const { POST } = await import("./route.ts");

  const response = await POST(
    new Request("http://localhost/api/dynamic-cli", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenario: {
          nodes: [{ key: "orchestration", title: "Orchestration" }],
          pulses: [
            {
              node: "orchestration",
              maturity: 0.8,
              timestamp: "2024-04-01T00:00:00Z",
            },
          ],
        },
        format: "text",
        indent: 2,
        fineTuneTags: [],
        exportDataset: false,
      }),
    }),
  );

  if (response.status !== 401) {
    throw new Error(`Expected HTTP 401 when admin credentials are missing.`);
  }

  resetOverrides();
});
