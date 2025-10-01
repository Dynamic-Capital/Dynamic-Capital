import { getServiceClient } from "../_shared/client.ts";
import { optionalEnv, requireEnv } from "../_shared/env.ts";
import { mna, ok, oops } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

interface GmailMessage {
  id: string;
  internalDate: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
  };
}

interface MessageMatch {
  email: string;
  messageId: string;
  receivedAt: string;
}

interface ReplySummary {
  scanned: number;
  considered: number;
  matched: number;
  updated: number;
  errors: string[];
}

const DEFAULT_LOOKBACK_MINUTES = 1440;
const MAX_MESSAGES = 200;
const MAX_PAGES = 5;

function parseEmailAddress(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/<([^>]+)>/);
  const email = match ? match[1] : trimmed;
  const normal = email.trim().toLowerCase();
  if (!normal.includes("@")) return null;
  return normal;
}

function getHeader(message: GmailMessage, name: string): string | null {
  const headers = message.payload?.headers ?? [];
  for (const header of headers) {
    if (header?.name?.toLowerCase() === name.toLowerCase()) {
      return header.value ?? null;
    }
  }
  return null;
}

async function fetchAccessToken(): Promise<string> {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } =
    requireEnv(
      [
        "GMAIL_CLIENT_ID",
        "GMAIL_CLIENT_SECRET",
        "GMAIL_REFRESH_TOKEN",
      ] as const,
    );

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`gmail_token_error:${response.status}:${text}`);
  }

  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) {
    throw new Error("gmail_missing_access_token");
  }
  return payload.access_token;
}

async function listMessages(
  user: string,
  token: string,
  query: string,
  label: string | null,
  pageToken?: string,
): Promise<{ messages: GmailMessage[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    q: query,
    maxResults: "100",
  });
  if (pageToken) params.set("pageToken", pageToken);
  if (label) params.append("labelIds", label);

  const url = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/${
      encodeURIComponent(user)
    }/messages`,
  );
  url.search = params.toString();

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`gmail_list_error:${response.status}:${text}`);
  }

  const body = await response.json() as {
    messages?: GmailMessage[];
    nextPageToken?: string;
  };

  return {
    messages: body.messages ?? [],
    nextPageToken: body.nextPageToken,
  };
}

async function fetchMessage(
  user: string,
  token: string,
  id: string,
): Promise<GmailMessage | null> {
  const url = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/${
      encodeURIComponent(user)
    }/messages/${encodeURIComponent(id)}`,
  );
  url.searchParams.set("format", "metadata");
  for (const header of ["From", "To", "Delivered-To", "Date"]) {
    url.searchParams.append("metadataHeaders", header);
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`gmail_fetch_error:${response.status}:${text}`);
  }
  return await response.json() as GmailMessage;
}

function parseMessageMatch(message: GmailMessage): MessageMatch | null {
  const email = parseEmailAddress(getHeader(message, "From"));
  if (!email) return null;
  const internal = message.internalDate
    ? Number(message.internalDate)
    : Number.NaN;
  const dateHeader = getHeader(message, "Date");
  const parsed = Number.isFinite(internal)
    ? new Date(internal)
    : dateHeader
    ? new Date(dateHeader)
    : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  return {
    email,
    messageId: message.id,
    receivedAt: parsed.toISOString(),
  };
}

