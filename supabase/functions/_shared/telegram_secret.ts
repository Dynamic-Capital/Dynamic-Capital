import { maybe, optionalEnv } from "./env.ts";
import { unauth } from "./http.ts";
import { getSetting } from "./config.ts";

const TELEGRAM_ALLOWED_UPDATES_BASE = [
  "message",
  "callback_query",
  "inline_query",
  "chat_member",
  "my_chat_member",
] as const;

export type TelegramAllowedUpdate =
  typeof TELEGRAM_ALLOWED_UPDATES_BASE[number];

export const TELEGRAM_ALLOWED_UPDATES: ReadonlyArray<TelegramAllowedUpdate> =
  Object.freeze(Array.from(new Set(TELEGRAM_ALLOWED_UPDATES_BASE)));

export const TELEGRAM_ALLOWED_UPDATES_JSON = JSON.stringify(
  TELEGRAM_ALLOWED_UPDATES,
);

export function cloneTelegramAllowedUpdates(): TelegramAllowedUpdate[] {
  return [...TELEGRAM_ALLOWED_UPDATES];
}

interface Query {
  eq: (key: string, value: string | boolean) => Query;
  limit: (n: number) => Query;
  maybeSingle: () => Promise<{ data?: { setting_value?: unknown } | null }>;
}

interface SupabaseLike {
  from: (table: string) => {
    select: (columns: string) => Query;
    upsert: (
      values: Record<string, unknown>,
      options: { onConflict: string },
    ) => Promise<{ error?: { message: string } | undefined }>;
  };
}

const SECRET_DECODER = new TextDecoder();

function decodeSecretBytes(
  value: ArrayBufferView | ArrayBuffer,
): string | null {
  try {
    const view = value instanceof Uint8Array
      ? value
      : value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    const decoded = SECRET_DECODER.decode(view).trim();
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

function normalizeSecretValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (value == null) return null;
  if (value instanceof Uint8Array) {
    return decodeSecretBytes(value);
  }
  if (ArrayBuffer.isView(value)) {
    return decodeSecretBytes(value);
  }
  if (value instanceof ArrayBuffer) {
    return decodeSecretBytes(value);
  }
  return null;
}

export async function readDbWebhookSecret(
  supa?: SupabaseLike,
): Promise<string | null> {
  try {
    if (supa) {
      const { data } = await supa.from("bot_settings")
        .select("setting_value")
        .eq("setting_key", "TELEGRAM_WEBHOOK_SECRET")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      return normalizeSecretValue(data?.setting_value);
    }
    return normalizeSecretValue(
      await getSetting<string | Uint8Array>("TELEGRAM_WEBHOOK_SECRET"),
    );
  } catch (error) {
    console.error("[telegram] failed to read webhook secret", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}
export async function expectedSecret(
  supa?: SupabaseLike,
): Promise<string | null> {
  return (await readDbWebhookSecret(supa)) ||
    normalizeSecretValue(optionalEnv("TELEGRAM_WEBHOOK_SECRET"));
}

function genHex(n = 24) {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function ensureWebhookSecret(
  supa: SupabaseLike,
  envSecret?: string | null,
): Promise<string> {
  const existing = await readDbWebhookSecret(supa);
  if (existing) return existing;
  const secret = normalizeSecretValue(envSecret) ??
    normalizeSecretValue(maybe("TELEGRAM_WEBHOOK_SECRET")) ??
    genHex(24);
  const { error } = await supa.from("bot_settings").upsert({
    setting_key: "TELEGRAM_WEBHOOK_SECRET",
    setting_value: secret,
    is_active: true,
  }, { onConflict: "setting_key" });
  if (error) throw new Error("upsert bot_settings failed: " + error.message);
  return secret;
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}
let missingSecretLogged = false;

export async function validateTelegramHeader(
  req: Request,
): Promise<Response | null> {
  const url = new URL(req.url);
  if (
    req.method === "GET" &&
    (url.pathname.endsWith("/version") || url.pathname.endsWith("/echo"))
  ) {
    return null;
  }
  let exp: string | null;
  try {
    exp = await expectedSecret();
  } catch (error) {
    console.error(
      "[telegram] unable to resolve expected webhook secret",
      error,
    );
    return unauth("secret lookup failure", req);
  }
  if (!exp) {
    if (!missingSecretLogged) {
      missingSecretLogged = true;
      console.warn(
        "[telegram] TELEGRAM_WEBHOOK_SECRET not configured; skipping header validation",
      );
    }
    return null;
  }
  const got = normalizeSecretValue(
    req.headers.get("x-telegram-bot-api-secret-token"),
  );
  if (!got || !timingSafeEqual(got, exp)) {
    return unauth("bad secret", req);
  }
  return null;
}
