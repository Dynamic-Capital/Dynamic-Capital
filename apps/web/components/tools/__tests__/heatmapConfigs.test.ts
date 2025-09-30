import { describe, expect, it } from "vitest";

import { HEATMAP_CONFIGS } from "../heatmapConfigs";

describe("heatmap configuration", () => {
  it("includes equities coverage with stock instruments", () => {
    const stocksConfig = HEATMAP_CONFIGS.stocks;

    expect(stocksConfig.assetClass).toBe("stocks");
    expect(stocksConfig.strength.entries.length).toBeGreaterThan(0);
    expect(
      stocksConfig.marketMovers.defaultEntries.some(
        (entry) => entry.instrumentId === "AAPL",
      ),
    ).toBe(true);
  });
});
