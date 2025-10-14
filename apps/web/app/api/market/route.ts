import { withApiMetrics } from "@/observability/server-metrics.ts";
import {
  DCT_SYMBOL_CANONICALS,
  fetchDctMarketSnapshot,
} from "@/services/dct-price.ts";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";

export const dynamic = "force-dynamic";

const STOOQ_ENDPOINT = "https://stooq.com/q/l/";
const STOOQ_QUERY_PARAMS = "f=sd2t2ohlcv&h&e=json";
const COINGECKO_ENDPOINT = "https://api.coingecko.com/api/v3/coins/markets";

const ALLOWED_CLASSES = new Set(
  [
    "stocks",
    "commodities",
    "indices",
    "crypto",
  ] as const,
);

const MAX_SYMBOLS_PER_REQUEST = 50;
const CACHE_TTL_MS = 30_000;

const isAllowedClass = (value: string): value is MarketClass =>
  ALLOWED_CLASSES.has(value as MarketClass);

type MarketClass = typeof ALLOWED_CLASSES extends Set<infer T> ? T : never;

type MarketSource = "stooq" | "coingecko" | "awesomeapi" | "dexscreener";

interface MarketQuote {
  requestSymbol: string;
  sourceSymbol: string;
  source: MarketSource;
  name?: string;
  last?: number | null;
  change?: number | null;
  changePercent?: number | null;
  high?: number | null;
  low?: number | null;
  open?: number | null;
  previousClose?: number | null;
  volume?: number | null;
  timestamp?: string | null;
}

interface MarketApiResponse {
  class: MarketClass;
  quotes: MarketQuote[];
  errors?: string[];
}

interface CachedMarketData {
  quotes: MarketQuote[];
  errors?: string[];
}

interface CacheEntry {
  timestamp: number;
  data: CachedMarketData;
}

const normalizeSymbol = (value: string) => value.trim().toLowerCase();

const responseCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<MarketApiResponse>>();

const cloneCachedData = (data: CachedMarketData): CachedMarketData => ({
  quotes: data.quotes.map((quote) => ({ ...quote })),
  errors: data.errors ? [...data.errors] : undefined,
});

const buildCacheKey = (assetClass: MarketClass, symbols: string[]) =>
  `${assetClass}:${symbols.map(normalizeSymbol).sort().join(",")}`;

const canonicalizeSymbol = (symbol: string) =>
  normalizeSymbol(symbol).replace(/[^a-z0-9]+/g, "");

const isDctSymbol = (symbol: string): boolean => {
  const canonical = canonicalizeSymbol(symbol);
  if (!canonical) return false;
  if (DCT_SYMBOL_CANONICALS.has(canonical)) {
    return true;
  }
  return false;
};

const getCachedResponse = (key: string): CachedMarketData | undefined => {
  const entry = responseCache.get(key);
  if (!entry) {
    return undefined;
  }

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    responseCache.delete(key);
    return undefined;
  }

  return cloneCachedData(entry.data);
};

const setCachedResponse = (key: string, data: CachedMarketData) => {
  responseCache.set(key, {
    timestamp: Date.now(),
    data: cloneCachedData(data),
  });
};

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed === "-") {
      return undefined;
    }
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const toIsoTimestamp = (date: unknown, time: unknown): string | undefined => {
  if (typeof date !== "string" || date.length === 0) {
    return undefined;
  }

  const sanitizedTime =
    typeof time === "string" && time.length > 0 && time !== "-"
      ? time
      : "00:00:00";
  const combined = `${date}T${sanitizedTime}Z`;
  const parsed = Date.parse(combined);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return new Date(parsed).toISOString();
};

interface StooqBatchResult {
  quotes: MarketQuote[];
  missingSymbols: string[];
}

