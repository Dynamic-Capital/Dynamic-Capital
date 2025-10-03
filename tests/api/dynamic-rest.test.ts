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

type BondYieldsResource = {
  totalMarkets: number;
  totalSeries: number;
  capabilities: string[];
  markets: Array<{ tenors: unknown[] }>;
};

type OpenSourceCategory = {
  name: string;
  license: string;
};

type OpenSourceResource = {
  totals: {
    helpers: number;
    languageModels: number;
    adapters: number;
    toolkits: number;
    overall: number;
  };
  categories: {
    helpers: OpenSourceCategory[];
    languageModels: OpenSourceCategory[];
    adapters: OpenSourceCategory[];
    toolkits: OpenSourceCategory[];
  };
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
  assert.ok(
    endpoints.some((endpoint) =>
      endpoint.path === "/api/dynamic-rest/resources/open-source"
    ),
    "open-source endpoint descriptor missing",
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

  const bondYields = body.resources.bondYields as BondYieldsResource;
  assert.ok(bondYields.totalMarkets > 0, "expected bond yield market coverage");
  assert.ok(
    bondYields.totalSeries >= bondYields.totalMarkets,
    "bond yield series count should cover every market",
  );
  assert.ok(
    bondYields.capabilities.includes("Live Stream"),
    "live stream capability should be advertised",
  );
  assert.ok(
    bondYields.markets.some((market) => market.tenors.length > 1),
    "expected multi-tenor coverage in bond markets",
  );

  const openSource = body.resources.openSource as OpenSourceResource;
  assert.equal(
    openSource.totals.overall,
    openSource.totals.helpers +
      openSource.totals.languageModels +
      openSource.totals.adapters +
      openSource.totals.toolkits,
    "overall total should equal the sum of category totals",
  );
  assert.equal(
    openSource.totals.helpers,
    openSource.categories.helpers.length,
    "helpers total should track helper catalog entries",
  );
  assert.ok(
    openSource.categories.languageModels.some((entry) =>
      entry.name.includes("Mistral")
    ),
    "expected representative language model",
  );
  assert.ok(
    openSource.categories.adapters.every((entry) => entry.license.length > 0),
    "adapter entries should include license metadata",
  );
  assert.equal(
    openSource.totals.languageModels,
    openSource.categories.languageModels.length,
    "language model total should track catalog entries",
  );
  assert.equal(
    openSource.totals.adapters,
    openSource.categories.adapters.length,
    "adapter total should match adapter catalog entries",
  );
  assert.equal(
    openSource.totals.toolkits,
    openSource.categories.toolkits.length,
    "toolkit total should match toolkit catalog entries",
  );

  const { GET: getResource } = await import(
    /* @vite-ignore */
    "../../apps/web/app/api/dynamic-rest/resources/[resource]/route.ts"
  );

  const resourceResponse = await getResource(
    new Request("http://localhost/api/dynamic-rest/resources/open-source"),
    { params: { resource: "open-source" } },
  );

  assert.equal(resourceResponse.status, 200);
  const resourceBody = await resourceResponse.json();
  assert.equal(resourceBody.status, "ok");
  assert.equal(resourceBody.resource.totals.overall, openSource.totals.overall);
}

if (typeof Deno !== "undefined") {
  Deno.test("GET /api/dynamic-rest returns aggregated resources", run);
} else {
  const { default: test } = await import(/* @vite-ignore */ "node:test");
  test("GET /api/dynamic-rest returns aggregated resources", run);
}
