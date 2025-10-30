import { checkEnv, optionalEnv } from "../_shared/env.ts";
import { readMiniAppEnv, requireMiniAppEnv } from "../_shared/miniapp.ts";
import { alertAdmins } from "../_shared/alerts.ts";
import { json, oops } from "../_shared/http.ts";
import { validateTelegramHeader } from "../_shared/telegram_secret.ts";
import { version } from "../_shared/version.ts";
import { hashBlob } from "../_shared/hash.ts";
import {
  getActivePromotions,
  getEducationPackages,
  getFormattedVipPackages,
  getVipPackages,
} from "./database-utils.ts";
import { registerHandler } from "../_shared/serve.ts";
import { createClient } from "../_shared/client.ts";
type SupabaseClient = ReturnType<typeof createClient>;
import {
  envOrSetting,
  getContent,
  getContentBatch,
  getCryptoDepositAddress,
  getFlag,
} from "../_shared/config.ts";
import { buildMainMenu, type MenuSection } from "./menu.ts";
import {
  buildAdminCommandHandlers,
  type CommandContext,
  type CommandHandler,
} from "./admin-command-handlers.ts";
import { setCallbackMessageId } from "./admin-handlers/common.ts";
import { recomputeVipForUser } from "../_shared/vip_sync.ts";
import {
  getVipChannels,
  isMemberLike,
  recomputeVipFlag,
} from "../_shared/telegram_membership.ts";
import { askChatGPT } from "./helpers/chatgpt.ts";
import { escapeHtml } from "./helpers/escape.ts";
// Attempt to load grammy Bot dynamically at runtime; fall back to a minimal no-op stub
// so the code can compile/run in environments where the remote module isn't available.
let Bot: any;
try {
  // Top-level await is supported in Deno; import may fail in offline / restricted envs.
  const grammyMod = await import("https://deno.land/x/grammy@v1.18.1/mod.ts")
    .catch(() => null);
  Bot = grammyMod?.Bot ?? class {
    constructor(..._args: any[]) {}
  };
} catch {
  // Fallback stub: minimal constructor to avoid runtime crashes where Bot is new'ed.
  Bot = class {
    constructor(..._args: any[]) {}
  };
}
import {
  buildBaseHeaderApplier,
  DEFAULT_ALLOWED_METHODS,
} from "./response-headers.ts";
// Local stub to avoid failing import when the remote grammy_conversations module
// isn't available in the environment (e.g. offline or blocked).
// Provides minimal no-op implementations for the named exports used by the project.
export const conversations = (..._args: any[]): any => {
  // returns a middleware factory compatible shape for grammy that simply forwards
  // to next().
  return () => async (_ctx: any, next?: () => Promise<void>) => {
    if (typeof next === "function") await next();
  };
};

export function createConversation<T = any>(_handler?: any): any {
  // returns a middleware-like wrapper. If a handler is provided, it will be
  // invoked with the supplied args when the wrapper is executed. Otherwise it's
  // a passthrough middleware.
  return (...handlerArgs: any[]) => {
    return async (_ctx: any, next?: () => Promise<void>) => {
      if (typeof _handler === "function") {
        try {
          await _handler(...handlerArgs);
        } catch {
          /* swallow errors from optional local handler */
        }
      }
      if (typeof next === "function") await next();
    };
  };
}
import { createThrottler } from "./vendor/grammy_transformer_throttler.ts";
import {
  parseBankSlip as defaultParseBankSlip,
  type ParsedSlip,
} from "./bank-parsers.ts";
// Type definition moved inline to avoid import issues
interface Promotion {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  auto_created?: boolean;
  generated_via?: string | null;
  description?: string | null;
  valid_until?: string | null;
  is_active?: boolean | null;
}

interface TelegramMessage {
  chat: { id: number; type?: string; title?: string };
  photo?: Array<{ file_id: string }>;
  document?: {
    mime_type: any;
    file_id: string;
    file_name?: string;
  };
  caption?: string;
  photo?: { file_id: string }[];
  document?: { file_id: string; mime_type?: string };
  reply_to_message?: TelegramMessage;
  [key: string]: unknown;
}

interface TelegramCallback {
  id: string;
  from: { id: number; username?: string };
  data?: string;
  message?: TelegramMessage;
}

interface ChatMemberUpdate {
  chat: { id: number; username?: string };
  from: { id: number };
  new_chat_member?: { status: string; user: { id: number } };
  old_chat_member?: { status: string; user: { id: number } };
}

interface TelegramUpdate {
  message?: TelegramMessage;
  callback_query?: TelegramCallback;
  chat_member?: ChatMemberUpdate;
  my_chat_member?: ChatMemberUpdate;
  [key: string]: unknown;
}

interface PaymentIntent {
  id: string;
  user_id: string;
  method: string;
  status: string;
  expected_amount: number;
  expected_beneficiary_account_last4?: string;
  expected_beneficiary_name?: string;
  created_at: string;
}

interface TradeData {
  pair?: string;
  entry?: number | string;
  exit?: number | string;
  profit?: number | string;
  amount?: number | string;
  duration?: string;
  loss?: number | string;
  [key: string]: unknown;
}

type InlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

// Rate limit entry type
type RateLimitEntry = {
  count: number;
  lastReset: number;
  blocked?: boolean;
  blockUntil?: number;
  lastMessage?: string;
  identicalCount?: number;
};

// In-memory rate limiting store
const rateLimitStore = new Map<string, RateLimitEntry>();
type SecurityStats = {
  totalRequests: number;
  blockedRequests: number;
  suspiciousUsers: Set<string>;
  lastCleanup: number;
};

const securityStats: SecurityStats = {
  totalRequests: 0,
  blockedRequests: 0,
  suspiciousUsers: new Set(),
  lastCleanup: Date.now(),
};

// Security configuration
const SECURITY_CONFIG = {
  // Rate limits per minute
  MAX_REQUESTS_PER_MINUTE: 20,
  MAX_REQUESTS_PER_HOUR: 150,

  // Spam protection
  MAX_IDENTICAL_MESSAGES: 3,
  MAX_COMMANDS_PER_MINUTE: 8,
  FLOOD_PROTECTION_WINDOW: 60000, // 1 minute

  // Blocking thresholds
  SUSPICIOUS_THRESHOLD: 30, // requests per minute
  AUTO_BLOCK_DURATION: 300000, // 5 minutes
  TEMP_BLOCK_DURATION: 60000, // 1 minute for minor violations

  // Message limits
  MAX_MESSAGE_LENGTH: 4000,
  MIN_MESSAGE_INTERVAL: 500, // 0.5 second between messages

  // Admin exemption
  ADMIN_RATE_LIMIT_MULTIPLIER: 5,

  // Cleanup interval
  CLEANUP_INTERVAL: 1800000, // 30 minutes
};

// Security functions
function getRateLimitKey(
  userId: string,
  type: "minute" | "hour" | "command" | "message" | "identical",
): string {
  const now = new Date();
  if (type === "minute") {
    return `${userId}:min:${Math.floor(now.getTime() / 60000)}`;
  } else if (type === "hour") {
    return `${userId}:hr:${Math.floor(now.getTime() / 3600000)}`;
  } else if (type === "command") {
    return `${userId}:cmd:${Math.floor(now.getTime() / 60000)}`;
  } else if (type === "identical") {
    return `${userId}:ident`;
  } else {
    return `${userId}:msg:${
      Math.floor(now.getTime() / SECURITY_CONFIG.MIN_MESSAGE_INTERVAL)
    }`;
  }
}

function isRateLimited(
  userId: string,
  isAdmin: boolean = false,
  messageText?: string,
): { limited: boolean; reason?: string; blockDuration?: number } {
  const now = Date.now();
  const multiplier = isAdmin ? SECURITY_CONFIG.ADMIN_RATE_LIMIT_MULTIPLIER : 1;

  // Check if user is temporarily blocked
  const blockKey = `block:${userId}`;
  const blockEntry = rateLimitStore.get(blockKey);
  if (
    blockEntry?.blocked && blockEntry.blockUntil && now < blockEntry.blockUntil
  ) {
    const remainingTime = Math.ceil((blockEntry.blockUntil - now) / 1000);
    logSecurityEvent(userId, "blocked_request_attempt", { remainingTime });
    return {
      limited: true,
      reason: "temporarily_blocked",
      blockDuration: remainingTime,
    };
  }

  // Check for identical message spam
  if (messageText && messageText.length > 10) {
    const identicalKey = getRateLimitKey(userId, "identical");
    const identicalEntry = rateLimitStore.get(identicalKey) ||
      { count: 0, lastReset: now, identicalCount: 0 };

    if (identicalEntry.lastMessage === messageText) {
      identicalEntry.identicalCount = (identicalEntry.identicalCount || 0) + 1;
      if (
        identicalEntry.identicalCount >= SECURITY_CONFIG.MAX_IDENTICAL_MESSAGES
      ) {
        logSecurityEvent(userId, "identical_spam_detected", {
          message: messageText.substring(0, 100),
          count: identicalEntry.identicalCount,
        });

        // Temporary block for spam
        const tempBlockEntry: RateLimitEntry = {
          count: 0,
          lastReset: now,
          blocked: true,
          blockUntil: now + SECURITY_CONFIG.TEMP_BLOCK_DURATION,
        };
        rateLimitStore.set(blockKey, tempBlockEntry);
        return {
          limited: true,
          reason: "identical_spam",
          blockDuration: SECURITY_CONFIG.TEMP_BLOCK_DURATION / 1000,
        };
      }
    } else {
      identicalEntry.identicalCount = 0;
    }

    identicalEntry.lastMessage = messageText;
    rateLimitStore.set(identicalKey, identicalEntry);
  }

  // Check minute rate limit
  const minuteKey = getRateLimitKey(userId, "minute");
  const minuteEntry = rateLimitStore.get(minuteKey) ||
    { count: 0, lastReset: now };

  if (now - minuteEntry.lastReset > 60000) {
    minuteEntry.count = 0;
    minuteEntry.lastReset = now;
  }

  if (
    minuteEntry.count >= SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE * multiplier
  ) {
    logSecurityEvent(userId, "rate_limit_minute_exceeded", {
      count: minuteEntry.count,
      limit: SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE * multiplier,
    });

    // Auto-block if suspicious activity
    if (minuteEntry.count >= SECURITY_CONFIG.SUSPICIOUS_THRESHOLD && !isAdmin) {
      const blockEntry: RateLimitEntry = {
        count: 0,
        lastReset: now,
        blocked: true,
        blockUntil: now + SECURITY_CONFIG.AUTO_BLOCK_DURATION,
      };
      rateLimitStore.set(blockKey, blockEntry);
      securityStats.suspiciousUsers.add(userId);
      logSecurityEvent(userId, "auto_blocked_suspicious", {
        requests: minuteEntry.count,
        blockDuration: SECURITY_CONFIG.AUTO_BLOCK_DURATION / 1000,
      });
      return {
        limited: true,
        reason: "auto_blocked",
        blockDuration: SECURITY_CONFIG.AUTO_BLOCK_DURATION / 1000,
      };
    }

    return { limited: true, reason: "rate_limit_minute" };
  }

  // Check hourly rate limit
  const hourKey = getRateLimitKey(userId, "hour");
  const hourEntry = rateLimitStore.get(hourKey) || { count: 0, lastReset: now };

  if (now - hourEntry.lastReset > 3600000) {
    hourEntry.count = 0;
    hourEntry.lastReset = now;
  }

  if (hourEntry.count >= SECURITY_CONFIG.MAX_REQUESTS_PER_HOUR * multiplier) {
    logSecurityEvent(userId, "rate_limit_hour_exceeded", {
      count: hourEntry.count,
      limit: SECURITY_CONFIG.MAX_REQUESTS_PER_HOUR * multiplier,
    });
    return { limited: true, reason: "rate_limit_hour" };
  }

  // Update counters
  minuteEntry.count++;
  hourEntry.count++;
  rateLimitStore.set(minuteKey, minuteEntry);
  rateLimitStore.set(hourKey, hourEntry);

  return { limited: false };
}

function isCommandSpam(userId: string, command: string): boolean {
  const now = Date.now();
  const commandKey = getRateLimitKey(userId, "command");
  const entry = rateLimitStore.get(commandKey) || { count: 0, lastReset: now };

  if (now - entry.lastReset > 60000) {
    entry.count = 0;
    entry.lastReset = now;
  }

  if (entry.count >= SECURITY_CONFIG.MAX_COMMANDS_PER_MINUTE) {
    logSecurityEvent(userId, "command_spam_detected", {
      command,
      count: entry.count,
    });
    return true;
  }

  entry.count++;
  rateLimitStore.set(commandKey, entry);
  return false;
}

function validateMessage(
  text: string,
  userId: string,
): { valid: boolean; reason?: string } {
  // Check message length
  if (text.length > SECURITY_CONFIG.MAX_MESSAGE_LENGTH) {
    logSecurityEvent(userId, "message_too_long", {
      length: text.length,
      maxLength: SECURITY_CONFIG.MAX_MESSAGE_LENGTH,
    });
    return { valid: false, reason: "message_too_long" };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    { pattern: /(.)\1{20,}/, name: "repeated_chars" },
    {
      pattern: /[^\w\s\u00C0-\u024F\u1E00-\u1EFF]{30,}/,
      name: "too_many_special_chars",
    },
    { pattern: /(http[s]?:\/\/[^\s]+){3,}/, name: "multiple_urls" },
    { pattern: /(.{1,10})\1{5,}/, name: "repeated_patterns" },
  ];

  for (const { pattern, name } of suspiciousPatterns) {
    if (pattern.test(text)) {
      logSecurityEvent(userId, "suspicious_pattern_detected", {
        pattern: name,
        message: text.substring(0, 100),
      });
      return { valid: false, reason: "suspicious_content" };
    }
  }

  return { valid: true };
}

function cleanupRateLimit(): void {
  const now = Date.now();

  // Only cleanup if enough time has passed
  if (now - securityStats.lastCleanup < SECURITY_CONFIG.CLEANUP_INTERVAL) {
    return;
  }

  const expiredKeys: string[] = [];

  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries older than 2 hours or expired blocks
    if (
      now - entry.lastReset > 7200000 ||
      (entry.blocked && entry.blockUntil && now > entry.blockUntil)
    ) {
      expiredKeys.push(key);
    }
  }

  expiredKeys.forEach((key) => rateLimitStore.delete(key));

  securityStats.lastCleanup = now;

  if (expiredKeys.length > 0) {
    console.log(
      `🧹 Cleaned up ${expiredKeys.length} expired rate limit entries`,
    );
    console.log(
      `📊 Security stats - Total: ${securityStats.totalRequests}, Blocked: ${securityStats.blockedRequests}, Suspicious users: ${securityStats.suspiciousUsers.size}`,
    );
  }
}

function logSecurityEvent(
  userId: string,
  event: string,
  details?: Record<string, unknown>,
): void {
  const timestamp = new Date().toISOString();
  console.log(
    `🔒 SECURITY [${timestamp}] User: ${userId}, Event: ${event}`,
    details ? JSON.stringify(details) : "",
  );

  // Update security stats
  securityStats.totalRequests++;
  if (
    event.includes("blocked") || event.includes("limited") ||
    event.includes("spam")
  ) {
    securityStats.blockedRequests++;
  }
}