async function fetchStooqQuotes(
  requestedSymbols: string[],
): Promise<StooqBatchResult> {
  if (requestedSymbols.length === 0) {
    return { quotes: [], missingSymbols: [] };
  }

  const url = `${STOOQ_ENDPOINT}?s=${
    encodeURIComponent(requestedSymbols.join(","))
  }&${STOOQ_QUERY_PARAMS}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Stooq request failed for ${
        requestedSymbols.join(", ")
      } (${response.status})`,
    );
  }

  const payload = await response.json() as {
    symbols?: Array<Record<string, unknown>>;
  };

  const normalizedLookup = new Map<string, string>();
  const canonicalLookup = new Map<string, string>();
  for (const symbol of requestedSymbols) {
    const normalized = normalizeSymbol(symbol);
    if (!normalizedLookup.has(normalized)) {
      normalizedLookup.set(normalized, symbol);
    }
    const canonical = canonicalizeSymbol(symbol);
    if (!canonicalLookup.has(canonical)) {
      canonicalLookup.set(canonical, symbol);
    }
  }

  const quotes: MarketQuote[] = [];
  const matched = new Set<string>();

  for (const item of payload.symbols ?? []) {
    const sourceSymbol = typeof item.symbol === "string"
      ? item.symbol
      : undefined;
    if (!sourceSymbol) {
      continue;
    }

    const normalizedSource = normalizeSymbol(sourceSymbol);
    const canonicalSource = canonicalizeSymbol(sourceSymbol);
    let requestSymbol = normalizedLookup.get(normalizedSource) ??
      canonicalLookup.get(canonicalSource);
    if (!requestSymbol) {
      requestSymbol = requestedSymbols.find((symbol) => {
        const normalized = normalizeSymbol(symbol);
        return !matched.has(normalized);
      }) ?? sourceSymbol;
    }
    const close = parseNumber(item.close);
    const open = parseNumber(item.open);
    const high = parseNumber(item.high);
    const low = parseNumber(item.low);
    const change = close !== undefined && open !== undefined
      ? close - open
      : undefined;
    const changePercent =
      change !== undefined && open !== undefined && open !== 0
        ? (change / open) * 100
        : undefined;
    const volume = parseNumber(item.volume);
    const timestamp = toIsoTimestamp(item.date, item.time);
    const name = typeof item.name === "string" ? item.name : undefined;

    matched.add(normalizeSymbol(requestSymbol));
    quotes.push({
      requestSymbol,
      sourceSymbol,
      source: "stooq",
      name,
      last: close,
      change,
      changePercent,
      high,
      low,
      open,
      previousClose: open,
      volume,
      timestamp: timestamp ?? null,
    });
  }

  const missingSymbols = requestedSymbols.filter((symbol) => {
    const normalized = normalizeSymbol(symbol);
    return !matched.has(normalized);
  });

  return { quotes, missingSymbols };
}

async function fetchCoinGeckoQuotes(
  ids: string[],
): Promise<MarketQuote[]> {
  if (ids.length === 0) {
    return [];
  }

  const url = new URL(COINGECKO_ENDPOINT);
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("price_change_percentage", "1h,24h,7d");

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`CoinGecko request failed (${response.status})`);
  }

  const payload = await response.json() as Array<Record<string, unknown>>;

  return payload.map((item) => {
    const id = typeof item.id === "string" ? item.id : "";
    const symbol = typeof item.symbol === "string"
      ? item.symbol.toUpperCase()
      : id.toUpperCase();
    const name = typeof item.name === "string" ? item.name : symbol;
    const lastUpdated = typeof item.last_updated === "string"
      ? item.last_updated
      : undefined;
    const last = parseNumber(item.current_price);
    const change = parseNumber(item.price_change_24h);
    const changePercent = parseNumber(item.price_change_percentage_24h);
    const high = parseNumber(item.high_24h);
    const low = parseNumber(item.low_24h);
    const previousClose = change !== undefined && last !== undefined
      ? last - change
      : undefined;
    const volume = parseNumber(item.total_volume);

    return {
      requestSymbol: id,
      sourceSymbol: symbol,
      source: "coingecko",
      name,
      last,
      change,
      changePercent,
      high,
      low,
      previousClose,
      volume,
      timestamp: lastUpdated ?? null,
    } satisfies MarketQuote;
  });
}

const normaliseErrorMessage = (reason: unknown): string => {
  if (reason instanceof Error) {
    return reason.message;
  }
  if (typeof reason === "string" && reason.trim()) {
    return reason.trim();
  }
  return "Unknown error";
};

