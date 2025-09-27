"use client";

import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { BuybackEvent, InvestorOverview } from "@/lib/investor-metrics";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";

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

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <Card className="flex h-full flex-col border border-white/10 bg-white/5 backdrop-blur">
      <CardHeader className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
          {title}
        </p>
        {description
          ? <p className="text-sm text-white/70">{description}</p>
          : null}
      </CardHeader>
      <CardContent className="h-72 pt-6">
        {children}
      </CardContent>
    </Card>
  );
}

const tonSegmentColors = ["#38bdf8", "#f97316", "#a855f7"] as const;

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

  const compactCurrencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [],
  );

  const shortDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }),
    [],
  );

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  const formatDateTime = useCallback(
    (value: string | null) => {
      if (!value) return "—";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "—";
      return dateTimeFormatter.format(date);
    },
    [dateTimeFormatter],
  );

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

  const tonAllocationData = useMemo(() => {
    const operations = Math.max(burnTotals.operationsTon, 0);
    const autoInvest = Math.max(burnTotals.autoInvestTon, 0);
    const direct = Math.max(burnTotals.burnTon - (operations + autoInvest), 0);

    return [
      { name: "Direct buybacks", value: direct },
      { name: "Operations allocation", value: operations },
      { name: "Auto-invest allocation", value: autoInvest },
    ].filter((item) => item.value > 0);
  }, [burnTotals.autoInvestTon, burnTotals.burnTon, burnTotals.operationsTon]);

  const capitalCompositionData = useMemo(
    () => [
      {
        name: "Capital",
        "Marked equity": overview.equity.markedEquityUsd,
        "Contributed capital": overview.equity.contributionUsd,
        "Profit / loss": overview.equity.profitLossUsd,
      },
    ],
    [
      overview.equity.contributionUsd,
      overview.equity.markedEquityUsd,
      overview.equity.profitLossUsd,
    ],
  );

  const buybackChartData = useMemo(
    () =>
      overview.buybackHistory
        .filter(
          (event): event is BuybackEvent & { executedAt: string } =>
            typeof event.executedAt === "string" && event.executedAt.length > 0,
        )
        .map((event) => {
          const date = new Date(event.executedAt);
          return {
            label: shortDateFormatter.format(date),
            ton: event.burnTon,
            dct: event.dctBurned,
          };
        }),
    [overview.buybackHistory, shortDateFormatter],
  );

  const renderTonTooltip = useCallback(
    ({ active, payload }: TooltipProps<number, string>) => {
      if (!active || !payload?.length) {
        return null;
      }

      const entry = payload[0];
      const value = typeof entry.value === "number"
        ? entry.value
        : Number(entry.value ?? 0);

      return (
        <div className="rounded-md bg-slate-900/90 px-3 py-2 text-xs text-white shadow-lg shadow-slate-950/50">
          <p className="font-medium text-white/90">{entry.name}</p>
          <p className="mt-1 text-sky-300">
            {tokenFormatter.format(value)} TON
          </p>
        </div>
      );
    },
    [tokenFormatter],
  );

  const renderBuybackTooltip = useCallback(
    ({ active, payload, label }: TooltipProps<number, string>) => {
      if (!active || !payload?.length) {
        return null;
      }

      const tonEntry = payload.find((entry) => entry.dataKey === "ton");
      const dctEntry = payload.find((entry) => entry.dataKey === "dct");

      return (
        <div className="rounded-md bg-slate-900/90 px-3 py-2 text-xs text-white shadow-lg shadow-slate-950/50">
          <p className="font-medium text-white/90">{label}</p>
          {tonEntry
            ? (
              <p className="mt-1 text-sky-300">
                {tokenFormatter.format(
                  typeof tonEntry.value === "number"
                    ? tonEntry.value
                    : Number(tonEntry.value ?? 0),
                )} TON burned
              </p>
            )
            : null}
          {dctEntry
            ? (
              <p className="text-rose-300">
                {tokenFormatter.format(
                  typeof dctEntry.value === "number"
                    ? dctEntry.value
                    : Number(dctEntry.value ?? 0),
                )} DCT destroyed
              </p>
            )
            : null}
        </div>
      );
    },
    [tokenFormatter],
  );

  const currencyTickFormatter = useCallback(
    (value: number) => compactCurrencyFormatter.format(value),
    [compactCurrencyFormatter],
  );

  const tonTickFormatter = useCallback(
    (value: number) => tokenFormatter.format(value),
    [tokenFormatter],
  );

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
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Capital composition"
          description="Compare marked equity against contributed capital and profit or loss."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={capitalCompositionData}
              barSize={48}
              margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={currencyTickFormatter}
                tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                formatter={(value: number | string) => {
                  const numericValue = typeof value === "number"
                    ? value
                    : Number(value);
                  return currencyFormatter.format(
                    Number.isFinite(numericValue) ? numericValue : 0,
                  );
                }}
                labelFormatter={() => "Capital composition"}
                contentStyle={{
                  backgroundColor: "rgba(15,23,42,0.92)",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(148,163,184,0.2)",
                  color: "#fff",
                }}
              />
              <Legend
                wrapperStyle={{ color: "rgba(248,250,252,0.75)" }}
                iconType="circle"
              />
              <Bar
                dataKey="Marked equity"
                fill="#60a5fa"
                radius={[6, 6, 0, 0]}
                maxBarSize={56}
              />
              <Bar
                dataKey="Contributed capital"
                fill="#34d399"
                radius={[6, 6, 0, 0]}
                maxBarSize={56}
              />
              <Bar
                dataKey="Profit / loss"
                fill="#f97316"
                radius={[6, 6, 0, 0]}
                maxBarSize={56}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title="Burn allocation"
          description="How TON burn activity is distributed across direct buybacks, operations, and auto-invest."
        >
          {tonAllocationData.length
            ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, bottom: 10 }}>
                  <Tooltip content={renderTonTooltip} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ color: "rgba(248,250,252,0.75)" }}
                  />
                  <Pie
                    data={tonAllocationData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {tonAllocationData.map((item, index) => (
                      <Cell
                        key={`${item.name}-${item.value}`}
                        fill={tonSegmentColors[index % tonSegmentColors.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )
            : (
              <div className="flex h-full items-center justify-center text-sm text-white/70">
                No TON burn allocation data available yet.
              </div>
            )}
        </ChartCard>
        <ChartCard
          title="Recent buyback activity"
          description="Multi-asset burns plotted by execution date."
        >
          {buybackChartData.length
            ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={buybackChartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <CartesianGrid
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={tonTickFormatter}
                    tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip content={renderBuybackTooltip} />
                  <Legend
                    wrapperStyle={{ color: "rgba(248,250,252,0.75)" }}
                    iconType="circle"
                  />
                  <defs>
                    <linearGradient
                      id="tonGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#60a5fa"
                        stopOpacity={0.15}
                      />
                    </linearGradient>
                    <linearGradient
                      id="dctGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#f472b6"
                        stopOpacity={0.75}
                      />
                      <stop
                        offset="95%"
                        stopColor="#f472b6"
                        stopOpacity={0.15}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="ton"
                    name="TON burned"
                    stroke="#60a5fa"
                    fill="url(#tonGradient)"
                    strokeWidth={2}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="dct"
                    name="DCT destroyed"
                    stroke="#f472b6"
                    fill="url(#dctGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )
            : (
              <div className="flex h-full items-center justify-center text-sm text-white/70">
                No historical buyback events recorded yet.
              </div>
            )}
        </ChartCard>
      </div>
    </div>
  );
}
