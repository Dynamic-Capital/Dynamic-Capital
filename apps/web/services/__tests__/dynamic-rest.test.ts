import { describe, expect, it } from "vitest";

import { buildDynamicRestResponse } from "../dynamic-rest";

describe("dynamic REST metadata", () => {
  it("summarises the stocks asset class", () => {
    const response = buildDynamicRestResponse(new Date("2025-09-25T01:00:00Z"));
    const stocksSummary = response.resources.instruments.assetClasses.stocks;

    expect(stocksSummary).toBeDefined();
    expect(stocksSummary.count).toBeGreaterThan(0);
    expect(stocksSummary.sample.map((entry) => entry.id)).toContain("AAPL");
  });
});
