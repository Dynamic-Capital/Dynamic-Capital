import type {
  StrengthMeterEntry,
  VolatilityMeterEntry,
} from "./MarketSnapshotPrimitives";
import type { SnapshotTone } from "./MarketSnapshotPrimitives";
import type { LiveMarketQuote } from "./useLiveMarketQuotes";

export const determineTone = (index: number, total: number): SnapshotTone => {
  if (total <= 0) {
    return "balanced";
  }

  const strongCutoff = Math.max(1, Math.ceil(total / 3));
  const softCutoff = Math.max(1, Math.ceil(total / 3));

  if (index < strongCutoff) {
    return "strong";
  }
  if (index >= total - softCutoff) {
    return "soft";
  }
  return "balanced";
};

export const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0.00%";
  }
  const formatted = Math.abs(value).toFixed(2);
  if (value > 0) {
    return `+${formatted}%`;
  }
  if (value < 0) {
    return `-${formatted}%`;
  }
  return `${formatted}%`;
};

export const formatUnsignedPercent = (
  value: number | null | undefined,
): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0.00%";
  }
  return `${Math.abs(value).toFixed(2)}%`;
};

export const formatNumber = (
  value: number | null | undefined,
  { digits = 2, prefix = "", suffix = "" }: {
    digits?: number;
    prefix?: string;
    suffix?: string;
  } = {},
): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return `${prefix}${value.toFixed(digits)}${suffix}`;
};

export const computeRangePercent = (
  quote?: LiveMarketQuote,
): number | undefined => {
  if (!quote) {
    return undefined;
  }

  const high = quote.high ?? undefined;
  const low = quote.low ?? undefined;
  const reference = quote.previousClose ?? quote.open ?? quote.last ??
    undefined;

  if (
    high === undefined ||
    low === undefined ||
    reference === undefined ||
    !Number.isFinite(high) ||
    !Number.isFinite(low) ||
    !Number.isFinite(reference) ||
    reference === 0
  ) {
    return undefined;
  }

  const range = Math.abs(high - low);
  if (!Number.isFinite(range) || range === 0) {
    return undefined;
  }

  return (range / Math.abs(reference)) * 100;
};

export const buildFallbackStrength = (
  ids: Array<{ id: string; code: string }>,
): StrengthMeterEntry[] =>
  ids.map((entry, index) => ({
    id: entry.id,
    code: entry.code,
    rank: index + 1,
    summary: "Awaiting live market sync.",
    tone: determineTone(index, ids.length),
  }));

export const buildFallbackVolatility = (
  ids: Array<{ id: string; code: string }>,
): VolatilityMeterEntry[] =>
  ids.map((entry, index) => ({
    id: entry.id,
    code: entry.code,
    rank: index + 1,
    summary: "Awaiting live market sync.",
  }));
