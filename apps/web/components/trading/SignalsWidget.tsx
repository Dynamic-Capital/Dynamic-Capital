"use client";

import { useEffect, useMemo, useState } from "react";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils";

type SignalColor = "success" | "warning" | "error";

type CoinGeckoMarket = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  last_updated: string;
  price_change_percentage_1h_in_currency: number | null;
  price_change_percentage_24h_in_currency: number | null;
};

type AssetSignal = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change1h: number | null;
  change24h: number | null;
  lastUpdated: Date | null;
  classification: SignalColor;
};

type LiveSignalState = {
  assets: AssetSignal[];
  updatedAt: Date | null;
  isLoading: boolean;
  errorMessage: string | null;
};

type SummaryMeta = {
  label: string;
  action: string;
  icon: LucideIcon;
  accentClass: string;
  badgeClass: string;
  barClass: string;
};

const REFRESH_INTERVAL_MS = 60_000;

const COINGECKO_ASSETS = [
  { id: "bitcoin", label: "Bitcoin", symbol: "BTC" },
  { id: "ethereum", label: "Ethereum", symbol: "ETH" },
  { id: "the-open-network", label: "Toncoin", symbol: "TON" },
] as const;

const COINGECKO_ENDPOINT =
  `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${
    COINGECKO_ASSETS.map((asset) => asset.id).join(",")
  }&order=market_cap_desc&per_page=${COINGECKO_ASSETS.length}&page=1&sparkline=false&price_change_percentage=1h,24h`;

const SIGNAL_META: Record<SignalColor, SummaryMeta> = {
  success: {
    label: "Bullish drift",
    action: "Momentum confirms the uptrend.",
    icon: TrendingUp,
    accentClass: "text-success",
    badgeClass: "bg-success/10 text-success",
    barClass: "bg-success",
  },
  warning: {
    label: "Range bound",
    action: "Conditions remain balanced.",
    icon: AlertTriangle,
    accentClass: "text-warning",
    badgeClass: "bg-warning/10 text-warning",
    barClass: "bg-warning",
  },
  error: {
    label: "Risk-off",
    action: "Capital rotation favours defense.",
    icon: ShieldAlert,
    accentClass: "text-error",
    badgeClass: "bg-error/10 text-error",
    barClass: "bg-error",
  },
};

const STATUS_BADGE = {
  live: "border-success/40 bg-success/10 text-success",
  refreshing: "border-primary/40 bg-primary/10 text-primary",
  stale: "border-warning/40 bg-warning/10 text-warning",
} satisfies Record<"live" | "refreshing" | "stale", string>;

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const PERCENT_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "always",
});

function classifyChange(change: number | null): SignalColor {
  if (change == null || Number.isNaN(change)) {
    return "warning";
  }

  if (change >= 1.5) {
    return "success";
  }

  if (change <= -1.5) {
    return "error";
  }

  return "warning";
}

function formatCurrency(value: number) {
  return USD_FORMATTER.format(value);
}

function formatPercent(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "–";
  }

  return `${PERCENT_FORMATTER.format(value)}%`;
}

function formatRelativeTime(date: Date) {
  const delta = Date.now() - date.getTime();

  if (delta < 60_000) {
    return "just now";
  }

  if (delta < 3_600_000) {
    const minutes = Math.round(delta / 60_000);
    return `${minutes}m ago`;
  }

  const hours = Math.round(delta / 3_600_000);
  return `${hours}h ago`;
}

function resolveUpdatedAt(assets: AssetSignal[]): Date | null {
  return assets.reduce<Date | null>((mostRecent, asset) => {
    if (!asset.lastUpdated) {
      return mostRecent;
    }

    if (!mostRecent || asset.lastUpdated > mostRecent) {
      return asset.lastUpdated;
    }

    return mostRecent;
  }, null);
}

