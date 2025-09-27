import { bad, mna, ok, oops } from "../_shared/http.ts";
import { validateTelegramHeader } from "../_shared/telegram_secret.ts";
import { createLogger } from "../_shared/logger.ts";
import { envOrSetting, getContent } from "../_shared/config.ts";
import { readMiniAppEnv } from "../_shared/miniapp.ts";
import { createClient } from "../_shared/client.ts";

interface TelegramMessage {
  text?: string;
  chat?: { id?: number };
}

interface TelegramUpdate {
  update_id?: number;
  message?: TelegramMessage;
}

const baseLogger = createLogger({ function: "telegram-webhook" });

function getLogger(req: Request) {
  return createLogger({
    function: "telegram-webhook",
    requestId: req.headers.get("sb-request-id") ||
      req.headers.get("x-request-id") ||
      crypto.randomUUID(),
  });
}

/**
 * Minimal wrapper around Telegram's sendMessage API.
 * Allows passing through optional payload fields like reply_markup.
 */
const BOT_TOKEN = await envOrSetting("TELEGRAM_BOT_TOKEN");

async function sendMessage(
  chatId: number,
  text: string,
  extra?: Record<string, unknown>,
) {
  if (!BOT_TOKEN) {
    baseLogger.warn(
      "TELEGRAM_BOT_TOKEN is not set; cannot send message",
    );
    return;
  }
  try {
    const resp = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, ...extra }),
      },
    );
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      baseLogger.error("sendMessage failed", {
        status: resp.status,
        body,
      });
    }
  } catch (err) {
    baseLogger.error("sendMessage error", err);
  }
}

export async function handler(req: Request): Promise<Response> {
  const logger = getLogger(req);
  try {
    const url = new URL(req.url);

    // Health/version probe
    if (req.method === "GET" && url.pathname.endsWith("/version")) {
      return ok({ name: "telegram-webhook", ts: new Date().toISOString() });
    }

    // Only accept POST for webhook deliveries
    if (req.method !== "POST") {
      return mna();
    }

    // Telegram signs webhook requests with X-Telegram-Bot-Api-Secret-Token
    // https://core.telegram.org/bots/api#setwebhook
    const authResp = await validateTelegramHeader(req);
    if (authResp) return authResp;

    // Parse the incoming update
    let update: TelegramUpdate | null = null;
    try {
      update = await req.json() as TelegramUpdate;
    } catch (err) {
      logger.error("failed to parse update", err);
      return bad("Invalid JSON");
    }

    const updateId = (update as TelegramUpdate)?.update_id;
    const text = update?.message?.text?.trim();
    const chatId = update?.message?.chat?.id;

    // Idempotency: upsert update_id so duplicates short-circuit
    if (typeof updateId === "number") {
      try {
        const supa = createClient("service");
        const { data, error } = await supa.from("webhook_updates").insert(
          { update_id: updateId },
          { onConflict: "update_id", ignoreDuplicates: true },
        ).select("update_id");
        if (error) {
          logger.error("webhook_updates insert error", error);
        } else if (!data || data.length === 0) {
          logger.info("duplicate update", {
            update_id: updateId,
            decision: "ignored",
          });
          return ok({ ok: true });
        }
      } catch (err) {
        logger.warn("idempotency disabled", err);
      }
    }

    // Basic command dispatcher for simple health/admin commands
    type CommandHandler = (chatId: number) => Promise<void>;

    const handlers: Record<string, CommandHandler> = {
      "/start": async (chatId) => {
        const { url, short } = await readMiniAppEnv();
        const botUsername = (await envOrSetting("TELEGRAM_BOT_USERNAME")) || "";
        const btnText = await getContent("miniapp_button_text") ??
          "Open VIP Mini App";
        const prompt = await getContent("miniapp_open_prompt") ??
          "Join the VIP Mini App:";

        if (url) {
          await sendMessage(chatId, prompt, {
            reply_markup: {
              inline_keyboard: [[{ text: btnText, web_app: { url } }]],
            },
          });
          return;
        }

        if (short && botUsername) {
          await sendMessage(chatId, prompt, {
            reply_markup: {
              inline_keyboard: [[{
                text: btnText,
                url: `https://t.me/${botUsername}/${short}`,
              }]],
            },
          });
          return;
        }

        const msg = await getContent("bot_activated_configuring") ??
          "Bot activated. Mini app is being configured. Please try again soon.";
        await sendMessage(chatId, msg);
      },
      "/ping": async (chatId) => {
        await sendMessage(chatId, JSON.stringify({ pong: true }));
      },
    };

    const command = text?.split(/\s+/)[0];
    if (typeof chatId === "number" && command && handlers[command]) {
      try {
        await handlers[command](chatId);
      } catch (err) {
        logger.error(`error handling ${command}`, err);
      }
    }

    logger.info("update processed", {
      update_id: updateId,
      type: text ? "message" : "unknown",
      decision: "processed",
    });

    return ok({ ok: true });
  } catch (err) {
    logger.error("telegram-webhook handler error", err);
    return oops("Internal Error", String(err));
  }
}

// Start the HTTP server when run as a standalone script in Deno.
export default handler;
if (import.meta.main && typeof Deno !== "undefined") {
  // Use a dynamic import so the module can also be loaded in Node tests
  // where the Deno standard library is unavailable.
  const { serve } = await import(
    "https://deno.land/std@0.224.0/http/server.ts"
  );
  serve(handler);
}
