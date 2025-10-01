import { createHash } from "crypto";
import { v5 as uuidv5, validate as uuidValidate } from "uuid";
import { z } from "zod";

const UUID_NAMESPACE = "de4ab7fa-5a93-4e90-9c10-1a4c1be3e8e9";

const numericStringRegex = /^-?\d+(?:\.\d+)?$/;

const rawAlertSchema = z
  .object({
    alert_uuid: z.string().min(1).optional(),
    alert_id: z.union([z.string(), z.number()]).optional(),
    id: z.union([z.string(), z.number()]).optional(),
    symbol: z.string().optional(),
    ticker: z.string().optional(),
    exchange: z.string().optional(),
    market: z.string().optional(),
    price: z.union([z.string(), z.number()]).optional(),
    time: z.union([z.string(), z.number()]).optional(),
    timestamp: z.union([z.string(), z.number()]).optional(),
    triggered_at: z.union([z.string(), z.number()]).optional(),
    strategy: z
      .object({
        order: z
          .object({
            price: z.union([z.string(), z.number()]).optional(),
            action: z.string().optional(),
            comment: z.string().optional(),
            timestamp: z.union([z.string(), z.number()]).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .passthrough();

export type RawAlertPayload = z.infer<typeof rawAlertSchema>;

export interface NormalizedAlert {
  alertUuid: string;
  symbol: string;
  exchange: string | null;
  triggeredAt: string;
  price: number | null;
  action: string | null;
  comment: string | null;
  rawPayload: RawAlertPayload;
}

export function validateAndNormalizeAlert(payload: unknown): NormalizedAlert {
  const parsed = rawAlertSchema.parse(payload);

  const identifier = firstDefined([
    parsed.alert_uuid,
    parsed.alert_id,
    parsed.id,
  ]);

  if (!identifier) {
    throw new Error("Alert payload must include an identifier.");
  }

  const alertUuid = normalizeIdentifier(identifier);
  const { symbol, exchange } = normalizeSymbol(
    firstDefined([
      parsed.symbol,
      parsed.ticker,
      parsed.market,
    ]),
    parsed.exchange,
  );
  const triggeredAt = normalizeTimestamp(
    firstDefined([
      parsed.triggered_at,
      parsed.timestamp,
      parsed.time,
      parsed.strategy?.order?.timestamp,
    ]),
  );
  const price = normalizeNumber(
    firstDefined([
      parsed.price,
      parsed.strategy?.order?.price,
    ]),
  );

  return {
    alertUuid,
    symbol,
    exchange,
    triggeredAt,
    price,
    action: parsed.strategy?.order?.action ?? null,
    comment: parsed.strategy?.order?.comment ?? null,
    rawPayload: parsed,
  };
}

function normalizeIdentifier(identifier: string | number): string {
  const raw = String(identifier).trim();
  if (!raw) {
    throw new Error("Alert payload must include a non-empty identifier.");
  }

  if (uuidValidate(raw)) {
    return raw;
  }

  return uuidv5(hashString(raw), UUID_NAMESPACE);
}

function normalizeSymbol(symbolValue?: string, fallbackExchange?: string): {
  symbol: string;
  exchange: string | null;
} {
  const raw = symbolValue?.trim();
  if (!raw) {
    throw new Error("Alert payload must include a symbol.");
  }

  const collapsed = raw.replace(/\s+/g, "");
  const parts = collapsed.split(":");

  if (parts.length === 1) {
    return {
      symbol: parts[0].toUpperCase(),
      exchange: fallbackExchange ? fallbackExchange.trim().toUpperCase() : null,
    };
  }

  const symbol = parts.pop() ?? "";
  const exchange = parts.join(":");

  return {
    symbol: symbol.toUpperCase(),
    exchange: exchange
      ? exchange.toUpperCase()
      : fallbackExchange
      ? fallbackExchange.trim().toUpperCase()
      : null,
  };
}

function normalizeTimestamp(value?: string | number): string {
  if (value === undefined || value === null || value === "") {
    throw new Error("Alert payload must include a timestamp.");
  }

  const date = toDate(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Alert payload timestamp is invalid.");
  }

  return date.toISOString();
}

function toDate(value: string | number): Date {
  if (typeof value === "number") {
    return value > 1e12 ? new Date(value) : new Date(value * 1000);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return new Date(NaN);
  }

  if (numericStringRegex.test(trimmed)) {
    const numericValue = Number(trimmed);
    return numericValue > 1e12
      ? new Date(numericValue)
      : new Date(numericValue * 1000);
  }

  return new Date(trimmed);
}

function normalizeNumber(value?: string | number): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function firstDefined<T>(values: Array<T | undefined | null>): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
