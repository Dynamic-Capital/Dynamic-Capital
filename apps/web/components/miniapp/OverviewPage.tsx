"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type HTMLMotionProps, motion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  Brain,
  GraduationCap,
  LineChart,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  type MarketQuote,
  type MarketWatchlistItem,
  useMarketWatchlistData,
  WATCHLIST,
} from "@/components/dynamic-portfolio/home/MarketWatchlist";
import { cn } from "@/utils";
import { formatIsoTime } from "@/utils/isoFormat";
import { haptic } from "@/lib/telegram";
import { track } from "@/lib/metrics";
import {
  fetchMiniappPortfolioOverview,
  type PortfolioOverviewData,
  type PortfolioOverviewKpi,
  type PortfolioPriority,
  type PortfolioTimeframe,
} from "@/services/miniapp/portfolioOverview";

const WATCHLIST_PREVIEW: MarketWatchlistItem[] = WATCHLIST.slice(0, 4);
const LEARN_PROGRESS = 0.72;
const LEARN_STREAK_DAYS = 12;
const LEARN_XP = 4860;
const LEARN_GOAL_XP = 6500;
const LEARN_RING_RADIUS = 42;
const LEARN_RING_CIRCUMFERENCE = 2 * Math.PI * LEARN_RING_RADIUS;

const PROP_FIRM_METRICS = {
  accountSize: 250_000,
  maxDrawdown: 0.08,
  profitTarget: 0.12,
  dailyProgress: 0.54,
  totalProgress: 0.32,
};

const TIMEFRAME_OPTIONS: Array<{
  id: PortfolioTimeframe;
  label: string;
}> = [
  { id: "today", label: "Today" },
  { id: "week", label: "7D" },
  { id: "14days", label: "14D" },
  { id: "month", label: "30D" },
];

type ModuleId =
  | "watchlist"
  | "token"
  | "treasury"
  | "pool"
  | "nft"
  | "dao"
  | "learn"
  | "prop";

interface ModuleCardProps {
  id: ModuleId;
  label: string;
  title: string;
  description: string;
  accentClassName: string;
  badge?: { label: string; className: string };
  activeModule: ModuleId;
  onActivate: (module: ModuleId) => void;
  children: ReactNode;
}

const MODULE_MOTION_PROPS: Pick<
  HTMLMotionProps<"div">,
  "initial" | "animate" | "transition"
> = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
};

function ModuleCard({
  id,
  label,
  title,
  description,
  accentClassName,
  badge,
  activeModule,
  onActivate,
  children,
}: ModuleCardProps) {
  return (
    <motion.div
      {...MODULE_MOTION_PROPS}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "group focus-within:scale-[1.01] focus-within:outline-none rounded-xl transition",
        activeModule === id
          ? "ring-1 ring-cyan-500/40"
          : "ring-1 ring-transparent",
      )}
      onMouseEnter={() => onActivate(id)}
      onFocusCapture={() => onActivate(id)}
      tabIndex={0}
    >
      <Card
        className={cn(
          "relative overflow-hidden border border-white/5 bg-[#010304]/80 text-white shadow-inner backdrop-blur-lg",
          accentClassName,
        )}
      >
        <CardHeader className="space-y-3 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
                {label}
              </p>
              <CardTitle className="font-manrope text-lg font-semibold tracking-wide text-white">
                {title}
              </CardTitle>
              <CardDescription className="text-white/70">
                {description}
              </CardDescription>
            </div>
            {badge
              ? (
                <Badge
                  variant="secondary"
                  className={cn("text-[11px] font-semibold", badge.className)}
                >
                  {badge.label}
                </Badge>
              )
              : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

const NFT_TIERS: Array<{
  name: string;
  yield: string;
  supply: string;
}> = [
  { name: "Velocity", yield: "6.5% APY", supply: "150 minted" },
  { name: "Edge", yield: "9.0% APY", supply: "80 minted" },
  { name: "Summit", yield: "12.4% APY", supply: "35 minted" },
];

const DAO_BADGES: Array<{ label: string; tone: "brand" | "warning" | "info" }> =
  [
    { label: "Risk committee", tone: "warning" },
    { label: "Automation", tone: "brand" },
    { label: "Playbook", tone: "info" },
  ];

const BADGE_TONE_CLASS: Record<"brand" | "warning" | "info", string> = {
  brand: "border-cyan-400/50 bg-cyan-400/10 text-cyan-200",
  warning: "border-amber-500/40 bg-amber-500/15 text-amber-100",
  info: "border-blue-400/40 bg-blue-400/10 text-blue-100",
};

const NUMBER_FORMAT_CACHE = new Map<string, Intl.NumberFormat>();

const formatCurrency = (value: number, currency: string, compact = false) => {
  const cacheKey = `${currency}-${compact ? "compact" : "standard"}`;
  if (!NUMBER_FORMAT_CACHE.has(cacheKey)) {
    NUMBER_FORMAT_CACHE.set(
      cacheKey,
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        notation: compact ? "compact" : "standard",
        maximumFractionDigits: compact ? 1 : 0,
      }),
    );
  }

  return NUMBER_FORMAT_CACHE.get(cacheKey)!.format(value);
};