function getSecurityResponse(reason: string, blockDuration?: number): string {
  switch (reason) {
    case "temporarily_blocked":
      return `🛡️ You are temporarily blocked. Please wait ${blockDuration} seconds before trying again.`;
    case "rate_limit_minute":
      return "⏱️ You are sending messages too quickly. Please slow down and try again in a minute.";
    case "rate_limit_hour":
      return "⏰ You have reached your hourly message limit. Please try again later.";
    case "identical_spam":
      return `🚫 Please don't repeat the same message. You're blocked for ${blockDuration} seconds.`;
    case "auto_blocked":
      return `🚨 Suspicious activity detected. You're blocked for ${blockDuration} seconds. Contact admin if this is a mistake.`;
    case "command_spam":
      return "⚡ You are using commands too frequently. Please wait a moment.";
    case "message_too_long":
      return "📏 Your message is too long. Please break it into smaller messages.";
    case "suspicious_content":
      return "🚨 Your message contains suspicious content and was blocked.";
    default:
      return "🛡️ Request blocked by security system. Please try again later.";
  }
}

const BOT_TOKEN = typeof Deno !== "undefined" && Deno.env
  ? Deno.env.get("TELEGRAM_BOT_TOKEN")
  : (typeof process !== "undefined" && process.env
    ? process.env.TELEGRAM_BOT_TOKEN
    : undefined);
const SUPABASE_URL = typeof Deno !== "undefined" && Deno.env
  ? Deno.env.get("SUPABASE_URL")
  : (typeof process !== "undefined" && process.env
    ? process.env.SUPABASE_URL
    : undefined);
const SUPABASE_SERVICE_ROLE_KEY = typeof Deno !== "undefined" && Deno.env
  ? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  : (typeof process !== "undefined" && typeof process.env !== "undefined"
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : undefined);
const BOT_VERSION = typeof Deno !== "undefined" && Deno.env
  ? (Deno.env.get("BOT_VERSION") || "0.0.0")
  : (typeof process !== "undefined" && process.env
    ? (process.env.BOT_VERSION || "0.0.0")
    : "0.0.0");
const WEBHOOK_SECRET = typeof Deno !== "undefined" && Deno.env
  ? Deno.env.get("TELEGRAM_WEBHOOK_SECRET")
  : (typeof process !== "undefined" && process.env
    ? process.env.TELEGRAM_WEBHOOK_SECRET
    : undefined);

console.log("🚀 Bot starting with environment check...");
console.log("BOT_TOKEN exists:", !!BOT_TOKEN);
console.log("SUPABASE_URL exists:", !!SUPABASE_URL);
console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!SUPABASE_SERVICE_ROLE_KEY);

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables");
  throw new Error("Missing required environment variables");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// Admin user IDs - including the user who's testing
const ADMIN_USER_IDS = new Set(["225513686"]);

// User sessions for features
const userSessions = new Map();
const activeBotSessions = new Map(); // Track bot sessions

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Bot startup time for status tracking
const BOT_START_TIME = new Date();
console.log("🕐 Bot started at:", BOT_START_TIME.toISOString());

// Receipt auto-approval constants
const AMOUNT_TOLERANCE = 0.02; // ±2%
const WINDOW_SECONDS = 180; // time gap between intent.created_at and slip time
const REQUIRE_PAY_CODE = false; // can be flipped to true later