async function fetchCryptoQuotes(symbols: string[]): Promise<CachedMarketData> {
  const quotes: MarketQuote[] = [];
  const errors: string[] = [];

  const dctSymbols: string[] = [];
  const otherSymbols: string[] = [];

  for (const symbol of symbols) {
    if (isDctSymbol(symbol)) {
      dctSymbols.push(symbol);
    } else {
      otherSymbols.push(symbol);
    }
  }

  const tasks: Array<Promise<void>> = [];

  if (dctSymbols.length > 0) {
    tasks.push((async () => {
      try {
        const snapshot = await fetchDctMarketSnapshot();
        const dctQuotes = dctSymbols.map<MarketQuote>((requestSymbol) => ({
          requestSymbol,
          sourceSymbol: snapshot.sourceSymbol,
          source: "dexscreener",
          name: snapshot.name,
          last: snapshot.price,
          change: snapshot.change,
          changePercent: snapshot.changePercent,
          high: null,
          low: null,
          open: null,
          previousClose: snapshot.previousClose,
          volume: snapshot.volume24h,
          timestamp: snapshot.timestamp,
        }));
        quotes.push(...dctQuotes);
      } catch (error) {
        errors.push(
          `DCT market data unavailable: ${normaliseErrorMessage(error)}`,
        );
      }
    })());
  }

  if (otherSymbols.length > 0) {
    tasks.push((async () => {
      try {
        const cgQuotes = await fetchCoinGeckoQuotes(otherSymbols);
        quotes.push(...cgQuotes);
      } catch (error) {
        errors.push(normaliseErrorMessage(error));
      }
    })());
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  return {
    quotes,
    errors: errors.length > 0 ? errors : undefined,
  } satisfies CachedMarketData;
}

async function loadQuotes(
  assetClass: MarketClass,
  symbols: string[],
): Promise<MarketApiResponse> {
  const trimmedSymbols = symbols.map((symbol) => symbol.trim()).filter(Boolean);
  const uniqueSymbols: string[] = [];
  const seen = new Set<string>();

  for (const symbol of trimmedSymbols) {
    const normalized = normalizeSymbol(symbol);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueSymbols.push(symbol);
    }
  }

  if (uniqueSymbols.length === 0) {
    return {
      class: assetClass,
      quotes: [],
      errors: ["No valid symbols supplied"],
    } satisfies MarketApiResponse;
  }

  const cacheKey = buildCacheKey(assetClass, uniqueSymbols);
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return { class: assetClass, ...cached } satisfies MarketApiResponse;
  }

  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const loader = (async (): Promise<MarketApiResponse> => {
    const errors: string[] = [];

    if (assetClass === "crypto") {
      const cryptoData = await fetchCryptoQuotes(uniqueSymbols);
      setCachedResponse(cacheKey, cryptoData);
      return {
        class: assetClass,
        quotes: cryptoData.quotes,
        errors: cryptoData.errors,
      } satisfies MarketApiResponse;
    }

    try {
      const { quotes, missingSymbols } = await fetchStooqQuotes(uniqueSymbols);
      if (missingSymbols.length > 0) {
        errors.push(
          `No market data for ${
            missingSymbols.map((symbol) => symbol.toUpperCase()).join(", ")
          }`,
        );
      }

      const response = {
        class: assetClass,
        quotes,
        errors: errors.length > 0 ? errors : undefined,
      } satisfies MarketApiResponse;
      setCachedResponse(cacheKey, {
        quotes,
        errors: errors.length > 0 ? [...errors] : undefined,
      });
      return response;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      const response = {
        class: assetClass,
        quotes: [],
        errors,
      } satisfies MarketApiResponse;
      return response;
    }
  })();

  inFlightRequests.set(cacheKey, loader);

  try {
    return await loader;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

export async function GET(req: Request) {
  return withApiMetrics(req, "/api/market", async () => {
    const url = new URL(req.url);
    const assetClassParam = url.searchParams.get("class");
    if (!assetClassParam) {
      return jsonResponse(
        { error: "Missing class parameter" },
        { status: 400 },
        req,
      );
    }

    if (!isAllowedClass(assetClassParam)) {
      return jsonResponse(
        { error: "Unsupported class parameter" },
        { status: 400 },
        req,
      );
    }

    const symbolsParam = url.searchParams.get("symbols");
    const symbols = symbolsParam
      ? symbolsParam.split(",").map((value) => value.trim()).filter(Boolean)
      : [];

    if (symbols.length === 0) {
      return jsonResponse(
        { error: "At least one symbol is required" },
        { status: 400 },
        req,
      );
    }

    const uniqueSymbolCount = new Set(
      symbols.map((symbol) => normalizeSymbol(symbol)),
    ).size;

    if (uniqueSymbolCount > MAX_SYMBOLS_PER_REQUEST) {
      return jsonResponse(
        {
          error: `Too many symbols requested (max ${MAX_SYMBOLS_PER_REQUEST})`,
        },
        { status: 400 },
        req,
      );
    }

    const result = await loadQuotes(assetClassParam, symbols);
    return jsonResponse(result, {}, req);
  });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = (req: Request) => methodNotAllowed(req);
export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
