"use client";

import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { InvestorOverview } from "@/lib/investor-metrics";

interface InvestorMetricsPanelProps {
  overview: InvestorOverview;
}

interface MetricCardProps {
  title: string;
  value: ReactNode;
  children?: ReactNode;
}

function MetricCard({ title, value, children }: MetricCardProps) {
  return (
    <Card className="border border-white/10 bg-white/5 backdrop-blur">
      <CardHeader className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
          {title}
        </p>
        <div className="text-3xl font-semibold text-white">{value}</div>
      </CardHeader>
      {children
        ? (
          <CardContent className="space-y-2 text-sm text-white/70">
            {children}
          </CardContent>
        )
        : null}
    </Card>
  );
}

export function InvestorMetricsPanel(
  { overview }: InvestorMetricsPanelProps,
) {
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }),
    [],
  );

  const tokenFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const formatDateTime = useCallback((value: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }, []);

  const profitLossValue = overview.equity.profitLossUsd;
  const profitLossClass = profitLossValue >= 0
    ? "text-emerald-300"
    : "text-rose-300";

  const subscription = overview.subscription;
  const subscriptionStatusLabel = subscription
    ? subscription.status.toUpperCase()
    : "NO SUBSCRIPTION";
  const subscriptionBadgeVariant = subscription
    ? subscription.isPaused
      ? "warning"
      : subscription.status === "active"
      ? "success"
      : "secondary"
    : "outline";

  const burnTotals = overview.burnTotals;
  const lastBuyback = overview.lastBuyback;

  return (
    <div className="w-full max-w-5xl">
      <div className="grid gap-6 md:grid-cols-2">
        <MetricCard
          title="Marked Equity"
          value={currencyFormatter.format(overview.equity.markedEquityUsd)}
        >
          <div className="flex flex-wrap items-center gap-2 text-white/70">
            <span>
              Contribution{" "}
              {currencyFormatter.format(overview.equity.contributionUsd)}
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-white/20 md:inline-flex" />
            <span className={profitLossClass}>
              P/L {currencyFormatter.format(profitLossValue)}
            </span>
          </div>
          <p>
            Last valuation {formatDateTime(overview.equity.lastValuationAt)}
          </p>
        </MetricCard>

        <MetricCard
          title="Treasury Burn Totals"
          value={`${tokenFormatter.format(burnTotals.burnTon)} TON`}
        >
          <p>
            {tokenFormatter.format(burnTotals.dctBurned)} DCT destroyed overall.
          </p>
          <p>
            Ops split {tokenFormatter.format(burnTotals.operationsTon)}{" "}
            TON · Auto-invest {tokenFormatter.format(burnTotals.autoInvestTon)}
            {" "}
            TON.
          </p>
          <p>Updated {formatDateTime(burnTotals.updatedAt)}</p>
        </MetricCard>

        <MetricCard
          title="Subscription Status"
          value={
            <div className="flex items-center gap-2">
              <Badge variant={subscriptionBadgeVariant}>
                {subscriptionStatusLabel}
              </Badge>
              <span className="text-base font-medium text-white/70">
                {subscription?.planName || "—"}
              </span>
            </div>
          }
        >
          {subscription
            ? (
              <div className="space-y-1">
                <p>
                  Next renewal {formatDateTime(subscription.nextRenewalAt)}
                </p>
                <p>
                  Last payment {formatDateTime(subscription.lastPaymentAt)}
                </p>
                {subscription.isPaused
                  ? <p className="text-amber-200">Auto-renew paused</p>
                  : null}
              </div>
            )
            : <p>No active subscription linked to your profile.</p>}
        </MetricCard>

        <MetricCard
          title="Latest Buyback"
          value={lastBuyback
            ? `${tokenFormatter.format(lastBuyback.burnTon)} TON`
            : "—"}
        >
          {lastBuyback
            ? (
              <div className="space-y-1">
                <p>
                  Burned {tokenFormatter.format(lastBuyback.dctBurned)} DCT
                </p>
                <p>Executed {formatDateTime(lastBuyback.executedAt)}</p>
                {lastBuyback.burnTxHash
                  ? (
                    <p className="truncate text-xs text-white/60">
                      Burn tx {lastBuyback.burnTxHash}
                    </p>
                  )
                  : null}
              </div>
            )
            : <p>No buyback activity recorded yet.</p>}
        </MetricCard>
      </div>
    </div>
  );
}
