import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { useMarketWatchlistData } from "@/components/dynamic-portfolio/home/MarketWatchlist";

vi.mock("@/lib/telegram", () => ({
  haptic: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  track: vi.fn(),
}));

const refreshMock = vi.fn();

type MockQuote = {
  last: number;
  changePercent: number;
  high: number;
  low: number;
};

vi.mock("@/components/dynamic-portfolio/home/MarketWatchlist", () => {
  const watchlistFixture = [
    {
      symbol: "BTCUSD",
      displaySymbol: "BTC",
      name: "Bitcoin",
      category: "Crypto",
      session: "Asia overlap",
      focus: "Watching $43k breakout",
      beginnerTip: "Plan entries around the desk bias",
      bias: "Long",
      dataKey: "BTCUSD",
      format: {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
      playbook: {
        automation: "Automation trims if momentum fades",
        plan: {
          default: "Keep core exposure while $40k holds",
        },
      },
    },
  ] as const;

  return {
    BIAS_DETAILS: {
      Long: {
        label: "Long bias",
        background: "brand-alpha-weak",
        onBackground: "brand-strong",
      },
    },
    CATEGORY_DETAILS: {
      Crypto: { icon: "sparkles", label: "Crypto" },
    },
    CATEGORY_ORDER: ["Crypto"],
    WATCHLIST: watchlistFixture,
    formatChangePercent: (value?: number) => {
      if (value === undefined) {
        return "—";
      }
      const absolute = Math.abs(value).toFixed(2);
      return value >= 0 ? `+${absolute}%` : `-${absolute}%`;
    },
    formatNumber: (value?: number) => {
      if (value === undefined) {
        return "—";
      }
      return new Intl.NumberFormat("en-US", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    },
    formatRange: (quote: MockQuote | undefined) => {
      if (!quote) {
        return "—";
      }
      const formatter = new Intl.NumberFormat("en-US", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${formatter.format(quote.low)} – ${formatter.format(quote.high)}`;
    },
    useMarketWatchlistData: vi.fn(() => ({
      quotes: {
        BTCUSD: {
          last: 42000,
          changePercent: 1.23,
          high: 43000,
          low: 41000,
        },
      },
      updatedAt: new Date("2024-05-01T12:00:00Z"),
      isFetching: false,
      error: null,
      refresh: refreshMock,
    })),
  };
});

import WatchlistPage from "../WatchlistPage";

describe("WatchlistPage", () => {
  beforeEach(() => {
    refreshMock.mockClear();
  });

  it("renders shared watchlist items and triggers refresh", async () => {
    render(<WatchlistPage />);

    expect(await screen.findByText(/Core Watchlist/i)).toBeInTheDocument();
    expect(screen.getByText("BTC")).toBeInTheDocument();
    expect(screen.getByText("42,000.00")).toBeInTheDocument();
    expect(screen.getByText(/Synced/)).toBeInTheDocument();
    const mockedUseMarketWatchlistData =
      useMarketWatchlistData as unknown as Mock;
    expect(mockedUseMarketWatchlistData).toHaveBeenCalledWith({
      enabled: true,
    });

    fireEvent.click(screen.getByRole("button", { name: /Refresh/i }));

    expect(refreshMock).toHaveBeenCalled();
  });
});
