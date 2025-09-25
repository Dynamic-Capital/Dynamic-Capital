"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Coins, PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/miniapp/Skeleton";

type FundMetrics = {
  supplyAllocation: { name: string; value: number }[];
  roiHistory: { epoch: string; roi: number }[];
  totals: {
    circulatingSupply: number;
    treasuryHoldings: number;
    totalBurned: number;
    activeInvestors: number;
    activeWallets: number;
    currentEpochRewards: number;
    operationsTon: number;
    autoInvestTon: number;
    burnTon: number;
    tonPaid: number;
  };
  changes: {
    circulatingPct: number | null;
    burnSharePct: number | null;
    investorParticipationPct: number | null;
    rewardsRoi: number | null;
  };
};

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
];

const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const integerFormatter = new Intl.NumberFormat("en-US");

function formatSignedPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatCompact(value: number | null | undefined, suffix: string) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${numberFormatter.format(value)} ${suffix}`;
}

export default function FundTransparencyTab() {
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState<FundMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      setLoading(true);
      try {
        const response = await fetch("/api/fund-metrics");
        const text = await response.text();
        let payload: unknown;
        try {
          payload = text ? JSON.parse(text) : null;
        } catch {
          payload = null;
        }

        if (!response.ok) {
          const message = (payload as { error?: string } | null)?.error ??
            text ??
            "Unable to load fund metrics";
          throw new Error(message);
        }

        if (cancelled) return;

        const data = (payload as { data?: FundMetrics } | null)?.data ?? null;
        setMetrics(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setMetrics(null);
        setError(
          err instanceof Error ? err.message : "Unable to load fund metrics",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMetrics();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    if (!metrics) {
      return [] as Array<{ label: string; value: string; helper: string }>;
    }

    const { totals, changes } = metrics;
    return [
      {
        label: "Circulating Supply",
        value: formatCompact(totals.circulatingSupply, "DCT"),
        helper: changes.circulatingPct !== null
          ? `${formatSignedPercent(changes.circulatingPct)} vs prior cycle`
          : "Awaiting first cycle",
      },
      {
        label: "Total Burned",
        value: formatCompact(totals.totalBurned, "DCT"),
        helper: changes.burnSharePct !== null
          ? `${changes.burnSharePct.toFixed(1)}% of purchased supply burned`
          : "Burn hook idle",
      },
      {
        label: "Active Investors",
        value: Number.isFinite(totals.activeInvestors)
          ? `${integerFormatter.format(totals.activeInvestors)} wallets`
          : "—",
        helper: totals.activeWallets > 0
          ? `${integerFormatter.format(totals.activeWallets)} connected wallets`
          : "Connect a wallet to join",
      },
      {
        label: "Current Epoch Rewards",
        value: formatCompact(totals.currentEpochRewards, "DCT"),
        helper: changes.rewardsRoi !== null
          ? `Avg ROI ${changes.rewardsRoi.toFixed(2)}%`
          : "Awaiting distribution",
      },
    ];
  }, [metrics]);

  const supplyData = useMemo(
    () => metrics?.supplyAllocation ?? [],
    [metrics],
  );
  const totalSupply = useMemo(
    () => supplyData.reduce((acc, entry) => acc + entry.value, 0),
    [supplyData],
  );
  const hasSupplyData = supplyData.some((entry) => entry.value > 0);

  const roiData = useMemo(() => metrics?.roiHistory ?? [], [metrics]);
  const hasRoiData = roiData.some((entry) => Number.isFinite(entry.roi));

  return (
    <>
      <section className="card" style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              background: "rgba(48, 194, 242, 0.12)",
              color: "var(--tg-accent)",
            }}
          >
            <Coins size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Fund transparency</h2>
            <p className="muted" style={{ margin: 0 }}>
              Tokenomics snapshot refreshed with each trading epoch.
            </p>
          </div>
        </header>

        {error && !loading && (
          <p
            role="status"
            className="muted"
            style={{ margin: 0, fontSize: 12 }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          }}
        >
          {loading && !metrics
            ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`stat-skeleton-${index}`}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <Skeleton h={48} />
              </div>
            ))
            : stats.map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  display: "grid",
                  gap: 6,
                }}
              >
                <span className="muted" style={{ fontSize: 12 }}>
                  {stat.label}
                </span>
                <strong style={{ fontSize: 18 }}>{stat.value}</strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  {stat.helper}
                </span>
              </div>
            ))}
        </div>
      </section>

      <section className="card" style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              background: "rgba(48, 194, 242, 0.12)",
              color: "var(--tg-accent)",
            }}
          >
            <PieChartIcon size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Supply allocation</h2>
            <p className="muted" style={{ margin: 0 }}>
              Circulating vs. treasury reserves and deflationary burn.
            </p>
          </div>
        </header>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ width: "100%", height: 220 }}>
            {!mounted || (loading && !metrics)
              ? <Skeleton h={220} />
              : hasSupplyData
              ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={supplyData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      stroke="none"
                      paddingAngle={4}
                    >
                      {supplyData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.06)" }}
                      contentStyle={{
                        background: "rgba(14,18,26,0.92)",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "var(--brand-text)",
                        boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
                      }}
                      formatter={(value: number, _name, entry) => [
                        `${numberFormatter.format(value)} DCT`,
                        entry?.name ?? "",
                      ]}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              )
              : (
                <div
                  style={{
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--muted-fg)",
                    fontSize: 13,
                  }}
                >
                  No supply allocation data yet.
                </div>
              )}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {supplyData.map((entry, index) => {
              const percent = totalSupply > 0
                ? ((entry.value / totalSupply) * 100).toFixed(1)
                : null;
              return (
                <div
                  key={entry.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 6,
                        background: chartColors[index % chartColors.length],
                      }}
                    />
                    <div>
                      <strong>{entry.name}</strong>
                      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                        {formatCompact(entry.value, "DCT")}{" "}
                        {percent !== null ? `(${percent}%)` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="card" style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              background: "rgba(48, 194, 242, 0.12)",
              color: "var(--tg-accent)",
            }}
          >
            <TrendingUp size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Fund ROI trend</h2>
            <p className="muted" style={{ margin: 0 }}>
              Net performance per epoch after execution and fees.
            </p>
          </div>
        </header>

        <div style={{ width: "100%", height: 240 }}>
          {!mounted || (loading && !metrics)
            ? <Skeleton h={240} />
            : hasRoiData
            ? (
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart
                  data={roiData}
                  margin={{ top: 8, right: 16, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="roiGradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--chart-2))"
                        stopOpacity={1}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--chart-3))"
                        stopOpacity={0.9}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="6 8"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="epoch"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(255,255,255,0.64)", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tick={{ fill: "rgba(255,255,255,0.64)", fontSize: 12 }}
                    tickFormatter={(value: number) => `${value.toFixed(1)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(14,18,26,0.92)",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "var(--brand-text)",
                      boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
                    }}
                    formatter={(
                      value: number,
                    ) => [`${value.toFixed(2)}%`, "ROI"]}
                    labelFormatter={(label) => `Epoch ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="roi"
                    stroke="url(#roiGradient)"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      strokeWidth: 1.5,
                      stroke: "rgba(255,255,255,0.9)",
                    }}
                    activeDot={{ r: 6 }}
                  />
                </ReLineChart>
              </ResponsiveContainer>
            )
            : (
              <div
                style={{
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--muted-fg)",
                  fontSize: 13,
                }}
              >
                ROI history will appear after the first epoch closes.
              </div>
            )}
        </div>

        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          ROI values capture compounded performance streamed to stakers each
          epoch.
        </p>
      </section>
    </>
  );
}
