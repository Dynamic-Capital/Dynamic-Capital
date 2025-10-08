import { withApiMetrics } from "@/observability/server-metrics.ts";
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

const isAllowedClass = (value: string): value is MarketClass =>
  ALLOWED_CLASSES.has(value as MarketClass);

type MarketClass = typeof ALLOWED_CLASSES extends Set<infer T> ? T : never;

type MarketSource = "stooq" | "coingecko" | "awesomeapi";

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

async function fetchStooqQuote(symbol: string): Promise<MarketQuote | null> {
  const url = `${STOOQ_ENDPOINT}?s=${
    encodeURIComponent(symbol)
  }&${STOOQ_QUERY_PARAMS}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Stooq request failed for ${symbol} (${response.status})`);
  }

  const payload = await response.json() as {
    symbols?: Array<Record<string, unknown>>;
  };

  const firstSymbol = payload.symbols?.[0];
  if (!firstSymbol) {
    return null;
  }

  const close = parseNumber(firstSymbol.close);
  const open = parseNumber(firstSymbol.open);
  const high = parseNumber(firstSymbol.high);
  const low = parseNumber(firstSymbol.low);
  const change = close !== undefined && open !== undefined
    ? close - open
    : undefined;
  const changePercent = change !== undefined && open !== undefined && open !== 0
    ? (change / open) * 100
    : undefined;

  const volume = parseNumber(firstSymbol.volume);
  const timestamp = toIsoTimestamp(firstSymbol.date, firstSymbol.time);

  const sourceSymbol = typeof firstSymbol.symbol === "string"
    ? firstSymbol.symbol
    : symbol.toUpperCase();

  return {
    requestSymbol: symbol,
    sourceSymbol,
    source: "stooq",
    last: close,
    change,
    changePercent,
    high,
    low,
    open,
    previousClose: open,
    volume,
    timestamp: timestamp ?? null,
  };
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

async function loadQuotes(
  assetClass: MarketClass,
  symbols: string[],
): Promise<MarketApiResponse> {
  const errors: string[] = [];

  if (assetClass === "crypto") {
    try {
      const quotes = await fetchCoinGeckoQuotes(symbols);
      return { class: assetClass, quotes };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return { class: assetClass, quotes: [], errors };
    }
  }

  const stooqRequests = await Promise.allSettled(
    symbols.map(async (symbol) => {
      try {
        const quote = await fetchStooqQuote(symbol);
        return quote;
      } catch (error) {
        errors.push(
          error instanceof Error
            ? error.message
            : `Unknown error for ${symbol}`,
        );
        return null;
      }
    }),
  );

  const quotes: MarketQuote[] = [];
  for (let index = 0; index < stooqRequests.length; index += 1) {
    const result = stooqRequests[index];
    const requestSymbol = symbols[index];
    if (result.status === "fulfilled" && result.value) {
      quotes.push({ ...result.value, requestSymbol });
    }
  }

  return {
    class: assetClass,
    quotes,
    errors: errors.length > 0 ? errors : undefined,
  };
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
