"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BellRing, RefreshCw, Sparkles, Zap } from "lucide-react";

import {
  BIAS_DETAILS,
  CATEGORY_DETAILS,
  CATEGORY_ORDER,
  formatChangePercent,
  formatNumber,
  formatRange,
  type InstrumentCategory,
  type MarketQuote,
  type MarketWatchlistItem,
  useMarketWatchlistData,
  WATCHLIST,
} from "@/components/dynamic-portfolio/home/MarketWatchlist";
import { formatIsoTime } from "@/utils/isoFormat";
import { cn } from "@/utils";
import { haptic } from "@/lib/telegram";
import { track } from "@/lib/metrics";

type WatchlistCategory = "All" | InstrumentCategory;

type WatchlistCardProps = {
  item: MarketWatchlistItem;
  quote: MarketQuote | undefined;
  alertsEnabled: boolean;
  onToggleAlerts: (symbol: string) => void;
  onOpenPlaybook: (symbol: string) => void;
  highlightLive: boolean;
};

const CATEGORY_FILTERS: WatchlistCategory[] = [
  "All",
  ...CATEGORY_ORDER,
];

const WATCHLIST_STATUS_ERROR =
  "Unable to sync live prices right now. We will retry automatically.";

const buildSparklinePoints = (
  symbol: string,
  changePercent?: number,
) => {
  const length = 16;
  const seedBase = symbol
    .split("")
    .reduce((accumulator, char) => accumulator + char.charCodeAt(0), 0);
  const slope = Number.isFinite(changePercent) ? changePercent! / 120 : 0;
  const points: string[] = [];

  for (let index = 0; index < length; index += 1) {
    const progress = index / (length - 1);
    const theta = progress * Math.PI * 2;
    const noise = Math.sin(theta + seedBase) * 0.18;
    const trend = slope * (index - length / 2);
    const baseline = 0.5 + noise + trend;
    const clamped = Math.min(0.92, Math.max(0.08, baseline));
    const x = (progress * 100).toFixed(2);
    const y = ((1 - clamped) * 32).toFixed(2);
    points.push(`${x},${y}`);
  }

  return points.join(" ");
};

const resolveChangeTone = (changePercent?: number) => {
  if (changePercent === undefined || Number.isNaN(changePercent)) {
    return "neutral" as const;
  }
  if (changePercent > 0) {
    return "positive" as const;
  }
  if (changePercent < 0) {
    return "negative" as const;
  }
  return "neutral" as const;
};

function WatchlistCard({
  item,
  quote,
  alertsEnabled,
  onToggleAlerts,
  onOpenPlaybook,
  highlightLive,
}: WatchlistCardProps) {
  const categoryDetails = CATEGORY_DETAILS[item.category];
  const bias = BIAS_DETAILS[item.bias];
  const changeValue = quote?.changePercent;
  const changeTone = resolveChangeTone(changeValue);
  const priceLabel = formatNumber(quote?.last, item.format);
  const changeLabel = formatChangePercent(changeValue);
  const rangeLabel = formatRange(quote, item.format);
  const gradientId = `spark-${item.symbol.toLowerCase()}`;
  const sparklinePoints = useMemo(
    () => buildSparklinePoints(item.symbol, changeValue),
    [item.symbol, changeValue],
  );

  const changeClasses = changeTone === "positive"
    ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
    : changeTone === "negative"
    ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
    : "border-white/15 bg-white/10 text-white/70";

  const automationSummary = item.playbook?.automation;
  const planSummary = item.playbook?.plan.default ?? item.focus;

  return (
    <article
      className={cn(
        "group relative flex w-[280px] snap-start flex-col gap-4 rounded-2xl border border-white/12 bg-gradient-to-br from-white/12 via-white/5 to-transparent p-5 transition-all",
        highlightLive &&
          "ring-1 ring-primary/45 ring-offset-2 ring-offset-slate-900/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-white/15 bg-white/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              {item.displaySymbol}
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                bias.background === "brand-alpha-weak"
                  ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-100"
                  : bias.background === "danger-alpha-weak"
                  ? "border-rose-500/50 bg-rose-500/20 text-rose-100"
                  : "border-white/20 bg-white/10 text-white/70",
              )}
            >
              {bias.label}
            </span>
          </div>
          <p className="text-sm font-medium text-white/85">{item.name}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-white">
              {priceLabel}
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-semibold",
                changeClasses,
              )}
            >
              {changeLabel}
            </span>
          </div>
          <button
            type="button"
            aria-pressed={alertsEnabled}
            onClick={() => onToggleAlerts(item.symbol)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium transition",
              alertsEnabled
                ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-100"
                : "border-white/20 bg-white/5 text-white/70 hover:border-white/35 hover:text-white",
            )}
          >
            <BellRing size={14} />
            {alertsEnabled ? "Alerts on" : "Enable alerts"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <svg viewBox="0 0 100 32" className="h-16 w-full">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop
                  offset="0%"
                  stopColor={changeTone === "negative"
                    ? "rgba(248,113,113,0.85)"
                    : "rgba(94,234,212,0.85)"}
                />
                <stop
                  offset="100%"
                  stopColor={changeTone === "negative"
                    ? "rgba(251,113,133,0.75)"
                    : "rgba(96,165,250,0.8)"}
                />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={sparklinePoints}
            />
          </svg>
        </div>
        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span className="flex items-center gap-1">
            <Sparkles size={14} className="text-primary" />
            {item.session}
          </span>
          <span>{rangeLabel}</span>
        </div>
      </div>

      <div className="space-y-2 text-sm leading-snug text-white/85">
        <p>{planSummary}</p>
        {automationSummary
          ? (
            <p className="flex items-center gap-2 text-xs text-white/60">
              <Zap size={14} className="text-primary" />
              {automationSummary}
            </p>
          )
          : null}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onOpenPlaybook(item.symbol)}
          className="flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary-foreground transition hover:bg-primary/30"
        >
          <ArrowRight size={14} />
          View playbook
        </button>
        <span className="text-[11px] text-white/55">
          {categoryDetails.label}
        </span>
      </div>
    </article>
  );
}

