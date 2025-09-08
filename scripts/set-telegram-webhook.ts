/**
 * Node script to set the Telegram webhook with a secret token
 * and print the current webhook info.
 *
 * Env vars:
 *  TELEGRAM_BOT_TOKEN
 *  TELEGRAM_WEBHOOK_SECRET
 *  SUPABASE_URL (e.g. https://<project>.supabase.co)
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const baseUrl = process.env.SUPABASE_URL;

if (!token || !secret || !baseUrl) {
  console.error("Missing required env TELEGRAM_BOT_TOKEN/TELEGRAM_WEBHOOK_SECRET/SUPABASE_URL");
  process.exit(1);
}

const webhookUrl = `${baseUrl.replace(/\/$/, "")}/functions/v1/telegram-webhook`;

const params = new URLSearchParams();
params.set("url", webhookUrl);
params.set("secret_token", secret);

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: params,
});
const json = await res.json();
if (!res.ok || !json.ok) {
  console.error("Failed to set webhook", json);
  process.exit(1);
}

const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
const infoJson = await infoRes.json();
console.log(JSON.stringify(infoJson, null, 2));

