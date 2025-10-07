const TELEGRAM_ALLOWED_UPDATES = Object.freeze([
  "message",
  "callback_query",
  "inline_query",
  "chat_member",
  "my_chat_member",
] as const);

export type TelegramAllowedUpdate = typeof TELEGRAM_ALLOWED_UPDATES[number];

export function cloneTelegramAllowedUpdates(): TelegramAllowedUpdate[] {
  return [...TELEGRAM_ALLOWED_UPDATES];
}

function normalize(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

let missingSecretWarned = false;

export function expectedSecret(): Promise<string | null> {
  return Promise.resolve(normalize(Deno.env.get("TELEGRAM_WEBHOOK_SECRET")));
}

export function validateTelegramHeader(
  req: Request,
): Promise<Response | null> {
  const exp = normalize(Deno.env.get("TELEGRAM_WEBHOOK_SECRET"));
  if (!exp) {
    if (!missingSecretWarned) {
      missingSecretWarned = true;
      console.warn(
        "[telegram] TELEGRAM_WEBHOOK_SECRET not configured; skipping header validation",
      );
    }
    return Promise.resolve(null);
  }

  const got = normalize(req.headers.get("x-telegram-bot-api-secret-token"));
  if (!got || got !== exp) {
    return Promise.resolve(new Response("Unauthorized", { status: 401 }));
  }
  return Promise.resolve(null);
}
