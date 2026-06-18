import { createClient } from "../_shared/client.ts";
import {
  bad,
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
  oops,
  unauth,
} from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

const TABLE = "mt5_risk_adjustments";

const riskSecret = Deno.env.get("MT5_RISK_WEBHOOK_SECRET") ?? "";
const terminalSecret = Deno.env.get("MT5_TERMINAL_KEY") ?? "";

const MAX_ADJUSTMENTS = 20;

type AdjustmentStatus = "pending" | "sent" | "applied" | "failed" | "ignored";

interface AdjustmentPayload {
  id?: string;
  ticket: string | number;
  account?: string | number;
  account_login?: string | number;
  symbol?: string;
  desired_stop_loss?: number | string | null;
  desired_take_profit?: number | string | null;
  trailing_stop_distance?: number | string | null;
  notes?: string;
  metadata?: Record<string, unknown>;
}

type SupabaseClient = ReturnType<typeof createClient>;

function getClient(): SupabaseClient {
  const injected =
    (globalThis as { __SUPABASE_SERVICE_CLIENT__?: SupabaseClient })
      .__SUPABASE_SERVICE_CLIENT__;
  return injected ?? createClient("service");
}

function parseNumberish(
  value: number | string | null | undefined,
): number | null {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseString(value: number | string | undefined): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value).toString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return null;
}

function ensureRiskAuth(req: Request): boolean {
  if (!riskSecret) return false;
  const authHeader = req.headers.get("authorization") ?? "";
  const apiKey = req.headers.get("x-api-key") ?? "";
  return authHeader === `Bearer ${riskSecret}` || apiKey === riskSecret;
}

function ensureTerminalAuth(req: Request): boolean {
  if (!terminalSecret) return false;
  const authHeader = req.headers.get("authorization") ?? "";
  const apiKey = req.headers.get("x-api-key") ?? "";
  return authHeader === `Bearer ${terminalSecret}` || apiKey === terminalSecret;
}

function normaliseAdjustment(payload: AdjustmentPayload) {
  const ticket = parseString(payload.ticket);
  if (!ticket) return null;
  const account = parseString(payload.account ?? payload.account_login);
  const sl = parseNumberish(payload.desired_stop_loss);
  const tp = parseNumberish(payload.desired_take_profit);
  const trailing = parseNumberish(payload.trailing_stop_distance);

  return {
    id: crypto.randomUUID(),
    ticket,
    account_login: account,
    symbol: payload.symbol?.trim() ?? null,
    desired_stop_loss: sl,
    desired_take_profit: tp,
    trailing_stop_distance: trailing,
    status: "pending" as AdjustmentStatus,
    status_message: null,
    notes: payload.notes?.trim() ?? null,
    payload: payload as Record<string, unknown>,
  };
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(req, "GET,POST,PATCH,OPTIONS"),
    });
  }

  if (req.method === "POST") {
    if (!ensureRiskAuth(req)) {
      return unauth("Invalid risk webhook credentials", req);
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch (error) {
      console.error("[mt5-risk] invalid JSON", error);
      return bad("Invalid JSON payload", undefined, req);
    }

    const adjustments = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { adjustments?: unknown }).adjustments)
      ? (payload as { adjustments: unknown[] }).adjustments
      : [payload];

    const records = [] as Array<ReturnType<typeof normaliseAdjustment>>;
    for (const candidate of adjustments) {
      const record = normaliseAdjustment(candidate as AdjustmentPayload);
      if (!record) {
        return bad("Invalid adjustment payload", candidate, req);
      }
      records.push(record);
    }

    const client = getClient();
    const { error, data } = await client.from(TABLE)
      .insert(
        records.map((record) => ({
          id: record.id,
          ticket: record.ticket,
          account_login: record.account_login,
          symbol: record.symbol,
          desired_stop_loss: record.desired_stop_loss,
          desired_take_profit: record.desired_take_profit,
          trailing_stop_distance: record.trailing_stop_distance,
          status: record.status,
          status_message: record.status_message,
          notes: record.notes,
          payload: record.payload,
        })),
        { defaultToNull: true },
      )
      .select("id");

    if (error) {
      console.error("[mt5-risk] failed to persist adjustments", error);
      return oops("Failed to persist adjustments", error, req);
    }

    return jsonResponse(
      {
        status: "queued",
        adjustments: (data ?? records).map((
          entry: Record<string, unknown>,
          idx,
        ) => ({
          id: entry.id ?? records[idx].id,
        })),
      },
      { status: 202 },
      req,
    );
  }

  if (req.method === "GET") {
    if (!ensureTerminalAuth(req)) {
      return unauth("Invalid terminal credentials", req);
    }

    const url = new URL(req.url);
    const account = url.searchParams.get("account");
    const limitParam = url.searchParams.get("limit");
    const limit = Math.max(
      1,
      Math.min(MAX_ADJUSTMENTS, limitParam ? Number(limitParam) : 10),
    );

    const client = getClient();
    const { data, error } = await client.from(TABLE)
      .select(
        "id, ticket, account_login, symbol, desired_stop_loss, desired_take_profit, trailing_stop_distance, payload, notes",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(MAX_ADJUSTMENTS);

    if (error) {
      console.error("[mt5-risk] failed to fetch adjustments", error);
      return oops("Failed to fetch adjustments", error, req);
    }

    const filtered = (data ?? []).filter((row) => {
      if (!account || account.trim() === "") return true;
      return row.account_login === account || row.account_login === null;
    });

    const adjustments = filtered.slice(0, limit).map((row) => ({
      id: row.id,
      ticket: row.ticket,
      account_login: row.account_login,
      symbol: row.symbol,
      desired_stop_loss: row.desired_stop_loss,
      desired_take_profit: row.desired_take_profit,
      trailing_stop_distance: row.trailing_stop_distance,
      notes: row.notes,
      payload: row.payload as Record<string, unknown> | null,
    }));

    const ids = adjustments.map((entry) => entry.id);
    if (ids.length > 0) {
      const { error: updateError } = await client
        .from(TABLE)
        .update({ status: "sent" })
        .in("id", ids);
      if (updateError) {
        console.error(
          "[mt5-risk] failed to mark adjustments sent",
          updateError,
        );
      }
    }

    return jsonResponse({ adjustments }, { status: 200 }, req);
  }

  if (req.method === "PATCH") {
    if (!ensureTerminalAuth(req)) {
      return unauth("Invalid terminal credentials", req);
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch (error) {
      console.error("[mt5-risk] invalid JSON for ack", error);
      return bad("Invalid JSON payload", undefined, req);
    }

    const updates = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { results?: unknown }).results)
      ? (payload as { results: unknown[] }).results
      : [payload];

    const client = getClient();
    for (const update of updates) {
      const entry = update as {
        id?: string;
        status?: string;
        message?: string;
      };
      if (!entry?.id || !entry.status) {
        return bad("Adjustment acknowledgement missing fields", entry, req);
      }
      const status = entry.status.toLowerCase();
      if (!["applied", "failed", "ignored"].includes(status)) {
        return bad("Unsupported status", entry, req);
      }
      const { error } = await client
        .from(TABLE)
        .update({ status, status_message: entry.message ?? null })
        .eq("id", entry.id);
      if (error) {
        console.error("[mt5-risk] failed to update status", { entry, error });
        return oops("Failed to update adjustment", error, req);
      }
    }

    return jsonResponse({ status: "ok" }, { status: 200 }, req);
  }

  return methodNotAllowed(req);
});

export default handler;
