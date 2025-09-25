import { getEnvVar } from "@/utils/env.ts";

export const TELEGRAM_API_BASE = "https://api.telegram.org";

export interface TelegramClientOptions {
  token?: string;
  apiBaseUrl?: string;
}

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export interface TelegramMessage {
  message_id: number;
  chat: {
    id: number;
    type: string;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  date: number;
  text?: string;
}

export interface SendMessagePayload {
  chat_id: number | string;
  text: string;
  parse_mode?: "MarkdownV2" | "HTML" | "Markdown";
  disable_web_page_preview?: boolean;
  reply_markup?: Record<string, unknown>;
}

export interface AnswerCallbackPayload {
  callback_query_id: string;
  text?: string;
  show_alert?: boolean;
  url?: string;
  cache_time?: number;
}

export interface SetWebhookPayload {
  url: string;
  secret_token?: string;
  drop_pending_updates?: boolean;
  allowed_updates?: string[];
}

export class TelegramBotClient {
  readonly token: string;
  readonly baseUrl: string;

  constructor(options: TelegramClientOptions = {}) {
    const token = options.token ?? getEnvVar("TELEGRAM_BOT_TOKEN");
    if (!token) {
      throw new Error("Missing TELEGRAM_BOT_TOKEN");
    }
    this.token = token;
    const base = options.apiBaseUrl ?? TELEGRAM_API_BASE;
    this.baseUrl = base.replace(/\/$/, "");
  }

  private endpoint(method: string) {
    return `${this.baseUrl}/bot${this.token}/${method}`;
  }

  private async request<T>(method: string, payload: unknown): Promise<T> {
    const res = await fetch(this.endpoint(method), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    });
    const json = (await res.json()) as TelegramApiResponse<T>;
    if (!json.ok || !json.result) {
      throw new Error(
        json.description
          ? `Telegram API error: ${json.description}`
          : "Telegram API request failed",
      );
    }
    return json.result;
  }

  sendMessage(payload: SendMessagePayload): Promise<TelegramMessage> {
    return this.request<TelegramMessage>("sendMessage", payload);
  }

  answerCallbackQuery(payload: AnswerCallbackPayload): Promise<true> {
    return this.request<true>("answerCallbackQuery", payload);
  }

  setWebhook(payload: SetWebhookPayload): Promise<true> {
    return this.request<true>("setWebhook", payload);
  }
}

export function getTelegramAppCredentials() {
  const appId = getEnvVar("TELEGRAM_APP_ID");
  const appHash = getEnvVar("TELEGRAM_APP_HASH");
  if (!appId || !appHash) {
    throw new Error("Missing Telegram mini app credentials");
  }
  return { appId, appHash } as const;
}
