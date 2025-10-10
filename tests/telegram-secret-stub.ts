const TELEGRAM_ALLOWED_UPDATES = Object.freeze(
  [
    "message",
    "callback_query",
    "inline_query",
    "chat_member",
    "my_chat_member",
  ] as const,
);

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
  const ignore = (detail: "missing" | "mismatch") => {
    console.warn(
      `[telegram] invalid webhook secret (${detail}); ignoring request`,
    );
    return new Response(
      JSON.stringify({
        ok: true,
        ignored: true,
        reason: "invalid_webhook_secret",
        detail,
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      },
    );
  };

  if (!got) {
    return Promise.resolve(ignore("missing"));
  }
  if (got !== exp) {
    return Promise.resolve(ignore("mismatch"));
  }
  return Promise.resolve(null);
}