export default function WatchlistPage() {
  const [selectedCategory, setSelectedCategory] = useState<WatchlistCategory>(
    "All",
  );
  const [alertedSymbols, setAlertedSymbols] = useState<Record<string, boolean>>(
    {},
  );
  const [justSynced, setJustSynced] = useState(false);

  const { quotes, updatedAt, isFetching, error, refresh } =
    useMarketWatchlistData({ enabled: true });

  useEffect(() => {
    if (!updatedAt) {
      return;
    }

    setJustSynced(true);
    const timeoutId = window.setTimeout(() => setJustSynced(false), 1800);

    return () => window.clearTimeout(timeoutId);
  }, [updatedAt]);

  const visibleItems = useMemo(() => {
    if (selectedCategory === "All") {
      return WATCHLIST;
    }
    return WATCHLIST.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const emptyCategoryLabel = useMemo(() => {
    if (selectedCategory === "All") {
      return "the full desk universe";
    }
    return CATEGORY_DETAILS[selectedCategory].label;
  }, [selectedCategory]);

  const statusLabel = useMemo(() => {
    if (error) {
      return error;
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
  }, [error, isFetching, updatedAt]);

  const handleToggleAlerts = useCallback((symbol: string) => {
    let nextEnabled = false;
    setAlertedSymbols((previous) => {
      nextEnabled = !previous[symbol];
      return { ...previous, [symbol]: nextEnabled };
    });

    haptic(nextEnabled ? "medium" : "light");
    void track("miniapp_watchlist_toggle_alert", {
      symbol,
      enabled: nextEnabled,
    });
  }, []);

  const handleOpenPlaybook = useCallback((symbol: string) => {
    haptic("medium");
    void track("miniapp_watchlist_open_playbook", { symbol });
  }, []);

  const handleFilterChange = useCallback((category: WatchlistCategory) => {
    setSelectedCategory(category);
    haptic("light");
    void track("miniapp_watchlist_filter", { category });
  }, []);

  const handleManageAlerts = useCallback(() => {
    haptic("medium");
    void track("miniapp_watchlist_manage_alerts");
  }, []);

  const handleManualRefresh = useCallback(() => {
    haptic("light");
    void track("miniapp_watchlist_refresh");
    void refresh();
  }, [refresh]);

  return (
    <section className="space-y-6 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/12 via-transparent to-white/5 p-5 shadow-[0_24px_60px_rgba(8,10,18,0.55)]">
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
              Dynamic Market
            </span>
            <h2 className="text-lg font-semibold text-white">Core Watchlist</h2>
            <p className="text-sm text-white/70">
              Auto-syncs with the desk&apos;s investor playbooks, alerting you
              when automation levels shift.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={handleManageAlerts}
              className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:border-white/35"
            >
              <BellRing size={14} />
              Manage alerts
            </button>
            <div className="flex items-center gap-3 text-[11px] text-white/65">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  error
                    ? "bg-rose-400"
                    : isFetching
                    ? "animate-pulse bg-emerald-300"
                    : justSynced
                    ? "bg-emerald-300"
                    : "bg-white/40",
                )}
              />
              <span className="font-medium">{statusLabel}</span>
              <button
                type="button"
                onClick={handleManualRefresh}
                className="flex items-center gap-1 rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-medium text-white/70 transition hover:border-white/35 hover:text-white"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORY_FILTERS.map((category) => {
          const isActive = category === selectedCategory;
          const label = category === "All"
            ? "All assets"
            : CATEGORY_DETAILS[category].label;

          return (
            <button
              key={category}
              type="button"
              onClick={() => handleFilterChange(category)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition",
                isActive
                  ? "border-primary/50 bg-primary/20 text-primary-foreground"
                  : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex snap-x gap-4 overflow-x-auto pb-3">
        {visibleItems.map((item) => (
          <WatchlistCard
            key={item.symbol}
            item={item}
            quote={quotes[item.dataKey]}
            alertsEnabled={Boolean(alertedSymbols[item.symbol])}
            onToggleAlerts={handleToggleAlerts}
            onOpenPlaybook={handleOpenPlaybook}
            highlightLive={justSynced && Boolean(quotes[item.dataKey])}
          />
        ))}
      </div>

      {!error && visibleItems.length === 0
        ? (
          <p className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white/70">
            We&apos;ll populate this list as soon as the desk spins up targets
            for {emptyCategoryLabel}.
          </p>
        )
        : null}

      {error
        ? (
          <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {WATCHLIST_STATUS_ERROR}
          </p>
        )
        : null}
    </section>
  );
}
