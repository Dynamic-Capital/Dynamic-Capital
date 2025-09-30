"use client";

import { useCallback, useMemo, useState } from "react";

import type { ChatMessage, ChatResult } from "@/services/llm/types";

export interface DynamicChatMessage extends ChatMessage {
  usageSummary?: string;
}

export interface DynamicChatEngineExecuteInput {
  messages: DynamicChatMessage[];
  input: string;
}

interface UseDynamicChatEngineOptions {
  executor: (input: DynamicChatEngineExecuteInput) => Promise<ChatResult>;
  initialMessages?: DynamicChatMessage[];
  initialSystemPrompt?: string;
  formatError?: (error: unknown) => string;
}

interface UseDynamicChatEngineResult {
  messages: DynamicChatMessage[];
  conversation: DynamicChatMessage[];
  systemMessage: DynamicChatMessage | null;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  resetConversation: () => void;
  sendMessage: () => Promise<ChatResult | null>;
}

const DEFAULT_ERROR_MESSAGE = "Unable to generate a response.";

const defaultErrorFormatter = (error: unknown) => {
  if (error instanceof Error) {
    return error.message || DEFAULT_ERROR_MESSAGE;
  }
  return DEFAULT_ERROR_MESSAGE;
};

function createBaseMessages(
  initialMessages: DynamicChatMessage[] | undefined,
  initialSystemPrompt: string | undefined,
): DynamicChatMessage[] {
  if (initialMessages && initialMessages.length > 0) {
    return initialMessages.map((message) => ({ ...message }));
  }
  if (initialSystemPrompt) {
    return [
      {
        role: "system",
        content: initialSystemPrompt,
      },
    ];
  }
  return [];
}

export function useDynamicChatEngine(
  {
    executor,
    initialMessages,
    initialSystemPrompt,
    formatError = defaultErrorFormatter,
  }: UseDynamicChatEngineOptions,
): UseDynamicChatEngineResult {
  const baseMessages = useMemo(
    () => createBaseMessages(initialMessages, initialSystemPrompt),
    [initialMessages, initialSystemPrompt],
  );

  const [messages, setMessages] = useState<DynamicChatMessage[]>(baseMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const systemMessage = useMemo(() => {
    return messages.find((message) => message.role === "system") ?? null;
  }, [messages]);

  const conversation = useMemo(() => {
    return messages.filter((message) => message.role !== "system");
  }, [messages]);

  const resetConversation = useCallback(() => {
    setMessages(baseMessages.map((message) => ({ ...message })));
    setInput("");
    setError(null);
  }, [baseMessages]);

  const sendMessage = useCallback(async (): Promise<ChatResult | null> => {
    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    let pendingMessages: DynamicChatMessage[] = [];
    const userMessage: DynamicChatMessage = { role: "user", content: trimmed };

    setMessages((previous) => {
      pendingMessages = [...previous, userMessage];
      return pendingMessages;
    });
    setInput("");

    try {
      const result = await executor({
        messages: pendingMessages,
        input: trimmed,
      });
      const assistantMessage: DynamicChatMessage = {
        ...result.message,
        usageSummary: formatUsage(result.usage),
      };
      setMessages((previous) => [...previous, assistantMessage]);
      return result;
    } catch (caughtError) {
      console.error("Dynamic chat engine send failed", caughtError);
      const message = formatError(caughtError);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [executor, formatError, input]);

  return {
    messages,
    conversation,
    systemMessage,
    input,
    setInput,
    isLoading,
    error,
    setError,
    resetConversation,
    sendMessage,
  };
}

export function formatUsage(usage: ChatResult["usage"]): string | undefined {
  if (!usage) return undefined;
  const parts: string[] = [];
  if (typeof usage.inputTokens === "number") {
    parts.push(`in: ${usage.inputTokens}`);
  }
  if (typeof usage.outputTokens === "number") {
    parts.push(`out: ${usage.outputTokens}`);
  }
  if (typeof usage.totalTokens === "number") {
    parts.push(`total: ${usage.totalTokens}`);
  }
  if (parts.length === 0) return undefined;
  return parts.join(" · ");
}