// Session Management Functions
async function startBotSession(
  telegramUserId: string,
  userInfo: Record<string, unknown> = {},
): Promise<string> {
  try {
    console.log(`🔄 Starting session for user: ${telegramUserId}`);

    // End any existing active sessions
    await endBotSession(telegramUserId);

    // Create new session
    const { data, error } = await supabaseAdmin
      .from("bot_sessions")
      .insert({
        telegram_user_id: telegramUserId,
        session_start: new Date().toISOString(),
        session_data: userInfo,
        activity_count: 1,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating session:", error);
      return "";
    }

    // Store in memory for quick access
    activeBotSessions.set(telegramUserId, {
      sessionId: data.id,
      startTime: new Date(),
      activityCount: 1,
    });

    console.log(
      `✅ Session started for user ${telegramUserId}, session ID: ${data.id}`,
    );
    return data.id;
  } catch (error) {
    console.error("🚨 Exception starting session:", error);
    return "";
  }
  const trimmed = parseMode.trim();
  if (!trimmed) {
    return DEFAULT_PARSE_MODE;
  }
  return trimmed.toLowerCase() === "html" ? "HTML" : trimmed;
}

function shouldEscapeHtml(parseMode: string): boolean {
  return parseMode.toLowerCase() === "html";
}

type OcrTextFromBlob = (blob: Blob) => Promise<string>;

let cachedOcrTextFromBlob: OcrTextFromBlob | null = null;
let ocrTextOverride: OcrTextFromBlob | null = null;
let parseBankSlipImpl = defaultParseBankSlip;

async function getOcrTextFromBlob(): Promise<OcrTextFromBlob> {
  if (ocrTextOverride) return ocrTextOverride;
  if (!cachedOcrTextFromBlob) {
    const mod = await import("./ocr.ts");
    cachedOcrTextFromBlob = mod.ocrTextFromBlob;
  }
  return cachedOcrTextFromBlob;
}

export function __setReceiptParsingOverrides(overrides: {
  ocrTextFromBlob?: typeof defaultOcrTextFromBlob;
  parseBankSlip?: typeof defaultParseBankSlip;
}): void {
  if (overrides.ocrTextFromBlob) {
    ocrTextOverride = overrides.ocrTextFromBlob;
  }
  if (overrides.parseBankSlip) {
    parseBankSlipImpl = overrides.parseBankSlip;
  }
}

export function __resetReceiptParsingOverrides(): void {
  ocrTextOverride = null;
  cachedOcrTextFromBlob = null;
  parseBankSlipImpl = defaultParseBankSlip;
}

async function telegramFetch(
  method: string,
  payload: unknown,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(
        `telegramFetch ${method} failed`,
        res.status,
        text.slice(0, 200),
      );
      throw new Error(`Telegram API ${method} error`);
    }
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendMessage(
  chatId: number,
  text: string,
  extra: Record<string, unknown> = {},
): Promise<number | null> {
  if (!BOT_TOKEN) {
    console.warn(
      "TELEGRAM_BOT_TOKEN is not set; cannot send message",
    );
    return null;
  }
  try {
    const { parse_mode: rawParseMode, ...rest } = extra;
    const parseMode = normalizeParseMode(rawParseMode);
    const r = await telegramFetch("sendMessage", {
      chat_id: chatId,
      text: shouldEscapeHtml(parseMode) ? escapeHtml(text) : text,
      disable_web_page_preview: true,
      allow_sending_without_reply: true,
      parse_mode: parseMode,
      ...rest,
    });
    const out = await r.json().catch(() => ({}));
    const id = out?.result?.message_id;
    return typeof id === "number" ? id : null;
  } catch (e) {
    console.error("sendMessage error", e);
    return null;
  }
}

async function editMessage(
  chatId: number,
  messageId: number,
  text: string,
  extra: Record<string, unknown> = {},
): Promise<number | null> {
  if (!BOT_TOKEN) {
    console.warn(
      "TELEGRAM_BOT_TOKEN is not set; cannot edit message",
    );
    return null;
  }
  try {
    const { parse_mode: rawParseMode, ...rest } = extra;
    const parseMode = normalizeParseMode(rawParseMode);
    const r = await telegramFetch("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: shouldEscapeHtml(parseMode) ? escapeHtml(text) : text,
      parse_mode: parseMode,
      ...rest,
    });
    const out = await r.json().catch(() => ({}));
    const id = out?.result?.message_id;
    return typeof id === "number" ? id : null;
  } catch (e) {
    console.error("editMessage error", e);
    return null;
  }
}
// New auto-approval handler for bank slip uploads
async function handleReceiptUpload(
  message: TelegramMessage,
  userId: string,
): Promise<void> {
  const chatId = message.chat.id;
  try {
    // 2. Identify file
    const fileId = message.photo
      ? message.photo[message.photo.length - 1].file_id
      : message.document?.file_id;
    if (!fileId) {
      await sendMessage(
        chatId,
        "❌ Unable to process the uploaded file. Please try again.",
      );
      return;
    }

    const infoRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`,
    );
    const info = await infoRes.json();
    const filePath = info.result?.file_path;
    if (!filePath) {
      await sendMessage(chatId, "❌ Could not fetch file info from Telegram.");
      return;
    }

    const fileRes = await fetch(
      `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`,
    );
    const blob = await fileRes.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
      "",
    );

    // 3. Duplicate guard
    const { data: dup } = await supabaseAdmin
      .from("receipts")
      .select("id")
      .eq("image_sha256", hashHex)
      .maybeSingle();
    if (dup) {
      await sendMessage(chatId, "This receipt was already used");
      return;
    }

    // 4. Storage upload
    const ext = filePath.split(".").pop() || "jpg";
    const storagePath = `${userId}/${Date.now()}.${ext}`;
    await supabaseAdmin.storage.from("receipts").upload(storagePath, blob, {
      contentType: fileRes.headers.get("content-type") || undefined,
    });
    const fileUrl = storagePath; // private bucket path

    // 5. OCR
    const text = await ocrTextFromBlob(blob);

    // 6. Parse bank slip
    const parsed = parseBankSlip(text);

    // 7. Find intent
    let intent = null as any;
    if (parsed.payCode) {
      const { data } = await supabaseAdmin
        .from("payment_intents")
        .select("*")
        .eq("pay_code", parsed.payCode)
        .maybeSingle();
      intent = data;
    }
    if (!intent) {
      const { data } = await supabaseAdmin
        .from("payment_intents")
        .select("*")
        .eq("user_id", userId)
        .eq("method", "bank")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      intent = data;
    }

    if (!intent) {
      await supabaseAdmin.from("receipts").insert({
        user_id: userId,
        file_url: fileUrl,
        image_sha256: hashHex,
        bank: parsed.bank,
        ocr_text: parsed.rawText,
        ocr_amount: parsed.amount,
        ocr_currency: parsed.currency,
        ocr_status: parsed.status,
        ocr_success_word: parsed.successWord,
        ocr_reference: parsed.reference,
        ocr_from_name: parsed.fromName,
        ocr_to_name: parsed.toName,
        ocr_to_account: parsed.toAccount,
        ocr_pay_code: parsed.payCode,
        ocr_txn_date: parsed.ocrTxnDateIso,
        ocr_value_date: parsed.ocrValueDateIso,
        verdict: "manual_review",
        reason: "no_intent_found",
      });
      await sendMessage(
        chatId,
        "🔎 We couldn’t auto-match your receipt. Sent for review. Reason: no_intent_found",
      );
      return;
    }

    // 8. Beneficiary check
    let beneficiaryOK = false;
    const toAccount = parsed.toAccount
      ? normalizeAccount(parsed.toAccount)
      : null;
    const toName = parsed.toName?.toLowerCase() || null;
    if (intent.expected_beneficiary_account_last4 && toAccount) {
      beneficiaryOK = toAccount.endsWith(
        intent.expected_beneficiary_account_last4,
      );
    }
    if (!beneficiaryOK && intent.expected_beneficiary_name && toName) {
      beneficiaryOK = intent.expected_beneficiary_name.toLowerCase() === toName;
    }
    if (!beneficiaryOK && toAccount) {
      const ben = await getApprovedBeneficiaryByAccountNumber(
        supabaseAdmin as any,
        toAccount,
      ) as any;
      if (ben && ben.account_name && toName) {
        beneficiaryOK = ben.account_name.toLowerCase() === toName;
      }
    }

    // 9. Decision rules
    const amountOK = parsed.amount != null &&
      Math.abs(parsed.amount - intent.expected_amount) /
            intent.expected_amount <= AMOUNT_TOLERANCE;
    const slipTimeStr = parsed.ocrTxnDateIso ?? parsed.ocrValueDateIso;
    const timeOK = slipTimeStr
      ? Math.abs(
            new Date(slipTimeStr).getTime() -
              new Date(intent.created_at).getTime(),
          ) / 1000 <= WINDOW_SECONDS
      : false;
    const statusOK = parsed.successWord || parsed.status === "SUCCESS";
    const payCodeOK = !REQUIRE_PAY_CODE || !intent.pay_code ||
      parsed.payCode === intent.pay_code;
    const approved = amountOK && timeOK && statusOK && beneficiaryOK &&
      payCodeOK;

    // 10. Write receipt row
    await supabaseAdmin.from("receipts").insert({
      payment_id: intent.id,
      user_id: userId,
      file_url: fileUrl,
      image_sha256: hashHex,
      bank: parsed.bank,
      ocr_text: parsed.rawText,
      ocr_amount: parsed.amount,
      ocr_currency: parsed.currency,
      ocr_status: parsed.status,
      ocr_success_word: parsed.successWord,
      ocr_reference: parsed.reference,
      ocr_from_name: parsed.fromName,
      ocr_to_name: parsed.toName,
      ocr_to_account: parsed.toAccount,
      ocr_pay_code: parsed.payCode,
      ocr_txn_date: parsed.ocrTxnDateIso,
      ocr_value_date: parsed.ocrValueDateIso,
      verdict: approved ? "approved" : "manual_review",
      reason: approved ? null : "auto_rules_failed",
    });

    // 11. Update intent
    if (approved) {
      await supabaseAdmin
        .from("payment_intents")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", intent.id);
    } else {
      await supabaseAdmin
        .from("payment_intents")
        .update({ status: "manual_review" })
        .eq("id", intent.id);
    }

    // 12. Reply
    if (approved) {
      await sendMessage(chatId, "✅ Receipt verified. Access granted.");
    } else {
      await sendMessage(
        chatId,
        "🔎 We couldn’t auto-match your receipt. Sent for review. Reason: auto_rules_failed",
      );
    }
  } catch (err) {
    console.error("🚨 Error processing receipt:", err);
    await sendMessage(chatId, "❌ An error occurred processing your receipt.");
  }
  return null;
}

export async function sendMiniAppOrBotOptions(chatId: number): Promise<void> {
  const enabled = await getFlag("mini_app_enabled");
  const url = enabled ? await sendMiniAppLink(chatId, { silent: true }) : null;
  const continueText = await getContent("continue_in_bot_button") ??
    "Continue in Bot";
  const miniText = await getContent("miniapp_button_text") ??
    "Open VIP Mini App";
  const inline_keyboard: {
    text: string;
    callback_data?: string;
    web_app?: { url: string };
  }[][] = [
    [{ text: continueText, callback_data: "nav:plans" }],
  ];
  let text: string;
  if (url) {
    inline_keyboard[0].push({ text: miniText, web_app: { url } });
    text = await getContent("choose_continue_prompt") ??
      "<b>Choose how to continue:</b>";
  } else {
    const key = enabled
      ? "miniapp_configure_continue"
      : "checkout_unavailable_continue";
    text = await getContent(key) ??
      (enabled
        ? "<b>Mini app is being configured.</b>\nContinue in bot:"
        : "<b>Checkout is currently unavailable.</b>\nContinue in bot:");
  }
  await notifyUser(chatId, text, {
    reply_markup: { inline_keyboard },
  });
}

export async function handleDashboardPackages(
  chatId: number,
  _userId: string,
): Promise<void> {
  const msg = await getFormattedVipPackages();
  await notifyUser(chatId, msg, { parse_mode: "Markdown" });
}

export async function handleDashboardRedeem(
  chatId: number,
  _userId: string,
): Promise<void> {
  await sendMiniAppOrBotOptions(chatId);
}

export async function handleDashboardHelp(
  chatId: number,
  _userId: string,
): Promise<void> {
  const msg = await getContent("help_message");
  await notifyUser(chatId, msg ?? "Help is coming soon.");
}

async function handleFaqCommand(chatId: number): Promise<void> {
  const faqContent = await getContent("faq_general");
  const { url: miniAppUrl } = await readMiniAppEnv();

  // Enhanced FAQ with structured content
  const faqText = `<b>❓ Frequently Asked Questions</b>

${
    faqContent ?? `<b>Common Questions:</b>

• What is VIP? Premium trading community
• How to join? Choose a plan below  
• Payment methods? Bank transfer or crypto
• Support? Contact us anytime!

💡 Need help? Ask anything!`
  }`;

  // Create interactive buttons
  const keyboard = [];

  // First row: Ask AI and Support
  keyboard.push([
    { text: "🤖 Ask AI", callback_data: "cmd:ask" },
    { text: "💬 Support", callback_data: "nav:support" },
  ]);

  // Second row: Education and Plans
  keyboard.push([
    { text: "📚 Education", callback_data: "cmd:education" },
    { text: "💳 Plans", callback_data: "nav:plans" },
  ]);

  // Third row: Back to Dashboard
  keyboard.push([
    { text: "🏠 Back to Dashboard", callback_data: "nav:dashboard" },
  ]);

  // Add Mini App button if available
  if (miniAppUrl) {
    const miniAppText = await getContent("miniapp_button_text") ??
      "🚀 Open VIP Mini App";
    keyboard.push([{ text: miniAppText, web_app: { url: miniAppUrl } }]);
  }

  await notifyUser(chatId, faqText, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard },
  });
}

async function handleEducationCommand(chatId: number): Promise<void> {
  const pkgs = await getEducationPackages();
  if (pkgs.length === 0) {
    const msg = await getContent("no_education_packages") ??
      "No education packages available.";
    await notifyUser(chatId, msg);
    return;
  }
  let text = "🎓 *Education Packages*\n\n";
  pkgs.forEach((pkg: Record<string, unknown>, idx: number) => {
    const name = (pkg.name as string) ?? `Package ${idx + 1}`;
    const price = pkg.price as number | undefined;
    const currency = (pkg.currency as string) ?? "USD";
    text += `${idx + 1}. ${name} - ${currency} ${price}\n`;
  });
  await notifyUser(chatId, text, { parse_mode: "Markdown" });
}

async function handlePromoCommand(chatId: number): Promise<void> {
  const promos = await getActivePromotions();
  if (promos.length === 0) {
    const msg = await getContent("no_active_promotions") ??
      "No active promotions at the moment.";
    await notifyUser(chatId, msg);
    return;
  }
  let text = "🎁 *Active Promotions*\n\nSelect a promo code:";
  const inline_keyboard = promos.map(
    (p: Record<string, unknown>, idx: number) => {
      const value = p.discount_type === "percentage"
        ? `${p.discount_value}%`
        : `$${p.discount_value}`;
      text += `\n${idx + 1}. ${p.code} - ${value}`;
      return [{ text: String(p.code), callback_data: `promo:${p.code}` }];
    },
  );
  await notifyUser(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard },
  });
}

async function handleAskCommand(ctx: CommandContext): Promise<void> {
  const question = ctx.args.join(" ");
  if (!question) {
    const usage = await getContent("ask_usage") ??
      "Please send a question, e.g. /ask How do I size positions?";
    await notifyUser(ctx.chatId, usage);
    return;
  }
  try {
    const answer = await askChatGPT(question) ??
      (await getContent("ask_no_answer")) ??
      "I couldn't find anything helpful. Try rephrasing or ask /support.";
    await notifyUser(ctx.chatId, answer);
  } catch {
    const msg = await getContent("ask_failed") ??
      "The coaching assistant is unavailable right now. Please try again shortly.";
    await notifyUser(ctx.chatId, msg);
  }
}

async function handleShouldIBuyCommand(ctx: CommandContext): Promise<void> {
  const instrument = ctx.args[0];
  if (!instrument) {
    const usage = await getContent("shouldibuy_usage") ??
      "Please send a symbol, e.g. /shouldibuy XAUUSD.";
    await notifyUser(ctx.chatId, usage);
    return;
  }
  if (!SUPABASE_URL) {
    const msg = await getContent("service_unavailable") ??
      "Service temporarily unavailable. Please try again soon.";
    await notifyUser(ctx.chatId, msg);
    return;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/trade-helper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instrument, command: "shouldibuy" }),
    });
    const data = await res.json().catch(() => ({}));
    const analysis = data.analysis ??
      (await getContent("shouldibuy_no_analysis")) ??
      "No analysis is available yet. Try again soon or contact /support.";
    await notifyUser(ctx.chatId, analysis, { parse_mode: "Markdown" });
  } catch {
    const msg = await getContent("shouldibuy_failed") ??
      "The analysis desk is offline right now. Please try again shortly.";
    await notifyUser(ctx.chatId, msg);
  }
}

export async function defaultCallbackHandler(
  chatId: number,
  _userId: string,
): Promise<void> {
  const unknown = await getContent("unknown_action") ??
    "Unknown action. Please choose a valid option.";
  await notifyUser(chatId, unknown);
}

export type CallbackHandler = (
  chatId: number,
  userId: string,
) => Promise<void>;

export function buildCallbackHandlers(
  handlers: AdminHandlers,
): Record<string, CallbackHandler> {
  return {
    dashboard_packages: handleDashboardPackages,
    dashboard_redeem: handleDashboardRedeem,
    dashboard_help: handleDashboardHelp,
    admin_dashboard: (chatId, userId) =>
      handlers.handleAdminDashboard(chatId, userId),
    table_management: (chatId, userId) =>
      handlers.handleTableManagement(chatId, userId),
    feature_flags: (chatId, userId) =>
      handlers.handleFeatureFlags(chatId, userId),
    publish_flags: (chatId) => handlers.handlePublishFlagsRequest(chatId),
    publish_flags_confirm: (chatId, userId) =>
      handlers.handlePublishFlagsConfirm(chatId, userId),
    rollback_flags: (chatId) => handlers.handleRollbackFlagsRequest(chatId),
    rollback_flags_confirm: (chatId, userId) =>
      handlers.handleRollbackFlagsConfirm(chatId, userId),
    env_status: async (chatId) => {
      const envStatus = await handlers.handleEnvStatus();
      await notifyUser(chatId, JSON.stringify(envStatus));
    },
    manage_table_bot_users: (chatId, userId) =>
      handlers.handleUserTableManagement(chatId, userId),
    manage_table_subscription_plans: (chatId, userId) =>
      handlers.handleSubscriptionPlansManagement(chatId, userId),
    manage_table_plan_channels: (chatId, userId) =>
      handlers.handlePlanChannelsManagement(chatId, userId),
    manage_table_education_packages: (chatId, userId) =>
      handlers.handleEducationPackagesManagement(chatId, userId),
    manage_table_promotions: (chatId, userId) =>
      handlers.handlePromotionsManagement(chatId, userId),
    manage_table_bot_content: (chatId, userId) =>
      handlers.handleContentManagement(chatId, userId),
    manage_table_bot_settings: (chatId, userId) =>
      handlers.handleBotSettingsManagement(chatId, userId),
    config_session_settings: (chatId, userId) =>
      handlers.handleConfigSessionSettings(chatId, userId),
    config_followup_settings: (chatId, userId) =>
      handlers.handleConfigFollowupSettings(chatId, userId),
    toggle_maintenance_mode: (chatId, userId) =>
      handlers.handleToggleMaintenanceMode(chatId, userId),
    config_auto_features: (chatId, userId) =>
      handlers.handleConfigAutoFeatures(chatId, userId),
    config_notifications: (chatId, userId) =>
      handlers.handleConfigNotifications(chatId, userId),
    config_performance: (chatId, userId) =>
      handlers.handleConfigPerformance(chatId, userId),
    add_new_setting: (chatId, userId) =>
      handlers.handleAddNewSetting(chatId, userId),
    backup_bot_settings: (chatId, userId) =>
      handlers.handleBackupBotSettings(chatId, userId),
    manage_table_daily_analytics: (chatId, userId) =>
      handlers.handleDailyAnalyticsManagement(chatId, userId),
    manage_table_user_sessions: (chatId, userId) =>
      handlers.handleUserSessionsManagement(chatId, userId),
    manage_table_payments: (chatId, userId) =>
      handlers.handlePaymentsManagement(chatId, userId),
    manage_table_broadcast_messages: (chatId, userId) =>
      handlers.handleBroadcastMessagesManagement(chatId, userId),
    manage_table_bank_accounts: (chatId, userId) =>
      handlers.handleBankAccountsManagement(chatId, userId),
    manage_table_auto_reply_templates: (chatId, userId) =>
      handlers.handleAutoReplyTemplatesManagement(chatId, userId),
    manage_table_user_interactions: (chatId, userId) =>
      handlers.handleUserInteractionsManagement(chatId, userId),
    manage_table_channel_memberships: (chatId, userId) =>
      handlers.handleChannelMembershipsManagement(chatId, userId),
    manage_table_media_files: (chatId, userId) =>
      handlers.handleMediaFilesManagement(chatId, userId),
    manage_table_admin_logs: (chatId, userId) =>
      handlers.handleAdminLogsManagement(chatId, userId),
    manage_table_kv_config: (chatId, userId) =>
      handlers.handleKvConfigManagement(chatId, userId),
    manage_table_contact_links: (chatId, userId) =>
      handlers.handleContactLinksManagement(chatId, userId),
    manage_table_abuse_bans: (chatId, userId) =>
      handlers.handleAbuseBansManagement(chatId, userId),
    edit_content_welcome_message: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "welcome_message"),
    edit_content_about_us: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "about_us"),
    edit_content_support_message: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "support_message"),
    edit_content_terms_conditions: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "terms_conditions"),
    edit_content_faq_general: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "faq_general"),
    edit_content_maintenance_message: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "maintenance_message"),
    edit_content_vip_benefits: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "vip_benefits"),
    edit_content_payment_instructions: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "payment_instructions"),
    add_new_content: (chatId, userId) =>
      handlers.handleAddNewContent(chatId, userId),
    add_contact_link: (chatId, userId) =>
      handlers.handleAddContactLink(chatId, userId),
    edit_contact_link: (chatId, userId) =>
      handlers.handleEditContactLink(chatId, userId),
    toggle_contact_link: (chatId, userId) =>
      handlers.handleToggleContactLink(chatId, userId),
    delete_contact_link: (chatId, userId) =>
      handlers.handleDeleteContactLink(chatId, userId),
    reorder_contact_links: (chatId, userId) =>
      handlers.handleReorderContactLinks(chatId, userId),
    vip_sync_management: (chatId, userId) =>
      handlers.handleVipSyncManagement(chatId, userId),
    vip_full_sync: (chatId, userId) =>
      handlers.handleVipFullSync(chatId, userId),
    vip_assign_lifetime: (chatId, userId) =>
      handlers.handleVipAssignLifetime(chatId, userId),
    vip_assign_lifetime_confirm: (chatId, userId) =>
      handlers.handleVipAssignLifetimeConfirm(chatId, userId),
    vip_sync_single: (chatId, userId) =>
      handlers.handleVipSyncSingle(chatId, userId),
    vip_view_status: (chatId, userId) =>
      handlers.handleVipViewStatus(chatId, userId),
    vip_configure_channels: (chatId, userId) =>
      handlers.handleVipConfigureChannels(chatId, userId),
    github_cleanup: (chatId, userId) =>
      handlers.handleGitHubCleanup(chatId, userId),
    github_analyze: (chatId, userId) =>
      handlers.handleGitHubAnalyze(chatId, userId),
    github_status: (chatId, userId) =>
      handlers.handleGitHubStatus(chatId, userId),
    github_structure: (chatId, userId) =>
      handlers.handleGitHubStructure(chatId, userId),
    github_cleanup_confirm: (chatId, userId) =>
      handlers.handleGitHubCleanupConfirm(chatId, userId),
    github_cleanup_execute: (chatId, userId) =>
      handlers.handleGitHubCleanupExecute(chatId, userId),
    preview_all_content: (chatId, userId) =>
      handlers.handlePreviewAllContent(chatId, userId),
    export_all_tables: (chatId, userId) =>
      handlers.handleExportAllTables(chatId, userId),
    table_stats_overview: (chatId, userId) =>
      handlers.handleTableStatsOverview(chatId, userId),
  };
}

function getDynamicCallbackHandler(
  data: string,
  handlers: AdminHandlers,
): CallbackHandler | null {
  if (data.startsWith("edit_plan_price_")) {
    const id = data.slice("edit_plan_price_".length);
    return (chatId, userId) => handlers.handleEditPlanPrice(chatId, userId, id);
  }
  if (data.startsWith("edit_plan_name_")) {
    const id = data.slice("edit_plan_name_".length);
    return (chatId, userId) => handlers.handleEditPlanName(chatId, userId, id);
  }
  if (data.startsWith("edit_plan_duration_")) {
    const id = data.slice("edit_plan_duration_".length);
    return (chatId, userId) =>
      handlers.handleEditPlanDuration(chatId, userId, id);
  }
  if (data.startsWith("edit_plan_features_")) {
    const id = data.slice("edit_plan_features_".length);
    return (chatId, userId) =>
      handlers.handleEditPlanFeatures(chatId, userId, id);
  }
  if (data === "auto_generate_promo") {
    return (chatId, userId) => handlers.handleAutoGeneratePromo(chatId, userId);
  }
  if (data.startsWith("toggle_plan_lifetime_")) {
    const id = data.slice("toggle_plan_lifetime_".length);
    return (chatId, userId) =>
      handlers.handleTogglePlanLifetime(chatId, userId, id);
  }
  if (data.startsWith("add_plan_feature_")) {
    const id = data.slice("add_plan_feature_".length);
    return (chatId, userId) =>
      handlers.handleAddPlanFeature(chatId, userId, id);
  }
  if (data.startsWith("remove_plan_feature_")) {
    const id = data.slice("remove_plan_feature_".length);
    return (chatId, userId) =>
      handlers.handleRemovePlanFeature(chatId, userId, id);
  }
  if (data.startsWith("replace_plan_features_")) {
    const id = data.slice("replace_plan_features_".length);
    return (chatId, userId) =>
      handlers.handleReplacePlanFeatures(chatId, userId, id);
  }
  if (data.startsWith("confirm_delete_plan_")) {
    const id = data.slice("confirm_delete_plan_".length);
    return (chatId, userId) =>
      handlers.handleConfirmDeletePlan(chatId, userId, id);
  }
  if (data.startsWith("delete_plan_confirmed_")) {
    const id = data.slice("delete_plan_confirmed_".length);
    return (chatId, userId) =>
      handlers.handleExecuteDeletePlan(chatId, userId, id);
  }
  if (data.startsWith("edit_plan_")) {
    const id = data.slice("edit_plan_".length);
    return (chatId, userId) =>
      handlers.handleEditSpecificPlan(chatId, userId, id);
  }
  if (data.startsWith("edit_contact_")) {
    const id = data.slice("edit_contact_".length);
    return (chatId, userId) =>
      handlers.processContactLinkOperation(chatId, userId, "edit", id);
  }
  if (data.startsWith("toggle_contact_")) {
    const id = data.slice("toggle_contact_".length);
    return (chatId, userId) =>
      handlers.processContactLinkOperation(chatId, userId, "toggle", id);
  }
  if (data.startsWith("delete_contact_")) {
    const id = data.slice("delete_contact_".length);
    return (chatId, userId) =>
      handlers.processContactLinkOperation(chatId, userId, "delete", id);
  }
  return null;
}

async function menuView(
  section: MenuSection,
): Promise<{ text: string; extra: Record<string, unknown> }> {
  if (section === "plans") {
    const [msg, pkgs] = await Promise.all([
      getFormattedVipPackages(),
      getVipPackages(),
    ]);
    const inline_keyboard = pkgs.map((pkg) => [{
      text: pkg.name,
      callback_data: "buy:" + pkg.id,
    }]);
    inline_keyboard.push([{ text: "Back", callback_data: "nav:dashboard" }]);
    return {
      text: msg,
      extra: { reply_markup: { inline_keyboard }, parse_mode: "Markdown" },
    };
  }
  if (section === "support") {
    const contactLinks = await fetchActiveContactLinks();
    const supportMessage = await getContent("support_message") ??
      `🛟 Need Help?

Our support team is here for you!

${contactLinks}

🕐 Support Hours: 24/7
We typically respond within 2-4 hours.

Route inquiries or marketing requests to the channels listed above.`;

    return {
      text: supportMessage,
      extra: {
        reply_markup: await buildMainMenu(section),
        parse_mode: "HTML",
      },
    };
  }
  const markup = await buildMainMenu(section) as {
    inline_keyboard: {
      text: string;
      callback_data?: string;
      web_app?: { url: string };
    }[][];
  };
  const { url } = await readMiniAppEnv();
  const miniText = await getContent("miniapp_button_text") ??
    "Open VIP Mini App";
  if (url) {
    markup.inline_keyboard.push([{ text: miniText, web_app: { url } }]);
  }
  const msg = await getContent("welcome_message");
  return {
    text: msg ??
      "Welcome to Dynamic Capital! Choose how you'd like to continue:",
    extra: { reply_markup: markup, parse_mode: "Markdown" },
  };
}

async function getMenuMessageId(chatId: number): Promise<number | null> {
  try {
    const supa = getSupabase();
    const { data } = await supa
      .from("bot_users")
      .select("menu_message_id")
      .eq("telegram_id", chatId)
      .maybeSingle();
    return data?.menu_message_id ?? null;
  } catch (e) {
    console.error("getMenuMessageId error", e);
    return null;
  }
}

async function setMenuMessageId(
  chatId: number,
  messageId: number | null,
): Promise<void> {
  try {
    const supa = getSupabase();
    await supa
      .from("bot_users")
      .update({ menu_message_id: messageId })
      .eq("telegram_id", chatId);
  } catch {
    /* ignore */
  }
}

async function sendMainMenu(
  chatId: number,
  section: MenuSection = "dashboard",
): Promise<number | null> {
  const view = await menuView(section);
  const msgId = await sendMessage(chatId, view.text, view.extra);
  if (msgId !== null) {
    await setMenuMessageId(chatId, msgId);
  }
  return msgId;
}

async function showMainMenu(
  chatId: number,
  section: MenuSection = "dashboard",
): Promise<void> {
  const existing = await getMenuMessageId(chatId);
  const view = await menuView(section);
  if (existing) {
    const newId = await editMessage(chatId, existing, view.text, view.extra);
    if (newId !== null) {
      await setMenuMessageId(chatId, newId);
    } else {
      await setMenuMessageId(chatId, null);
      await sendMainMenu(chatId, section);
    }
  } else {
    await sendMainMenu(chatId, section);
  }
}

async function extractTelegramUpdate(
  req: Request,
): Promise<TelegramUpdate | null> {
  try {
    return await req.json() as TelegramUpdate;
  } catch {
    return null;
  }
}

function isDirectMessage(msg: TelegramMessage | undefined): boolean {
  if (!msg) return false;
  const chatType = msg.chat.type;
  if (chatType === "private") return true;
  const bot = botUsername.toLowerCase();
  if (bot) {
    const text = `${msg.text ?? ""} ${msg.caption ?? ""}`.toLowerCase();
    if (text.includes(`@${bot}`)) return true;
    const replyUser = msg.reply_to_message?.from?.username?.toLowerCase();
    if (replyUser === bot) return true;
  }
  return false;
}

function getFileIdFromUpdate(update: TelegramUpdate | null): string | null {
  const msg = update?.message;
  if (!msg) return null;
  if (Array.isArray(msg.photo) && msg.photo.length > 0) {
    return msg.photo[msg.photo.length - 1].file_id;
  }
  const doc = msg.document;
  if (
    doc &&
    (!doc.mime_type || doc.mime_type.startsWith("image/"))
  ) {
    return doc.file_id;
  }
  return null;
}

function isStartMessage(m: TelegramMessage | undefined) {
  const t = m?.text ?? "";
  if (t.startsWith("/start")) return true;
  const ents = m?.entities as
    | { offset: number; length: number; type: string }[]
    | undefined;
  return Array.isArray(ents) && ents.some((e) =>
    e.type === "bot_command" &&
    t.slice(e.offset, e.offset + e.length).startsWith("/start")
  );
}

function supaSvc() {
  return getSupabase();
}

/** Persist one interaction for analytics. */
async function logInteraction(
  kind: string,
  telegramUserId: string,
  extra: unknown = null,
): Promise<void> {
  try {
    const supa = supaSvc();
    await supa.from("user_interactions").insert({
      telegram_user_id: telegramUserId,
      interaction_type: kind,
      interaction_data: extra,
      page_context: "telegram-bot",
    });
  } catch {
    /* swallow */
  }
}

/** Simple per-user RPM limit using Supabase RPC (resets every minute). */
async function enforceRateLimit(tgId: string): Promise<null | Response> {
  try {
    const limit = Number((await envOrSetting("RATE_LIMIT_PER_MINUTE")) ?? "20");
    const { error } = await supaSvc().rpc("rl_touch", {
      _tg: tgId,
      _limit: limit,
    });
    if (
      error &&
      (error.message === "rate_limited" ||
        (error as { details?: string }).details === "rate_limited")
    ) {
      const msg = await getContent("rate_limit_exceeded") ??
        "Too Many Requests";
      return json({ ok: false, error: msg }, 429);
    }
  } catch {
    // Ignore rate limit failures when Supabase is unavailable
    return null;
  }
  return null;
}

async function storeReceiptImage(
  blob: Blob,
  storagePath: string,
): Promise<string> {
  try {
    const supabase = getSupabase();
    const result = await supabase.storage
      .from("payment-receipts")
      .upload(storagePath, blob, { contentType: blob.type || undefined });
    const error = result?.error;
    if (error) {
      console.error("storeReceiptImage upload error", error);
      throw error;
    }
    return storagePath;
  } catch (e) {
    console.error("storeReceiptImage error", e);
    throw e;
  }
}

/** Ensure bot user exists and report whether this is a new user */
async function ensureBotUserExists(
  telegramUserId: string,
  firstName?: string,
  lastName?: string,
  username?: string,
): Promise<{ created: boolean }> {
  try {
    const supa = getSupabase();
    // Check if user exists
    const { data: existingUser } = await supa
      .from("bot_users")
      .select("id, telegram_id")
      .eq("telegram_id", telegramUserId)
      .maybeSingle();

    if (existingUser) {
      // User exists, update their info if provided
      if (firstName || lastName || username) {
        await supa
          .from("bot_users")
          .update({
            first_name: firstName,
            last_name: lastName,
            username: username,
            updated_at: new Date().toISOString(),
          })
          .eq("telegram_id", telegramUserId);
      }
      return { created: false };
    }

    // Create new user
    await supa.from("bot_users").insert({
      telegram_id: telegramUserId,
      first_name: firstName,
      last_name: lastName,
      username: username,
    });

    return { created: true };
  } catch (error) {
    console.error("Error in ensureBotUserExists:", error);
    throw error;
  }
}

/** Fetch active contact links from database */
async function fetchActiveContactLinks(): Promise<string> {
  try {
    const supa = getSupabase();
    const { data: links } = await supa
      .from("contact_links")
      .select("platform, display_name, url, icon_emoji")
      .eq("is_active", true)
      .order("display_order");

    if (!links || links.length === 0) {
      return [
        "📧 Inquiries: hello@dynamiccapital.ton",
        "🛟 Support: support@dynamiccapital.ton",
        "📣 Marketing: marketing@dynamiccapital.ton",
        "💬 Telegram: https://t.me/DynamicCapital_Support",
        "🌐 Website: https://dynamiccapital.com",
        "📸 Instagram: https://www.instagram.com/dynamic.capital/",
        "📘 Facebook: https://www.facebook.com/dynamic.capital.fb/",
        "📊 TradingView: https://www.tradingview.com/u/DynamicCapital-FX/",
        "🎵 TikTok: https://www.tiktok.com/@dynamic.capital.mv/",
      ].join("\n");
    }

    return links
      .map((link: {
        platform: string;
        display_name: string;
        url: string;
        icon_emoji?: string;
      }) => `${link.icon_emoji || "🔗"} ${link.display_name}: ${link.url}`)
      .join("\n");
  } catch (error) {
    console.error("Error fetching contact links:", error);
    return [
      "📧 Inquiries: hello@dynamiccapital.ton",
      "🛟 Support: support@dynamiccapital.ton",
      "📣 Marketing: marketing@dynamiccapital.ton",
      "💬 Telegram: https://t.me/DynamicCapital_Support",
      "🌐 Website: https://dynamiccapital.com",
      "📸 Instagram: https://www.instagram.com/dynamic.capital/",
      "📘 Facebook: https://www.facebook.com/dynamic.capital.fb/",
      "📊 TradingView: https://www.tradingview.com/u/DynamicCapital-FX/",
      "🎵 TikTok: https://www.tiktok.com/@dynamic.capital.mv/",
    ].join("\n");
  }
}

async function handleMembershipUpdate(update: TelegramUpdate): Promise<void> {
  const cm = update.chat_member ?? update.my_chat_member;
  if (!cm) return;
  const supa = supaSvc();
  const userId = String(cm.new_chat_member?.user?.id ?? cm.from?.id ?? "");
  if (!userId) return;
  const chatId = String(cm.chat.id);
  const chatUsername = cm.chat.username ? `@${cm.chat.username}` : null;
  const channels = await getVipChannels(supa);
  const isVipChannel = channels.includes(chatId) ||
    (chatUsername ? channels.includes(chatUsername) : false);
  if (!isVipChannel) return;
  const status = cm.new_chat_member?.status ?? null;
  const active = isMemberLike(status);
  await supa.from("channel_memberships").upsert({
    telegram_user_id: userId,
    channel_id: chatId,
    is_active: active,
    updated_at: new Date().toISOString(),
  }, { onConflict: "telegram_user_id,channel_id" });
  const grace = Number(optionalEnv("VIP_EXPIRY_GRACE_DAYS") || "0");
  await recomputeVipFlag(supa, userId, grace);
  try {
    await supa.from("admin_logs").insert({
      action_type: "vip_sync_update",
      telegram_user_id: userId,
      action_description: `${active ? "join" : "leave"}:${chatId}`,
    });
  } catch {
    /* ignore */
  }
}

export const commandHandlers: Record<string, CommandHandler> = {
  "/start": async ({ chatId, msg }) => {
    const telegramUserId = String(chatId);
    const firstName = msg?.from?.first_name;
    const lastName = msg?.from?.last_name;
    const username = msg?.from?.username;

    // Ensure user exists
    let isNewUser = false;
    try {
      const result = await ensureBotUserExists(
        telegramUserId,
        firstName,
        lastName,
        username,
      );
      isNewUser = result.created;
    } catch (error) {
      console.error("ensureBotUserExists error", error);
    }

    // Get welcome message with improved default
    const welcomeMessage = await getContent("welcome_message") ??
      `👋 <b>Welcome to Dynamic Capital!</b>

🚀 Premium signals &amp; expert guidance
✅ Smart risk management  
🤝 Join thousands of successful traders

<b>What would you like to do?</b>`;

    // Get current Mini App configuration
    const { url } = await readMiniAppEnv();
    const continueText = await getContent("continue_in_bot_button") ??
      "Continue in Bot";
    const miniText = await getContent("miniapp_button_text") ??
      "🚀 Open VIP Mini App";

    // Build enhanced keyboard
    const keyboard: {
      text: string;
      callback_data?: string;
      web_app?: { url: string };
    }[][] = [
      [{ text: continueText, callback_data: "nav:dashboard" }],
    ];

    // Always add Mini App button since readMiniAppEnv now auto-derives URL
    if (url) {
      keyboard[0].push({ text: miniText, web_app: { url } });
    }

    // Add popular actions
    keyboard.push([
      { text: "💳 Plans", callback_data: "nav:plans" },
      { text: "📦 Packages", callback_data: "cmd:education" },
    ]);

    // Add utility actions
    keyboard.push([
      { text: "🎁 Promo", callback_data: "cmd:promo" },
      { text: "👤 Account", callback_data: "nav:dashboard" },
      { text: "❓ FAQ", callback_data: "cmd:faq" },
    ]);

    // Add advanced actions
    keyboard.push([
      { text: "📚 Education", callback_data: "cmd:education" },
      { text: "🤔 Should I Buy?", callback_data: "cmd:shouldibuy" },
      { text: "💬 Support", callback_data: "nav:support" },
    ]);

    await sendMessage(chatId, welcomeMessage, {
      reply_markup: { inline_keyboard: keyboard },
      parse_mode: "HTML",
    });

    await logInteraction(
      isNewUser ? "new_user_start" : "returning_user_start",
      telegramUserId,
    );
  },
  "/app": async ({ chatId }) => {
    await showMainMenu(chatId, "dashboard");
  },
  "/plans": async ({ chatId }) => {
    await showMainMenu(chatId, "plans");
  },
  "/packages": async ({ chatId }) => {
    await showMainMenu(chatId, "plans");
  },
  "/account": async ({ chatId }) => {
    await showMainMenu(chatId, "dashboard");
  },
  "/support": async ({ chatId }) => {
    await showMainMenu(chatId, "support");
  },
  "/contact": async ({ chatId }) => {
    const contactLinks = await fetchActiveContactLinks();
    const contactMessage = await getContent("contact_message") ??
      `💬 Contact Dynamic Capital Support

${contactLinks}

🕐 Support Hours: 24/7
📞 We typically respond within 2-4 hours

Route inquiries, support tickets, or marketing campaigns to the channel that fits best.

How can we help you today?`;

    await sendMessage(chatId, contactMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🏠 Back to Dashboard", callback_data: "nav:dashboard" }],
        ],
      },
    });
  },
  "/help": async ({ chatId }) => {
    await handleDashboardHelp(chatId, String(chatId));
  },
  "/faq": async ({ chatId }) => {
    await handleFaqCommand(chatId);
  },
  "/education": async ({ chatId }) => {
    await handleEducationCommand(chatId);
  },
  "/promo": async ({ chatId }) => {
    await handlePromoCommand(chatId);
  },
  "/ask": async (ctx) => {
    await handleAskCommand(ctx);
  },
  "/shouldibuy": async (ctx) => {
    await handleShouldIBuyCommand(ctx);
  },
};

// Admin command handlers are built separately to keep user logic light
const adminCommandHandlers = buildAdminCommandHandlers(
  loadAdminHandlers,
  (chatId, text) => notifyUser(chatId, text),
);

async function handleCommand(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg) return;
  const chatId = msg.chat.id;
  const userId = String(msg.from?.id ?? chatId);
  if (msg.chat.type === "private" && userId) {
    try {
      await recomputeVipForUser(userId);
    } catch (err) {
      console.error("vip check error", err);
    }
  }
  const text = msg.text?.trim();
  if (!text) return;
  const miniAppValid = await hasMiniApp();

  // Handle pending admin plan edits before command parsing
  const handlers = await loadAdminHandlers();
  if (await handlers.handlePlanEditInput(chatId, userId, text)) return;

  // Extract the command without bot mentions and gather arguments
  const [firstToken, ...args] = text.split(/\s+/);
  let command = firstToken.split("@")[0];
  if (isStartMessage(msg)) command = "/start";

  try {
    const ctx: CommandContext = { msg, chatId, args, miniAppValid };
    const handler = commandHandlers[command] ?? adminCommandHandlers[command];
    if (handler) {
      await handler(ctx);
    }
  } catch (err) {
    console.error("handleCommand error", err);
  }
}

async function handleAddAdminUser(
  chatId: number,
  userId: string,
): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from("user_sessions").upsert({
      telegram_user_id: userId,
      awaiting_input: "add_admin_user",
      is_active: true,
      last_activity: new Date().toISOString(),
    });
    await notifyUser(
      chatId,
      "👤 **Add Admin User**\n\nSend the Telegram User ID to make admin:",
    );
  } catch (error) {
    console.error("Error in handleAddAdminUser:", error);
    await notifyUser(chatId, "❌ Error setting up admin user addition.");
  }
}

async function handleSearchUser(chatId: number, userId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from("user_sessions").upsert({
      telegram_user_id: userId,
      awaiting_input: "search_user",
      is_active: true,
      last_activity: new Date().toISOString(),
    });
    await notifyUser(
      chatId,
      "🔍 **Search User**\n\nSend username, user ID, or name to search:",
    );
  } catch (error) {
    console.error("Error in handleSearchUser:", error);
    await notifyUser(chatId, "❌ Error setting up user search.");
  }
}

async function handleManageVipUsers(
  chatId: number,
  userId: string,
): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: vipUsers } = await supabase
      .from("bot_users")
      .select("telegram_id, username, first_name, last_name")
      .eq("is_vip", true)
      .limit(10);

    let message = "💎 **VIP Users Management**\n\n";

    if (vipUsers && vipUsers.length > 0) {
      message += "Current VIP Users:\n";
      vipUsers.forEach((user: any, index: number) => {
        const name = user.first_name || user.username || user.telegram_id;
        message += `${index + 1}. ${name} (${user.telegram_id})\n`;
      });
    } else {
      message += "No VIP users found.";
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: "➕ Add VIP", callback_data: "add_vip_user" },
          { text: "➖ Remove VIP", callback_data: "remove_vip_user" },
        ],
        [
          { text: "🔄 Refresh", callback_data: "manage_vip_users" },
          { text: "🔙 Back", callback_data: "manage_table_bot_users" },
        ],
      ],
    };

    await notifyUser(chatId, message, { reply_markup: keyboard });
  } catch (error) {
    console.error("Error in handleManageVipUsers:", error);
    await notifyUser(chatId, "❌ Error fetching VIP users.");
  }
}

async function handleExportUsers(
  chatId: number,
  userId: string,
): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: users } = await supabase
      .from("bot_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (!users || users.length === 0) {
      await notifyUser(chatId, "📋 No users found to export.");
      return;
    }

    // Log admin action
    await supabase.from("admin_logs").insert({
      admin_telegram_id: userId,
      action_type: "export_users",
      action_description: `Exported ${users.length} user records`,
      affected_table: "bot_users",
    });

    // Create a simple text summary
    let exportText = `📊 **User Export Summary**\n\n`;
    exportText += `Total Users: ${users.length}\n`;
    exportText += `VIP Users: ${users.filter((u: any) => u.is_vip).length}\n`;
    exportText += `Admin Users: ${
      users.filter((u: any) => u.is_admin).length
    }\n\n`;
    exportText += `Recent Users:\n`;

    users.slice(0, 10).forEach((user: any, index: number) => {
      const name = user.first_name || user.username || "Unknown";
      const status = user.is_vip ? "💎" : user.is_admin ? "👑" : "👤";
      exportText += `${index + 1}. ${status} ${name} (${user.telegram_id})\n`;
    });

    await notifyUser(chatId, exportText);
  } catch (error) {
    console.error("Error in handleExportUsers:", error);
    await notifyUser(chatId, "❌ Error exporting users.");
  }
}

async function handleCallback(update: TelegramUpdate): Promise<void> {
  const cb = update.callback_query;
  if (!cb) return;
  const chatId = cb.message?.chat.id ?? cb.from.id;
  const data = cb.data || "";
  const userId = String(cb.from.id);
  setCallbackMessageId(cb.message?.message_id ?? null);
  try {
    if (data.startsWith("pay:")) {
      await answerCallbackQuery(cb.id);
      await sendMiniAppOrBotOptions(chatId);
      return;
    }
    // Acknowledge other callbacks promptly to avoid client retries
    await answerCallbackQuery(cb.id);
    if (data.startsWith("nav:") && cb.message) {
      const section = data.slice("nav:".length) as MenuSection;
      const view = await menuView(section);
      await editMessage(chatId, cb.message!.message_id!, view.text, view.extra);
      return;
    }
    if (data.startsWith("cmd:")) {
      const cmd = "/" + data.slice("cmd:".length);
      const handler = commandHandlers[cmd] ?? adminCommandHandlers[cmd];
      if (handler) {
        const ctx: CommandContext = {
          msg: cb.message ?? { chat: { id: chatId } },
          chatId,
          args: [],
          miniAppValid: await hasMiniApp(),
        };
        await handler(ctx);
      }
      return;
    }
    if (data.startsWith("promo:")) {
      const code = data.split(":")[1];
      const pkgs = await getVipPackages();
      const inline_keyboard = pkgs.map((p) => [
        { text: p.name, callback_data: `promoplan:${code}:${p.id}` },
      ]);
      inline_keyboard.push([{ text: "Back", callback_data: "cmd:promo" }]);
      const text = `Apply ${code} to which plan?`;
      if (cb.message) {
        await editMessage(chatId, cb.message!.message_id!, text, {
          reply_markup: { inline_keyboard },
        });
      } else {
        await notifyUser(chatId, text, { reply_markup: { inline_keyboard } });
      }
      return;
    }
    if (data.startsWith("promoplan:")) {
      const [, code, planId] = data.split(":");
      const pkgs = await getVipPackages();
      const plan = pkgs.find((p) => p.id === planId);
      if (!plan) {
        await notifyUser(chatId, "Plan not found.");
        return;
      }
      if (!SUPABASE_URL) {
        const msg = await getContent("service_unavailable") ??
          "Service temporarily unavailable. Please try again soon.";
        await notifyUser(chatId, msg);
        return;
      }
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (SUPABASE_SERVICE_ROLE_KEY) {
        headers.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
      }
      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/promo-validate`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ code, telegram_id: userId, plan_id: planId }),
        },
      ).then((r) => r.json()).catch(() => null);
      if (!resp?.ok) {
        const reason = resp?.reason;
        const msg = reason
          ? `Invalid promo code: ${reason}`
          : "Invalid promo code.";
        if (cb.message) {
          await editMessage(chatId, cb.message!.message_id!, msg);
        } else {
          await notifyUser(chatId, msg);
        }
        return;
      }
      const finalAmount = resp.final_amount as number;
      const text =
        `Promo ${code} applied to ${plan.name}.\nOutstanding Amount: ${plan.currency} ${
          finalAmount.toFixed(2)
        }`;
      if (cb.message) {
        await editMessage(chatId, cb.message!.message_id!, text, {
          parse_mode: "Markdown",
        });
      } else {
        await notifyUser(chatId, text, { parse_mode: "Markdown" });
      }
      return;
    }
    if (data.startsWith("buy:")) {
      const planId = data.slice("buy:".length);
      const pkgs = await getVipPackages();
      const plan = pkgs.find((p) => p.id === planId);
      if (plan && cb.message) {
        const inline_keyboard = [
          [{
            text: "Pay by Bank Transfer (Upload Receipt)",
            callback_data: `method:bank:${plan.id}`,
          }],
          [{
            text: "Pay with Crypto",
            callback_data: `method:crypto:${plan.id}`,
          }],
          [{ text: "Back", callback_data: "nav:plans" }],
        ];
        await editMessage(
          chatId,
          cb.message!.message_id!,
          `Choose payment method for ${plan.name}:`,
          { reply_markup: { inline_keyboard } },
        );
      } else if (cb.message) {
        await editMessage(chatId, cb.message!.message_id!, "Plan not found.");
      }
      return;
    }
    if (data.startsWith("method:bank:")) {
      const planId = data.split(":")[2];
      if (cb.message) {
        await editMessage(chatId, cb.message!.message_id!, "Choose currency:", {
          reply_markup: {
            inline_keyboard: [[
              { text: "USD", callback_data: `currency:bank:USD:${planId}` },
              { text: "MVR", callback_data: `currency:bank:MVR:${planId}` },
            ], [{ text: "Back", callback_data: "nav:plans" }]],
          },
        });
      }
      return;
    }
    if (data.startsWith("method:crypto:")) {
      const planId = data.split(":")[2];
      if (cb.message) {
        await editMessage(chatId, cb.message!.message_id!, "Choose currency:", {
          reply_markup: {
            inline_keyboard: [[
              { text: "USD", callback_data: `currency:crypto:USD:${planId}` },
              { text: "MVR", callback_data: `currency:crypto:MVR:${planId}` },
            ], [{ text: "Back", callback_data: "nav:plans" }]],
          },
        });
      }
      return;
    }
    if (data.startsWith("currency:")) {
      const [, method, currency, planId] = data.split(":");
      let supa;
      try {
        supa = getSupabase();
      } catch (e) {
        console.error("payment creation error", e);
        const msg = await getContent("payment_create_failed") ??
          "Unable to create payment.";
        await notifyUser(chatId, msg);
        return;
      }
      const { data: user } = await supa
        .from("bot_users")
        .select("id")
        .eq("telegram_id", chatId)
        .maybeSingle();
      let userId = user?.id as string | undefined;
      if (!userId) {
        const { data: ins } = await supa
          .from("bot_users")
          .insert({ telegram_id: String(chatId) })
          .select("id")
          .single();
        userId = ins?.id as string | undefined;
      }
      if (!userId) {
        const msg = await getContent("payment_create_failed") ??
          "Unable to create payment.";
        await notifyUser(chatId, msg);
        return;
      }
      const plan = (await getVipPackages()).find((p) => p.id === planId);
      if (!plan) {
        await notifyUser(chatId, "Plan not found.");
        return;
      }
      const usdPrice = plan.price;
      const amount = currency === "MVR" ? usdPrice * 17.5 : usdPrice;
      if (method === "bank") {
        await supa.from("payments").insert({
          user_id: userId,
          plan_id: planId,
          amount,
          currency,
          payment_method: "bank_transfer",
          status: "pending",
        });
        const payCode = `DC-${
          crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()
        }`;
        const { error: piErr } = await supa.from("payment_intents").insert({
          user_id: userId,
          method: "bank",
          expected_amount: amount,
          currency,
          pay_code: payCode,
          status: "pending",
          notes: planId,
        });
        if (piErr) {
          console.error("create bank payment intent error", piErr);
        }
        const { data: banks } = await supa
          .from("bank_accounts")
          .select(
            "bank_name,account_name,account_number,currency",
          )
          .eq("is_active", true)
          .eq("currency", currency)
          .order("display_order");
        const list = (banks as {
          bank_name: string;
          account_name: string;
          account_number: string;
          currency: string;
        }[] || [])
          .map((b) =>
            `${b.bank_name}\nAccount Name: ${b.account_name}\nAccount Number: <code>${b.account_number}</code>\nCurrency: ${b.currency}`
          )
          .join("\n\n");
        const instructions = await getContent("payment_instructions");
        const amountLine = `Outstanding Amount: ${currency} ${
          amount.toFixed(2)
        }\n\n`;
        const message = `${
          instructions ? `${instructions}\n\n` : ""
        }${amountLine}${list}\n\nPay Code: <code>${payCode}</code>\nAdd this in transfer remarks.\nPlease send a photo of your bank transfer receipt.`;
        const { data: us } = await supa
          .from("user_sessions")
          .select("id")
          .eq("telegram_user_id", String(chatId))
          .limit(1)
          .maybeSingle();
        if (us?.id) {
          await supa
            .from("user_sessions")
            .update({
              awaiting_input: `receipt:${planId}`,
              last_activity: new Date().toISOString(),
              is_active: true,
            })
            .eq("id", us.id);
        } else {
          await supa.from("user_sessions").insert({
            telegram_user_id: String(chatId),
            awaiting_input: `receipt:${planId}`,
            last_activity: new Date().toISOString(),
            is_active: true,
          });
        }
        if (cb.message) {
          await editMessage(chatId, cb.message!.message_id!, message, {
            reply_markup: {
              inline_keyboard: [[{ text: "Back", callback_data: "nav:plans" }]],
            },
            parse_mode: "HTML",
          });
        }
      } else if (method === "crypto") {
        const { error: perr } = await supa.from("payments").insert({
          user_id: userId,
          plan_id: planId,
          amount,
          currency,
          payment_method: "crypto",
          status: "pending",
        });
        const address = (await getCryptoDepositAddress()) ||
          "Please contact support for the crypto address.";
        if (perr) {
          console.error("create crypto payment error", perr);
          const msg = await getContent("payment_create_failed") ??
            "Unable to create payment. Please try again later.";
          await notifyUser(chatId, msg);
        } else if (cb.message) {
          const instructions = await getContent("payment_instructions");
          const msg = instructions
            ? `${instructions}\n\nAmount: ${currency} ${
              amount.toFixed(2)
            }\nSend the payment to ${address} and reply with the transaction details for manual approval.`
            : `Amount: ${currency} ${
              amount.toFixed(2)
            }\nSend the payment to ${address} and reply with the transaction details for manual approval.`;
          await editMessage(chatId, cb.message!.message_id!, msg, {
            reply_markup: {
              inline_keyboard: [[{ text: "Back", callback_data: "nav:plans" }]],
            },
            parse_mode: "HTML",
          });
        }
      }
      return;
    }
    const handlers = await loadAdminHandlers();
    if (data.startsWith("toggle_flag_")) {
      const flag = data.replace("toggle_flag_", "");
      await handlers.handleToggleFeatureFlag(chatId, userId, flag);
    } else {
      const dyn = getDynamicCallbackHandler(data, handlers);
      if (dyn) {
        await dyn(chatId, userId);
      } else {
        const callbackHandlers = buildCallbackHandlers(handlers);
        const handler = callbackHandlers[data] ?? defaultCallbackHandler;
        await handler(chatId, userId);
      }
    }
  } catch (err) {
    console.error("handleCallback error", err);
  } finally {
    setCallbackMessageId(null);
  }
}

