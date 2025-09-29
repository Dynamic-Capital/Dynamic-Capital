"use client";

import { useCallback } from "react";

import { MAX_HISTORY } from "@/services/dynamic-ai/constants";
import {
  chatHistorySchema,
  type ChatMessage,
  chatMessageSchema,
  type ChatRequestPayload,
  type TelegramAuthData,
  telegramAuthSchema,
} from "@/services/dynamic-ai/schema";

interface UseDynamicChatOptions {
  sessionId?: string;
  telegramData?: TelegramAuthData;
}

interface FetchHistoryResult {
  messages: ChatMessage[];
}

interface SendMessageOptions {
  message: string;
  history: ChatMessage[];
}

interface SendMessageResult {
  assistantMessage: ChatMessage | null;
  history: ChatMessage[];
  metadata?: Record<string, unknown>;
}

export type DynamicChatErrorCategory =
  | "network"
  | "server"
  | "rate-limit"
  | "validation"
  | "client"
  | "unknown";

interface DynamicChatErrorOptions {
  status?: number;
  requestId?: string | null;
  hint?: unknown;
  category?: DynamicChatErrorCategory;
  cause?: unknown;
}

export class DynamicChatError extends Error {
  readonly status?: number;
  readonly requestId?: string | null;
  readonly hint?: unknown;
  readonly category: DynamicChatErrorCategory;
  readonly cause?: unknown;

  constructor(message: string, options: DynamicChatErrorOptions = {}) {
    super(message);
    this.name = "DynamicChatError";
    this.status = options.status;
    this.requestId = options.requestId;
    this.hint = options.hint;
    this.category = options.category ?? inferCategory(options.status);
    this.cause = options.cause;
  }

  get isRetryable(): boolean {
    return this.category === "network" || this.category === "server";
  }

  get isRecoverable(): boolean {
    return this.category === "rate-limit" || this.category === "validation";
  }
}

function inferCategory(status?: number): DynamicChatErrorCategory {
  if (status === undefined) {
    return "network";
  }
  if (status >= 500) {
    return "server";
  }
  if (status === 429) {
    return "rate-limit";
  }
  if (status === 400 || status === 422) {
    return "validation";
  }
  if (status >= 400) {
    return "client";
  }
  return "unknown";
}

async function parseErrorResponse(response: Response) {
  try {
    return await response.json() as { error?: string; hint?: unknown };
  } catch (error) {
    console.warn("Failed to parse chat error payload", error);
    return {} as { error?: string; hint?: unknown };
  }
}

function parseHistory(raw: unknown): ChatMessage[] {
  const parsed = chatHistorySchema.safeParse(raw);
  if (!parsed.success) {
    return [];
  }
  return parsed.data.map((item) => chatMessageSchema.parse(item));
}

export function useDynamicChat({
  sessionId,
  telegramData,
}: UseDynamicChatOptions) {
  const fetchHistory = useCallback(async (): Promise<FetchHistoryResult> => {
    if (!sessionId) {
      return { messages: [] };
    }

    const query = new URLSearchParams({ sessionId });

    let response: Response;
    try {
      response = await fetch(`/api/dynamic-ai/chat?${query.toString()}`);
    } catch (error) {
      throw new DynamicChatError("Network error while loading chat history", {
        cause: error,
        category: "network",
      });
    }

    if (!response.ok) {
      const body = await parseErrorResponse(response);
      throw new DynamicChatError(
        body?.error ?? `Failed to load chat history (${response.status})`,
        {
          status: response.status,
          requestId: response.headers.get("x-request-id"),
          hint: body?.hint,
        },
      );
    }

    const payload = await response.json() as { messages?: unknown };
    const messages = parseHistory(payload.messages);
    return { messages };
  }, [sessionId]);

  const sendMessage = useCallback(async (
    options: SendMessageOptions,
  ): Promise<SendMessageResult> => {
    if (!sessionId) {
      throw new Error("Missing chat session");
    }

    const trimmedHistory = options.history.slice(-MAX_HISTORY);
    const payload: ChatRequestPayload = {
      sessionId,
      message: options.message,
      history: trimmedHistory,
      telegram: telegramData
        ? telegramAuthSchema.parse(telegramData)
        : undefined,
    };

    let response: Response;
    try {
      response = await fetch("/api/dynamic-ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload satisfies ChatRequestPayload),
      });
    } catch (error) {
      throw new DynamicChatError("Network error while sending message", {
        cause: error,
        category: "network",
      });
    }

    const body = await response.json() as {
      assistantMessage?: unknown;
      history?: unknown;
      metadata?: Record<string, unknown>;
      error?: string;
      hint?: unknown;
    };

    if (!response.ok) {
      throw new DynamicChatError(
        body?.error ?? "Dynamic AI request failed",
        {
          status: response.status,
          requestId: response.headers.get("x-request-id"),
          hint: body?.hint,
        },
      );
    }

    const history = parseHistory(body.history);
    const assistantMessage = body.assistantMessage
      ? chatMessageSchema.safeParse(body.assistantMessage).success
        ? chatMessageSchema.parse(body.assistantMessage)
        : null
      : null;

    return {
      assistantMessage,
      history,
      metadata: body.metadata,
    };
  }, [sessionId, telegramData]);

  return {
    fetchHistory,
    sendMessage,
  };
}
