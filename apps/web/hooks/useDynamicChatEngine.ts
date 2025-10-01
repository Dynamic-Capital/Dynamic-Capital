"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SetStateAction } from "react";

import type { ChatMessage, ChatResult } from "@/services/llm/types";

export interface DynamicChatMessage extends ChatMessage {
  usageSummary?: string;
}

export interface DynamicChatEngineExecuteInput {
  messages: DynamicChatMessage[];
  input: string;
  signal?: AbortSignal;
}

interface UseDynamicChatEngineOptions {
  executor: (input: DynamicChatEngineExecuteInput) => Promise<ChatResult>;
  initialMessages?: DynamicChatMessage[];
  initialSystemPrompt?: string;
  formatError?: (error: unknown) => string;
  conversationWindowSize?: number;
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
  updateSystemPrompt: (nextPrompt: string | null | undefined) => void;
}

const DEFAULT_ERROR_MESSAGE = "Unable to generate a response.";

const DEFAULT_CONVERSATION_WINDOW = 12;

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

function cloneMessages(messages: DynamicChatMessage[]): DynamicChatMessage[] {
  return messages.map((message) => ({ ...message }));
}

function enforceConversationWindow(
  messages: DynamicChatMessage[],
  windowSize: number,
): DynamicChatMessage[] {
  if (windowSize <= 0) {
    return messages;
  }

  let remaining = windowSize;
  const preserved: DynamicChatMessage[] = [];

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "system") {
      preserved.push({ ...message });
      continue;
    }
    if (remaining > 0) {
      preserved.push({ ...message });
      remaining -= 1;
    }
  }

  return preserved.reverse();
}

export function useDynamicChatEngine(
  {
    executor,
    initialMessages,
    initialSystemPrompt,
    formatError = defaultErrorFormatter,
    conversationWindowSize = DEFAULT_CONVERSATION_WINDOW,
  }: UseDynamicChatEngineOptions,
): UseDynamicChatEngineResult {
  const resolvedBaseMessages = useMemo(
    () => createBaseMessages(initialMessages, initialSystemPrompt),
    [initialMessages, initialSystemPrompt],
  );

  const baseMessagesRef = useRef<DynamicChatMessage[]>(resolvedBaseMessages);
  const [messagesState, setMessagesState] = useState<DynamicChatMessage[]>(
    resolvedBaseMessages,
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const isSendingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const nextBase = cloneMessages(resolvedBaseMessages);
    baseMessagesRef.current = nextBase;

    if (hasHydratedRef.current) {
      setMessagesState(cloneMessages(nextBase));
      setInput("");
      setError(null);
      return;
    }

    hasHydratedRef.current = true;
    setMessagesState(cloneMessages(nextBase));
  }, [resolvedBaseMessages]);

  const setMessages = useCallback(
    (updater: SetStateAction<DynamicChatMessage[]>) => {
      if (!isMountedRef.current) return;
      setMessagesState((previous) => {
        if (typeof updater === "function") {
          return (updater as (
            value: DynamicChatMessage[],
          ) => DynamicChatMessage[])(
            previous,
          );
        }
        return updater;
      });
    },
    [],
  );

  const systemMessage = useMemo(() => {
    return messagesState.find((message) => message.role === "system") ?? null;
  }, [messagesState]);

  const conversation = useMemo(() => {
    return messagesState.filter((message) => message.role !== "system");
  }, [messagesState]);

  const resetConversation = useCallback(() => {
    const baseCopy = cloneMessages(baseMessagesRef.current);
    setMessages(baseCopy);
    setInput("");
    setError(null);
  }, [setMessages]);

  const updateSystemPrompt = useCallback(
    (nextPrompt: string | null | undefined) => {
      const previousBaseLength = baseMessagesRef.current.length;
      const nextBase = cloneMessages(
        createBaseMessages(initialMessages, nextPrompt ?? undefined),
      );

      baseMessagesRef.current = nextBase;

      setMessages((previous) => {
        const conversationStart = Math.min(previousBaseLength, previous.length);
        const conversationMessages = previous
          .slice(conversationStart)
          .map((message) => ({ ...message }));

        if (nextBase.length === 0) {
          return conversationMessages;
        }

        if (
          nextBase.length === 1 &&
          nextBase[0]?.role === "system" &&
          previous[0]?.role === "system"
        ) {
          const remainingMessages = previous
            .slice(1)
            .map((message) => ({ ...message }));
          return [{ ...nextBase[0] }, ...remainingMessages];
        }

        return [...nextBase, ...conversationMessages];
      });

      setError(null);
    },
    [initialMessages, setMessages],
  );

  const sendMessage = useCallback(async (): Promise<ChatResult | null> => {
    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    if (isSendingRef.current) {
      return null;
    }

    isSendingRef.current = true;
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    let pendingMessages: DynamicChatMessage[] = [];
    const userMessage: DynamicChatMessage = { role: "user", content: trimmed };

    setMessages((previous) => {
      pendingMessages = [...previous, userMessage];
      return pendingMessages;
    });
    if (isMountedRef.current) {
      setInput("");
    }

    const abortController = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = abortController;

    try {
      const boundedMessages = enforceConversationWindow(
        pendingMessages,
        Math.max(conversationWindowSize, 0),
      );
      const result = await executor({
        messages: boundedMessages,
        input: trimmed,
        signal: abortController.signal,
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
      if (isMountedRef.current) {
        setError(message);
      }
      return null;
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      isSendingRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [conversationWindowSize, executor, formatError, input, setMessages]);

  return {
    messages: messagesState,
    conversation,
    systemMessage,
    input,
    setInput,
    isLoading,
    error,
    setError,
    resetConversation,
    sendMessage,
    updateSystemPrompt,
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