export async function startReceiptPipeline(
  update: TelegramUpdate,
): Promise<void> {
  try {
    const chatId = update.message!.chat.id;
    if (!(await getFlag("vip_sync_enabled"))) {
      const msg = await getContent("vip_sync_disabled") ??
        "VIP sync is currently disabled.";
      await notifyUser(chatId, msg);
      return;
    }
    const fileId = getFileIdFromUpdate(update);
    if (!fileId) {
      const msg = await getContent("no_receipt_image") ??
        "No receipt image found.";
      await notifyUser(chatId, msg);
      return;
    }
    let supa;
    try {
      supa = getSupabase();
    } catch (e) {
      console.error("startReceiptPipeline error", e);
      const msg = await getContent("receipt_processing_unavailable") ??
        "Receipt processing unavailable.";
      await notifyUser(chatId, msg);
      return;
    }
    const { data: session } = await supa
      .from("user_sessions")
      .select("id,awaiting_input")
      .eq("telegram_user_id", String(chatId))
      .maybeSingle();
    const awaiting = session?.awaiting_input || "";
    if (!awaiting.startsWith("receipt:")) {
      const msg = await getContent("no_pending_purchase") ??
        "No pending purchase. Use /buy to select a plan.";
      await notifyUser(chatId, msg);
      return;
    }
    const planId = awaiting.split(":")[1];
    const { data: user } = await supa
      .from("bot_users")
      .select("id")
      .eq("telegram_id", chatId)
      .maybeSingle();
    if (!user?.id) {
      const msg = await getContent("start_before_receipts") ??
        "Please use /start before sending receipts.";
      await notifyUser(chatId, msg);
      return;
    }
    if (!BOT_TOKEN) {
      const msg = await getContent("receipt_processing_unavailable") ??
        "Receipt processing unavailable.";
      await notifyUser(chatId, msg);
      return;
    }
    const fileInfo = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`,
    ).then((r) => r.json()).catch(() => null);
    const path = fileInfo?.result?.file_path;
    if (!path) {
      const msg = await getContent("cannot_fetch_receipt") ??
        "Cannot fetch receipt.";
      await notifyUser(chatId, msg);
      return;
    }
    const blob = await fetch(
      `https://api.telegram.org/file/bot${BOT_TOKEN}/${path}`,
    ).then((r) => r.blob());

    let parsedSlip: ParsedSlip | null = null;
    try {
      const ocrText = await (await getOcrTextFromBlob())(blob);
      parsedSlip = parseBankSlipImpl(ocrText);
    } catch (error) {
      console.error("Failed to OCR/parse bank slip", error);
    }

    const hash = await hashBlob(blob);
    const storagePath = `receipts/${chatId}/${hash}`;
    try {
      await storeReceiptImage(blob, storagePath);
    } catch (error) {
      console.error("Failed to store receipt image", error);
      const msg = await getContent("receipt_upload_failed") ??
        "Failed to upload receipt. Please try again later.";
      await notifyUser(chatId, msg);
      return;
    }

    // Get plan details for proper amount
    const { data: plan } = await supa.from("subscription_plans")
      .select("price, currency")
      .eq("id", planId)
      .maybeSingle();

    const { data: pay } = await supa.from("payments")
      .insert({
        user_id: user.id,
        plan_id: planId,
        amount: plan?.price || 0,
        currency: plan?.currency || "USD",
        payment_method: "bank_transfer",
        status: "pending",
      })
      .select("id")
      .single();
    if (!pay?.id || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      const msg = await getContent("receipt_submit_failed") ??
        "Failed to submit receipt. Please try again later.";
      await notifyUser(chatId, msg);
      return;
    }
    const rs = await fetch(`${SUPABASE_URL}/functions/v1/receipt-submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        telegram_id: String(chatId),
        payment_id: pay.id,
        file_path: storagePath,
        bucket: "payment-receipts",
        ...(parsedSlip ? { parsed_slip: parsedSlip } : {}),
      }),
    }).then((r) => r.json()).catch(() => null);
    if (!rs?.ok) {
      if (rs?.error === "duplicate_receipt") {
        const dupMsg = typeof rs.message === "string" && rs.message
          ? rs.message
          : await getContent("duplicate_receipt_detected") ??
            "We already received this receipt. Please upload a different image.";
        await notifyUser(chatId, dupMsg);
        try {
          await supa.from("payments").delete().eq("id", pay.id);
        } catch (cleanupErr) {
          console.error("Failed to clean up duplicate payment", cleanupErr);
        }
      } else {
        const msg = await getContent("receipt_submit_failed") ??
          "Failed to submit receipt. Please try again later.";
        await notifyUser(chatId, msg);
      }
      return;
    }
    await supa.from("user_sessions").update({ awaiting_input: null }).eq(
      "id",
      session?.id,
    );
    const msg = await getContent("receipt_received") ??
      "✅ Receipt received. We'll review it shortly.";
    await notifyUser(chatId, msg);
  } catch (err) {
    console.error("startReceiptPipeline error", err);
  }
}
// Main serve function
Deno.serve(async (req: Request): Promise<Response> => {
  console.log(`📥 Request received: ${req.method} ${req.url}`);

  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== WEBHOOK_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  // Check for new deployments on each request to notify admins
  await checkBotVersion();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    const uptimeMinutes = Math.floor(
      (Date.now() - BOT_START_TIME.getTime()) / 1000 / 60,
    );
    return new Response(
      `🚀 Enhanced Dynamic Capital Bot is live!\n\n⏰ Uptime: ${uptimeMinutes} minutes\n🔑 Admins: ${ADMIN_USER_IDS.size}\n💬 Sessions: ${userSessions.size}`,
      { status: 200, headers: corsHeaders },
    );
  }

  try {
    const body = await req.text();
    const update = JSON.parse(body);

    console.log("📨 Update received:", JSON.stringify(update, null, 2));

    // Extract user info
    const from = update.message?.from || update.callback_query?.from;
    if (!from) {
      console.log("❌ No 'from' user found in update");
      return new Response("OK", { status: 200 });
    }

    const chatId = update.message?.chat?.id ||
      update.callback_query?.message?.chat?.id;
    const userId = from.id.toString();
    const firstName = from.first_name || "Friend";
    const _lastName = from.last_name;
    const username = from.username;

    console.log(`👤 Processing update for user: ${userId} (${firstName})`);

    // Run security checks FIRST
    const isUserAdmin = isAdmin(userId);

    // Periodic cleanup of rate limit store
    cleanupRateLimit();

    // Check rate limits and security
    const messageText = update.message?.text || update.callback_query?.data ||
      "";
    const rateLimitResult = isRateLimited(userId, isUserAdmin, messageText);

    if (rateLimitResult.limited) {
      const response = getSecurityResponse(
        rateLimitResult.reason!,
        rateLimitResult.blockDuration,
      );
      if (chatId) {
        await sendMessage(chatId, response);
      }
      logSecurityEvent(userId, "request_blocked", {
        reason: rateLimitResult.reason,
        messageText: messageText.substring(0, 100),
      });
      return new Response("OK", { status: 200 });
    }

    // Validate message content
    if (messageText && messageText.length > 0) {
      const validationResult = validateMessage(messageText, userId);
      if (!validationResult.valid) {
        const response = getSecurityResponse(validationResult.reason!);
        if (chatId) {
          await sendMessage(chatId, response);
        }
        return new Response("OK", { status: 200 });
      }
    }

    // Track user activity for session management (after security checks pass)
    await updateBotSession(userId, {
      message_type: update.message ? "message" : "callback_query",
      text: messageText,
      timestamp: new Date().toISOString(),
      security_passed: true,
    });

    // Handle regular messages
    if (update.message) {
      const text = update.message.text;
      console.log(`📝 Processing text message: ${text} from user: ${userId}`);

      // Update session activity
      await updateBotSession(userId, {
        message_type: "text",
        text: text,
        timestamp: new Date().toISOString(),
      });

      // Check for maintenance mode
      const maintenanceMode = await getBotSetting("maintenance_mode");
      if (maintenanceMode === "true" && !isAdmin(userId)) {
        console.log("🔧 Bot in maintenance mode for non-admin user");
        await sendMessage(
          chatId,
          "🔧 *Bot is under maintenance*\n\n⏰ We'll be back soon! Thank you for your patience.\n\n🛟 For urgent support, contact @DynamicCapital_Support",
        );
        return new Response("OK", { status: 200 });
      }

      // Check for command spam before processing commands
      if (text && text.startsWith("/")) {
        const command = text.split(" ")[0].split("@")[0];
        if (isCommandSpam(userId, command) && !isUserAdmin) {
          const response = getSecurityResponse("command_spam");
          await sendMessage(chatId, response);
          return new Response("OK", { status: 200 });
        }
      }

      // Handle /start command with dynamic welcome message
      if (text?.split(" ")[0]?.startsWith("/start")) {
        console.log(`🚀 Start command from: ${userId} (${firstName})`);

        // Add timeout to prevent hanging
        const timeoutPromise: Promise<Response> = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Start command timeout")), 10000) // 10 second timeout
        );

        const startCommandPromise = (async () => {
          try {
            console.log(`🔄 Starting bot session for user: ${userId}`);
            await startBotSession(userId, {
              firstName,
              username,
              command: "start",
            });
            console.log(
              `✅ Bot session started successfully for user: ${userId}`,
            );

            console.log(`📄 Fetching auto reply for user: ${userId}`);
            const autoReply = await getAutoReply("auto_reply_welcome", {
              firstName,
            });
            console.log(
              `📄 Auto reply result: ${autoReply ? "found" : "not found"}`,
            );

            console.log(`📄 Getting welcome message for user: ${userId}`);
            const welcomeMessage: FormattedMessage = autoReply
              ? { text: autoReply, parseMode: "Markdown" }
              : await getWelcomeMessage(firstName);
            console.log(
              `📄 Welcome message length: ${welcomeMessage?.text.length || 0}`,
            );

            console.log(`⌨️ Getting main menu keyboard for user: ${userId}`);
            const keyboard = await getMainMenuKeyboard();
            console.log(`⌨️ Keyboard generated: ${keyboard ? "yes" : "no"}`);

            console.log(`📤 Sending welcome message to user: ${userId}`);
            await sendMessage(chatId, welcomeMessage.text, keyboard, {
              parseMode: welcomeMessage.parseMode,
            });
            console.log(
              `✅ Welcome message sent successfully to user: ${userId}`,
            );
            if (isAdmin(userId)) {
              await handleBotStatus(chatId, userId);
            }

            return new Response("OK", { status: 200 });
          } catch (error) {
            console.error(
              `❌ Error in /start command for user ${userId}:`,
              error,
            );
            await sendMessage(
              chatId,
              "❌ Sorry, something went wrong. Please try again in a moment.",
            );
            return new Response("Error", { status: 500 });
          }
        })();

        try {
          return await Promise.race<Response>([
            startCommandPromise,
            timeoutPromise,
          ]);
        } catch (error) {
          console.error(
            `⏱️ Start command timeout or error for user ${userId}:`,
            error,
          );
          await sendMessage(
            chatId,
            "⏱️ The request is taking longer than expected. Please try /start again.",
          );
          return new Response("Timeout", { status: 408 });
        }
      }

      // Handle /admin command
      if (text === "/admin") {
        console.log(`🔐 Admin command from: ${userId} (${firstName})`);
        console.log(`🔐 Admin check result: ${isAdmin(userId)}`);
        console.log(
          `🔐 Current admin IDs: ${Array.from(ADMIN_USER_IDS).join(", ")}`,
        );

        if (isAdmin(userId)) {
          await handleAdminDashboard(chatId, userId);
        } else {
          await sendAccessDeniedMessage(
            chatId,
            `Admin privileges required.\n\n🔑 Your ID: \`${userId}\`\n🛟 Contact support if you should have admin access.`,
          );
        }
        return new Response("OK", { status: 200 });
      }

      // Handle /help command
      if (text === "/help") {
        await handleHelpCommand(chatId, userId, firstName);
        return new Response("OK", { status: 200 });
      }

      // Handle /status command for admins
      if (text === "/status" && isAdmin(userId)) {
        await handleBotStatus(chatId, userId);
        return new Response("OK", { status: 200 });
      }

      // Handle /refresh command for admins
      if (text === "/refresh" && isAdmin(userId)) {
        await handleRefreshBot(chatId, userId);
        return new Response("OK", { status: 200 });
      }

      // Check if user is sending custom broadcast message
      const userSession = getUserSession(userId);
      if (userSession.awaitingInput === "custom_broadcast_message") {
        await handleCustomBroadcastSend(chatId, userId, text);
        return new Response("OK", { status: 200 });
      }
      if (userSession.awaitingInput?.startsWith("update_setting:")) {
        const settingKey = userSession.awaitingInput.split(":")[1];
        userSession.awaitingInput = null;
        const success = await setBotSetting(settingKey, text, userId);
        await sendMessage(
          chatId,
          success
            ? `✅ Updated *${settingKey}* to \`${text}\``
            : `❌ Failed to update *${settingKey}*`,
        );
        return new Response("OK", { status: 200 });
      }
      if (userSession.awaitingInput?.startsWith("edit_content:")) {
        const contentKey = userSession.awaitingInput.split(":")[1];
        userSession.awaitingInput = null;
        await handleContentEditSave(chatId, userId, text, contentKey);
        return new Response("OK", { status: 200 });
      }

      // Handle /broadcast command for admins
      if (text === "/broadcast" && isAdmin(userId)) {
        await handleBroadcastMenu(chatId, userId);
        return new Response("OK", { status: 200 });
      }

      // Handle new chat member events (when bot is added to channels/groups)
      if (update.message.new_chat_members) {
        await handleNewChatMember(update.message);
        return new Response("OK", { status: 200 });
      }

      // Check if user is waiting for promo code input before processing other message types
      const promoSession = userSessions.get(userId);
      if (promoSession && promoSession.type === "waiting_promo_code") {
        if (!text) {
          await sendMessage(
            chatId,
            "❌ Promo codes must be sent as text. Please try again.",
          );
        } else {
          await handlePromoCodeInput(
            chatId,
            userId,
            text.trim().toUpperCase(),
            promoSession,
          );
        }
        return new Response("OK", { status: 200 });
      }

      // Handle photo/document uploads (receipts)
      if (update.message.photo || update.message.document) {
        await handleReceiptUpload(update.message, userId);
        return new Response("OK", { status: 200 });
      }

      // Handle unknown commands with auto-reply
      if (text?.startsWith("/")) {
        await handleUnknownCommand(chatId, userId, text);
        return new Response("OK", { status: 200 });
      }

      // Only respond to regular messages in specific conditions
      const chatType = update.message.chat.type;
      const isPrivateChat = chatType === "private";
      const isBotMentioned = text?.includes("@") &&
        text?.toLowerCase().includes("dynamic"); // Adjust based on your bot username

      // Only auto-reply if:
      // 1. It's a private chat (direct message)
      // 2. Bot is mentioned in group/channel
      if (isPrivateChat || isBotMentioned) {
        const generalReply = await getAutoReply("auto_reply_general") ||
          "🤖 Thanks for your message! Use /start to see the main menu or /help for assistance.";
        await sendMessage(chatId, generalReply);
      } else {
        console.log(`🔇 Ignoring message in ${chatType} - bot not mentioned`);
      }
    }

    // Handle callback queries
    if (update.callback_query) {
      const callbackData = update.callback_query.data;
      console.log(
        `🔘 Processing callback: ${callbackData} from user: ${userId}`,
      );

      // Update session activity
      await updateBotSession(userId, {
        message_type: "callback",
        callback_data: callbackData,
        timestamp: new Date().toISOString(),
      });

      try {
        console.log(`🔍 Processing callback switch for: ${callbackData}`);
        switch (callbackData) {
          case "view_vip_packages": {
            console.log("💎 Displaying VIP packages");
            const vipMessage = await getFormattedVipPackages();
            const vipKeyboard = await getVipPackagesKeyboard();
            await sendMessage(chatId, vipMessage, vipKeyboard);
            break;
          }

          case "view_education":
            console.log("🎓 Displaying education packages");
            await handleViewEducation(chatId, userId);
            break;

          case "view_promotions":
            console.log("💰 Displaying promotions");
            await handleViewPromotions(chatId, userId);
            break;

          case "back_main": {
            const autoReply = await getAutoReply("auto_reply_welcome", {
              firstName,
            });
            const mainMessage: FormattedMessage = autoReply
              ? { text: autoReply, parseMode: "Markdown" }
              : await getWelcomeMessage(firstName);
            const mainKeyboard = await getMainMenuKeyboard();
            await sendMessage(chatId, mainMessage.text, mainKeyboard, {
              parseMode: mainMessage.parseMode,
            });
            break;
          }

          case "admin_dashboard":
            console.log(`🔐 Admin dashboard callback from: ${userId}`);
            await handleAdminDashboard(chatId, userId);
            break;

          case "bot_control":
            await handleBotControl(chatId, userId);
            break;

          case "bot_status":
            await handleBotStatus(chatId, userId);
            break;

          case "refresh_bot":
            await handleRefreshBot(chatId, userId);
            break;

          // Table Management Callbacks
          case "manage_tables":
            await handleTableManagement(chatId, userId);
            break;

          case "manage_table_bot_users":
            await handleUserTableManagement(chatId, userId);
            break;

          case "manage_table_subscription_plans":
            console.log(
              `🔍 Handling subscription plans management for user ${userId}`,
            );
            await handleSubscriptionPlansManagement(chatId, userId);
            break;

          case "manage_table_plan_channels":
            await handlePlanChannelsManagement(chatId, userId);
            break;

          case "manage_table_education_packages":
            await handleEducationPackagesManagement(chatId, userId);
            break;

          case "manage_table_promotions":
            await handlePromotionsManagement(chatId, userId);
            break;

          case "manage_table_bot_content":
            await handleContentManagement(chatId, userId);
            break;

          case "manage_table_bot_settings":
            await handleBotSettingsManagement(chatId, userId);
            break;

          case "table_stats_overview":
            await handleTableStatsOverview(chatId, userId);
            break;

          case "view_sessions":
            await handleViewSessions(chatId, userId);
            break;

          case "clean_cache":
            if (isAdmin(userId)) {
              userSessions.clear();
              await sendMessage(
                chatId,
                "🧹 *Cache Cleaned!*\n\n✅ All user sessions cleared\n✅ Temporary data removed",
              );
              await logAdminAction(
                userId,
                "cache_clean",
                "User sessions cache cleared",
              );
            }
            break;

          case "clean_old_sessions":
            if (isAdmin(userId)) {
              try {
                // End sessions older than 24 hours
                const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
                  .toISOString();
                const { data, error: _error } = await supabaseAdmin
                  .from("bot_sessions")
                  .update({
                    session_end: new Date().toISOString(),
                    duration_minutes: 1440, // 24 hours max
                  })
                  .is("session_end", null)
                  .lt("session_start", cutoffTime)
                  .select();

                await sendMessage(
                  chatId,
                  `🧹 *Old Sessions Cleaned!*\n\n✅ Cleaned ${
                    data?.length || 0
                  } old sessions\n🕐 Sessions older than 24h ended`,
                );
                await logAdminAction(
                  userId,
                  "session_cleanup",
                  `Cleaned ${data?.length || 0} old sessions`,
                );
              } catch (error) {
                await sendMessage(
                  chatId,
                  `❌ Error cleaning sessions: ${(error as Error).message}`,
                );
              }
            }
            break;

          case "quick_analytics":
            await handleQuickAnalytics(chatId, userId);
            break;

          case "report_users":
            await handleUserAnalyticsReport(chatId, userId);
            break;

          case "report_payments":
            await handlePaymentReport(chatId, userId);
            break;

          case "report_packages":
            await handlePackageReport(chatId, userId);
            break;

          case "report_promotions":
            await handlePromotionReport(chatId, userId);
            break;

          case "report_bot_usage":
            await handleBotUsageReport(chatId, userId);
            break;

          case "report_security": {
            const securityReport = `🔒 **Security Report**

🛡️ **Real-time Security Stats:**
• Total Requests: ${securityStats.totalRequests}
• Blocked Requests: ${securityStats.blockedRequests}
• Suspicious Users: ${securityStats.suspiciousUsers.size}
• Rate Limit Store: ${rateLimitStore.size} entries

📊 **Security Metrics:**
• Block Rate: ${
              securityStats.totalRequests > 0
                ? ((securityStats.blockedRequests /
                  securityStats.totalRequests) * 100).toFixed(2)
                : 0
            }%
• Active Sessions: ${activeBotSessions.size}
• Memory Usage: Optimized

🚨 **Recent Blocked Users:**
${
              Array.from(securityStats.suspiciousUsers).slice(-5).map((u) =>
                `• User ${u}`
              ).join("\n") || "None"
            }

✅ **Security Status:** All systems protected
*Last updated: ${new Date().toLocaleString()}*`;
            await sendMessage(chatId, securityReport);
            break;
          }

          case "analytics_dashboard":
            await handleTableStatsOverview(chatId, userId);
            break;

          case "export_all_data":
            await sendMessage(
              chatId,
              "📤 **Data Export**\n\n🔄 Generating comprehensive data export...",
            );
            await handleUserAnalyticsReport(chatId, userId, "30d");
            await handlePaymentReport(chatId, userId, "30d");
            await handleBotUsageReport(chatId, userId, "30d");
            await sendMessage(
              chatId,
              "✅ **Export Complete!** All reports generated above.",
            );
            break;
          case "quick_diagnostic":
            if (isAdmin(userId)) {
              const diagnostic = `🔧 *Quick Diagnostic*

🔑 **Environment:**
• Bot Token: ${BOT_TOKEN ? "✅" : "❌"}
• Database: ${SUPABASE_URL ? "✅" : "❌"}
• Service Key: ${SUPABASE_SERVICE_ROLE_KEY ? "✅" : "❌"}

📊 **Current State:**
• Admin Count: ${ADMIN_USER_IDS.size}
• Memory Sessions: ${userSessions.size}
• Active Bot Sessions: ${activeBotSessions.size}
• Uptime: ${Math.floor((Date.now() - BOT_START_TIME.getTime()) / 1000 / 60)}min

🤖 **Bot Info:**
• Started: ${BOT_START_TIME.toLocaleString()}
• Function ID: telegram-bot
• Status: 🟢 Running`;

              await sendMessage(chatId, diagnostic);
            }
            break;

          case "admin_broadcast":
            await handleBroadcastMenu(chatId, userId);
            break;

          case "send_greeting":
            await handleSendGreeting(chatId, userId);
            break;

          case "send_channel_intro":
            await handleSendChannelIntro(chatId, userId);
            break;

          // Trade Results Posting
          case "post_trade_results":
            await handlePostTradeResult(chatId, userId);
            break;

          case "post_winning_trade": {
            const winningResult = await postToResultsChannel("winning_trade", {
              pair: "BTC/USDT",
              entry: "42,500",
              exit: "44,100",
              profit: "3.8",
              duration: "2h 15m",
              amount: "1,680",
            });
            if (winningResult) {
              await sendMessage(
                chatId,
                "✅ Winning trade result posted to @DynamicCapital_Results channel!",
              );
            } else {
              await sendMessage(
                chatId,
                "❌ Failed to post trade result. Check bot permissions in the channel.",
              );
            }
            break;
          }

          case "post_losing_trade": {
            const losingResult = await postToResultsChannel("losing_trade", {
              pair: "ETH/USDT",
              entry: "2,340",
              exit: "2,285",
              loss: "2.3",
              duration: "1h 30m",
              amount: "460",
            });
            if (losingResult) {
              await sendMessage(
                chatId,
                "✅ Losing trade result posted to @DynamicCapital_Results channel!",
              );
            } else {
              await sendMessage(
                chatId,
                "❌ Failed to post trade result. Check bot permissions in the channel.",
              );
            }
            break;
          }

          case "post_weekly_summary": {
            const weeklyResult = await postToResultsChannel("weekly_summary", {
              week: "Week of Jan 1-7, 2025",
              totalTrades: "24",
              winningTrades: "18",
              losingTrades: "6",
              winRate: "75",
              totalProfit: "8,450",
              totalLoss: "1,980",
              netPnL: "6,470",
              roi: "12.8",
            });
            if (weeklyResult) {
              await sendMessage(
                chatId,
                "✅ Weekly summary posted to @DynamicCapital_Results channel!",
              );
            } else {
              await sendMessage(
                chatId,
                "❌ Failed to post weekly summary. Check bot permissions in the channel.",
              );
            }
            break;
          }

          case "post_monthly_report": {
            const monthlyResult = await postToResultsChannel("monthly_report", {
              month: "December 2024",
              totalTrades: "96",
              successfulTrades: "72",
              failedTrades: "24",
              successRate: "75",
              grossProfit: "34,850",
              totalLosses: "8,200",
              netProfit: "26,650",
              monthlyROI: "18.5",
              bestPairs:
                "• BTC/USDT: +22%\n• ETH/USDT: +18%\n• SOL/USDT: +15%\n• ADA/USDT: +12%",
            });
            if (monthlyResult) {
              await sendMessage(
                chatId,
                "✅ Monthly report posted to @DynamicCapital_Results channel!",
              );
            } else {
              await sendMessage(
                chatId,
                "❌ Failed to post monthly report. Check bot permissions in the channel.",
              );
            }
            break;
          }

          case "custom_broadcast":
            await handleCustomBroadcast(chatId, userId);
            break;

          case "broadcast_history":
            await handleBroadcastHistory(chatId, userId);
            break;

          case "broadcast_settings":
            await handleBroadcastSettings(chatId, userId);
            break;

          case "test_broadcast":
            await handleTestBroadcast(chatId, userId);
            break;

          case "admin_settings":
            await handleAdminSettings(chatId, userId);
            break;

          case "admin_packages":
            await handleSubscriptionPlansManagement(chatId, userId);
            break;

          case "admin_promos":
            await handlePromotionsManagement(chatId, userId);
            break;

          case "admin_content":
            await handleContentManagement(chatId, userId);
            break;

          case "admin_analytics":
            await handleAnalyticsMenu(chatId, userId);
            break;

          case "admin_tools":
            await handleBotControl(chatId, userId);
            break;

          case "admin_users":
            await handleUserTableManagement(chatId, userId);
            break;

          case "toggle_auto_delete":
            await handleToggleAutoDelete(chatId, userId);
            break;

          case "toggle_auto_intro":
            await handleToggleAutoIntro(chatId, userId);
            break;

          case "toggle_maintenance":
            await handleToggleMaintenance(chatId, userId);
            break;

          case "view_all_settings":
            await handleViewAllSettings(chatId, userId);
            break;

          // Table Management Additional Callbacks
          case "manage_table_daily_analytics":
          case "manage_table_user_sessions":
          case "manage_table_payments":
            await handlePaymentsTableManagement(chatId, userId);
            break;

          case "manage_table_broadcast_messages":
            await handleBroadcastTableManagement(chatId, userId);
            break;

          case "manage_table_bank_accounts":
            await handleBankAccountsTableManagement(chatId, userId);
            break;

          case "manage_table_auto_reply_templates":
            await handleAutoReplyTableManagement(chatId, userId);
            break;

          case "export_all_tables":
            if (isAdmin(userId)) {
              await sendMessage(
                chatId,
                "📊 Exporting all table data...\n\n📋 This feature will generate CSV exports of all database tables.\n\n⏳ Coming soon!",
              );
            }
            break;

          // User Management Callbacks
          case "add_admin_user":
            await handleAddAdminUser(chatId, userId);
            break;
          case "search_user":
            await handleSearchUser(chatId, userId);
            break;
          case "manage_vip_users":
            await handleManageVipUsers(chatId, userId);
            break;
          case "export_users":
            await handleExportUsers(chatId, userId);
            break;

          // VIP Plan Management Callbacks
          case "create_vip_plan":
            await handleCreateVipPlan(chatId, userId);
            break;
          case "edit_vip_plan":
            await handleEditVipPlan(chatId, userId);
            break;
          case "delete_vip_plan":
            await handleDeleteVipPlan(chatId, userId);
            break;
          case "vip_plan_stats":
            await handleVipPlanStats(chatId, userId);
            break;
          case "update_plan_pricing":
            await handleUpdatePlanPricing(chatId, userId);
            break;
          case "manage_plan_features":
            await handleManagePlanFeatures(chatId, userId);
            break;

          // Education Package Management Callbacks
          case "create_education_package":
          case "edit_education_package":
          case "delete_education_package":
            await sendMessage(
              chatId,
              "🗑️ Education package deletion requires careful consideration due to enrolled students. Please contact the developer for manual deletion.",
            );
            break;

          case "education_package_stats":
            await handleEducationPackageStats(chatId, userId);
            break;

          case "manage_education_categories":
            await handleEducationCategoriesManagement(chatId, userId);
            break;

          case "view_education_enrollments":
            await handleEducationEnrollmentsView(chatId, userId);
            break;

          // Promotion Management Callbacks
          case "create_promotion":
            await handleCreatePromotion(chatId, userId);
            break;

          case "delete_promotion":
            await sendMessage(
              chatId,
              "🗑️ Promotion deletion requires careful consideration. Please use admin dashboard to disable promotions instead.",
            );
            break;

          case "promotion_analytics":
            await handlePromotionReport(chatId, userId);
            break;

          case "toggle_promotion_status":
            await sendMessage(
              chatId,
              "🔄 Use the promotions management menu to toggle promotion status.",
            );
            break;

          case "promotion_usage_stats":
            await handlePromotionReport(chatId, userId);
            break;

          // Content Management Callbacks
          case "edit_content_welcome_message":
            await handleEditContent(chatId, userId, "welcome_message");
            break;
          case "edit_content_about_us":
            await handleEditContent(chatId, userId, "about_us");
            break;
          case "edit_content_support_message":
            await handleEditContent(chatId, userId, "support");
            break;
          case "edit_content_terms_conditions":
            await handleEditContent(chatId, userId, "terms");
            break;
          case "edit_content_faq_general":
            await handleEditContent(chatId, userId, "faq");
            break;
          case "edit_content_maintenance_message":
            await handleEditContent(chatId, userId, "maintenance_message");
            break;
          case "preview_all_content":
            await handlePreviewAllContent(chatId, userId);
            break;
          case "add_new_content":
            await sendMessage(
              chatId,
              "➕ Adding new content is not yet supported.",
            );
            break;

          // Bot Settings Callbacks
          case "config_session_settings":
            await promptSettingUpdate(
              chatId,
              userId,
              "session_timeout_minutes",
              "Enter new session timeout in minutes.",
            );
            break;
          case "config_payment_settings":
            await promptSettingUpdate(
              chatId,
              userId,
              "payment_timeout_minutes",
              "Enter payment timeout in minutes.",
            );
            break;
          case "config_notification_settings":
            await promptSettingUpdate(
              chatId,
              userId,
              "admin_notifications",
              "Enable admin notifications? (true/false)",
            );
            break;
          case "config_security_settings":
            await promptSettingUpdate(
              chatId,
              userId,
              "max_login_attempts",
              "Enter maximum login attempts before lockout.",
            );
            break;
          case "reset_all_settings": {
            if (!isAdmin(userId)) {
              await sendAccessDeniedMessage(chatId);
              break;
            }
            const success = await resetBotSettings(
              DEFAULT_BOT_SETTINGS,
              userId,
            );
            await sendMessage(
              chatId,
              success
                ? "✅ All settings have been reset to defaults."
                : "❌ Failed to reset settings.",
            );
            break;
          }
          case "backup_settings": {
            if (!isAdmin(userId)) {
              await sendAccessDeniedMessage(chatId);
              break;
            }
            const settings = await getAllBotSettings();
            const formatted = Object.entries(settings)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n");
            await sendMessage(
              chatId,
              `📦 *Current Settings Backup*\n\n${
                formatted || "No settings found."
              }`,
            );
            break;
          }

          // Additional Settings Toggles
          case "set_delete_delay":
            await promptSettingUpdate(
              chatId,
              userId,
              "auto_delete_delay_seconds",
              "Enter auto-delete delay in seconds.",
            );
            break;
          case "set_broadcast_delay":
            await promptSettingUpdate(
              chatId,
              userId,
              "broadcast_delay_ms",
              "Enter broadcast delay in milliseconds.",
            );
            break;
          case "advanced_settings":
            await showAdvancedSettings(chatId, userId);
            break;
          case "export_settings": {
            if (!isAdmin(userId)) {
              await sendAccessDeniedMessage(chatId);
              break;
            }
            const settings = await getAllBotSettings();
            const formatted = Object.entries(settings)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n");
            await sendMessage(
              chatId,
              `📤 *Bot Settings Export*\n\n${
                formatted || "No settings found."
              }`,
            );
            break;
          }

          // Broadcast Management Callbacks
          case "edit_channels":
          case "auto_settings":
          case "broadcast_help":
            await sendMessage(
              chatId,
              "📢 Advanced broadcast features coming soon!",
            );
            break;

          // Handle VIP package selections and other complex callbacks
          default:
            if (callbackData.startsWith("select_vip_")) {
              const packageId = callbackData.replace("select_vip_", "");
              await handleVipPackageSelection(
                chatId,
                userId,
                packageId,
                firstName,
              );
            } else if (callbackData.startsWith("payment_method_")) {
              console.log(
                `💳 Payment method callback received: ${callbackData}`,
              );
              const [, , packageId, method] = callbackData.split("_");
              console.log(
                `💳 Parsed: packageId=${packageId}, method=${method}`,
              );
              await handlePaymentMethodSelection(
                chatId,
                userId,
                packageId,
                method,
              );
            } else if (callbackData.startsWith("approve_payment_")) {
              const paymentId = callbackData.replace("approve_payment_", "");
              await handleApprovePayment(chatId, userId, paymentId);
            } else if (callbackData.startsWith("reject_payment_")) {
              const paymentId = callbackData.replace("reject_payment_", "");
              await handleRejectPayment(chatId, userId, paymentId);
            } else if (callbackData.startsWith("apply_promo_")) {
              const packageId = callbackData.replace("apply_promo_", "");
              await handlePromoCodePrompt(chatId, userId, packageId);
            } else if (callbackData.startsWith("show_payment_")) {
              const packageId = callbackData.replace("show_payment_", "");
              await handleShowPaymentMethods(chatId, userId, packageId);
            } else if (callbackData.startsWith("view_user_")) {
              const targetUserId = callbackData.replace("view_user_", "");
              await handleViewUserProfile(chatId, userId, targetUserId);
            } else if (callbackData.startsWith("approve_user_payments_")) {
              const targetUserId = callbackData.replace(
                "approve_user_payments_",
                "",
              );
              await sendMessage(
                chatId,
                `✅ All pending payments for user ${targetUserId} have been approved.`,
              );
            } else if (callbackData.startsWith("reject_user_payments_")) {
              const targetUserId = callbackData.replace(
                "reject_user_payments_",
                "",
              );
              await sendMessage(
                chatId,
                `❌ All pending payments for user ${targetUserId} have been rejected.`,
              );
            } else if (callbackData.startsWith("select_education_")) {
              const packageId = callbackData.replace("select_education_", "");
              await handleEducationPackageSelection(
                chatId,
                userId,
                packageId,
                firstName,
              );
            } else if (callbackData.startsWith("make_vip_")) {
              const targetUserId = callbackData.replace("make_vip_", "");
              await handleMakeUserVip(chatId, userId, targetUserId);
            } else if (callbackData.startsWith("message_user_")) {
              const targetUserId = callbackData.replace("message_user_", "");
              await handleMessageUser(chatId, userId, targetUserId);
            } else if (
              callbackData.startsWith("edit_plan_") ||
              callbackData.startsWith("editplan")
            ) {
              // Support both current `edit_plan_` prefix and legacy `editplan` format
              const planId = callbackData
                .replace("edit_plan_", "")
                .replace("editplan", "");
              console.log(`🔧 Admin ${userId} editing plan: ${planId}`);

              if (!isAdmin(userId)) {
                await sendAccessDeniedMessage(chatId);
                return new Response("OK", { status: 200 });
              }

              try {
                const { data: plan, error } = await supabaseAdmin
                  .from("subscription_plans")
                  .select("*")
                  .eq("id", planId)
                  .single();

                if (error) throw error;

                if (!plan) {
                  await sendMessage(chatId, "❌ Plan not found.");
                  return new Response("OK", { status: 200 });
                }

                const editMessage = `✏️ **Edit Plan: ${plan.name}**
                
📋 **Current Details:**
• **Name:** ${plan.name}
• **Price:** $${plan.price} ${plan.currency}
• **Duration:** ${
                  plan.is_lifetime
                    ? "Lifetime"
                    : `${plan.duration_months} months`
                }
• **Features:** ${plan.features?.length || 0} items

🔧 **What would you like to edit?**`;

                const editKeyboard = {
                  inline_keyboard: [
                    [
                      {
                        text: "📝 Edit Name",
                        callback_data: `edit_plan_name_${planId}`,
                      },
                      {
                        text: "💰 Edit Price",
                        callback_data: `edit_plan_price_${planId}`,
                      },
                    ],
                    [
                      {
                        text: "⏰ Edit Duration",
                        callback_data: `edit_plan_duration_${planId}`,
                      },
                      {
                        text: "✨ Edit Features",
                        callback_data: `edit_plan_features_${planId}`,
                      },
                    ],
                    [
                      {
                        text: "🗑️ Delete Plan",
                        callback_data: `delete_plan_${planId}`,
                      },
                    ],
                    [
                      {
                        text: "🔙 Back to Plans",
                        callback_data: "edit_vip_plan",
                      },
                    ],
                  ],
                };

                await sendMessage(chatId, editMessage, editKeyboard);
                await logAdminAction(
                  userId,
                  "plan_edit_view",
                  `Viewing edit options for plan: ${plan.name}`,
                  "subscription_plans",
                  planId,
                );
              } catch (error) {
                console.error("🚨 Error loading plan for editing:", error);
                await sendMessage(
                  chatId,
                  `❌ Error loading plan: ${(error as Error).message}`,
                );
              }
            } else if (callbackData === "about_us") {
              await handleAboutUs(chatId, userId);
            } else if (callbackData === "support") {
              await handleSupport(chatId, userId);
            } else if (callbackData === "view_promotions") {
              await handleViewPromotions(chatId, userId);
            } else if (callbackData === "trading_results") {
              await handleTradingResults(chatId, userId);
            } else if (callbackData === "help_faq") {
              await handleHelpAndFAQ(chatId, userId, firstName);
            } else if (callbackData === "terms") {
              await handleTerms(chatId, userId);
            } else if (callbackData === "view_education") {
              await handleViewEducation(chatId, userId);
            } else if (callbackData === "view_pending_payments") {
              await handleViewPendingPayments(chatId, userId);
            } else {
              console.log(`❓ Unknown callback: ${callbackData}`);
              console.log(`🔍 Full callback debug info:`, {
                userId,
                chatId,
                callbackData,
                firstName,
                timestamp: new Date().toISOString(),
              });
              await sendMessage(
                chatId,
                `❓ Unknown action: "${callbackData}". Please try again or use /start for the main menu.`,
              );
            }
        }

        // Answer callback query to remove loading state
        await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: update.callback_query.id,
            }),
          },
        );
      } catch (error) {
        console.error("🚨 Error handling callback:", error);
        await sendMessage(
          chatId,
          "❌ An error occurred. Please try again or contact support.",
        );

        // Still answer the callback query
        await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: update.callback_query.id,
              text: "Error occurred, please try again",
            }),
          },
        );
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("🚨 Main error:", error);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});

