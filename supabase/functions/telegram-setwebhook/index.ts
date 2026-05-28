import { optionalEnv } from "../_shared/env.ts";
import {
  expectedSecret,
  TELEGRAM_ALLOWED_UPDATES_JSON,
} from "../_shared/telegram_secret.ts";
import { registerHandler } from "../_shared/serve.ts";
import { telegramWebhookUrl } from "../_shared/edge.ts";

const BOT = optionalEnv("TELEGRAM_BOT_TOKEN") || "";
const url = telegramWebhookUrl() || "";

export const handler = registerHandler(async (req) => {
  const SECRET = await expectedSecret();
  if (!BOT || !url) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing BOT or BASE URL" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
  const u = new URL(req.url);
  const drop = u.searchParams.get("drop") === "1"; // optional: delete webhook first
  const dry = u.searchParams.get("dry") === "1"; // optional: dry-run

  if (dry) {
    return new Response(
      JSON.stringify({
        ok: true,
        dry: true,
        target: url,
        uses_secret: !!SECRET,
      }),
      { headers: { "content-type": "application/json" } },
    );
  }

  if (drop) {
    await fetch(`https://api.telegram.org/bot${BOT}/deleteWebhook`, {
      method: "POST",
    }).catch(() => null);
  }
  const form = new URLSearchParams();
  form.set("url", url);
  if (SECRET) form.set("secret_token", SECRET);
  form.set("allowed_updates", TELEGRAM_ALLOWED_UPDATES_JSON);

  const res = await fetch(`https://api.telegram.org/bot${BOT}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const json = await res.json().catch(() => null);
  return new Response(
    JSON.stringify({
      ok: res.ok,
      status: res.status,
      result: json,
      target: url,
      used_secret: !!SECRET,
    }),
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    },
  );
});

export default handler;
