import { optionalEnv } from "../_shared/env.ts";
import { expectedSecret } from "../_shared/telegram_secret.ts";
import { registerHandler } from "../_shared/serve.ts";

const BOT = optionalEnv("TELEGRAM_BOT_TOKEN") || "";
const BASE = (optionalEnv("SUPABASE_URL") || "").replace(/\/$/, "");
const FN = "telegram-webhook";
const expected = BASE ? `${BASE}/functions/v1/${FN}` : null;

function red(s: string, keep = 4) {
  return s ? s.slice(0, keep) + "...redacted" : "";
}

export const handler = registerHandler(async () => {
  const SECRET = await expectedSecret();
  if (!BOT) {
    return new Response(
      JSON.stringify({ ok: false, error: "BOT_TOKEN missing" }),
      { headers: { "content-type": "application/json" }, status: 500 },
    );
  }
  const info = await fetch(`https://api.telegram.org/bot${BOT}/getWebhookInfo`)
    .then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));
  return new Response(
    JSON.stringify({
      ok: true,
      expected_url: expected,
      has_secret: !!SECRET,
      token_preview: red(BOT),
      webhook_info: info,
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
