"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock, LineChart, Sparkles } from "lucide-react";

import { cn } from "@/utils";
import { formatIsoTime } from "@/utils/isoFormat";
import { haptic } from "@/lib/telegram";
import { track } from "@/lib/metrics";
import {
  fetchMiniappPortfolioOverview,
  type PortfolioOverviewData,
  type PortfolioPriority,
  type PortfolioTimeframe,
} from "@/services/miniapp/portfolioOverview";

type MetricTone = "positive" | "negative" | "neutral";

type TimeframeOption = {
  id: PortfolioTimeframe;
  label: string;
  helper: string;
};

const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { id: "today", label: "Today", helper: "Live" },
  { id: "week", label: "7D", helper: "This week" },
  { id: "14days", label: "14D", helper: "Bi-weekly" },
  { id: "month", label: "30D", helper: "This month" },
];

const OVERVIEW_ERROR_MESSAGE =
  "Unable to load the live portfolio snapshot. Showing the latest cached metrics.";

const currencyFormatter = (currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const trendTone = (value: number): MetricTone => {
  if (value > 0.25) return "positive";
  if (value < -0.25) return "negative";
  return "neutral";
};

const toneClassMap: Record<MetricTone, string> = {
  positive: "text-emerald-300",
  negative: "text-rose-300",
  neutral: "text-white",
};

const badgeToneMap: Record<MetricTone, string> = {
  positive: "border-emerald-400/50 bg-emerald-400/15 text-emerald-200",
  negative: "border-rose-500/50 bg-rose-500/15 text-rose-200",
  neutral: "border-white/20 bg-white/10 text-white/70",
};

const badgeToneForTrend = (trend: "up" | "down" | "flat"): string => {
  if (trend === "up") return badgeToneMap.positive;
  if (trend === "down") return badgeToneMap.negative;
  return badgeToneMap.neutral;
};

const emphasisToneMap: Record<
  NonNullable<PortfolioPriority["emphasis"]>,
  string
> = {
  focus: "border-primary/40 bg-primary/15",
  risk: "border-amber-500/40 bg-amber-500/15",
  automation: "border-emerald-500/35 bg-emerald-500/15",
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

function MetricHighlight({
  label,
  value,
  helper,
  tone = "neutral",
  loading,
}: {
  label: string;
  value: string;
  helper: string;
  tone?: MetricTone;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
        {label}
      </p>
      <div className="mt-2 text-xl font-semibold text-white">
        {loading
          ? (
            <span className="block h-6 w-24 animate-pulse rounded bg-white/20" />
          )
          : <span className={toneClassMap[tone]}>{value}</span>}
      </div>
      <p className="mt-1 text-sm text-white/65">
        {loading
          ? (
            <span className="block h-4 w-32 animate-pulse rounded bg-white/10" />
          )
          : helper}
      </p>
    </div>
  );
}

function PriorityCard({ priority }: { priority: PortfolioPriority }) {
  const toneClass = priority.emphasis
    ? emphasisToneMap[priority.emphasis]
    : "border-white/15 bg-white/5";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition hover:border-white/25",
        toneClass,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-white">{priority.title}</h4>
        <span className="text-[11px] font-medium text-white/60">
          {priority.owner}
        </span>
      </div>
      <p className="mt-2 text-sm text-white/75">{priority.description}</p>
    </div>
  );
}

export default function OverviewPage() {
  const [timeframe, setTimeframe] = useState<PortfolioTimeframe>("week");
  const [data, setData] = useState<PortfolioOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchMiniappPortfolioOverview({ timeframe })
      .then((result) => {
        if (!active) {
          return;
        }
        setData(result);
        setError(
          result.isFallback ? OVERVIEW_ERROR_MESSAGE : null,
        );
        setLoading(false);
      })
      .catch((fetchError) => {
        console.error("Failed to load portfolio overview", fetchError);
        if (!active) {
          return;
        }
        setError(OVERVIEW_ERROR_MESSAGE);
        setData(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [timeframe]);

  const hero = data?.hero ?? null;
  const formatter = useMemo(
    () => currencyFormatter(hero?.baseCurrency ?? "USD"),
    [hero?.baseCurrency],
  );

  const equityPoints = useMemo(() => buildCurvePoints(data), [data]);

  const displayedKpis = data?.kpis ?? [];
  const showKpiSkeleton = loading && displayedKpis.length === 0;
  const displayedPriorities = data?.priorities ?? [];
  const showPrioritySkeleton = loading && displayedPriorities.length === 0;

  const handleOpenDesk = useCallback(() => {
    haptic("medium");
    void track("miniapp_overview_open_desk");
  }, []);

  return (
    <div className="space-y-6">
      <section className="space-y-6 rounded-[28px] border border-white/12 bg-gradient-to-br from-white/12 via-white/5 to-transparent p-5 shadow-[0_24px_60px_rgba(8,10,18,0.55)]">
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
              Portfolio pulse
            </span>
            <h2 className="text-xl font-semibold text-white">
              {loading || !hero
                ? (
                  <span className="block h-6 w-44 animate-pulse rounded bg-white/20" />
                )
                : `${formatter.format(hero.totalCapitalUsd)} deployed`}
            </h2>
            <p className="text-sm text-white/70">
              Live allocation, win-rate velocity, and VIP share for the selected
              window.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {TIMEFRAME_OPTIONS.map((option) => {
              const isActive = option.id === timeframe;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setTimeframe(option.id);
                    haptic("light");
                    void track("miniapp_overview_timeframe", {
                      timeframe: option.id,
                    });
                  }}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-2xl border px-3 py-2 text-left transition",
                    isActive
                      ? "border-primary/60 bg-primary/20 text-primary-foreground"
                      : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white",
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                    {option.helper}
                  </span>
                  <span className="text-sm font-semibold">{option.label}</span>
                </button>
              );
            })}
            <div className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/65">
              <Clock size={12} />
              {loading || !hero
                ? "Syncing…"
                : `Updated ${formatIsoTime(new Date(hero.updatedAt))}`}
            </div>
            {data?.isFallback
              ? (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[11px] font-medium text-amber-200">
                  Fallback snapshot
                </span>
              )
              : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-[1.2fr,0.8fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricHighlight
                label="Net PnL"
                value={hero
                  ? percentFormatter.format(hero.pnlPercent / 100)
                  : "0%"}
                helper="Versus previous window"
                tone={trendTone(hero?.pnlPercent ?? 0)}
                loading={loading}
              />
              <MetricHighlight
                label="Win rate"
                value={hero
                  ? percentFormatter.format(hero.winRatePercent / 100)
                  : "0%"}
                helper="Signal accuracy trend"
                tone={trendTone((hero?.winRatePercent ?? 0) - 55)}
                loading={loading}
              />
              <MetricHighlight
                label="Desk velocity"
                value={hero ? `${hero.deskVelocity} trades` : "—"}
                helper="Markets actively managed"
                tone="neutral"
                loading={loading}
              />
              <MetricHighlight
                label="VIP share"
                value={hero
                  ? percentFormatter.format(hero.vipSharePercent / 100)
                  : "0%"}
                helper="Desk clients in VIP automation"
                tone={trendTone((hero?.vipSharePercent ?? 0) - 40)}
                loading={loading}
              />
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <div className="flex items-center justify-between text-sm text-white/70">
                <span className="flex items-center gap-2 font-semibold text-white">
                  <LineChart size={16} className="text-primary" /> Equity curve
                </span>
                <span>{timeframe}</span>
              </div>
              <div className="mt-4 h-40">
                {loading || !equityPoints
                  ? (
                    <div className="h-full w-full animate-pulse rounded-xl bg-white/10" />
                  )
                  : (
                    <svg viewBox="0 0 100 40" className="h-full w-full">
                      <defs>
                        <linearGradient
                          id="equity-gradient"
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="rgba(94,234,212,0.45)" />
                          <stop
                            offset="100%"
                            stopColor="rgba(94,234,212,0.05)"
                          />
                        </linearGradient>
                      </defs>
                      <polyline
                        fill="none"
                        stroke="url(#equity-gradient)"
                        strokeWidth={2.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={equityPoints}
                      />
                    </svg>
                  )}
              </div>
              <button
                type="button"
                onClick={handleOpenDesk}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/50 bg-primary/20 px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/25"
              >
                <ArrowRight size={16} /> Review trading desk
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {showKpiSkeleton
            ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`kpi-skeleton-${index}`}
                className="rounded-2xl border border-white/12 bg-white/5 p-4"
              >
                <span className="block h-3 w-20 animate-pulse rounded bg-white/15" />
                <span className="mt-3 block h-6 w-24 animate-pulse rounded bg-white/20" />
                <span className="mt-2 block h-4 w-28 animate-pulse rounded bg-white/10" />
              </div>
            ))
            : displayedKpis.map((kpi) => (
              <div
                key={kpi.id}
                className="rounded-2xl border border-white/12 bg-white/5 p-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
                  {kpi.label}
                </p>
                <div className="mt-2 text-lg font-semibold text-white">
                  {kpi.value}
                </div>
                <span
                  className={cn(
                    "mt-1 inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    badgeToneForTrend(kpi.trend),
                  )}
                >
                  <Sparkles size={12} />
                  {kpi.deltaLabel}
                </span>
              </div>
            ))}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
            Desk priorities
          </h3>
          <div className="grid gap-3">
            {showPrioritySkeleton
              ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`priority-skeleton-${index}`}
                  className="rounded-2xl border border-white/12 bg-white/5 p-4"
                >
                  <span className="block h-4 w-1/2 animate-pulse rounded bg-white/20" />
                  <span className="mt-2 block h-4 w-full animate-pulse rounded bg-white/10" />
                  <span className="mt-2 block h-4 w-3/4 animate-pulse rounded bg-white/10" />
                </div>
              ))
              : displayedPriorities.map((priority) => (
                <PriorityCard key={priority.id} priority={priority} />
              ))}
          </div>
        </div>
      </section>

      {error
        ? (
          <p className="rounded-2xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100">
            {error}
          </p>
        )
        : null}
    </div>
  );
}
