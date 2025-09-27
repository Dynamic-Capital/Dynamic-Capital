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
const MT5_HEARTBEAT_TABLE = "mt5_account_heartbeats";

const TELEGRAM_CHAT_ENV = "TELEGRAM_TRADES_CHAT_ID";
const TELEGRAM_TEMPLATE_ENV = "TELEGRAM_TRADES_TEMPLATE";

const DEFAULT_TRADE_TEMPLATE =
  "⚡️ MT5 {{side}} {{symbol}} {{volume}} lots @ {{open_price}} (PnL {{profit}})";

type HeartbeatPayload = {
  status?: string;
  account?: string | number;
  account_login?: string | number;
  balance?: number | string;
  equity?: number | string;
  free_margin?: number | string;
  margin_free?: number | string;
};

type NormalizedHeartbeat = {
  account_login: string;
  status: string;
  balance: number | null;
  equity: number | null;
  free_margin: number | null;
  raw_payload: HeartbeatPayload;
};

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
  status?: string;
  source?: string;
  balance?: number | string;
  equity?: number | string;
  margin_free?: number | string;
  free_margin?: number | string;
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
  source: string;
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
    source = "mt5",
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
    source,
    raw_payload,
  };
}

function sanitizeHeartbeat(
  heartbeat: Partial<NormalizedHeartbeat>,
): NormalizedHeartbeat {
  const {
    account_login,
    status = "alive",
    balance = null,
    equity = null,
    free_margin = null,
    raw_payload = {},
  } = heartbeat;

  if (!account_login) {
    throw new Error("account_login is required for heartbeat");
  }

  return {
    account_login,
    status,
    balance,
    equity,
    free_margin,
    raw_payload,
  };
}

function parseMaybeNumber(value: number | string | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isHeartbeatPayload(payload: Mt5TradePayload | HeartbeatPayload) {
  if (!payload) return false;
  const status = typeof payload.status === "string"
    ? payload.status.trim().toLowerCase()
    : "";
  return status === "alive";
}

async function persistHeartbeat(
  supabase: SupabaseServiceClient,
  payload: HeartbeatPayload,
  req: Request,
): Promise<Response> {
  const account = normalizeAccount(payload.account ?? payload.account_login);
  if (!account) {
    return bad("Missing account identifier", { account: payload.account }, req);
  }

  const record = sanitizeHeartbeat({
    account_login: account,
    status: typeof payload.status === "string"
      ? payload.status.trim()
      : "alive",
    balance: parseMaybeNumber(payload.balance),
    equity: parseMaybeNumber(payload.equity),
    free_margin: parseMaybeNumber(payload.free_margin ?? payload.margin_free),
    raw_payload: payload,
  });

  const { error } = await supabase.from(MT5_HEARTBEAT_TABLE).insert(record);
  if (error) {
    console.error("[mt5] failed to persist heartbeat", error);
    return oops("Failed to persist heartbeat", error, req);
  }

  return jsonResponse({ status: "ok", data: record }, { status: 200 }, req);
}

function asDisplayNumber(value: number | null | undefined, digits = 2) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return value.toFixed(digits);
}

function renderTelegramTemplate(
  template: string,
  record: NormalizedTrade,
) {
  const replacements: Record<string, string> = {
    symbol: record.symbol,
    side: record.side.toUpperCase(),
    volume: asDisplayNumber(record.volume ?? undefined),
    open_price: asDisplayNumber(record.open_price ?? undefined, 3),
    profit: asDisplayNumber(record.profit ?? undefined),
    account: record.account_login ?? "unknown",
    ticket: record.mt5_ticket_id,
    source: record.source,
  };

  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => replacements[key] ?? `{{${key}}}`,
  );
}

async function notifyTelegram(record: NormalizedTrade) {
  const chatId = Deno.env.get(TELEGRAM_CHAT_ENV);
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!chatId || !token) return;

  const template = Deno.env.get(TELEGRAM_TEMPLATE_ENV) ||
    DEFAULT_TRADE_TEMPLATE;
  const text = renderTelegramTemplate(template, record);

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  });

  const attemptSend = async (attempt: number) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Telegram API responded ${res.status}`);
        }
        return true;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      console.error("[mt5] telegram notification failed", { attempt, error });
      return false;
    }
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const success = await attemptSend(attempt + 1);
    if (success) return;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
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

  const supabase = getSupabaseServiceClient();

  if (isHeartbeatPayload(payload)) {
    return await persistHeartbeat(supabase, payload, req);
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

  const source =
    typeof payload.source === "string" && payload.source.trim() !== ""
      ? payload.source.trim()
      : "mt5";
  const record = sanitizeRecord({
    mt5_ticket_id: ticket,
    symbol,
    side,
    volume,
    open_price: openPrice,
    profit,
    account_login: accountLogin,
    opened_at: openedAt,
    source,
    raw_payload: payload,
  });

  const { error } = await supabase
    .from(MT5_LOG_TABLE)
    .upsert(record, { onConflict: "mt5_ticket_id" });

  if (error) {
    console.error("[mt5] failed to persist trade", error);
    return oops("Failed to persist trade", error, req);
  }

  await notifyTelegram(record);

  return jsonResponse(
    { status: "ok", data: record },
    { status: 200 },
    req,
  );
});

export default handler;