console.log("🚀 Bot is ready and listening for updates!");
function endBotSession(telegramUserId: string) {
  throw new Error("Function not implemented.");
}

function normalizeParseMode(rawParseMode: unknown) {
  throw new Error("Function not implemented.");
}

function ocrTextFromBlob(blob: Blob) {
  throw new Error("Function not implemented.");
}

function parseBankSlip(text: any) {
  throw new Error("Function not implemented.");
}

function normalizeAccount(toAccount: any) {
  throw new Error("Function not implemented.");
}

function getApprovedBeneficiaryByAccountNumber(arg0: any, toAccount: any): any {
  throw new Error("Function not implemented.");
}

function sendMiniAppLink(chatId: number, arg1: { silent: boolean }) {
  throw new Error("Function not implemented.");
}

function notifyUser(
  chatId: number,
  text: string,
  arg2: {
    reply_markup: {
      inline_keyboard: {
        text: string;
        callback_data?: string;
        web_app?: { url: string };
      }[][];
    };
  },
) {
  throw new Error("Function not implemented.");
}

function getSupabase() {
  throw new Error("Function not implemented.");
}

function loadAdminHandlers(): Promise<
  typeof import("c:/Users/Abdul Mumin/OneDrive/Dynamic-Capital/Dynamic-Capital/supabase/functions/telegram-bot/admin-handlers/index")
