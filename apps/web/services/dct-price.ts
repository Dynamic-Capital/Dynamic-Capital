import {
  TON_MAINNET_DEDUST_DCT_TON_POOL,
  TON_MAINNET_JETTON_MASTER,
  TON_MAINNET_STONFI_DCT_TON_POOL,
  TON_MAINNET_SWAPCOFFEE_DCT_TON_POOL,
} from "@shared/ton/mainnet-addresses.ts";

const canonicalize = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");

export const DCT_SYMBOL_CANONICALS = Object.freeze(
  new Set<string>([
    "dct",
    "dctton",
    "dctusdt",
    "dctusd",
    "tondct",
    "dynamiccapital",
    "dynamiccapitaltoken",
    canonicalize(TON_MAINNET_JETTON_MASTER),
    canonicalize(TON_MAINNET_STONFI_DCT_TON_POOL),
    canonicalize(TON_MAINNET_DEDUST_DCT_TON_POOL),
    canonicalize(TON_MAINNET_SWAPCOFFEE_DCT_TON_POOL),
  ]),
);

const TRACKED_PAIR_ADDRESSES = Object.freeze(
  new Set<string>([
    TON_MAINNET_STONFI_DCT_TON_POOL.toLowerCase(),
    TON_MAINNET_DEDUST_DCT_TON_POOL.toLowerCase(),
    TON_MAINNET_SWAPCOFFEE_DCT_TON_POOL.toLowerCase(),
  ]),
);

const DEX_SCREENER_DCT_ENDPOINT =
  `https://api.dexscreener.com/latest/dex/tokens/${TON_MAINNET_JETTON_MASTER}`;

interface DexScreenerTokenInfo {
  readonly address?: string;
  readonly symbol?: string;
  readonly name?: string;
}

interface DexScreenerPairMetrics {
  readonly h24?: number | string | null;
}

interface DexScreenerPairLiquidity {
  readonly usd?: number | string | null;
}

interface DexScreenerPair {
  readonly pairAddress?: string;
  readonly baseToken?: DexScreenerTokenInfo;
  readonly quoteToken?: DexScreenerTokenInfo;
  readonly priceUsd?: number | string | null;
  readonly priceChange?: DexScreenerPairMetrics;
  readonly volume?: DexScreenerPairMetrics;
  readonly liquidity?: DexScreenerPairLiquidity;
}

interface DexScreenerTokenResponse {
  readonly pairs?: readonly DexScreenerPair[];
}

interface ParsedDexPair {
  readonly price: number;
  readonly changePercent?: number;
  readonly liquidityUsd?: number;
  readonly volumeUsd?: number;
  readonly name?: string;
  readonly symbol?: string;
}

export interface DctMarketSnapshot {
  readonly price: number;
  readonly changePercent: number | null;
  readonly change: number | null;
  readonly previousClose: number | null;
  readonly volume24h: number | null;
  readonly timestamp: string;
  readonly sourceSymbol: string;
  readonly name: string;
}

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "-") {
      return undefined;
    }
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const isTrackedPair = (pair: DexScreenerPair): boolean => {
  const pairAddress = typeof pair.pairAddress === "string"
    ? pair.pairAddress.toLowerCase()
    : "";
  if (pairAddress && TRACKED_PAIR_ADDRESSES.has(pairAddress)) {
    return true;
  }
  const baseAddress = typeof pair.baseToken?.address === "string"
    ? pair.baseToken.address.toLowerCase()
    : "";
  return baseAddress === TON_MAINNET_JETTON_MASTER.toLowerCase();
};

const parseDexPair = (pair: DexScreenerPair): ParsedDexPair | null => {
  const price = coerceNumber(pair.priceUsd);
  if (price === undefined || price <= 0) {
    return null;
  }

  const changePercent = coerceNumber(pair.priceChange?.h24 ?? null);
  const liquidityUsd = coerceNumber(pair.liquidity?.usd ?? null);
  const volumeUsd = coerceNumber(pair.volume?.h24 ?? null);
  const name = typeof pair.baseToken?.name === "string"
    ? pair.baseToken.name
    : undefined;
  const symbol = typeof pair.baseToken?.symbol === "string"
    ? pair.baseToken.symbol
    : undefined;

  return {
    price,
    changePercent,
    liquidityUsd,
    volumeUsd,
    name,
    symbol,
  };
};

