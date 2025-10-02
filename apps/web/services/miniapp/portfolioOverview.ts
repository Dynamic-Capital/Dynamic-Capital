import { callEdgeFunction } from "@/config/supabase";

export type PortfolioTimeframe = "today" | "week" | "14days" | "month";

export interface PortfolioOverviewHero {
  baseCurrency: string;
  totalCapitalUsd: number;
  pnlPercent: number;
  winRatePercent: number;
  deskVelocity: number;
  vipSharePercent: number;
  updatedAt: string;
}

export interface PortfolioOverviewKpi {
  id: string;
  label: string;
  value: string;
  deltaLabel: string;
  trend: "up" | "down" | "flat";
}

export type PortfolioPriorityEmphasis = "focus" | "risk" | "automation";

export interface PortfolioPriority {
  id: string;
  title: string;
  description: string;
  owner: string;
  emphasis?: PortfolioPriorityEmphasis;
}

export interface PortfolioSparkPoint {
  timestamp: string;
  equityUsd: number;
}

export interface PortfolioOverviewData {
  hero: PortfolioOverviewHero;
  kpis: PortfolioOverviewKpi[];
  priorities: PortfolioPriority[];
  equityCurve: PortfolioSparkPoint[];
  timeframe: PortfolioTimeframe;
  isFallback: boolean;
}

interface AnalyticsComparison {
  revenue_change?: number;
  sales_change?: number;
}

interface AnalyticsPackagePerformanceEntry {
  id?: string;
  name?: string;
  sales?: number;
  revenue?: number;
  currency?: string;
}

interface AnalyticsResponse {
  timeframe?: string;
  total_revenue?: number;
  currency?: string;
  comparison?: AnalyticsComparison;
  package_performance?: AnalyticsPackagePerformanceEntry[];
  generated_at?: string;
  total_users?: number;
  vip_users?: number;
  pending_payments?: number;
}

const FALLBACK_OVERVIEW: PortfolioOverviewData = {
  timeframe: "week",
  isFallback: true,
  hero: {
    baseCurrency: "USD",
    totalCapitalUsd: 4_800_000,
    pnlPercent: 6.4,
    winRatePercent: 62.3,
    deskVelocity: 87,
    vipSharePercent: 41,
    updatedAt: new Date().toISOString(),
  },
  kpis: [
    {
      id: "capital",
      label: "Capital deployed",
      value: "$4.8M",
      deltaLabel: "+6.4% vs prior",
      trend: "up",
    },
    {
      id: "win-rate",
      label: "Win rate",
      value: "62.3%",
      deltaLabel: "+2.1% vs target",
      trend: "up",
    },
    {
      id: "velocity",
      label: "Desk velocity",
      value: "87 trades",
      deltaLabel: "Active in 9 markets",
      trend: "flat",
    },
    {
      id: "vip-share",
      label: "VIP share",
      value: "41%",
      deltaLabel: "+4% onboarding",
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
    {
      id: "macro-prep",
      title: "Macro catalyst prep",
      description: "Draft playbook for FOMC and Nvidia earnings crossfire.",
      owner: "Owner: Ava",
      emphasis: "risk",
    },
    {
      id: "automation-sync",
      title: "Automation sync",
      description: "Validate guardrails before Asia session liquidity opens.",
      owner: "Owner: Ops Desk",
      emphasis: "automation",
    },
  ],
  equityCurve: Array.from({ length: 8 }, (_, index) => ({
    timestamp: new Date(Date.now() - (7 - index) * 86_400_000).toISOString(),
    equityUsd: 4_800_000 * (1 + index * 0.012),
  })),
};

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

const formatCurrency = (value: number, currency: string) => {
  const key = `${currency}-compact`;
  const formatter = currencyFormatterCache.get(key) ??
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    });

  if (!currencyFormatterCache.has(key)) {
    currencyFormatterCache.set(key, formatter);
  }

  return formatter.format(value);
};

