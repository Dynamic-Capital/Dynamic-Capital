import { describe, expect, it } from "vitest";

import {
  buildDynamicRestBondYieldsResponse,
  buildDynamicRestInstrumentsResponse,
  buildDynamicRestResponse,
  buildDynamicRestTradingDeskResponse,
} from "../dynamic-rest";

describe("dynamic REST metadata", () => {
  it("summarises the stocks asset class", () => {
    const response = buildDynamicRestResponse(new Date("2025-09-25T01:00:00Z"));
    const stocksSummary = response.resources.instruments.assetClasses.stocks;

    expect(stocksSummary).toBeDefined();
    expect(stocksSummary.count).toBeGreaterThan(0);
    expect(stocksSummary.sample.map((entry) => entry.id)).toContain("AAPL");
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
});
