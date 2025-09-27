import assert from "node:assert/strict";

type EndpointDescriptor = {
  method: string;
  path: string;
};

type InstrumentResource = {
  total: number;
  assetClasses: Record<string, { count: number; sample: unknown[] }>;
  majorPairs: unknown[];
};

type TradingDeskResource = {
  plansAvailable: number;
  activePlans: Array<{ planSummary: unknown[] }>;
};

async function run() {
  const { GET } = await import(
    /* @vite-ignore */ "../../apps/web/app/api/dynamic-rest/route.ts"
  );

  const request = new Request("http://localhost/api/dynamic-rest");
  const response = await GET(request);

  assert.equal(response.status, 200);

  const contentType = response.headers.get("content-type") ?? "";
  assert.ok(
    contentType.includes("application/json"),
    `expected JSON response, received ${contentType}`,
  );

  const body = await response.json();

  assert.equal(body.status, "ok");
  assert.equal(body.metadata.version, 1);
  assert.equal(body.metadata.repository, "Dynamic Capital");
  assert.ok(typeof body.generatedAt === "string");
  assert.ok(!Number.isNaN(Date.parse(body.generatedAt)));

  const endpoints = body.endpoints as EndpointDescriptor[];
  assert.ok(Array.isArray(endpoints));
  assert.ok(
    endpoints.some((endpoint) => endpoint.path === "/api/dynamic-rest"),
    "primary endpoint descriptor missing",
  );

  const instruments = body.resources.instruments as InstrumentResource;
  assert.ok(instruments.total > 0, "expected instrument inventory");
  assert.ok(Object.keys(instruments.assetClasses).length >= 4);
  assert.ok(
    instruments.assetClasses.currencies?.count > 0,
    "currency summary missing",
  );
  assert.ok(
    instruments.majorPairs.length > 0,
    "major FX pairs should be included",
  );

  const tradingDesk = body.resources.tradingDesk as TradingDeskResource;
  assert.ok(
    tradingDesk.plansAvailable >= tradingDesk.activePlans.length,
    "plansAvailable should reflect activePlans length",
  );
  assert.ok(
    tradingDesk.activePlans.some((plan) => plan.planSummary.length > 0),
    "plan summaries should not be empty",
  );
}

if (typeof Deno !== "undefined") {
  Deno.test("GET /api/dynamic-rest returns aggregated resources", run);
} else {
  const { default: test } = await import(/* @vite-ignore */ "node:test");
  test("GET /api/dynamic-rest returns aggregated resources", run);
}
