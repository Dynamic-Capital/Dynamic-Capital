import { maybe, optionalEnv } from "./env.ts";

export interface TonRateResult {
  rate: number | null;
  source: string;
  fetchedAt: string;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function fetchTonUsdRate(
  fetchFn: typeof fetch = globalThis.fetch.bind(globalThis),
): Promise<TonRateResult> {
  const override = optionalEnv("TON_USD_OVERRIDE");
  if (override) {
    const parsed = parseNumber(override);
    if (parsed && parsed > 0) {
      return {
        rate: parsed,
        source: "env:TON_USD_OVERRIDE",
        fetchedAt: new Date().toISOString(),
      };
    }
  }

  try {
    const tonApiToken = maybe("TON_API") ??
      maybe("TON_API_KEY") ??
      maybe("TON_API_TOKEN");
    const headers: Record<string, string> = { accept: "application/json" };

    if (tonApiToken) {
      const normalized = tonApiToken.startsWith("Bearer ") ||
          tonApiToken.startsWith("bearer ")
        ? tonApiToken
        : `Bearer ${tonApiToken}`;
      headers.Authorization = normalized;
    }

    const response = await fetchFn(
      "https://tonapi.io/v2/rates?tokens=ton",
      { headers },
    );
    if (!response.ok) {
      throw new Error(`tonapi returned ${response.status}`);
    }
    const payload = await response.json();
    const rate = parseNumber(
      payload?.rates?.TON?.prices?.USD ?? payload?.rates?.ton?.prices?.usd,
    );
    if (rate && rate > 0) {
      return {
        rate,
        source: "tonapi",
        fetchedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.warn("Failed to fetch TON/USD rate", error);
  }

  return {
    rate: null,
    source: "unavailable",
    fetchedAt: new Date().toISOString(),
  };
}

export function resolveDisplayPrice(
  basePrice: number,
  dynamicPrice: number | null,
): { price: number; dynamicApplied: boolean } {
  if (dynamicPrice && dynamicPrice > 0) {
    return { price: Number(dynamicPrice.toFixed(2)), dynamicApplied: true };
  }
  return { price: Number(basePrice.toFixed(2)), dynamicApplied: false };
}

export function calculateTonAmount(
  priceUsdt: number,
  tonRate: number | null,
): number | null {
  if (!tonRate || tonRate <= 0) return null;
  return Number((priceUsdt / tonRate).toFixed(6));
}

export function calculateDctAmount(priceUsdt: number): number {
  return Number(priceUsdt.toFixed(2));
}

export function diffPercent(
  current: number,
  previous: number | null,
): number | null {
  if (!previous || previous <= 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}
