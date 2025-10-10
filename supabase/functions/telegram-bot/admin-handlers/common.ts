import { createClient } from "../../_shared/client.ts";
import { requireEnv } from "../../_shared/env.ts";

const { TELEGRAM_BOT_TOKEN: BOT_TOKEN } = requireEnv(
  [
    "TELEGRAM_BOT_TOKEN",
  ] as const,
);

export const supabaseAdmin: ReturnType<typeof createClient> = (() => {
  try {
    return createClient("service");
  } catch {
    return {} as ReturnType<typeof createClient>;
  }
})();

let currentMessageId: number | null = null;

export function setCallbackMessageId(id: number | null) {
  currentMessageId = id;
}

const TELEGRAM_MARKDOWN_ESCAPE_PATTERN = /([\\_*\[\]()~`>#+\-=|{}.!])/g;

// Sanitize markdown to prevent Telegram parsing errors
function sanitizeMarkdown(text: string): string {
  return text.replace(TELEGRAM_MARKDOWN_ESCAPE_PATTERN, "\\$1");
}

async function callTelegram(
  method: string,
  payload: Record<string, unknown>,
  retryWithPlainText = false,
) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  try {
    const safePayload = { ...payload };
    const originalContent: {
      text?: string;
      caption?: string;
    } = {};

    const parseMode = typeof safePayload.parse_mode === "string"
      ? safePayload.parse_mode
      : undefined;
    const shouldSanitizeMarkdown = !retryWithPlainText &&
      parseMode === "MarkdownV2";

    if (shouldSanitizeMarkdown && typeof safePayload.text === "string") {
      originalContent.text = safePayload.text;
      safePayload.text = sanitizeMarkdown(safePayload.text);
    }

    if (shouldSanitizeMarkdown && typeof safePayload.caption === "string") {
      originalContent.caption = safePayload.caption;
      safePayload.caption = sanitizeMarkdown(safePayload.caption);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safePayload),
    });
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Telegram API error [${method}]:`, errorData);

      // If markdown parsing failed and we haven't retried yet, try with plain text
      if (
        errorData.includes("can't parse entities") && !retryWithPlainText &&
        parseMode === "MarkdownV2"
      ) {
        console.log("Retrying with plain text due to markdown parsing error");
        const plainPayload = {
          ...payload,
          ...(originalContent.text ? { text: originalContent.text } : {}),
          ...(originalContent.caption
            ? { caption: originalContent.caption }
            : {}),
          parse_mode: undefined,
        };
        return callTelegram(method, plainPayload, true);
      }

      return null;
    }
    return await response.json();
  } catch (error) {
    const safeError = error instanceof Error
      ? { name: error.name, message: error.message }
      : { message: String(error) };
    console.error(`❌ Error calling Telegram API [${method}]:`, safeError);
    return null;
  }
}

export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  // Split long messages into chunks to avoid Telegram limits
  const MAX_MESSAGE_LENGTH = 4096;
  if (text.length > MAX_MESSAGE_LENGTH) {
    const chunks = [];
    let currentChunk = "";
    const lines = text.split("\\n");

    for (const line of lines) {
      if ((currentChunk + line + "\\n").length > MAX_MESSAGE_LENGTH) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = line + "\\n";
      } else {
        currentChunk += line + "\\n";
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    // Send all chunks except the last one without reply markup
    for (let i = 0; i < chunks.length - 1; i++) {
      await sendMessage(chatId, chunks[i]);
    }

    // Send the last chunk with reply markup
    if (chunks.length > 0) {
      return sendMessage(chatId, chunks[chunks.length - 1], replyMarkup);
    }
  }

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
    parse_mode: "MarkdownV2",
    disable_web_page_preview: true, // Improve performance
  };

  if (currentMessageId != null) {
    payload.message_id = currentMessageId;
    const res = await callTelegram("editMessageText", payload);
    currentMessageId = res?.result?.message_id ?? null;
    return res;
  }

  const res = await callTelegram("sendMessage", payload);
  currentMessageId = res?.result?.message_id ?? null;
  return res;
}
