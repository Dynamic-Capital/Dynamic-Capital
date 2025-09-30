import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/components/dynamic-ui-system", () => ({
  Column: () => null,
  Row: () => null,
  Heading: () => null,
  Text: () => null,
  Tag: () => null,
  Line: () => null,
  Icon: () => null,
}));

vi.mock("@/components/ui/AsciiShaderText", () => ({
  AsciiShaderText: ({ children }: { children?: unknown }) => children ?? null,
}));

vi.mock("../RefreshAnimation", () => ({
  RefreshAnimation: () => null,
}));

type MarketWatchlistModule = typeof import("../MarketWatchlist");

let marketWatchlistModule: MarketWatchlistModule;

beforeAll(async () => {
  marketWatchlistModule = await import("../MarketWatchlist");
});

describe("MarketWatchlist taxonomy", () => {
  it("maps stocks asset class to the stocks category", () => {
    expect(marketWatchlistModule.CATEGORY_BY_ASSET_CLASS.stocks).toBe("Stocks");
  });

  it("includes equities in the watchlist data set", () => {
    const stockSymbols = marketWatchlistModule.WATCHLIST
      .filter((item) => item.category === "Stocks")
      .map((item) => item.symbol);

    expect(stockSymbols).toEqual(
      expect.arrayContaining(["AAPL", "MSFT"]),
    );
  });

  it("groups watchlist entries using the defined category order", () => {
    const groupedCategories = marketWatchlistModule.WATCHLIST_GROUPS.map(
      (group) => group.category,
    );

    expect(groupedCategories).toEqual(marketWatchlistModule.CATEGORY_ORDER);
  });

  it("keeps all grouped entries aligned with their category labels", () => {
    for (const group of marketWatchlistModule.WATCHLIST_GROUPS) {
      for (const item of group.items) {
        expect(item.category).toBe(group.category);
      }
    }
  });
});
