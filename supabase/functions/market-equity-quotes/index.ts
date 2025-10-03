import {
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
} from "../_shared/http.ts";
import { createLogger } from "../_shared/logger.ts";
import { registerHandler } from "../_shared/serve.ts";

const FUNCTION_NAME = "market-equity-quotes";
const PROVIDER_ENDPOINT = "https://www.alphavantage.co/query";
const PROVIDER_FUNCTION = "GLOBAL_QUOTE";
const API_KEY_ENV_VARS = [
  "ALPHA_VANTAGE_API_KEY",
  "DCT_ALPHA_VANTAGE_API_KEY",
  "STOCK_FEED_API_KEY",
] as const;

const CACHE_TTL_MS = 30_000;
const MAX_CACHE_SIZE = 256;

interface AlphaVantageQuote {
  "01. symbol"?: string;
  "03. high"?: string;
  "04. low"?: string;
  "05. price"?: string;
  "07. latest trading day"?: string;
  "10. change percent"?: string;
}

interface AlphaVantageResponse {
  "Global Quote"?: AlphaVantageQuote;
  Note?: string;
  Information?: string;
}

export type EquityQuote = {
  last: number;
  changePercent: number;
  high: number;
  low: number;
};

type EquityQuoteResult = {
  quote: EquityQuote;
  updatedAt?: string;
};

type CacheEntry = {
  value: EquityQuoteResult | null;
  expiresAt: number;
};

const quoteCache = new Map<string, CacheEntry>();

const pruneExpiredCacheEntries = (now: number) => {
  for (const [symbol, entry] of quoteCache.entries()) {
    if (entry.expiresAt <= now) {
      quoteCache.delete(symbol);
    }
  }
};

const enforceCacheSizeLimit = () => {
  if (quoteCache.size <= MAX_CACHE_SIZE) {
    return;
  }

  const entries = Array.from(quoteCache.entries()).sort(
    (a, b) => a[1].expiresAt - b[1].expiresAt,
  );

  while (quoteCache.size > MAX_CACHE_SIZE && entries.length > 0) {
    const [symbol] = entries.shift()!;
    quoteCache.delete(symbol);
  }
};

const getCachedQuote = (
  symbol: string,
): EquityQuoteResult | null | undefined => {
  const cached = quoteCache.get(symbol);
  if (!cached) {
    return undefined;
  }
  if (cached.expiresAt <= Date.now()) {
    quoteCache.delete(symbol);
    return undefined;
  }
  return cached.value;
};

const setCachedQuote = (symbol: string, value: EquityQuoteResult | null) => {
  pruneExpiredCacheEntries(Date.now());
  const expiresAt = Date.now() + CACHE_TTL_MS;
  quoteCache.set(symbol, { value, expiresAt });
  enforceCacheSizeLimit();
};

const parseSymbols = (value: string | null): string[] => {
  if (!value) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .split(",")
        .map((token) => token.trim().toUpperCase())
        .filter((token) => token.length > 0),
    ),
  );
};

const resolveApiKey = (): string | null => {
  for (const key of API_KEY_ENV_VARS) {
    const value = Deno.env.get(key)?.trim();
    if (value) {
      return value;
    }
  }
  return null;
};

const parseNumber = (value: string | undefined): number | null => {
  if (!value) return null;
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePercent = (value: string | undefined): number | null => {
  if (!value) return null;
  const sanitized = value.replace(/%/g, "").trim();
  return parseNumber(sanitized);
};

const toQuote = (payload: AlphaVantageQuote): EquityQuoteResult | null => {
  const last = parseNumber(payload["05. price"]);
  const high = parseNumber(payload["03. high"]);
  const low = parseNumber(payload["04. low"]);
  const changePercent = parsePercent(payload["10. change percent"]);

  if (
    last === null ||
    high === null ||
    low === null ||
    changePercent === null
  ) {
    return null;
  }

  return {
    quote: { last, high, low, changePercent },
    updatedAt: payload["07. latest trading day"],
  };
};

const fetchQuote = async (
  symbol: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<EquityQuoteResult | null> => {
  const url = new URL(PROVIDER_ENDPOINT);
  url.searchParams.set("function", PROVIDER_FUNCTION);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Provider request failed (${response.status})`);
  }

  const payload = (await response.json()) as AlphaVantageResponse;

  if (!payload["Global Quote"]) {
    if (payload.Note || payload.Information) {
      throw new Error(payload.Note || payload.Information || "Unknown error");
    }
    return null;
  }

  const parsed = toQuote(payload["Global Quote"] ?? {});
  return parsed;
};

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(req, "GET,OPTIONS"),
        "access-control-max-age": "86400",
      },
    });
  }

  if (req.method !== "GET") {
    return methodNotAllowed(req);
  }

  const logger = createLogger({
    function: FUNCTION_NAME,
    requestId: req.headers.get("sb-request-id") ||
      req.headers.get("x-request-id") ||
      crypto.randomUUID(),
  });

  const symbols = parseSymbols(new URL(req.url).searchParams.get("symbols"));

  if (symbols.length === 0) {
    return jsonResponse(
      { error: "missing_symbols" },
      { status: 400, headers: corsHeaders(req, "GET,OPTIONS") },
    );
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    logger.error("Equity quotes API key is not configured");
    return jsonResponse(
      { error: "provider_not_configured" },
      { status: 500, headers: corsHeaders(req, "GET,OPTIONS") },
    );
  }

  try {
    const quotes: Record<string, EquityQuote> = {};
    let latestTimestamp: string | null = null;

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const cached = getCachedQuote(symbol);
        if (cached !== undefined) {
          return { symbol, result: cached };
        }

        try {
          const fetched = await fetchQuote(symbol, apiKey, req.signal);
          setCachedQuote(symbol, fetched ?? null);
          return { symbol, result: fetched };
        } catch (error) {
          logger.warn(`Failed to fetch quote for ${symbol}`, error);
          return { symbol, result: null };
        }
      }),
    );

    for (const { symbol, result } of results) {
      if (!result) {
        continue;
      }

      quotes[symbol] = result.quote;

      if (result.updatedAt) {
        const existing = latestTimestamp ? Date.parse(latestTimestamp) : 0;
        const candidate = Date.parse(result.updatedAt);
        if (!Number.isNaN(candidate) && candidate > existing) {
          latestTimestamp = new Date(candidate).toISOString();
        }
      }
    }

    return jsonResponse(
      { data: quotes, meta: { lastUpdated: latestTimestamp } },
      { status: 200, headers: corsHeaders(req, "GET,OPTIONS") },
    );
  } catch (error) {
    logger.error("Unhandled error while fetching equity quotes", error);
    return jsonResponse(
      { error: "unexpected_error" },
      { status: 500, headers: corsHeaders(req, "GET,OPTIONS") },
    );
  }
});
