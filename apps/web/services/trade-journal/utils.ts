import type { TradeJournalRequest } from "./types";

export const tradeJournalRequestDefaults: TradeJournalRequest = {
  sessionDate: "",
  sessionSummary: "",
  objectives: [],
  marketContext: "",
  trades: [],
  riskEvents: [],
  mindsetNotes: [],
  metrics: {},
  environment: {},
};

export function normaliseList(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter((value, index, collection) =>
      value.length > 0 && collection.indexOf(value) === index
    );
}

export function formatPnL(pnl: number): string {
  const sign = pnl >= 0 ? "+" : "-";
  return `${sign}${Math.abs(pnl).toFixed(2)}`;
}

export function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${value.toFixed(0)}%`;
}

export function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sum = values.reduce((total, item) => total + item, 0);
  return sum / values.length;
}

export function toFrequencyMap(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((accumulator, value) => {
    const key = value.trim();
    if (key.length === 0) {
      return accumulator;
    }
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}
