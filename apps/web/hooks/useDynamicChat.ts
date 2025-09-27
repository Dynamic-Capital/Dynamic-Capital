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
    const response = await fetch(`/api/dynamic-ai/chat?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to load chat history: ${response.statusText}`);
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

    const response = await fetch("/api/dynamic-ai/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload satisfies ChatRequestPayload),
    });

    const body = await response.json() as {
      assistantMessage?: unknown;
      history?: unknown;
      metadata?: Record<string, unknown>;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(body?.error ?? "Dynamic AI request failed");
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
