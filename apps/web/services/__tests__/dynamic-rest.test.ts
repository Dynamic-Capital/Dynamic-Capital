import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  buildDynamicRestBondYieldsResponse,
  buildDynamicRestDexScreenerResponse,
  buildDynamicRestInstrumentsResponse,
  buildDynamicRestResponse,
  buildDynamicRestTradingDeskResponse,
} from "../dynamic-rest";
import {
  DEX_SCREENER_API_BASE_URL,
  DEX_SCREENER_API_ENDPOINTS,
  __setDexScreenerFetchOverride,
} from "../dex-screener";

const DEX_SCREENER_STUB_DATA = {
  profiles: [
    {
      url: "https://dexscreener.com/ton/sample-token",
      chainId: "ton",
      tokenAddress: "EQA123SampleAddress",
      description: "Sample DCT pair",
      icon: "https://cdn.example.com/icon.png",
      header: "https://cdn.example.com/header.png",
      openGraph: "https://cdn.example.com/og.png",
      links: [
        { type: "website", label: "Docs", url: "https://dynamic.capital" },
      ],
    },
  ],
  latestBoosts: [
    {
      url: "https://dexscreener.com/ton/sample-boost",
      chainId: "ton",
      tokenAddress: "EQA123SampleAddress",
      description: "Boost entry",
      amount: 25,
      totalAmount: 100,
      icon: "https://cdn.example.com/icon.png",
      links: [
        { url: "https://dynamic.capital" },
      ],
    },
  ],
  topBoosts: [
    {
      url: "https://dexscreener.com/ton/sample-top",
      chainId: "ton",
      tokenAddress: "EQA456SampleAddress",
      description: "Top boost entry",
      totalAmount: 500,
      header: "https://cdn.example.com/header.png",
      links: [
        { type: "twitter", url: "https://x.com/dynamiccapital" },
      ],
    },
  ],
} as const;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function createDexScreenerStub(): typeof fetch {
  const { latestProfiles, latestBoosts, topBoosts } = DEX_SCREENER_API_ENDPOINTS;
  const profileUrl = `${DEX_SCREENER_API_BASE_URL}${latestProfiles}`;
  const latestBoostsUrl = `${DEX_SCREENER_API_BASE_URL}${latestBoosts}`;
  const topBoostsUrl = `${DEX_SCREENER_API_BASE_URL}${topBoosts}`;

  return async (input: RequestInfo | URL) => {
    const target = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;

    if (target === profileUrl) {
      return jsonResponse(DEX_SCREENER_STUB_DATA.profiles);
    }
    if (target === latestBoostsUrl) {
      return jsonResponse(DEX_SCREENER_STUB_DATA.latestBoosts);
    }
    if (target === topBoostsUrl) {
      return jsonResponse(DEX_SCREENER_STUB_DATA.topBoosts);
    }

    throw new Error(`Unhandled Dex Screener request: ${target}`);
  };
}

beforeAll(() => {
  __setDexScreenerFetchOverride(createDexScreenerStub());
});

afterAll(() => {
  __setDexScreenerFetchOverride(undefined);
});

describe("dynamic REST metadata", () => {
  it("summarises the stocks asset class", async () => {
    const response = await buildDynamicRestResponse(
      new Date("2025-09-25T01:00:00Z"),
    );
    const stocksSummary = response.resources.instruments.assetClasses.stocks;

    expect(stocksSummary).toBeDefined();
    expect(stocksSummary.count).toBeGreaterThan(0);
    expect(stocksSummary.sample.map((entry) => entry.id)).toContain("AAPL");
    expect(response.resources.dexScreener.totals.profiles).toBeGreaterThan(0);
  });

  it("builds an instrument resource envelope", () => {
    const now = new Date("2025-09-25T01:00:00Z");
    const response = buildDynamicRestInstrumentsResponse(now);

    expect(response.status).toBe("ok");
    expect(response.generatedAt).toBe(now.toISOString());
    expect(response.metadata.version).toBe(1);
    expect(response.resource.assetClasses.stocks.count).toBeGreaterThan(0);
  });

  it("builds a trading desk resource envelope", () => {
    const now = new Date("2025-09-25T02:00:00Z");
    const response = buildDynamicRestTradingDeskResponse(now);

    expect(response.status).toBe("ok");
    expect(response.generatedAt).toBe(now.toISOString());
    expect(response.resource.plansAvailable).toBeGreaterThanOrEqual(0);
  });

  it("builds a bond yields resource envelope", () => {
    const now = new Date("2025-09-25T03:00:00Z");
    const response = buildDynamicRestBondYieldsResponse(now);

    expect(response.status).toBe("ok");
    expect(response.generatedAt).toBe(now.toISOString());
    expect(response.resource.totalMarkets).toBeGreaterThan(0);
  });

  it("builds a dex screener resource envelope", async () => {
    const now = new Date("2025-09-25T04:00:00Z");
    const response = await buildDynamicRestDexScreenerResponse(now);

    expect(response.status).toBe("ok");
    expect(response.generatedAt).toBe(now.toISOString());
    expect(response.resource.status).toBe("ok");
    expect(response.resource.totals.profiles).toBe(1);
    expect(response.resource.latestBoosts[0]?.amount).toBe(25);
  });
});
