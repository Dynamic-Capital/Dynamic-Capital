import { createClient } from "../_shared/client.ts";
import { maybe } from "../_shared/env.ts";
import {
  bad,
  corsHeaders,
  methodNotAllowed,
  ok,
  oops,
} from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import { ensureEcosystemUser, isMentorRole } from "../_shared/ecosystem.ts";

const supabase = createClient("service");

const directionAliases = new Map<string, string>([
  ["buy", "long"],
  ["bull", "long"],
  ["sell", "short"],
  ["bear", "short"],
  ["flat", "neutral"],
]);

const directionLabels: Record<string, string> = {
  long: "Long",
  short: "Short",
  neutral: "Neutral",
};

interface BroadcastSignalRequest {
  asset?: unknown;
  direction?: unknown;
  confidence?: unknown;
  price?: unknown;
  summary?: unknown;
  notes?: unknown;
  tags?: unknown;
  userId?: unknown;
  authUserId?: unknown;
  wallet?: unknown;
  email?: unknown;
  role?: unknown;
  dctBalance?: unknown;
  telemetry?: Record<string, unknown> | null;
  chatId?: unknown;
}

interface TelegramResponse {
  ok?: boolean;
  result?: { message_id?: number };
  description?: string;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeAsset(value: unknown): string | null {
  const asset = normalizeString(value);
  if (!asset) return null;
  return asset.toUpperCase();
}

function normalizeDirection(value: unknown): string | null {
  const raw = normalizeString(value)?.toLowerCase();
  if (!raw) return null;
  const mapped = directionAliases.get(raw) ?? raw;
  if (mapped === "long" || mapped === "short" || mapped === "neutral") {
    return mapped;
  }
  return null;
}

function normalizeConfidence(value: unknown): number {
  if (value === null || value === undefined) return 50;
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return 50;
  if (num <= 1) {
    return clamp(num * 100, 0, 100);
  }
  return clamp(num, 0, 100);
}

function normalizePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeTags(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeString(entry))
      .filter((entry): entry is string => Boolean(entry))
      .map((entry) => entry.replace(/^#/, "#"));
  }

  const str = normalizeString(value);
  if (!str) return [];
  return str
    .split(",")
    .map((entry) => normalizeString(entry))
    .filter((entry): entry is string => Boolean(entry))
    .map((entry) => entry.replace(/^#/, "#"));
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

function formatConfidence(confidence: number): string {
  return `${confidence.toFixed(1)}%`;
}

function formatPrice(price: number | null): string | null {
  if (price === null) return null;
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: price < 10 ? 4 : 2,
  });
  return formatter.format(price);
}

async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
): Promise<TelegramResponse | null> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
      },
    );
    return await response.json() as TelegramResponse;
  } catch (error) {
    console.error("Failed to send telegram signal", error);
    return null;
  }
}

function buildTelegramMessage(
  asset: string,
  direction: string,
  confidence: number,
  price: number | null,
  summary: string | null,
  tags: string[],
): string {
  const lines = [`📡 *${asset}* — ${directionLabels[direction] ?? direction}`];
  lines.push(`Confidence: ${formatConfidence(confidence)}`);
  const priceLabel = formatPrice(price);
  if (priceLabel) {
    lines.push(`Reference Price: ${priceLabel}`);
  }
  if (summary) {
    lines.push("\n" + summary);
  }
  if (tags.length > 0) {
    lines.push(
      "\n" +
        tags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" "),
    );
  }
  return lines.join("\n");
}

export const handler = registerHandler(async (req) => {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method === "GET" && url.pathname.endsWith("/version")) {
    return ok({ name: "broadcast-signal", ts: new Date().toISOString() }, req);
  }

  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  let body: BroadcastSignalRequest;
  try {
    body = await req.json() as BroadcastSignalRequest;
  } catch {
    return bad("INVALID_JSON", null, req);
  }

  const asset = normalizeAsset(body.asset);
  const direction = normalizeDirection(body.direction);
  if (!asset) {
    return bad("MISSING_ASSET", null, req);
  }
  if (!direction) {
    return bad("INVALID_DIRECTION", null, req);
  }

  const confidence = normalizeConfidence(body.confidence);
  const price = normalizePrice(body.price);
  const summary = normalizeString(body.summary ?? body.notes);
  const tags = normalizeTags(body.tags);

  let authorId: string | null = null;
  if (body.userId || body.authUserId || body.wallet) {
    try {
      const user = await ensureEcosystemUser(supabase, {
        userId: body.userId as string | undefined,
        authUserId: body.authUserId as string | undefined,
        wallet: body.wallet as string | undefined,
        email: body.email as string | undefined,
        role: body.role as string | undefined,
        dctBalance: body.dctBalance as number | string | undefined,
      });
      authorId = user.id;
      if (!isMentorRole(user.role)) {
        console.warn("Signal broadcast from non-mentor role", {
          user: user.id,
          role: user.role,
        });
      }
    } catch (error) {
      console.error("Failed to resolve signal author", error);
    }
  }

  const metadata: Record<string, unknown> = {
    tags,
    telemetry: body.telemetry ?? null,
  };

  const { data: inserted, error } = await supabase
    .from("signals")
    .insert({
      author_id: authorId,
      asset,
      direction,
      confidence,
      price,
      notes: summary,
      metadata,
    })
    .select("id, created_at")
    .maybeSingle();

  if (error) {
    console.error("Failed to insert signal", error.message);
    return oops("SIGNAL_PERSIST_FAILED", error.message, req);
  }

  const botToken = maybe("TELEGRAM_BOT_TOKEN");
  const configuredChatId = maybe("SIGNALS_BROADCAST_CHAT_ID") ??
    maybe("TRADING_SIGNALS_CHAT_ID") ??
    maybe("TELEGRAM_SIGNAL_CHAT_ID");
  const overrideChatId = normalizeString(body.chatId);
  const chatId = overrideChatId ?? configuredChatId;

  let telegramMessageId: number | null = null;
  if (botToken && chatId) {
    const message = buildTelegramMessage(
      asset,
      direction,
      confidence,
      price,
      summary,
      tags,
    );
    const response = await sendTelegramMessage(botToken, chatId, message);
    if (!response?.ok) {
      console.error(
        "Telegram broadcast failed",
        response?.description ?? "unknown error",
      );
    } else {
      telegramMessageId = response.result?.message_id ?? null;
    }
  }

  if (telegramMessageId && inserted?.id) {
    await supabase
      .from("signals")
      .update({
        metadata: {
          ...metadata,
          telegram: {
            chatId,
            messageId: telegramMessageId,
          },
        },
      })
      .eq("id", inserted.id);
  }

  return ok({
    signalId: inserted?.id ?? null,
    createdAt: inserted?.created_at ?? new Date().toISOString(),
    asset,
    direction,
    confidence,
    price,
    authorId,
  }, req);
});

export default handler;

registerHandler(handler);
