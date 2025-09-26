import { getServiceClient } from "../_shared/client.ts";
import {
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
} from "../_shared/http.ts";
import { createLogger } from "../_shared/logger.ts";
import { registerHandler } from "../_shared/serve.ts";

const FUNCTION_NAME = "market-movers-feed";
const DEFAULT_LIMIT = 32;
const MAX_LIMIT = 64;

type MarketMoverRow = {
  symbol: string;
  display: string;
  score: number | null;
  classification: string;
  updated_at: string;
};

type MarketMover = {
  symbol: string;
  display: string;
  score: number;
  classification: string;
  updated_at: string;
};

function parseLimit(value: string | null): number {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

function toMarketMover(row: MarketMoverRow): MarketMover | null {
  if (!row.symbol || !row.display) {
    return null;
  }
  if (row.score === null || Number.isNaN(row.score)) {
    return null;
  }
  const updatedAt = row.updated_at ?? new Date().toISOString();
  return {
    symbol: row.symbol,
    display: row.display,
    score: Number(row.score),
    classification: row.classification ?? "Neutral",
    updated_at: updatedAt,
  };
}

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

  try {
    const url = new URL(req.url);
    const limit = parseLimit(url.searchParams.get("limit"));

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("market_movers")
      .select("symbol, display, score, classification, updated_at")
      .order("score", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("Failed to fetch market movers", error);
      return jsonResponse({ error: "failed_to_fetch_market_movers" }, {
        status: 500,
        headers: corsHeaders(req, "GET,OPTIONS"),
      });
    }

    const payload = (data ?? [])
      .map(toMarketMover)
      .filter((row): row is MarketMover => row !== null);

    return jsonResponse({ data: payload }, {
      status: 200,
      headers: corsHeaders(req, "GET,OPTIONS"),
    });
  } catch (error) {
    logger.error("Unhandled error in market-movers-feed", error);
    return jsonResponse({ error: "unexpected_error" }, {
      status: 500,
      headers: corsHeaders(req, "GET,OPTIONS"),
    });
  }
});
