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

const TABLE = "mt5_commands";

const webhookSecret = Deno.env.get("MT5_COMMANDS_WEBHOOK_SECRET") ?? "";
const terminalSecret = Deno.env.get("MT5_TERMINAL_KEY") ?? "";

const MAX_COMMANDS = 20;

type CommandAction = "open" | "close" | "modify";

interface CommandPayload {
  id?: string;
  external_id?: string;
  action: CommandAction;
  symbol: string;
  side?: string;
  volume?: number | string;
  price?: number | string;
  stop_loss?: number | string;
  take_profit?: number | string;
  trailing_stop?: number | string;
  ticket?: string | number;
  account?: string | number;
  account_login?: string | number;
  comment?: string;
  metadata?: Record<string, unknown>;
}

interface CommandRecord {
  id: string;
  external_id: string | null;
  action: CommandAction;
  symbol: string;
  side: string | null;
  volume: number | null;
  price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  trailing_stop: number | null;
  ticket: string | null;
  account_login: string | null;
  status: string;
  comment: string | null;
  payload: Record<string, unknown>;
}

type SupabaseClient = ReturnType<typeof createClient>;

function getClient(): SupabaseClient {
  const injected =
    (globalThis as { __SUPABASE_SERVICE_CLIENT__?: SupabaseClient })
      .__SUPABASE_SERVICE_CLIENT__;
  return injected ?? createClient("service");
}

function parseNumberish(value: number | string | undefined): number | null {
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

function normaliseAction(action: string | undefined): CommandAction | null {
  if (!action) return null;
  const lower = action.toLowerCase();
  if (lower === "open" || lower === "close" || lower === "modify") {
    return lower;
  }
  return null;
}

function ensureWebhookAuth(req: Request): boolean {
  if (!webhookSecret) return false;
  const authHeader = req.headers.get("authorization") ?? "";
  const apiKey = req.headers.get("x-api-key") ?? "";
  return authHeader === `Bearer ${webhookSecret}` || apiKey === webhookSecret;
}

function ensureTerminalAuth(req: Request): boolean {
  if (!terminalSecret) return false;
  const authHeader = req.headers.get("authorization") ?? "";
  const apiKey = req.headers.get("x-api-key") ?? "";
  return authHeader === `Bearer ${terminalSecret}` || apiKey === terminalSecret;
}

function normaliseCommand(payload: CommandPayload): CommandRecord | null {
  const action = normaliseAction(payload.action);
  if (!action) return null;
  const symbol = payload.symbol?.trim();
  if (!symbol) return null;

  const volume = parseNumberish(payload.volume);
  const price = parseNumberish(payload.price);
  const stopLoss = parseNumberish(payload.stop_loss);
  const takeProfit = parseNumberish(payload.take_profit);
  const trailingStop = parseNumberish(payload.trailing_stop);
  const account = parseString(payload.account ?? payload.account_login);
  const ticket = parseString(payload.ticket);
  const side = payload.side?.trim()?.toLowerCase() ?? null;

  if (action === "open" && (!side || volume === null)) {
    return null;
  }
  if (action !== "open" && !ticket) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    external_id: payload.id ?? payload.external_id ?? null,
    action,
    symbol,
    side,
    volume,
    price,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    trailing_stop: trailingStop,
    ticket,
    account_login: account,
    status: "queued",
    comment: payload.comment?.trim() ?? null,
    payload: payload as Record<string, unknown>,
  };
}

function mapRecordForTerminal(record: Record<string, unknown>) {
  const payload = record.payload as Record<string, unknown> | null;
  return {
    id: record.id,
    action: record.command_type ?? payload?.action,
    symbol: record.symbol,
    side: record.side,
    volume: record.volume,
    price: record.price,
    stop_loss: record.stop_loss,
    take_profit: record.take_profit,
    trailing_stop: record.trailing_stop,
    ticket: record.ticket,
    account_login: record.account_login,
    comment: record.comment,
    payload,
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
    if (!ensureWebhookAuth(req)) {
      return unauth("Invalid webhook credentials", req);
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch (error) {
      console.error("[mt5-commands] invalid JSON", error);
      return bad("Invalid JSON payload", undefined, req);
    }

    const commandsArray = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { commands?: unknown }).commands)
      ? (payload as { commands: unknown[] }).commands
      : [payload];

    const records: CommandRecord[] = [];
    for (const candidate of commandsArray) {
      const record = normaliseCommand(candidate as CommandPayload);
      if (!record) {
        return bad("Invalid command payload", candidate, req);
      }
      records.push(record);
    }

    const client = getClient();
    const { error, data } = await client
      .from(TABLE)
      .insert(
        records.map((record) => ({
          id: record.id,
          external_id: record.external_id,
          account_login: record.account_login,
          command_type: record.action,
          symbol: record.symbol,
          side: record.side,
          volume: record.volume,
          price: record.price,
          stop_loss: record.stop_loss,
          take_profit: record.take_profit,
          trailing_stop: record.trailing_stop,
          ticket: record.ticket,
          status: record.status,
          status_message: null,
          payload: record.payload,
          comment: record.comment,
        })),
        { defaultToNull: true },
      )
      .select("id, external_id");

    if (error) {
      console.error("[mt5-commands] failed to persist commands", error);
      return oops("Failed to persist commands", error, req);
    }

    return jsonResponse(
      {
        status: "queued",
        commands: (data ?? records).map((
          entry: Record<string, unknown>,
          idx,
        ) => ({
          id: entry.id ?? records[idx].id,
          external_id: entry.external_id ?? records[idx].external_id,
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
      Math.min(MAX_COMMANDS, limitParam ? Number(limitParam) : 10),
    );

    const client = getClient();
    const { data, error } = await client.from(TABLE)
      .select(
        "id, command_type, symbol, side, volume, price, stop_loss, take_profit, trailing_stop, ticket, account_login, payload, comment",
      )
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(MAX_COMMANDS);
    if (error) {
      console.error("[mt5-commands] failed to fetch queued commands", error);
      return oops("Failed to fetch commands", error, req);
    }

    const filtered = (data ?? []).filter((row) => {
      if (!account || account.trim() === "") return true;
      return row.account_login === account || row.account_login === null;
    });

    const commands = filtered.slice(0, limit).map(mapRecordForTerminal);
    const ids = commands.map((command) => command.id);
    if (ids.length > 0) {
      const { error: updateError } = await client
        .from(TABLE)
        .update({ status: "sent" })
        .in("id", ids);
      if (updateError) {
        console.error(
          "[mt5-commands] failed to mark commands sent",
          updateError,
        );
      }
    }

    return jsonResponse({ commands }, { status: 200 }, req);
  }

  if (req.method === "PATCH") {
    if (!ensureTerminalAuth(req)) {
      return unauth("Invalid terminal credentials", req);
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch (error) {
      console.error("[mt5-commands] invalid JSON for ack", error);
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
        return bad("Command acknowledgement missing fields", entry, req);
      }
      const status = entry.status.toLowerCase();
      if (!["filled", "failed", "cancelled", "ignored"].includes(status)) {
        return bad("Unsupported status", entry, req);
      }
      const { error } = await client
        .from(TABLE)
        .update({ status, status_message: entry.message ?? null })
        .eq("id", entry.id);
      if (error) {
        console.error("[mt5-commands] failed to update status", {
          entry,
          error,
        });
        return oops("Failed to update command", error, req);
      }
    }

    return jsonResponse({ status: "ok" }, { status: 200 }, req);
  }

  return methodNotAllowed(req);
});

export default handler;
