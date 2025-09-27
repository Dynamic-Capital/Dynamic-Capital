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
import { supabase } from "@/integrations/supabase/client";

type FundTransparencyData = {
  supplyAllocation: { name: string; value: number }[];
  stats: {
    label: string;
    value: number;
    unit: string;
    helper: string | null;
  }[];
  roiHistory: { period: string; roi: number }[];
  drawdownHistory: { period: string; drawdown: number }[];
  totals: {
    minted: number;
    treasury: number;
    burned: number;
    circulating: number;
    investorCount: number;
    latestReward: number;
  };
  lastUpdated: string;
};

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
];

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatStatValue(value: number, unit: string): string {
  if (unit === "USDT") {
    return `${currencyFormatter.format(value)} ${unit}`;
  }
  if (unit === "wallets") {
    return `${compactNumber.format(value)} wallets`;
  }
  return `${compactNumber.format(value)} ${unit}`;
}

export default function FundTransparencyTab() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<FundTransparencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const { data: response, error: fnError } = await supabase.functions
          .invoke<{
            data?: FundTransparencyData;
          }>("fund-transparency");

        if (cancelled) return;

        if (fnError) {
          throw fnError;
        }

        setData(response?.data ?? null);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch fund transparency", err);
        if (!cancelled) {
          setError(
            "Unable to load transparency metrics. Please try again later.",
          );
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchMetrics();

    return () => {
      cancelled = true;
    };
  }, []);

  const supplyAllocation = useMemo(
    () => data?.supplyAllocation ?? [],
    [data?.supplyAllocation],
  );
  const roiHistory = useMemo(
    () => data?.roiHistory ?? [],
    [data?.roiHistory],
  );
  const totalSupply = useMemo(
    () => supplyAllocation.reduce((acc, entry) => acc + entry.value, 0),
    [supplyAllocation],
  );

  const chartSupplyData = supplyAllocation.map((entry) => ({
    ...entry,
    value: Number(entry.value.toFixed(2)),
  }));

  const roiChartData = roiHistory.map((entry) => ({
    epoch: entry.period,
    roi: entry.roi,
  }));

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

        {error && (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,0,0,0.2)",
              background: "rgba(255,0,0,0.06)",
              padding: "10px 12px",
              fontSize: 12,
              color: "rgba(255,255,255,0.8)",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} h={88} />
            ))
            : data
            ? data.stats.map((stat) => (
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
                <strong style={{ fontSize: 18 }}>
                  {formatStatValue(stat.value, stat.unit)}
                </strong>
                {stat.helper && (
                  <span className="muted" style={{ fontSize: 12 }}>
                    {stat.helper}
                  </span>
                )}
              </div>
            ))
            : (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  fontSize: 12,
                }}
              >
                Transparency metrics will appear once trading data is available.
              </div>
            )}
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
            {mounted && !loading && chartSupplyData.length > 0
              ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={chartSupplyData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      stroke="none"
                      paddingAngle={4}
                    >
                      {chartSupplyData.map((entry, index) => (
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
                        `${compactNumber.format(value)} DCAP`,
                        entry?.name ?? "",
                      ]}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              )
              : loading
              ? <Skeleton h={220} />
              : (
                <div
                  style={{
                    display: "grid",
                    placeItems: "center",
                    height: "100%",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  No supply data available yet.
                </div>
              )}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {chartSupplyData.length > 0
              ? chartSupplyData.map((entry, index) => {
                const percent = totalSupply > 0
                  ? Math.round((entry.value / totalSupply) * 1000) / 10
                  : 0;
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
                        <p
                          className="muted"
                          style={{ margin: 0, fontSize: 12 }}
                        >
                          {compactNumber.format(entry.value)} ({percent}%)
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
              : loading
              ? Array.from({ length: 3 }).map((_, idx) => (
                <Skeleton key={idx} h={32} />
              ))
              : (
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  Allocation details appear once subscriptions settle.
                </p>
              )}
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
          {mounted && !loading && roiChartData.length > 0
            ? (
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart
                  data={roiChartData}
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
            : loading
            ? <Skeleton h={240} />
            : (
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  height: "100%",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                ROI history will display after the first cycle closes.
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
