import { getServiceClient } from "../_shared/client.ts";
import { maybe, need } from "../_shared/env.ts";
import {
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
} from "../_shared/http.ts";
import { createLogger } from "../_shared/logger.ts";
import { registerHandler } from "../_shared/serve.ts";

const FUNCTION_NAME = "gmail-replies-sync";
const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_MESSAGES_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages";
const DEFAULT_LOOKBACK_DAYS = 1;
const DEFAULT_MAX_MESSAGES = 100;

type Logger = ReturnType<typeof createLogger>;

interface GmailMessageListResponse {
  messages?: Array<{ id?: string | null }> | null;
  nextPageToken?: string | null;
}

interface GmailMessageMetadata {
  payload?: {
    headers?: Array<{ name?: string | null; value?: string | null }> | null;
  } | null;
}

interface SyncSummary {
  messagesProcessed: number;
  uniqueSenders: number;
  leadsMatched: number;
  leadsUpdated: number;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function buildSearchQuery(): string {
  const overrideQuery = maybe("GMAIL_SEARCH_QUERY");
  if (overrideQuery && overrideQuery.trim().length > 0) {
    return overrideQuery.trim();
  }
  const lookbackDays = parsePositiveInt(
    maybe("GMAIL_LOOKBACK_DAYS"),
    DEFAULT_LOOKBACK_DAYS,
  );
  const inboxFilter = maybe("GMAIL_SEARCH_FILTER");
  const baseQuery = `newer_than:${lookbackDays}d in:inbox -from:me`;
  if (!inboxFilter) return baseQuery;
  return `${baseQuery} ${inboxFilter}`.trim();
}

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const primary = value.split(",")[0]?.trim();
  if (!primary) return null;
  const match = primary.match(/<([^>]+)>/);
  const raw = match ? match[1] : primary;
  const cleaned = raw
    .replace(/^mailto:/i, "")
    .replace(/^["'\s]+/, "")
    .replace(/["'\s]+$/, "")
    .toLowerCase();
  if (!cleaned.includes("@")) {
    return null;
  }
  return cleaned;
}

async function fetchAccessToken(logger: Logger) {
  const clientId = need("GMAIL_CLIENT_ID");
  const clientSecret = need("GMAIL_CLIENT_SECRET");
  const refreshToken = need("GMAIL_REFRESH_TOKEN");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GMAIL_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    logger.error("Failed to refresh Gmail access token", {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error("gmail_token_refresh_failed");
  }

  const payload = await response.json() as {
    access_token?: string;
  };

  if (!payload.access_token) {
    logger.error("Missing access_token in Gmail response", payload);
    throw new Error("gmail_token_missing");
  }

  return payload.access_token;
}

async function listMessageIds(
  accessToken: string,
  maxMessages: number,
  logger: Logger,
) {
  const query = buildSearchQuery();
  const collected = new Set<string>();
  let pageToken: string | undefined;

  while (collected.size < maxMessages) {
    const remaining = Math.max(1, maxMessages - collected.size);
    const params = new URLSearchParams({
      q: query,
      maxResults: `${Math.min(remaining, 100)}`,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetch(`${GMAIL_MESSAGES_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      logger.error("Failed to list Gmail messages", {
        status: response.status,
        statusText: response.statusText,
      });
      break;
    }

    const payload = await response.json() as GmailMessageListResponse;
    const messages = payload.messages ?? [];
    for (const message of messages) {
      if (message?.id) {
        collected.add(message.id);
        if (collected.size >= maxMessages) break;
      }
    }

    if (!payload.nextPageToken || collected.size >= maxMessages) {
      break;
    }
    pageToken = payload.nextPageToken ?? undefined;
  }

  return { ids: Array.from(collected), query };
}

async function fetchMessageSender(
  accessToken: string,
  id: string,
  logger: Logger,
): Promise<string | null> {
  const params = new URLSearchParams({
    format: "metadata",
    metadataHeaders: "From",
    fields: "payload(headers)",
  });
  const response = await fetch(
    `${GMAIL_MESSAGES_URL}/${id}?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    logger.warn("Failed to fetch Gmail message", {
      id,
      status: response.status,
      statusText: response.statusText,
    });
    return null;
  }

  const payload = await response.json() as GmailMessageMetadata;
  const headers = payload.payload?.headers ?? [];
  const fromHeader = headers.find((header) =>
    header.name?.toLowerCase() === "from"
  );

  return normalizeEmail(fromHeader?.value ?? null);
}

async function updateLeads(
  emails: string[],
  logger: Logger,
): Promise<{ matched: number; updated: number }> {
  if (emails.length === 0) {
    return { matched: 0, updated: 0 };
  }

  const supabase = getServiceClient();
  const leads: Array<{ id: string; email: string; status: string | null }> = [];

  const chunkSize = 50;
  for (let i = 0; i < emails.length; i += chunkSize) {
    const chunk = emails.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("leads")
      .select("id,email,status")
      .in("email", chunk);
    if (error) {
      logger.error("Failed to load leads", error);
      throw new Error("leads_fetch_failed");
    }
    if (data) {
      leads.push(...data);
    }
  }

  const idsToUpdate = leads
    .filter((lead) => lead.status?.toUpperCase() !== "REPLIED")
    .map((lead) => lead.id);

  if (idsToUpdate.length === 0) {
    return { matched: leads.length, updated: 0 };
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      status: "REPLIED",
      replied_at: new Date().toISOString(),
    })
    .in("id", idsToUpdate);

  if (updateError) {
    logger.error("Failed to update leads", updateError);
    throw new Error("leads_update_failed");
  }

  return { matched: leads.length, updated: idsToUpdate.length };
}

async function syncReplies(logger: Logger) {
  const parsedMax = parsePositiveInt(
    maybe("GMAIL_MAX_MESSAGES"),
    DEFAULT_MAX_MESSAGES,
  );
  const maxMessages = Math.min(parsedMax, 500);
  const accessToken = await fetchAccessToken(logger);
  const { ids, query } = await listMessageIds(accessToken, maxMessages, logger);

  if (ids.length === 0) {
    logger.info("No Gmail messages matched query", { query });
    return {
      messagesProcessed: 0,
      uniqueSenders: 0,
      leadsMatched: 0,
      leadsUpdated: 0,
    } satisfies SyncSummary;
  }

  const senders = new Set<string>();
  for (const id of ids) {
    const email = await fetchMessageSender(accessToken, id, logger);
    if (email) {
      senders.add(email);
    }
  }

  if (senders.size === 0) {
    logger.info("No senders extracted from Gmail messages", { query });
    return {
      messagesProcessed: ids.length,
      uniqueSenders: 0,
      leadsMatched: 0,
      leadsUpdated: 0,
    } satisfies SyncSummary;
  }

  const { matched, updated } = await updateLeads(Array.from(senders), logger);
  logger.info("Processed Gmail replies", {
    query,
    messages: ids.length,
    senders: senders.size,
    matched,
    updated,
  });

  return {
    messagesProcessed: ids.length,
    uniqueSenders: senders.size,
    leadsMatched: matched,
    leadsUpdated: updated,
  } satisfies SyncSummary;
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders(req, "GET,POST,OPTIONS") },
    });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return methodNotAllowed(req);
  }

  const logger = createLogger({
    function: FUNCTION_NAME,
    requestId: req.headers.get("sb-request-id") ||
      req.headers.get("x-request-id") ||
      crypto.randomUUID(),
  });

  try {
    const summary = await syncReplies(logger);
    return jsonResponse({ ok: true, summary }, { status: 200 }, req);
  } catch (error) {
    logger.error("Failed to sync Gmail replies", error);
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ ok: false, error: message }, { status: 500 }, req);
  }
});

export default handler;
