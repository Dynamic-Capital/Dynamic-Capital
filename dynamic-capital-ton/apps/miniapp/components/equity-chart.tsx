"use client";

import type {
  ExnessAccountSummary,
  ExnessEquityPoint,
} from "../lib/exness";

type EquityChartProps = {
  points: ExnessEquityPoint[];
  summary?: ExnessAccountSummary | null;
  loading?: boolean;
  error?: string | null;
  source?: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function buildChartPath(points: ExnessEquityPoint[]): string {
  if (points.length === 0) {
    return "";
  }

  const width = 700;
  const height = 240;
  const minValue = Math.min(...points.map((point) => point.equity));
  const maxValue = Math.max(...points.map((point) => point.equity));
  const range = maxValue - minValue || 1;
  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  return points
    .map((point, index) => {
      const x = index * stepX;
      const y = height - ((point.equity - minValue) / range) * height;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export function EquityChart({
  points,
  summary,
  loading = false,
  error,
  source,
}: EquityChartProps) {
  const path = buildChartPath(points);
  const fillPath = path
    ? `${path} L700,240 L0,240 Z`
    : "";

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-[0_20px_48px_rgba(5,8,16,0.65)]">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-100">Equity curve</h3>
          {source && (
            <span className="rounded-full border border-slate-700/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
              {source === "api" ? "Live" : source === "cache" ? "Cached" : "Sample"}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400">
          Track how desk equity has evolved across the latest trading sessions.
        </p>
      </header>

      {loading ? (
        <div className="flex h-56 items-center justify-center text-sm text-slate-400">
          Fetching equity data…
        </div>
      ) : error ? (
        <div className="flex h-56 items-center justify-center text-sm text-rose-300">
          {error}
        </div>
      ) : (
        <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-slate-900/60 to-slate-950">
          <svg
            viewBox="0 0 700 240"
            role="img"
            aria-label="Equity over time"
            className="h-full w-full"
          >
            <defs>
              <linearGradient id="equityGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g>
              {points.map((point, index) => {
                const x = (index / Math.max(points.length - 1, 1)) * 700;
                return (
                  <text
                    key={point.timestamp}
                    x={x}
                    y={228}
                    className="fill-slate-500 text-[11px]"
                  >
                    {new Date(point.timestamp).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </text>
                );
              })}
            </g>
            {path && (
              <>
                <path
                  d={fillPath}
                  fill="url(#equityGradient)"
                  stroke="none"
                />
                <path
                  d={path}
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}
          </svg>
        </div>
      )}

      {summary && (
        <dl className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4">
            <dt className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Balance
            </dt>
            <dd className="mt-2 text-lg font-semibold text-slate-100">
              {currencyFormatter.format(summary.balance)}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4">
            <dt className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Equity
            </dt>
            <dd className="mt-2 text-lg font-semibold text-slate-100">
              {currencyFormatter.format(summary.equity)}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4">
            <dt className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Free margin
            </dt>
            <dd className="mt-2 text-lg font-semibold text-slate-100">
              {currencyFormatter.format(summary.freeMargin)}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4">
            <dt className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Margin level
            </dt>
            <dd className="mt-2 text-lg font-semibold text-slate-100">
              {numberFormatter.format(summary.marginLevel)}%
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
