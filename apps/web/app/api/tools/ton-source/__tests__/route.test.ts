declare const Deno: {
  test: (name: string, fn: () => void | Promise<void>) => void;
};

function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message ?? `Expected ${expected} but received ${actual}`);
  }
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

Deno.test("GET /api/tools/ton-source returns configuration", async () => {
  const { GET } = await import("../route.ts");

  const response = GET();
  assertEquals(response.status, 200);
  assertCondition(
    response.headers.get("cache-control")?.includes("max-age=300") ?? false,
    "expected cache-control header to advertise 5 minute freshness",
  );

  const payload = await response.json() as {
    backends: string[];
    backendsTestnet: string[];
    funcVersions: string[];
    tactVersions: string[];
    tolkVersions: string[];
  };

  assertEquals(payload.backends.length, 3, "expected three production backends");
  assertEquals(payload.backendsTestnet.length, 1, "expected one testnet backend");
  assertEquals(payload.funcVersions[0], "0.4.6-wasmfix.0");
  assertEquals(payload.tactVersions[0], "1.6.13");
  assertEquals(payload.tolkVersions[0], "1.1.0");
});
