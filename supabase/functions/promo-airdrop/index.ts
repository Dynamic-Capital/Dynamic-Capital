import { createClient } from "../_shared/client.ts";
import {
  bad,
  corsHeaders,
  methodNotAllowed,
  ok,
  oops,
  unauth,
} from "../_shared/http.ts";
import { optionalEnv } from "../_shared/env.ts";
import { registerHandler } from "../_shared/serve.ts";

type DiscountType = "percentage" | "fixed";

interface AirdropRecipient {
  telegram_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  metadata?: Record<string, unknown>;
}

interface PromoAirdropRequest {
  campaign: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  valid_for_days?: number;
  valid_until?: string;
  max_uses?: number;
  code_prefix?: string;
  code_length?: number;
  recipients: AirdropRecipient[];
  metadata?: Record<string, unknown>;
}

interface PromoInsertResult {
  id: string;
  code: string;
  valid_until: string;
  telegram_id: string;
}

const DEFAULT_VALID_DAYS = 14;
const DEFAULT_CODE_LENGTH = 8;

function authorize(req: Request): boolean {
  const secret = optionalEnv("PROMO_AIRDROP_SECRET");
  if (!secret) return true;

  const header = req.headers.get("authorization");
  const apiKey = req.headers.get("x-api-key");

  if (header && header.toLowerCase().startsWith("bearer ")) {
    return header.slice("bearer ".length).trim() === secret;
  }

  if (apiKey) {
    return apiKey.trim() === secret;
  }

  return false;
}

function isDiscountType(value: unknown): value is DiscountType {
  return value === "percentage" || value === "fixed";
}

function normalizeTelegramId(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
}

function computeValidUntil(payload: PromoAirdropRequest): string | null {
  if (payload.valid_until) {
    const parsed = new Date(payload.valid_until);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const days = Number.isFinite(payload.valid_for_days)
    ? Math.max(1, Math.trunc(payload.valid_for_days!))
    : DEFAULT_VALID_DAYS;
  const result = new Date();
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString();
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(prefix = "DROP", length = DEFAULT_CODE_LENGTH): string {
  const normalizedLength = Math.max(4, Math.min(20, Math.trunc(length)));
  const bytes = new Uint8Array(normalizedLength);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]);
  return `${prefix.toUpperCase()}-${chars.join("")}`;
}

