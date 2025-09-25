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

const supplyAllocation: { name: string; value: number }[] = [
  { name: "Users", value: 6_200_000 },
  { name: "Treasury", value: 2_800_000 },
  { name: "Burn", value: 1_000_000 },
];

const roiHistory: { epoch: string; roi: number }[] = [
  { epoch: "E1", roi: 4.3 },
  { epoch: "E2", roi: 4.9 },
  { epoch: "E3", roi: 5.6 },
  { epoch: "E4", roi: 6.1 },
  { epoch: "E5", roi: 6.6 },
  { epoch: "E6", roi: 6.9 },
  { epoch: "E7", roi: 7.4 },
  { epoch: "E8", roi: 7.8 },
];

const stats = [
  {
    label: "Circulating Supply",
    value: "6.2M DCAP",
    helper: "+2.4% vs last epoch",
  },
  {
    label: "Total Burned",
    value: "1.0M DCAP",
    helper: "16% of max supply removed",
  },
  {
    label: "Active Investors",
    value: "18,450 wallets",
    helper: "Growth +640 this week",
  },
  {
    label: "Current Epoch Rewards",
    value: "82,500 USDC",
    helper: "Streaming over 7 days",
  },
] as const;

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
];

const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export default function FundTransparencyTab() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalSupply = useMemo(
    () => supplyAllocation.reduce((acc, entry) => acc + entry.value, 0),
    [],
  );

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

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          }}
        >
          {stats.map((stat) => (
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
            {mounted
              ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={supplyAllocation}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      stroke="none"
                      paddingAngle={4}
                    >
                      {supplyAllocation.map((entry, index) => (
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
                        `${numberFormatter.format(value)} DCAP`,
                        entry?.name ?? "",
                      ]}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              )
              : <Skeleton h={220} />}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {supplyAllocation.map((entry, index) => {
              const percent = Math.round((entry.value / totalSupply) * 1000) /
                10;
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
                        {numberFormatter.format(entry.value)} ({percent}%)
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
          {mounted
            ? (
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart
                  data={roiHistory}
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
            : <Skeleton h={240} />}
        </div>

        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          ROI values capture compounded performance streamed to stakers each
          epoch.
        </p>
      </section>
    </>
  );
}
