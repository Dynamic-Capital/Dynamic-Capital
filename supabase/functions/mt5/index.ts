import { createClient } from "../_shared/client.ts";
import {
  bad,
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
  oops,
} from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

type Mt5TradePayload = {
  symbol?: string;
  type?: string;
  lots?: number | string;
  volume?: number | string;
  open_price?: number | string;
  price_open?: number | string;
  profit?: number | string;
};

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

function normalizeSide(value: string | undefined): "BUY" | "SELL" | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  return upper === "BUY" || upper === "SELL" ? upper : null;
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

  const symbol =
    typeof payload.symbol === "string" && payload.symbol.trim() !== ""
      ? payload.symbol.trim()
      : null;
  const side = normalizeSide(payload.type);
  const qty = parseNumber(payload.volume) ?? parseNumber(payload.lots);
  const price = parseNumber(payload.price_open) ??
    parseNumber(payload.open_price);
  const pnl = parseNumber(payload.profit);

  if (!symbol || !side) {
    return bad("Missing required trade fields", { symbol, side }, req);
  }

  const supabase = createClient("service");
  const insertPayload = {
    symbol,
    side,
    qty,
    price,
    pnl,
    source: "MT5" as const,
  };

  const { error } = await supabase.from("trades").insert(insertPayload);

  if (error) {
    console.error("[mt5] failed to persist trade", error);
    return oops("Failed to persist trade", error, req);
  }

  return jsonResponse(
    { status: "ok", data: insertPayload },
    { status: 200 },
    req,
  );
});

export default handler;
