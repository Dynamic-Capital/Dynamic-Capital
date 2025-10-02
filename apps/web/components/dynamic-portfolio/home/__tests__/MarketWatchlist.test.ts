import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SUPABASE_CONFIG } from "@/config/supabase";

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

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

type MarketWatchlistModule = typeof import("../MarketWatchlist");

let marketWatchlistModule: MarketWatchlistModule;

beforeAll(async () => {
  marketWatchlistModule = await import("../MarketWatchlist");
});

afterEach(() => {
  vi.restoreAllMocks();
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

describe("loadMarketQuotes", () => {
  it("merges stock overrides from the equity quote provider", async () => {
    const awesomePayload = {
      EURUSD: {
        bid: "1.1000",
        pctChange: "0.50",
        high: "1.2000",
        low: "1.0000",
        create_date: "2024-04-30 15:30:00",
      },
    } satisfies Record<string, unknown>;

    const equityPayload = {
      data: {
        AAPL: {
          last: 175.12,
          changePercent: 1.2,
          high: 180.5,
          low: 170.3,
        },
        MSFT: {
          last: 320.55,
          changePercent: -0.4,
          high: 325.0,
          low: 315.0,
        },
      },
      meta: { lastUpdated: "2024-05-01T12:00:00.000Z" },
    } satisfies Record<string, unknown>;

    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

      if (url.includes("economia.awesomeapi.com.br")) {
        return Promise.resolve(
          new Response(JSON.stringify(awesomePayload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      if (url.includes("market-equity-quotes")) {
        const headers = new Headers(init?.headers ?? {});
        expect(headers.get("apikey")).toBe(SUPABASE_CONFIG.ANON_KEY);

        return Promise.resolve(
          new Response(JSON.stringify(equityPayload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      throw new Error(`Unexpected fetch request for ${url}`);
    });

    const { quotes, lastUpdated } = await marketWatchlistModule
      .loadMarketQuotes();

    expect(quotes.AAPL).toEqual({
      last: 175.12,
      changePercent: 1.2,
      high: 180.5,
      low: 170.3,
    });

    expect(quotes.MSFT).toEqual({
      last: 320.55,
      changePercent: -0.4,
      high: 325.0,
      low: 315.0,
    });

    expect(quotes.EURUSD).toEqual({
      last: 1.1,
      changePercent: 0.5,
      high: 1.2,
      low: 1.0,
    });

    expect(lastUpdated?.toISOString()).toBe("2024-05-01T12:00:00.000Z");
  });

  it("continues when the equity feed request fails", async () => {
    const awesomePayload = {
      EURUSD: {
        bid: "1.1000",
        pctChange: "0.50",
        high: "1.2000",
        low: "1.0000",
        create_date: "2024-04-30 15:30:00",
      },
    } satisfies Record<string, unknown>;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

      if (url.includes("economia.awesomeapi.com.br")) {
        return Promise.resolve(
          new Response(JSON.stringify(awesomePayload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      if (url.includes("market-equity-quotes")) {
        return Promise.resolve(new Response("", { status: 500 }));
      }

      throw new Error(`Unexpected fetch request for ${url}`);
    });

    const { quotes, lastUpdated } = await marketWatchlistModule
      .loadMarketQuotes();

    expect(quotes.EURUSD).toEqual({
      last: 1.1,
      changePercent: 0.5,
      high: 1.2,
      low: 1.0,
    });

    expect(quotes.AAPL).toBeUndefined();
    expect(lastUpdated?.toISOString()).toBe("2024-04-30T15:30:00.000Z");
    expect(warnSpy).toHaveBeenCalled();
  });
});
