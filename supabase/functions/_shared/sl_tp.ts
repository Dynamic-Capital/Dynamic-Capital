export type TradeSide = "BUY" | "SELL";

export interface SlTpParams {
  entry: number;
  side: TradeSide;
  volatility: number;
  rr?: number;
  fibonacciRetracement?: number | null;
  fibonacciExtension?: number | null;
  treasuryHealth?: number;
}

export interface SlTpResult {
  sl: number | null;
  tp: number | null;
}

const MIN_TREASURY = 0;
const MAX_TREASURY = 2;
const LOWER_BUFFER = 0.8;
const UPPER_BUFFER = 1.2;

function roundToTwo(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : value;
}

function applyTreasuryScale(treasuryHealth: number | undefined): number {
  const clamped = Math.min(
    MAX_TREASURY,
    Math.max(MIN_TREASURY, treasuryHealth ?? 1),
  );

  if (clamped < LOWER_BUFFER) {
    const ratio = LOWER_BUFFER === 0 ? 0 : clamped / LOWER_BUFFER;
    return 0.6 + 0.5 * ratio;
  }

  if (clamped > UPPER_BUFFER) {
    return 1 + Math.min(0.5, (clamped - UPPER_BUFFER) * 0.5);
  }

  return 1;
}

function blendWithFibonacci(base: number, distance?: number | null): number {
  if (distance === undefined || distance === null) return base;
  return (base * 0.5) + (Math.abs(distance) * 0.5);
}

export function assignStops(params: SlTpParams): SlTpResult {
  const rr = params.rr && params.rr > 0 ? params.rr : 2;
  const side = params.side;

  if (side !== "BUY" && side !== "SELL") {
    return { sl: null, tp: null };
  }

  const price = params.entry;
  const baseline = Math.max(Math.abs(price) * 0.01, params.volatility * 1.5);
  const fibAdjusted = blendWithFibonacci(
    baseline,
    params.fibonacciRetracement !== undefined
      ? price - Number(params.fibonacciRetracement)
      : undefined,
  );

  const risk = Math.max(
    0,
    fibAdjusted * applyTreasuryScale(params.treasuryHealth),
  );
  const rewardBase = risk * rr;
  const reward = blendWithFibonacci(
    rewardBase,
    params.fibonacciExtension !== undefined &&
      params.fibonacciExtension !== null
      ? Number(params.fibonacciExtension) - price
      : undefined,
  );

  if (side === "BUY") {
    return {
      sl: roundToTwo(price - risk),
      tp: roundToTwo(price + reward),
    };
  }

  return {
    sl: roundToTwo(price + risk),
    tp: roundToTwo(price - reward),
  };
}

export function computeVolatility(prices: number[], lookback = 10): number {
  if (prices.length < 2) return 0;
  const window = Math.min(lookback, prices.length - 1);
  let sum = 0;
  for (let i = prices.length - window; i < prices.length; i++) {
    const prev = prices[i - 1];
    const current = prices[i];
    sum += Math.abs(current - prev);
  }
  return sum / window;
}

export function deriveFibonacciAnchors(
  prices: number[],
  side: TradeSide,
): { retracement: number; extension: number } {
  if (prices.length === 0) {
    return { retracement: 0, extension: 0 };
  }

  const window = prices.slice(-20);
  const high = Math.max(...window);
  const low = Math.min(...window);
  const range = high - low || Math.abs(prices[prices.length - 1]) * 0.02;

  if (side === "BUY") {
    return {
      retracement: high - range * 0.786,
      extension: low + range * 1.618,
    };
  }

  return {
    retracement: low + range * 0.786,
    extension: high - range * 1.618,
  };
}