const aggregatePairs = (
  pairs: readonly DexScreenerPair[],
): DctMarketSnapshot => {
  const parsedPairs = pairs
    .map(parseDexPair)
    .filter((entry): entry is ParsedDexPair => entry !== null);

  if (parsedPairs.length === 0) {
    throw new Error("Dex Screener did not return usable DCT price data");
  }

  const totalLiquidity = parsedPairs.reduce(
    (sum, entry) => sum + Math.max(0, entry.liquidityUsd ?? 0),
    0,
  );

  let weights = parsedPairs.map((entry) => {
    if (totalLiquidity > 0) {
      const contribution = Math.max(0, entry.liquidityUsd ?? 0) /
        totalLiquidity;
      return Number.isFinite(contribution) ? contribution : 0;
    }
    return 0;
  });

  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum <= 0) {
    const equalWeight = 1 / parsedPairs.length;
    weights = parsedPairs.map(() => equalWeight);
  } else {
    weights = weights.map((weight) => weight / weightSum);
  }

  const price = parsedPairs.reduce(
    (sum, entry, index) => sum + entry.price * weights[index],
    0,
  );

  let changeWeighted = 0;
  let changeWeightTotal = 0;
  parsedPairs.forEach((entry, index) => {
    if (entry.changePercent !== undefined) {
      changeWeighted += entry.changePercent * weights[index];
      changeWeightTotal += weights[index];
    }
  });

  const changePercent = changeWeightTotal > 0
    ? changeWeighted / changeWeightTotal
    : null;

  let change: number | null = null;
  let previousClose: number | null = null;
  if (changePercent !== null) {
    const factor = 1 + changePercent / 100;
    if (Number.isFinite(factor) && factor !== 0) {
      const computedPrevious = price / factor;
      if (Number.isFinite(computedPrevious)) {
        previousClose = computedPrevious;
        change = price - computedPrevious;
      }
    }
  }

  const volumeTotal = parsedPairs.reduce(
    (sum, entry) => sum + Math.max(0, entry.volumeUsd ?? 0),
    0,
  );

  const name = parsedPairs.find((entry) => entry.name)?.name ??
    "Dynamic Capital Token";
  const symbol = parsedPairs.find((entry) => entry.symbol)?.symbol ?? "DCT";

  return {
    price,
    changePercent,
    change,
    previousClose,
    volume24h: volumeTotal > 0 ? volumeTotal : null,
    timestamp: new Date().toISOString(),
    sourceSymbol: symbol,
    name,
  } satisfies DctMarketSnapshot;
};

export async function fetchDctMarketSnapshot(
  fetcher: typeof fetch = fetch,
): Promise<DctMarketSnapshot> {
  const response = await fetcher(DEX_SCREENER_DCT_ENDPOINT, {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Dex Screener request failed (${response.status})`,
    );
  }

  const rawBody = await response.text();
  let payload: DexScreenerTokenResponse;
  try {
    payload = JSON.parse(rawBody) as DexScreenerTokenResponse;
  } catch (error) {
    throw new Error(
      "Dex Screener response was not valid JSON",
      error instanceof Error ? { cause: error } : undefined,
    );
  }

  const pairs = Array.isArray(payload.pairs)
    ? payload.pairs.filter(isTrackedPair)
    : [];

  if (pairs.length === 0) {
    throw new Error("Dex Screener response missing tracked DCT pools");
  }

  return aggregatePairs(pairs);
}

export const __testables = {
  canonicalize,
  coerceNumber,
  parseDexPair,
  aggregatePairs,
  isTrackedPair,
};