async function ensureBotUser(
  supabase: ReturnType<typeof createClient>,
  recipient: AirdropRecipient,
): Promise<string | null> {
  const telegramId = normalizeTelegramId(recipient.telegram_id);
  if (!telegramId) return null;

  const response = await supabase.rpc("ensure_bot_user", {
    _telegram_id: telegramId,
    _username: recipient.username ?? null,
    _first: recipient.first_name ?? null,
    _last: recipient.last_name ?? null,
  });

  if (response.error) {
    console.error("promo-airdrop: ensure_bot_user failed", response.error);
    return null;
  }

  const id = response.data;
  if (typeof id === "string" && id.trim() !== "") {
    return id;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

async function insertPromotion(
  supabase: ReturnType<typeof createClient>,
  payload: PromoAirdropRequest,
  recipient: AirdropRecipient,
  validUntil: string,
  botUserId: string | null,
): Promise<PromoInsertResult | { error: string; telegram_id: string }> {
  const telegramId = normalizeTelegramId(recipient.telegram_id);
  if (!telegramId) {
    return {
      error: "invalid_telegram_id",
      telegram_id: String(recipient.telegram_id ?? ""),
    };
  }

  const nowIso = new Date().toISOString();
  const description = payload.description
    ? payload.description
    : `${payload.campaign} airdrop for ${telegramId}`;

  const payloadMetadata = isRecord(payload.metadata) ? payload.metadata : {};
  const recipientMetadata = isRecord(recipient.metadata)
    ? recipient.metadata
    : {};

  const metadata = cleanRecord({
    ...payloadMetadata,
    ...recipientMetadata,
    telegram_id: telegramId,
    username: recipient.username ?? null,
    first_name: recipient.first_name ?? null,
    last_name: recipient.last_name ?? null,
  });
  const metadataValue = Object.keys(metadata).length > 0 ? metadata : null;

  const maxUses = Number.isFinite(payload.max_uses)
    ? Math.max(1, Math.trunc(payload.max_uses!))
    : 1;

  const codeLength = Number.isFinite(payload.code_length)
    ? Math.max(4, Math.trunc(payload.code_length!))
    : DEFAULT_CODE_LENGTH;

  const prefix = payload.code_prefix?.trim() || payload.campaign || "DROP";

  const attempts = 5;
  for (let i = 0; i < attempts; i++) {
    const code = generateCode(prefix, codeLength);

    const insert = await supabase
      .from("promotions")
      .insert({
        code,
        description,
        discount_type: payload.discount_type,
        discount_value: payload.discount_value,
        valid_from: nowIso,
        valid_until: validUntil,
        max_uses,
        current_uses: 0,
        is_active: true,
        auto_created: false,
        generated_via: `airdrop:${payload.campaign}`,
        airdrop_campaign: payload.campaign,
        airdrop_metadata: metadataValue,
        airdrop_bot_user_id: botUserId,
        airdrop_target: telegramId,
      })
      .select("id, code, valid_until")
      .maybeSingle();

    if (insert.error) {
      if (insert.error.code === "23505") {
        continue;
      }
      console.error("Failed to insert promotion", insert.error);
      return {
        error: insert.error.code ?? "insert_failed",
        telegram_id: telegramId,
      };
    }

    if (insert.data) {
      return {
        id: insert.data.id as string,
        code: insert.data.code as string,
        valid_until: insert.data.valid_until as string,
        telegram_id: telegramId,
      };
    }
  }

  return { error: "code_generation_failed", telegram_id: telegramId };
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  if (!authorize(req)) {
    return unauth("Invalid promo airdrop secret", req);
  }

  let payload: PromoAirdropRequest | null = null;
  try {
    payload = await req.json();
  } catch (error) {
    console.error("Failed to parse promo-airdrop payload", error);
  }

  if (!payload) {
    return bad("Invalid JSON payload", null, req);
  }

  if (!Array.isArray(payload.recipients) || payload.recipients.length === 0) {
    return bad("At least one recipient is required", null, req);
  }

  if (typeof payload.campaign !== "string" || payload.campaign.trim() === "") {
    return bad("Campaign name is required", null, req);
  }

  if (!isDiscountType(payload.discount_type)) {
    return bad("Invalid discount_type", null, req);
  }

  if (
    typeof payload.discount_value !== "number" ||
    !Number.isFinite(payload.discount_value) ||
    payload.discount_value <= 0
  ) {
    return bad("discount_value must be a positive number", null, req);
  }

  if (
    payload.discount_type === "percentage" &&
    payload.discount_value > 100
  ) {
    return bad("Percentage discounts cannot exceed 100", null, req);
  }

  const validUntil = computeValidUntil(payload);
  if (!validUntil) {
    return bad("Unable to determine valid_until", null, req);
  }

  const supabase = createClient("service");

  const results: PromoInsertResult[] = [];
  const failures: Array<{ telegram_id: string; error: string }> = [];

  for (const recipient of payload.recipients) {
    const telegramId = normalizeTelegramId(recipient.telegram_id);
    if (!telegramId) {
      failures.push({
        telegram_id: String(recipient.telegram_id ?? ""),
        error: "invalid_telegram_id",
      });
      continue;
    }

    const botUserId = await ensureBotUser(supabase, recipient);
    if (!botUserId) {
      failures.push({ telegram_id: telegramId, error: "bot_user_sync_failed" });
      continue;
    }

    const inserted = await insertPromotion(
      supabase,
      payload,
      recipient,
      validUntil,
      botUserId,
    );

    if ("error" in inserted) {
      failures.push({ telegram_id: telegramId, error: inserted.error });
      continue;
    }

    results.push(inserted);
  }

  if (results.length === 0) {
    return oops("Failed to create any promo airdrops", { failures }, req);
  }

  return ok({
    campaign: payload.campaign,
    created: results,
    failed: failures,
    valid_until: validUntil,
  }, req);
});

export default handler;
