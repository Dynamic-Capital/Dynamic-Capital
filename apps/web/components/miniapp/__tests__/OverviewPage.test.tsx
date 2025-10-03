import { render, screen } from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  type MockedFunction,
  vi,
} from "vitest";

vi.mock("@/services/miniapp/portfolioOverview", () => ({
  fetchMiniappPortfolioOverview: vi.fn(),
}));

import OverviewPage from "../OverviewPage";
import {
  fetchMiniappPortfolioOverview,
  type PortfolioOverviewData,
} from "@/services/miniapp/portfolioOverview";

const mockedFetch = fetchMiniappPortfolioOverview as MockedFunction<
  typeof fetchMiniappPortfolioOverview
>;

const MOCK_DATA: PortfolioOverviewData = {
  hero: {
    baseCurrency: "USD",
    totalCapitalUsd: 4_800_000,
    pnlPercent: 6.4,
    winRatePercent: 62.3,
    deskVelocity: 87,
    vipSharePercent: 41,
    updatedAt: "2025-01-15T12:00:00Z",
  },
  kpis: [
    {
      id: "capital",
      label: "Capital deployed",
      value: "$4.8M",
      deltaLabel: "+6.4% vs prior",
      trend: "up",
    },
  ],
  priorities: [
    {
      id: "liquidity-rotation",
      title: "Liquidity rotation",
      description: "Shift 15% of BTC profits into the AI narrative basket.",
      owner: "Lead: Mason",
      emphasis: "focus",
    },
  ],
  equityCurve: [
    { timestamp: "2025-01-10T00:00:00Z", equityUsd: 4_400_000 },
    { timestamp: "2025-01-11T00:00:00Z", equityUsd: 4_520_000 },
    { timestamp: "2025-01-12T00:00:00Z", equityUsd: 4_800_000 },
  ],
  timeframe: "week",
  isFallback: false,
};

beforeEach(() => {
  mockedFetch.mockResolvedValue(MOCK_DATA);
});

describe("OverviewPage", () => {
  it("renders hero summary and priorities from the portfolio service", async () => {
    render(<OverviewPage />);

    expect(mockedFetch).toHaveBeenCalledWith({ timeframe: "week" });

    expect(
      await screen.findByText(/\$4,800,000 deployed/i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/capital deployed/i)).toBeInTheDocument();
    expect(await screen.findByText(/Liquidity rotation/i)).toBeInTheDocument();
  });
});