const formatPercent = (
  value: number | null | undefined,
  fractionDigits = 1,
) => {
  if (value == null) {
    return "—";
  }
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(fractionDigits)}%`;
};

const buildCurvePoints = (data: PortfolioOverviewData | null) => {
  if (!data?.equityCurve.length) {
    return "";
  }
  const values = data.equityCurve.map((point) => point.equityUsd);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  return data.equityCurve
    .map((point, index) => {
      const x = (index / Math.max(1, data.equityCurve.length - 1)) * 100;
      const normalised = (point.equityUsd - min) / range;
      const y = (1 - normalised) * 40;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
};

const watchlistStatusLabel = (
  updatedAt: Date | null,
  isFetching: boolean,
  hasError: boolean,
) => {
  if (hasError) {
    return "Live feed paused";
  }
  if (!updatedAt && isFetching) {
    return "Fetching live prices…";
  }
  if (isFetching) {
    return "Syncing live prices…";
  }
  if (updatedAt) {
    return `Synced ${formatIsoTime(updatedAt)}`;
  }
  return "Waiting for live feed…";
};

export default function OverviewPage() {
  const [timeframe, setTimeframe] = useState<PortfolioTimeframe>("week");
  const [data, setData] = useState<PortfolioOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleId>("watchlist");

  const { quotes, updatedAt, isFetching, error: watchlistError } =
    useMarketWatchlistData({ enabled: true });

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchMiniappPortfolioOverview({ timeframe })
      .then((result) => {
        if (!active) {
          return;
        }
        setData(result);
        setError(result.isFallback ? "Showing cached trading metrics" : null);
        setLoading(false);
      })
      .catch((fetchError) => {
        console.error("Failed to load portfolio overview", fetchError);
        if (!active) {
          return;
        }
        setError(
          "Unable to load the live portfolio snapshot. Showing the latest cached metrics.",
        );
        setData(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [timeframe]);

  const hero = data?.hero ?? null;
  const displayedKpis: PortfolioOverviewKpi[] = data?.kpis ?? [];
  const daoPriorities: PortfolioPriority[] = data?.priorities ?? [];
  const equityPoints = useMemo(() => buildCurvePoints(data), [data]);
  const watchlistFormatters = useMemo(() => {
    return WATCHLIST_PREVIEW.reduce<Record<string, Intl.NumberFormat>>(
      (accumulator, item) => {
        accumulator[item.symbol] = new Intl.NumberFormat("en-US", item.format);
        return accumulator;
      },
      {},
    );
  }, []);

  const watchlistRows = useMemo(() => {
    return WATCHLIST_PREVIEW.map((item) => {
      const quote = (quotes as Record<string, MarketQuote | undefined>)[
        item.symbol
      ];
      const lastPrice = quote
        ? watchlistFormatters[item.symbol].format(quote.last)
        : "—";
      const change = quote?.changePercent ?? null;
      return {
        key: item.symbol,
        display: item.displaySymbol,
        name: item.name,
        bias: item.bias,
        price: lastPrice,
        change,
      };
    });
  }, [quotes, watchlistFormatters]);

  const watchlistStatus = watchlistStatusLabel(
    updatedAt,
    isFetching,
    Boolean(watchlistError),
  );

  const baseCurrency = hero?.baseCurrency ?? "USD";
  const totalCapitalDisplay = hero
    ? formatCurrency(hero.totalCapitalUsd, baseCurrency, true)
    : "—";
  const pnlPercentDisplay = formatPercent(hero?.pnlPercent);
  const winRateDisplay = formatPercent(hero?.winRatePercent);
  const vipShareDisplay = formatPercent(hero?.vipSharePercent);
  const deskVelocityDisplay = hero ? `${hero.deskVelocity} trades` : "—";

  const handleWatchlistAction = useCallback(() => {
    haptic("light");
    void track("miniapp_ecosystem_open_watchlist");
  }, []);

  const handleTokenAction = useCallback(() => {
    haptic("light");
    void track("miniapp_ecosystem_token_action");
  }, []);

  const handleTreasuryAction = useCallback(() => {
    haptic("light");
    void track("miniapp_ecosystem_treasury_action");
  }, []);

  const handlePoolAction = useCallback(() => {
    haptic("light");
    void track("miniapp_ecosystem_pool_review");
  }, []);

  const handleLearnContinue = useCallback(() => {
    haptic("medium");
    void track("miniapp_ecosystem_learn_continue");
  }, []);

  const handleLearnRewards = useCallback(() => {
    haptic("light");
    void track("miniapp_ecosystem_learn_rewards");
  }, []);

  const handlePropFirmConnect = useCallback(() => {
    haptic("medium");
    void track("miniapp_ecosystem_prop_connect_mt5");
  }, []);

  const handlePropFirmStats = useCallback(() => {
    haptic("light");
    void track("miniapp_ecosystem_prop_stats");
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-6">
      <header className="flex flex-col gap-3 text-center sm:text-left">
        <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60 sm:mx-0">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Dynamic Ecosystem Suite
        </span>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Unified oversight across every Dynamic module
        </h1>
        <p className="text-sm text-white/70 sm:max-w-2xl">
          Monitor live markets, treasury flows, governance priorities, and
          growth programs without leaving the mini-app. Each module stays synced
          with Supabase data and trading desk automation.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <ModuleCard
          id="watchlist"
          label="Watchlist"
          title="Dynamic Watchlist"
          description="Cross-asset liquidity pulse synced to desk automation."
          accentClassName="before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_top,#38bdf8_0%,transparent_60%)]"
          badge={{
            label: "Live feed",
            className:
              "border border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
          }}
          activeModule={activeModule}
          onActivate={setActiveModule}
        >
          <div className="space-y-3">
            {watchlistRows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">
                    {row.display}
                  </span>
                  <span className="text-xs text-white/60">{row.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white tabular-nums">
                    {row.price}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      row.change == null
                        ? "text-white/50"
                        : row.change >= 0
                        ? "text-emerald-300"
                        : "text-rose-300",
                    )}
                  >
                    {row.change == null
                      ? "—"
                      : `${row.change >= 0 ? "+" : ""}${
                        row.change.toFixed(2)
                      }%`}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="glass"
              size="sm"
              className="gap-2 text-white"
              onClick={handleWatchlistAction}
            >
              Open board
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Button>
            <span className="text-xs text-white/60">{watchlistStatus}</span>
          </div>
          {watchlistError
            ? <p className="text-xs text-amber-200">{watchlistError}</p>
            : null}
        </ModuleCard>

        <ModuleCard
          id="token"
          label="Token"
          title="Dynamic Token Utility"
          description="Capital coverage, win-rate velocity, and VIP allocation."
          accentClassName="before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_top,#6366f1_0%,transparent_65%)]"
          badge={{
            label: baseCurrency,
            className: "border border-white/15 bg-white/10 text-white/80",
          }}
          activeModule={activeModule}
          onActivate={setActiveModule}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/5 bg-white/5 p-3">
              <p className="text-xs text-white/60">Treasury value</p>
              <p className="mt-1 text-lg font-semibold text-white tabular-nums">
                {totalCapitalDisplay}
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-3">
              <p className="text-xs text-white/60">Desk velocity</p>
              <p className="mt-1 text-lg font-semibold text-white tabular-nums">
                {deskVelocityDisplay}
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-3">
              <p className="text-xs text-white/60">PnL momentum</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-300">
                {pnlPercentDisplay}
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-3">
              <p className="text-xs text-white/60">Win rate</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-cyan-300">
                {winRateDisplay}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="premium"
              size="sm"
              className="gap-2"
              onClick={handleTokenAction}
            >
              Manage token flows
              <TrendingUp className="h-4 w-4" aria-hidden />
            </Button>
            <span className="text-xs text-white/60">
              VIP share {vipShareDisplay}
            </span>
          </div>
          {data?.isFallback
            ? (
              <p className="text-xs text-amber-200">
                Using cached metrics until live sync resumes.
              </p>
            )
            : null}
        </ModuleCard>

        <ModuleCard
          id="treasury"
          label="Treasury"
          title="Multi-chain treasury posture"
          description="Guardrails and allocations refreshed with every session hand-off."
          accentClassName="before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_top,#22d3ee_0%,transparent_70%)]"
          badge={{
            label: "Guarded",
            className: "border border-cyan-300/40 bg-cyan-300/15 text-cyan-100",
          }}
          activeModule={activeModule}
          onActivate={setActiveModule}
        >
          <div className="space-y-3">
            {(loading && displayedKpis.length === 0
              ? Array.from({ length: 3 }).map((_, index) => ({
                id: `kpi-skeleton-${index}`,
                label: "Loading",
                value: "—",
                deltaLabel: "—",
              }))
              : displayedKpis.slice(0, 3)).map((kpi) => (
                <div
                  key={kpi.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                >
                  <div>
                    <p className="text-xs text-white/60">{kpi.label}</p>
                    <p className="text-sm font-semibold text-white tabular-nums">
                      {kpi.value}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-cyan-200">
                    {"deltaLabel" in kpi ? kpi.deltaLabel : "Syncing"}
                  </span>
                </div>
              ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {TIMEFRAME_OPTIONS.map((option) => {
              const isActiveTimeframe = option.id === timeframe;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTimeframe(option.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] transition",
                    isActiveTimeframe
                      ? "border-cyan-400/60 bg-cyan-400/20 text-cyan-100"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
            <Button
              variant="glass"
              size="sm"
              className="ml-auto gap-2 text-white"
              onClick={handleTreasuryAction}
            >
              Review guardrails
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </ModuleCard>

        <ModuleCard
          id="pool"
          label="Pool"
          title="Liquidity pools & automation"
          description="Sparkline mirrors desk allocation curve for the selected timeframe."
          accentClassName="before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_top,#0ea5e9_0%,transparent_65%)]"
          badge={{
            label: "Active",
            className:
              "border border-emerald-400/40 bg-emerald-400/15 text-emerald-100",
          }}
          activeModule={activeModule}
          onActivate={setActiveModule}
        >
          <div className="h-40 rounded-2xl border border-white/5 bg-white/5 p-4">
            {loading || !equityPoints
              ? (
                <div className="h-full w-full animate-pulse rounded-xl bg-white/10" />
              )
              : (
                <svg viewBox="0 0 100 40" className="h-full w-full">
                  <defs>
                    <linearGradient
                      id="pool-spark"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="rgba(34,211,238,0.55)" />
                      <stop offset="100%" stopColor="rgba(34,211,238,0.05)" />
                    </linearGradient>
                  </defs>
                  <polyline
                    fill="none"
                    stroke="url(#pool-spark)"
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={equityPoints}
                  />
                </svg>
              )}
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-white/60">PnL delta</p>
              <p className="text-lg font-semibold tabular-nums text-emerald-300">
                {pnlPercentDisplay}
              </p>
            </div>
            <Button
              variant="glass"
              size="sm"
              className="gap-2 text-white"
              onClick={handlePoolAction}
            >
              Review pools
              <BarChart3 className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </ModuleCard>

        <ModuleCard
          id="nft"
          label="NFT"
          title="NFT access tiers"
          description="Membership layers blend automation access with treasury rewards."
          accentClassName="before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_top,#f472b6_0%,transparent_70%)]"
          badge={{
            label: "Minting",
            className: "border border-pink-400/40 bg-pink-400/15 text-pink-100",
          }}
          activeModule={activeModule}
          onActivate={setActiveModule}
        >
          <div className="space-y-3">
            {NFT_TIERS.map((tier) => (
              <div
                key={tier.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    {tier.name}
                  </p>
                  <p className="text-xs text-white/60">{tier.supply}</p>
                </div>
                <span className="text-sm font-semibold text-cyan-200 tabular-nums">
                  {tier.yield}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60">
              New drops unlock automation boosts.
            </span>
            <Button variant="glass" size="sm" className="text-white">
              View tiers
            </Button>
          </div>
        </ModuleCard>

        <ModuleCard
          id="dao"
          label="DAO"
          title="Governance board"
          description="Priorities queued for snapshot with automation-ready guardrails."
          accentClassName="before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_top,#38bdf8_0%,transparent_70%)]"
          badge={{
            label: "Voting soon",
            className: "border border-white/15 bg-white/10 text-white/80",
          }}
          activeModule={activeModule}
          onActivate={setActiveModule}
        >
          <div className="space-y-3">
            {(loading && daoPriorities.length === 0
              ? Array.from({ length: 3 }).map((_, index) => ({
                id: `priority-skeleton-${index}`,
                title: "Loading",
                description: "Updating governance priorities…",
                owner: "Desk lead",
              }))
              : daoPriorities.slice(0, 3)).map((priority) => (
                <div
                  key={priority.id}
                  className="rounded-lg border border-white/5 bg-white/5 p-3"
                >
                  <p className="text-sm font-semibold text-white">
                    {priority.title}
                  </p>
                  <p className="mt-1 text-xs text-white/65">
                    {priority.description}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/60">
                    <Brain className="h-3.5 w-3.5" aria-hidden />
                    {priority.owner}
                  </span>
                </div>
              ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {DAO_BADGES.map((badge) => (
              <span
                key={badge.label}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[11px]",
                  BADGE_TONE_CLASS[badge.tone],
                )}
              >
                <Sparkles className="h-3 w-3" aria-hidden />
                {badge.label}
              </span>
            ))}
          </div>
        </ModuleCard>

        <ModuleCard
          id="learn"
          label="Learn & Earn"
          title="Dynamic Learn & Earn"
          description="Continue your lesson track and convert XP streaks into DCT rewards."
          accentClassName="before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_top_left,#7c3aed_0%,rgba(6,182,212,0.35)_55%,transparent_80%)]"
          badge={{
            label: "Earned DCT",
            className: "border border-cyan-300/40 bg-cyan-400/15 text-cyan-100",
          }}
          activeModule={activeModule}
          onActivate={setActiveModule}
        >
          <div className="flex items-center gap-4">
            <div className="relative flex h-28 w-28 items-center justify-center">
              <svg className="h-28 w-28" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={LEARN_RING_RADIUS}
                  stroke="rgba(148,163,255,0.25)"
                  strokeWidth={10}
                  fill="none"
                />
                <motion.circle
                  cx="60"
                  cy="60"
                  r={LEARN_RING_RADIUS}
                  stroke="url(#learn-gradient)"
                  strokeWidth={10}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={LEARN_RING_CIRCUMFERENCE}
                  strokeDashoffset={LEARN_RING_CIRCUMFERENCE}
                  animate={{
                    strokeDashoffset: LEARN_RING_CIRCUMFERENCE *
                      (1 - LEARN_PROGRESS),
                  }}
                  transition={{
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
                <defs>
                  <linearGradient
                    id="learn-gradient"
                    x1="0"
                    x2="1"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span className="text-xs text-white/60">Progress</span>
                <span className="text-xl font-semibold text-white tabular-nums">
                  {Math.round(LEARN_PROGRESS * 100)}%
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-white/60">Current streak</p>
                <p className="text-lg font-semibold text-white tabular-nums">
                  {LEARN_STREAK_DAYS} days
                </p>
              </div>
              <div>
                <p className="text-xs text-white/60">XP bank</p>
                <p className="text-lg font-semibold text-white tabular-nums">
                  {LEARN_XP.toLocaleString()} / {LEARN_GOAL_XP.toLocaleString()}
                  {" "}
                  XP
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="premium"
              size="sm"
              className="gap-2"
              onClick={handleLearnContinue}
            >
              Continue lesson
              <GraduationCap className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="glass"
              size="sm"
              className="text-white"
              onClick={handleLearnRewards}
            >
              View rewards
            </Button>
          </div>
        </ModuleCard>

        <ModuleCard
          id="prop"
          label="Prop firm"
          title="Dynamic Prop Firm desk"
          description="Track funded account guardrails and challenge progress in real time."
          accentClassName="before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_top_left,#fbbf24_0%,rgba(59,130,246,0.4)_60%,transparent_85%)]"
          badge={{
            label: "Funded",
            className: "border border-white/20 bg-white/10 text-white/80",
          }}
          activeModule={activeModule}
          onActivate={setActiveModule}
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-white/5 bg-white/5 p-3">
              <p className="text-xs text-white/60">Account size</p>
              <p className="mt-1 text-sm font-semibold text-white tabular-nums">
                {formatCurrency(PROP_FIRM_METRICS.accountSize, "USD")}
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-3">
              <p className="text-xs text-white/60">Max drawdown</p>
              <p className="mt-1 text-sm font-semibold text-amber-200 tabular-nums">
                {formatPercent(-PROP_FIRM_METRICS.maxDrawdown * 100)}
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-3">
              <p className="text-xs text-white/60">Profit target</p>
              <p className="mt-1 text-sm font-semibold text-emerald-200 tabular-nums">
                {formatPercent(PROP_FIRM_METRICS.profitTarget * 100)}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Daily progress</span>
                <span className="tabular-nums text-white">
                  {Math.round(PROP_FIRM_METRICS.dailyProgress * 100)}%
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${PROP_FIRM_METRICS.dailyProgress * 100}%`,
                  }}
                  transition={{
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Total challenge</span>
                <span className="tabular-nums text-white">
                  {Math.round(PROP_FIRM_METRICS.totalProgress * 100)}%
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 via-rose-300 to-purple-400"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${PROP_FIRM_METRICS.totalProgress * 100}%`,
                  }}
                  transition={{
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.1,
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="premium"
              size="sm"
              className="gap-2"
              onClick={handlePropFirmConnect}
            >
              Connect MT5
              <LineChart className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="glass"
              size="sm"
              className="text-white"
              onClick={handlePropFirmStats}
            >
              View challenge stats
            </Button>
          </div>
        </ModuleCard>
      </div>

      {error
        ? (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100">
            {error}
          </p>
        )
        : null}

      <p className="text-center text-sm text-white/70">
        AI Copilot is monitoring all modules in real-time 🔁
      </p>
    </div>
  );
}