function buildQuery(lookbackMinutes: number, custom: string | null): string {
  const base = custom?.trim() ||
    "in:inbox -category:social -category:promotions";
  const days = Math.max(Math.ceil(lookbackMinutes / 1440), 1);
  return `${base} newer_than:${days}d`;
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export const handler = registerHandler(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname.endsWith("/version")) {
    return ok({ name: "crm-reply-sync", ts: new Date().toISOString() });
  }
  if (req.method === "HEAD") {
    return new Response(null, { status: 200 });
  }
  if (req.method !== "POST") {
    return mna();
  }

  const lookbackMinutes = sanitizeNumber(
    optionalEnv("CRM_GMAIL_LOOKBACK_MINUTES"),
    DEFAULT_LOOKBACK_MINUTES,
  );
  const since = new Date(Date.now() - lookbackMinutes * 60 * 1000);
  const user = optionalEnv("GMAIL_USER") ?? "me";
  const label = optionalEnv("GMAIL_REPLY_LABEL");
  const query = buildQuery(lookbackMinutes, optionalEnv("GMAIL_REPLY_QUERY"));

  let accessToken: string;
  try {
    accessToken = await fetchAccessToken();
  } catch (error) {
    console.error("[crm-reply-sync] Token error", error);
    return oops(
      "gmail_token_error",
      error instanceof Error ? error.message : String(error),
    );
  }

  const matches = new Map<string, MessageMatch>();
  const summary: ReplySummary = {
    scanned: 0,
    considered: 0,
    matched: 0,
    updated: 0,
    errors: [],
  };

  let pageToken: string | undefined;
  for (
    let page = 0;
    page < MAX_PAGES && summary.scanned < MAX_MESSAGES;
    page += 1
  ) {
    let list;
    try {
      list = await listMessages(user, accessToken, query, label, pageToken);
    } catch (error) {
      console.error("[crm-reply-sync] List error", error);
      summary.errors.push(
        error instanceof Error ? error.message : String(error),
      );
      break;
    }

    for (const { id } of list.messages) {
      if (summary.scanned >= MAX_MESSAGES) break;
      summary.scanned += 1;
      let detailed: GmailMessage | null = null;
      try {
        detailed = await fetchMessage(user, accessToken, id);
      } catch (error) {
        console.error("[crm-reply-sync] Fetch error", error);
        summary.errors.push(
          error instanceof Error ? error.message : String(error),
        );
        continue;
      }
      if (!detailed) continue;
      const match = parseMessageMatch(detailed);
      if (!match) continue;
      summary.considered += 1;
      if (new Date(match.receivedAt) < since) continue;
      const existing = matches.get(match.email);
      if (
        !existing || new Date(match.receivedAt) < new Date(existing.receivedAt)
      ) {
        matches.set(match.email, match);
      }
    }

    if (!list.nextPageToken) break;
    pageToken = list.nextPageToken;
  }

  if (matches.size === 0) {
    return ok({ ...summary, message: "no_matches" });
  }

  const emails = Array.from(matches.keys());
  const supabase = getServiceClient();

  const filters = emails
    .map((email) => `email.ilike.${email}`)
    .join(",");

  const { data: leads, error: leadError } = await supabase
    .from("crm_leads")
    .select("id,email,replied_at,status,metadata")
    .or(filters);

  if (leadError) {
    console.error("[crm-reply-sync] Lead lookup error", leadError.message);
    return oops("lead_lookup_failed", leadError.message);
  }

  const rows = leads ?? [];
  summary.matched = rows.length;
  const nowIso = new Date().toISOString();

  for (const lead of rows) {
    const emailKey = lead.email?.toLowerCase();
    if (!emailKey) continue;
    const match = matches.get(emailKey);
    if (!match) continue;
    const existingDate = lead.replied_at ? new Date(lead.replied_at) : null;
    const matchDate = new Date(match.receivedAt);
    if (existingDate && existingDate <= matchDate) {
      continue;
    }

    const metadata = normalizeMetadata(lead.metadata);
    metadata.last_reply = {
      message_id: match.messageId,
      received_at: match.receivedAt,
      updated_at: nowIso,
    };

    const { error: updateError } = await supabase
      .from("crm_leads")
      .update({
        replied_at: match.receivedAt,
        status: lead.status === "completed" ? lead.status : "replied",
        next_send_at: null,
        metadata,
      })
      .eq("id", lead.id);

    if (updateError) {
      console.error(
        "[crm-reply-sync] Failed to update lead",
        lead.id,
        updateError.message,
      );
      summary.errors.push(updateError.message);
      continue;
    }

    summary.updated += 1;
  }

  return ok(summary);
});

export default handler;

function sanitizeNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}
