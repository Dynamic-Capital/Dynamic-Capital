import { createClient } from "../_shared/client.ts";
import {
  bad,
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
  oops,
} from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

const MT5_LOG_TABLE = "mt5_trade_logs";

interface Mt5TradePayload {
  symbol?: string;
  type?: string;
  lots?: number | string;
  volume?: number | string;
  open_price?: number | string;
  price_open?: number | string;
  profit?: number | string;
  ticket?: number | string;
  mt5_ticket_id?: number | string;
  account?: string | number;
  account_login?: string | number;
  open_time?: number | string;
  opened_at?: number | string;
}

type NormalizedTrade = {
  mt5_ticket_id: string;
  symbol: string;
  side: "buy" | "sell";
  volume: number | null;
  open_price: number | null;
  profit: number | null;
  account_login: string | null;
  opened_at: string | null;
  raw_payload: Mt5TradePayload;
};

type SupabaseServiceClient = ReturnType<typeof createClient>;

function getSupabaseServiceClient(): SupabaseServiceClient {
  const injected = (globalThis as {
    __SUPABASE_SERVICE_CLIENT__?: SupabaseServiceClient;
  }).__SUPABASE_SERVICE_CLIENT__;
  return injected ?? createClient("service");
}

function parseNumber(value: number | string | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function parseInteger(value: number | string | undefined): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value).toString();
  }
  if (typeof value === "string" && value.trim() !== "") {
    const maybeInt = value.trim();
    if (/^-?\d+$/.test(maybeInt)) {
      return maybeInt;
    }
  }
  return null;
}

function normalizeSide(value: string | undefined): "buy" | "sell" | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  if (upper === "BUY") return "buy";
  if (upper === "SELL") return "sell";
  return null;
}

function normalizeAccount(value: string | number | undefined): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value).toString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return null;
}

function normalizeOpenedAt(value: number | string | undefined): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value <= 0) return null;
    return new Date(Math.trunc(value) * 1000).toISOString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      if (numeric <= 0) return null;
      return new Date(Math.trunc(numeric) * 1000).toISOString();
    }
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return null;
}

function sanitizeRecord(record: Partial<NormalizedTrade>): NormalizedTrade {
  const {
    mt5_ticket_id,
    symbol,
    side,
    volume = null,
    open_price = null,
    profit = null,
    account_login = null,
    opened_at = null,
    raw_payload = {},
  } = record;

  if (!mt5_ticket_id) {
    throw new Error("mt5_ticket_id is required");
  }
  if (!symbol) {
    throw new Error("symbol is required");
  }
  if (!side) {
    throw new Error("side is required");
  }

  return {
    mt5_ticket_id,
    symbol,
    side,
    volume,
    open_price,
    profit,
    account_login,
    opened_at,
    raw_payload,
  };
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(req, "POST,OPTIONS"),
    });
  }

  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  let payload: Mt5TradePayload;
  try {
    payload = await req.json() as Mt5TradePayload;
  } catch (error) {
    console.error("[mt5] invalid JSON payload", error);
    return bad("Invalid JSON payload", undefined, req);
  }

  const symbol = typeof payload.symbol === "string"
    ? payload.symbol.trim()
    : "";
  const side = normalizeSide(payload.type);
  const volume = parseNumber(payload.volume) ?? parseNumber(payload.lots);
  const openPrice = parseNumber(payload.price_open) ??
    parseNumber(payload.open_price);
  const profit = parseNumber(payload.profit);
  const ticket = parseInteger(payload.mt5_ticket_id ?? payload.ticket);
  const accountLogin = normalizeAccount(
    payload.account ?? payload.account_login,
  );
  const openedAt = normalizeOpenedAt(payload.open_time ?? payload.opened_at);

  if (!symbol) {
    return bad("Missing trade symbol", { symbol }, req);
  }

  if (!side) {
    return bad("Missing or invalid trade side", { side: payload.type }, req);
  }

  if (!ticket) {
    return bad(
      "Missing MT5 ticket identifier",
      { ticket: payload.ticket },
      req,
    );
  }

  const supabase = getSupabaseServiceClient();
  const record = sanitizeRecord({
    mt5_ticket_id: ticket,
    symbol,
    side,
    volume,
    open_price: openPrice,
    profit,
    account_login: accountLogin,
    opened_at: openedAt,
    raw_payload: payload,
  });

  const { error } = await supabase
    .from(MT5_LOG_TABLE)
    .upsert(record, { onConflict: "mt5_ticket_id" });

  if (error) {
    console.error("[mt5] failed to persist trade", error);
    return oops("Failed to persist trade", error, req);
  }

  return jsonResponse(
    { status: "ok", data: record },
    { status: 200 },
    req,
  );
});

export default handler;