export function SignalsWidget() {
  const [state, setState] = useState<LiveSignalState>({
    assets: [],
    updatedAt: null,
    isLoading: true,
    errorMessage: null,
  });

  useEffect(() => {
    let isMounted = true;
    let activeController: AbortController | null = null;

    const loadSignals = async () => {
      if (!isMounted) {
        return;
      }

      if (activeController) {
        activeController.abort();
      }

      const controller = new AbortController();
      activeController = controller;

      setState((previous) => ({
        ...previous,
        isLoading: previous.assets.length === 0,
      }));

      try {
        const response = await fetch(COINGECKO_ENDPOINT, {
          cache: "no-store",
          headers: {
            accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load live data (${response.status})`);
        }

        const payload = (await response.json()) as CoinGeckoMarket[];

        if (!isMounted) {
          return;
        }

        const assets = COINGECKO_ASSETS.reduce<AssetSignal[]>((list, asset) => {
          const market = payload.find((entry) => entry.id === asset.id);

          if (!market) {
            return list;
          }

          list.push({
            id: asset.id,
            name: asset.label,
            symbol: asset.symbol.toUpperCase(),
            price: market.current_price,
            change1h: market.price_change_percentage_1h_in_currency ?? null,
            change24h: market.price_change_percentage_24h_in_currency ?? null,
            lastUpdated: market.last_updated
              ? new Date(market.last_updated)
              : null,
            classification: classifyChange(
              market.price_change_percentage_24h_in_currency ?? null,
            ),
          });

          return list;
        }, []);

        const updatedAt = resolveUpdatedAt(assets) ?? new Date();

        setState({
          assets,
          updatedAt,
          isLoading: false,
          errorMessage: null,
        });
      } catch (error) {
        if (!isMounted || controller.signal.aborted) {
          return;
        }

        console.error("Failed to refresh live signals", error);

        setState((previous) => ({
          ...previous,
          isLoading: false,
          errorMessage: previous.assets.length > 0
            ? "Live data temporarily unavailable"
            : "Unable to load live data",
        }));
      }
    };

    void loadSignals();

    const refreshTimer = window.setInterval(() => {
      void loadSignals();
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;

      window.clearInterval(refreshTimer);

      if (activeController) {
        activeController.abort();
      }
    };
  }, []);

  const summary = useMemo(() => {
    return state.assets.reduce(
      (totals, asset) => {
        totals[asset.classification] += 1;
        return totals;
      },
      { success: 0, warning: 0, error: 0 } as Record<SignalColor, number>,
    );
  }, [state.assets]);

  const totalSignals = useMemo(() => {
    return state.assets.length;
  }, [state.assets]);

  const isSkeleton = state.isLoading && state.assets.length === 0;
  const isStale = Boolean(state.errorMessage);
  const statusVariant = isSkeleton ? "refreshing" : isStale ? "stale" : "live";

  const cardClasses =
    "relative overflow-hidden rounded-3xl border border-border/60 bg-background/90 p-6 shadow-lg shadow-primary/10";
  const summaryId = "signals-summary";
  const listId = "signals-list";

  return (
    <Card className={cardClasses}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(110,80,255,0.12),transparent_75%)]" />
      <div className="relative z-10 space-y-6">
        <div
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          aria-labelledby={summaryId}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Activity className="h-6 w-6" aria-hidden />
            </span>
            <div className="space-y-1">
              <p id={summaryId} className="text-base font-semibold">
                Live market pulse
              </p>
              <p className="text-sm text-muted-foreground">
                Open-source telemetry from CoinGecko, refreshed every minute.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "self-start sm:self-auto",
              STATUS_BADGE[statusVariant],
            )}
          >
            {statusVariant === "live"
              ? "Live"
              : statusVariant === "refreshing"
              ? "Refreshing"
              : "Stale"}
          </Badge>
        </div>

        <div className="rounded-2xl border border-border/50 bg-background/80 p-4 shadow-inner">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Tracked assets</span>
            <span className="text-sm font-semibold text-foreground">
              {totalSignals}
            </span>
          </div>
          <div
            className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-border/60"
            aria-hidden
          >
            {(["success", "warning", "error"] as const).map((color) => {
              const meta = SIGNAL_META[color];
              const value = summary[color];
              const widthPercent = totalSignals
                ? Math.max(Math.round((value / totalSignals) * 100), 4)
                : 0;

              return (
                <span
                  key={color}
                  className={meta.barClass}
                  style={{ width: `${widthPercent}%` }}
                />
              );
            })}
          </div>
        </div>

        {isSkeleton
          ? (
            <div className="space-y-3" role="status" aria-live="polite">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/80 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton shape="circle" />
                    <div className="w-full space-y-2">
                      <Skeleton />
                      <Skeleton width="m" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Skeleton width="s" />
                    <Skeleton width="s" />
                  </div>
                </div>
              ))}
            </div>
          )
          : (
            <>
              <ul id={listId} className="grid gap-3" role="list">
                {state.assets.map((asset) => {
                  const meta = SIGNAL_META[asset.classification];
                  const changeClass =
                    asset.change24h == null || Number.isNaN(asset.change24h)
                      ? "text-muted-foreground"
                      : asset.change24h >= 0
                      ? "text-success"
                      : "text-error";

                  const ChangeIcon =
                    asset.change24h != null && asset.change24h < 0
                      ? ArrowDownRight
                      : ArrowUpRight;

                  return (
                    <li
                      key={asset.id}
                      className="group flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl",
                            meta.badgeClass,
                          )}
                        >
                          <meta.icon className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            {asset.name}
                          </p>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {asset.symbol}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 text-sm sm:items-end">
                        <span className="font-semibold text-foreground">
                          {formatCurrency(asset.price)}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-semibold",
                              changeClass,
                            )}
                          >
                            <ChangeIcon className="h-3.5 w-3.5" aria-hidden />
                            {formatPercent(asset.change24h)}
                          </span>
                          <Badge
                            variant="secondary"
                            className="bg-muted/40 text-muted-foreground"
                          >
                            1h {formatPercent(asset.change1h)}
                          </Badge>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-col gap-1 rounded-2xl border border-dashed border-border/50 bg-background/60 p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden />
                  <span>
                    {state.updatedAt
                      ? `Synced ${formatRelativeTime(state.updatedAt)} · ${
                        state.updatedAt.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                          timeZoneName: "short",
                        })
                      }`
                      : "Awaiting first sync"}
                  </span>
                </div>
                {state.errorMessage
                  ? (
                    <span className="text-warning">
                      {state.errorMessage}
                    </span>
                  )
                  : (
                    <span className="text-muted-foreground/80">
                      Powered by the open CoinGecko market API.
                    </span>
                  )}
              </div>
            </>
          )}
      </div>
    </Card>
  );
}
