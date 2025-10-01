import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "crypto";
import { log } from "../lib/logger.js";
import {
  getSupabaseClient,
  toSupabaseRecord,
  upsertAlert,
} from "../lib/supabase.js";
import { validateAndNormalizeAlert } from "../lib/validation.js";

const SECRET_HEADER = "x-tradingview-secret";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const expectedSecret = process.env.TRADINGVIEW_WEBHOOK_SECRET;

  if (!expectedSecret) {
    log("error", "TradingView webhook secret is not configured.");
    res.status(500).json({ error: "Webhook secret not configured." });
    return;
  }

  const providedSecret = headerValue(req.headers[SECRET_HEADER]);
  if (!providedSecret || !verifySecret(providedSecret, expectedSecret)) {
    log("warn", "Rejected TradingView webhook due to invalid secret.", {
      header: SECRET_HEADER,
    });
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let payload: unknown;

  try {
    payload = await parseJsonBody(req);
  } catch (error) {
    log("error", "Failed to parse TradingView payload.", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(400).json({ error: "Invalid JSON payload." });
    return;
  }

  let normalized;
  try {
    normalized = validateAndNormalizeAlert(payload);
  } catch (error) {
    log("warn", "TradingView payload failed validation.", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(400).json({
      error: error instanceof Error ? error.message : "Invalid payload.",
    });
    return;
  }

  try {
    const client = getSupabaseClient();
    const tableName = process.env.SUPABASE_ALERTS_TABLE ?? "tradingview_alerts";
    const record = toSupabaseRecord(normalized);

    await upsertAlert(client, tableName, record);

    log("info", "TradingView alert processed.", {
      alertUuid: normalized.alertUuid,
      symbol: normalized.symbol,
      tableName,
    });

    res.status(200).json({ status: "ok", alertUuid: normalized.alertUuid });
  } catch (error) {
    log("error", "Failed to persist TradingView alert.", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to persist alert." });
  }
}

async function parseJsonBody(req: VercelRequest): Promise<unknown> {
  if (req.body) {
    if (Buffer.isBuffer(req.body)) {
      return JSON.parse(req.body.toString("utf8"));
    }

    if (typeof req.body === "string") {
      return JSON.parse(req.body);
    }

    return req.body;
  }

  const raw = await readRequestBody(req);

  if (!raw) {
    throw new Error("Request body is empty.");
  }

  return JSON.parse(raw);
}

function readRequestBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      resolve(data);
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
}

function verifySecret(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