const formatPercent = (value: number, fractionDigits = 1) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(fractionDigits)}%`;

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const deriveTrend = (value: number): "up" | "down" | "flat" => {
  if (value > 0.25) {
    return "up";
  }
  if (value < -0.25) {
    return "down";
  }
  return "flat";
};

const buildSyntheticCurve = (
  base: number,
  pnlPercent: number,
  length = 8,
): PortfolioSparkPoint[] => {
  const now = Date.now();
  const variance = pnlPercent / 100;

  return Array.from({ length }, (_, index) => {
    const step = index / Math.max(1, length - 1);
    const wave = Math.sin(step * Math.PI * 1.5) * 0.04;
    const momentum = variance * step;
    const value = base * (1 + wave + momentum);
    const timestamp = new Date(now - (length - 1 - index) * 86_400_000);

    return {
      timestamp: timestamp.toISOString(),
      equityUsd: Math.max(0, value),
    };
  });
};

const normaliseAnalyticsPayload = (
  payload: AnalyticsResponse,
  timeframe: PortfolioTimeframe,
): PortfolioOverviewData => {
  const currency = payload.currency && typeof payload.currency === "string"
    ? payload.currency
    : "USD";
  const totalRevenue = Number(payload.total_revenue ?? 0);
  const comparison = payload.comparison ?? {};
  const revenueChange = Number(comparison.revenue_change ?? 0);
  const salesChange = Number(comparison.sales_change ?? 0);
  const totalUsers = Number(payload.total_users ?? 0);
  const vipUsers = Number(payload.vip_users ?? 0);
  const vipSharePercent = totalUsers > 0 ? (vipUsers / totalUsers) * 100 : 0;
  const deskVelocity = (payload.package_performance ?? []).reduce(
    (accumulator, entry) => accumulator + Number(entry.sales ?? 0),
    0,
  );

  const hero: PortfolioOverviewHero = {
    baseCurrency: currency,
    totalCapitalUsd: totalRevenue,
    pnlPercent: revenueChange,
    winRatePercent: clampPercent(58 + salesChange / 2),
    deskVelocity,
    vipSharePercent: clampPercent(vipSharePercent),
    updatedAt: payload.generated_at ?? new Date().toISOString(),
  };

  const kpis: PortfolioOverviewKpi[] = [
    {
      id: "capital",
      label: "Capital deployed",
      value: formatCurrency(hero.totalCapitalUsd, currency),
      deltaLabel: formatPercent(revenueChange),
      trend: deriveTrend(revenueChange),
    },
    {
      id: "win-rate",
      label: "Win rate",
      value: formatPercent(hero.winRatePercent, 1),
      deltaLabel: formatPercent(salesChange / 2),
      trend: deriveTrend(salesChange / 2),
    },
    {
      id: "velocity",
      label: "Desk velocity",
      value: `${Math.round(hero.deskVelocity)} trades`,
      deltaLabel: `${
        Math.max(1, hero.deskVelocity > 0 ? hero.deskVelocity : 1)
      } markets in play`,
      trend: deriveTrend(hero.deskVelocity - 60),
    },
    {
      id: "vip-share",
      label: "VIP share",
      value: formatPercent(hero.vipSharePercent, 1),
      deltaLabel: formatPercent(hero.vipSharePercent - 38, 1),
      trend: deriveTrend(hero.vipSharePercent - 38),
    },
  ];

  const priorities: PortfolioPriority[] = (payload.package_performance ?? [])
    .slice(0, 3).map((entry, index) => {
      const revenue = Number(entry.revenue ?? 0);
      const sales = Number(entry.sales ?? 0);

      const emphasis: PortfolioPriorityEmphasis = index === 0
        ? "focus"
        : index === 1
        ? "risk"
        : "automation";

      const owners = ["Lead: Mason", "Owner: Ava", "Owner: Ops Desk"];

      return {
        id: entry.id ?? `package-${index}`,
        title: `${entry.name ?? "Desk package"} momentum`,
        description: `Keep ${sales} active seats aligned; ${
          formatCurrency(revenue, currency)
        } booked this window.`,
        owner: owners[index] ?? owners[owners.length - 1],
        emphasis,
      } satisfies PortfolioPriority;
    });

  const equityCurve = buildSyntheticCurve(
    hero.totalCapitalUsd,
    hero.pnlPercent,
  );

  return {
    hero,
    kpis,
    priorities: priorities.length > 0
      ? priorities
      : FALLBACK_OVERVIEW.priorities,
    equityCurve,
    timeframe,
    isFallback: false,
  } satisfies PortfolioOverviewData;
};

export async function fetchMiniappPortfolioOverview(
  options: {
    timeframe?: PortfolioTimeframe;
    callEdge?: typeof callEdgeFunction;
  } = {},
): Promise<PortfolioOverviewData> {
  const { timeframe = "week", callEdge = callEdgeFunction } = options;

  try {
    const { data, status } = await callEdge<AnalyticsResponse>(
      "ANALYTICS_DATA",
      {
        method: "POST",
        body: { timeframe },
      },
    );

    if (!data || status !== 200) {
      throw new Error("No analytics payload returned");
    }

    return normaliseAnalyticsPayload(data, timeframe);
  } catch (error) {
    console.warn("Falling back to default portfolio overview", error);
    return {
      ...FALLBACK_OVERVIEW,
      timeframe,
      isFallback: true,
    } satisfies PortfolioOverviewData;
  }
}