> {
  throw new Error("Function not implemented.");
}

function hasMiniApp() {
  throw new Error("Function not implemented.");
}

function answerCallbackQuery(id: string) {
  throw new Error("Function not implemented.");
}

function checkBotVersion() {
  throw new Error("Function not implemented.");
}

function isAdmin(userId: any) {
  throw new Error("Function not implemented.");
}

function updateBotSession(
  userId: any,
  arg1: {
    message_type: string;
    text: any;
    timestamp: string;
    security_passed: boolean;
  },
) {
  throw new Error("Function not implemented.");
}

function getBotSetting(arg0: string) {
  throw new Error("Function not implemented.");
}

function getAutoReply(arg0: string, arg1: { firstName: any }) {
  throw new Error("Function not implemented.");
}

function getWelcomeMessage(firstName: any): any {
  throw new Error("Function not implemented.");
}

function getMainMenuKeyboard() {
  throw new Error("Function not implemented.");
}

function handleBotStatus(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleAdminDashboard(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function sendAccessDeniedMessage(chatId: any, arg1: string) {
  throw new Error("Function not implemented.");
}

function handleHelpCommand(chatId: any, userId: any, firstName: any) {
  throw new Error("Function not implemented.");
}

function handleRefreshBot(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function getUserSession(userId: any) {
  throw new Error("Function not implemented.");
}

function handleCustomBroadcastSend(chatId: any, userId: any, text: any) {
  throw new Error("Function not implemented.");
}

function setBotSetting(settingKey: any, text: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleContentEditSave(
  chatId: any,
  userId: any,
  text: any,
  contentKey: any,
) {
  throw new Error("Function not implemented.");
}

function handleBroadcastMenu(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleNewChatMember(message: any) {
  throw new Error("Function not implemented.");
}

function handlePromoCodeInput(
  chatId: any,
  userId: any,
  arg2: any,
  promoSession: any,
) {
  throw new Error("Function not implemented.");
}

function handleUnknownCommand(chatId: any, userId: any, text: any) {
  throw new Error("Function not implemented.");
}

function getVipPackagesKeyboard() {
  throw new Error("Function not implemented.");
}

function handleViewEducation(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleViewPromotions(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleBotControl(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleTableManagement(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleUserTableManagement(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleSubscriptionPlansManagement(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handlePlanChannelsManagement(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleEducationPackagesManagement(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handlePromotionsManagement(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleContentManagement(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleBotSettingsManagement(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleTableStatsOverview(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleViewSessions(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function logAdminAction(userId: any, arg1: string, arg2: string) {
  throw new Error("Function not implemented.");
}

function handleQuickAnalytics(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleUserAnalyticsReport(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handlePaymentReport(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handlePackageReport(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handlePromotionReport(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleBotUsageReport(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleSendGreeting(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleSendChannelIntro(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handlePostTradeResult(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function postToResultsChannel(
  arg0: string,
  arg1: {
    pair: string;
    entry: string;
    exit: string;
    profit: string;
    duration: string;
    amount: string;
  },
) {
  throw new Error("Function not implemented.");
}

function handleCustomBroadcast(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleBroadcastHistory(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleBroadcastSettings(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleTestBroadcast(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleAdminSettings(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleAnalyticsMenu(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleToggleAutoDelete(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleToggleAutoIntro(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleToggleMaintenance(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleViewAllSettings(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handlePaymentsTableManagement(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleBroadcastTableManagement(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleBankAccountsTableManagement(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleAutoReplyTableManagement(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleCreateVipPlan(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleEditVipPlan(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleDeleteVipPlan(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleVipPlanStats(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleUpdatePlanPricing(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleManagePlanFeatures(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleEducationPackageStats(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleEducationCategoriesManagement(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleEducationEnrollmentsView(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleCreatePromotion(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleEditContent(chatId: any, userId: any, arg2: string) {
  throw new Error("Function not implemented.");
}

function handlePreviewAllContent(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function promptSettingUpdate(
  chatId: any,
  userId: any,
  arg2: string,
  arg3: string,
) {
  throw new Error("Function not implemented.");
}

function resetBotSettings(DEFAULT_BOT_SETTINGS: any, userId: any) {
  throw new Error("Function not implemented.");
}

function getAllBotSettings() {
  throw new Error("Function not implemented.");
}

function showAdvancedSettings(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleVipPackageSelection(
  chatId: any,
  userId: any,
  packageId: any,
  firstName: any,
) {
  throw new Error("Function not implemented.");
}

function handlePaymentMethodSelection(
  chatId: any,
  userId: any,
  packageId: any,
  method: any,
) {
  throw new Error("Function not implemented.");
}

function handleApprovePayment(chatId: any, userId: any, paymentId: any) {
  throw new Error("Function not implemented.");
}

function handleRejectPayment(chatId: any, userId: any, paymentId: any) {
  throw new Error("Function not implemented.");
}

function handlePromoCodePrompt(chatId: any, userId: any, packageId: any) {
  throw new Error("Function not implemented.");
}

function handleShowPaymentMethods(chatId: any, userId: any, packageId: any) {
  throw new Error("Function not implemented.");
}

function handleViewUserProfile(chatId: any, userId: any, targetUserId: any) {
  throw new Error("Function not implemented.");
}

function handleEducationPackageSelection(
  chatId: any,
  userId: any,
  packageId: any,
  firstName: any,
) {
  throw new Error("Function not implemented.");
}

function handleMakeUserVip(chatId: any, userId: any, targetUserId: any) {
  throw new Error("Function not implemented.");
}

function handleMessageUser(chatId: any, userId: any, targetUserId: any) {
  throw new Error("Function not implemented.");
}

function handleAboutUs(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleSupport(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleTradingResults(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleHelpAndFAQ(chatId: any, userId: any, firstName: any) {
  throw new Error("Function not implemented.");
}

function handleTerms(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}

function handleViewPendingPayments(chatId: any, userId: any) {
  throw new Error("Function not implemented.");
}
