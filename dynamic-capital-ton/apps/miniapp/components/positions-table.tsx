"use client";

import type { ExnessPosition } from "../lib/exness";

type PositionsTableProps = {
  positions: ExnessPosition[];
  loading?: boolean;
  error?: string | null;
  source?: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatVolume(volume: number): string {
  return volume.toFixed(volume >= 10 ? 1 : 2);
}

function formatPrice(price: number): string {
  return price.toFixed(price >= 10 ? 2 : 4);
}

function formatTime(value: string): string {
  const date = new Date(value);
  return `${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} · ${date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function PositionsTable({
  positions,
  loading = false,
  error,
  source,
}: PositionsTableProps) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-[0_20px_48px_rgba(5,8,16,0.65)]">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-100">Open positions</h3>
          {source && (
            <span className="rounded-full border border-slate-700/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
              {source === "api" ? "Live" : source === "cache" ? "Cached" : "Sample"}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400">
          Current MT5 tickets monitored by the Dynamic Capital execution desk.
        </p>
      </header>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">
          Fetching open positions…
        </div>
      ) : error ? (
        <div className="flex h-40 items-center justify-center text-sm text-rose-300">
          {error}
        </div>
      ) : positions.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">
          No open positions right now. Desk is waiting for the next setup.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800/60">
          <table className="min-w-full divide-y divide-slate-800/60 text-sm">
            <thead className="bg-slate-950/70 text-[0.72rem] uppercase tracking-[0.22em] text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Ticket</th>
                <th className="px-4 py-3 text-left">Pair</th>
                <th className="px-4 py-3 text-left">Direction</th>
                <th className="px-4 py-3 text-right">Volume</th>
                <th className="px-4 py-3 text-right">Open</th>
                <th className="px-4 py-3 text-right">Mark</th>
                <th className="px-4 py-3 text-right">P&amp;L</th>
                <th className="px-4 py-3 text-left">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 text-slate-200">
              {positions.map((position) => (
                <tr key={position.ticket}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {position.ticket}
                  </td>
                  <td className="px-4 py-3 font-semibold">{position.symbol}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                        position.direction === "buy"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-rose-500/10 text-rose-300"
                      }`}
                    >
                      {position.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatVolume(position.volume)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-300">
                    {formatPrice(position.openPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-300">
                    {formatPrice(position.currentPrice)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      position.profit >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {currencyFormatter.format(position.profit)}
                  </td>
                  <td className="px-4 py-3 text-left text-xs text-slate-400">
                    {formatTime(position.openTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
