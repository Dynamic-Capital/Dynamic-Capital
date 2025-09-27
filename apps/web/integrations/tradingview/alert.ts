export type TradingViewAlertPayload = Record<string, unknown> & {
  alert_uuid?: string;
  alert_id?: string | number;
  id?: string | number;
  symbol?: string;
  ticker?: string;
  market?: string;
  exchange?: string;
  timeframe?: string;
  price?: string | number;
  strategy?: {
    order?: {
      price?: string | number;
      action?: string;
      comment?: string;
      direction?: string;
      type?: string;
    };
  };
  direction?: string;
  order_type?: string;
  triggered_at?: string | number;
  timestamp?: string | number;
  time?: string | number;
  priority?: number | string;
};

export type SignalDirection = "long" | "short" | "flat";

export interface NormalizedTradingSignal {
  alertId: string;
  symbol: string;
  exchange: string | null;
  timeframe: string | null;
  direction: SignalDirection;
  orderType: "market" | "limit" | "stop" | "stop_limit";
  price: number | null;
  triggeredAt: string;
  comment: string | null;
  priority: number;
  raw: TradingViewAlertPayload;
}

function coerceString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }
  return null;
}

function normalizeAlertId(payload: TradingViewAlertPayload): string {
  const identifier = coerceString(
    payload.alert_uuid ?? payload.alert_id ?? payload.id,
  );
  if (!identifier) {
    throw new Error("TradingView alert payload is missing an identifier");
  }
  return identifier;
}

function normalizeSymbol(payload: TradingViewAlertPayload) {
  const baseSymbol = coerceString(
    payload.symbol ?? payload.ticker ?? payload.market,
  );
  if (!baseSymbol) {
    throw new Error("TradingView alert payload is missing a symbol");
  }
  const collapsed = baseSymbol.replace(/\s+/g, "");
  const parts = collapsed.split(":");
  if (parts.length === 1) {
    return {
      symbol: parts[0].toUpperCase(),
      exchange: coerceString(payload.exchange)?.toUpperCase() ?? null,
    };
  }
  const symbol = parts.pop() ?? "";
  const exchange = parts.join(":");
  return {
    symbol: symbol.toUpperCase(),
    exchange: exchange
      ? exchange.toUpperCase()
      : coerceString(payload.exchange)?.toUpperCase() ?? null,
  };
}

function normalizeDirection(payload: TradingViewAlertPayload): SignalDirection {
  const source = coerceString(payload.direction) ??
    coerceString(payload.strategy?.order?.direction) ??
    coerceString(payload.strategy?.order?.action);
  if (!source) return "flat";
  const normalized = source.toLowerCase();
  if (["buy", "long", "call", "bull"].includes(normalized)) return "long";
  if (["sell", "short", "put", "bear"].includes(normalized)) return "short";
  if (["flat", "close", "exit"].includes(normalized)) return "flat";
  return "flat";
}

function normalizeOrderType(
  payload: TradingViewAlertPayload,
): "market" | "limit" | "stop" | "stop_limit" {
  const value = coerceString(payload.order_type) ??
    coerceString(payload.strategy?.order?.type);
  if (!value) return "market";
  switch (value.toLowerCase()) {
    case "limit":
      return "limit";
    case "stop":
      return "stop";
    case "stop_limit":
    case "stop-limit":
      return "stop_limit";
    default:
      return "market";
  }
}

function normalizePrice(payload: TradingViewAlertPayload): number | null {
  const value = payload.price ?? payload.strategy?.order?.price;
  const raw = coerceString(value);
  if (!raw) return null;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeTimestamp(payload: TradingViewAlertPayload): string {
  const value = payload.triggered_at ??
    payload.timestamp ??
    payload.time;
  const raw = coerceString(value);
  if (!raw) return new Date().toISOString();
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    const millis = numeric > 1e12 ? numeric : numeric * 1000;
    const date = new Date(millis);
    return Number.isNaN(date.getTime())
      ? new Date().toISOString()
      : date.toISOString();
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
}

function normalizePriority(payload: TradingViewAlertPayload): number {
  const value = payload.priority;
  const raw = coerceString(value);
  if (!raw) return 0;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function normalizeTradingViewAlert(
  payload: TradingViewAlertPayload,
): NormalizedTradingSignal {
  const alertId = normalizeAlertId(payload);
  const { symbol, exchange } = normalizeSymbol(payload);
  return {
    alertId,
    symbol,
    exchange,
    timeframe: coerceString(payload.timeframe),
    direction: normalizeDirection(payload),
    orderType: normalizeOrderType(payload),
    price: normalizePrice(payload),
    triggeredAt: normalizeTimestamp(payload),
    comment: coerceString(payload.strategy?.order?.comment),
    priority: normalizePriority(payload),
    raw: payload,
  };
}
