import {
  DYNAMIC_AI_CHAT_KEY,
  DYNAMIC_AI_CHAT_TIMEOUT_MS,
  DYNAMIC_AI_CHAT_URL,
  isDynamicAiConfigured,
} from "@/config/dynamic-ai";
import { SYSTEM_PROMPT } from "@/services/dynamic-ai/constants";
import {
  type ChatRequestMessage,
  chatRequestMessageSchema,
  type DynamicAiResponse,
  dynamicAiResponseSchema,
} from "@/services/dynamic-ai/schema";

const DYNAMIC_AI_FETCH_OVERRIDE = Symbol.for(
  "dynamic-capital.dynamic-ai.fetch-override",
);

function getFetch(): typeof fetch {
  const override = (globalThis as Record<PropertyKey, unknown>)[
    DYNAMIC_AI_FETCH_OVERRIDE
  ];
  if (typeof override === "function") {
    return override as typeof fetch;
  }
  return fetch;
}

export interface DynamicAiChatParams {
  sessionId: string;
  messages: ChatRequestMessage[];
  signal?: AbortSignal;
  language?: string;
}

export type DynamicAiChatResult = DynamicAiResponse;

function buildDemoResponse(
  messages: ChatRequestMessage[],
  language?: string,
): DynamicAiResponse {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  const focusLine = latestUserMessage
    ? `• Focus request: “${latestUserMessage.content}”.`
    : "• Provide a prompt to explore orchestration flows.";

  const languageLine = language
    ? `• Preferred language: ${language}.`
    : undefined;

  const advisoryLine =
    "• Connect live credentials to stream production-grade signals.";

  const segments = [
    "⚡ Dynamic AI demo mode active.",
    focusLine,
    "• Fusion stack: directional, momentum, sentiment, and treasury guardrails.",
    "• Routes outcomes to Dynamic AGI for execution and Dynamic AGS for governance review.",
    advisoryLine,
  ];

  if (languageLine) {
    segments.splice(2, 0, languageLine);
  }

  const metadata: Record<string, unknown> = {
    mode: "demo",
    domain: "dynamic-ai",
  };
  if (latestUserMessage?.content) {
    metadata.prompt = latestUserMessage.content;
  }
  if (language) {
    metadata.language = language;
  }

  return {
    answer: segments.join("\n"),
    metadata,
  } satisfies DynamicAiResponse;
}

export async function callDynamicAi({
  sessionId,
  messages,
  signal,
  language,
}: DynamicAiChatParams): Promise<DynamicAiChatResult> {
  const parsedMessages = messages.map((message) =>
    chatRequestMessageSchema.parse(message)
  );

  if (parsedMessages.length === 0) {
    throw new Error("Dynamic AI chat requires at least one message");
  }

  const normalizedMessages: ChatRequestMessage[] = parsedMessages.map(
    (message, index) => {
      const content = message.content.trim();
      if (!content) {
        throw new Error(
          `Dynamic AI chat message at index ${index} cannot be empty`,
        );
      }
      const normalized: ChatRequestMessage = { role: message.role, content };
      const languageTag = message.language?.trim();
      if (languageTag) {
        normalized.language = languageTag;
      }
      return normalized;
    },
  );

  if (normalizedMessages[0]?.role !== "system") {
    normalizedMessages.unshift({ role: "system", content: SYSTEM_PROMPT });
  }

  const trimmedSessionId = sessionId.trim();
  if (!trimmedSessionId) {
    throw new Error("Dynamic AI chat requires a session identifier");
  }

  const normalizedLanguage = language?.trim();

  if (!isDynamicAiConfigured) {
    return buildDemoResponse(normalizedMessages, normalizedLanguage);
  }

  const chatUrl = DYNAMIC_AI_CHAT_URL!;
  const chatKey = DYNAMIC_AI_CHAT_KEY!;

  const controller = new AbortController();
  const fetcher = getFetch();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DYNAMIC_AI_CHAT_TIMEOUT_MS,
  );

  let externalAbortHandler: (() => void) | undefined;
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      externalAbortHandler = () => controller.abort();
      signal.addEventListener("abort", externalAbortHandler);
    }
  }

  try {
    const payload: Record<string, unknown> = {
      messages: normalizedMessages,
      sessionId: trimmedSessionId,
    };
    if (normalizedLanguage) {
      payload.language = normalizedLanguage;
    }

    const response = await fetcher(chatUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${chatKey}`,
        "x-session-id": trimmedSessionId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      const suffix = errorBody ? ` ${errorBody}` : "";
      throw new Error(
        `Dynamic AI request failed: ${response.status} ${response.statusText}${suffix}`,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      throw new Error(
        "Dynamic AI response was not valid JSON.",
        error instanceof Error ? { cause: error } : undefined,
      );
    }
    return dynamicAiResponseSchema.parse(body);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (signal?.aborted) {
        throw new Error("Dynamic AI request was cancelled.");
      }
      throw new Error("Dynamic AI request timed out.");
    }
    throw error instanceof Error
      ? error
      : new Error("Dynamic AI request failed.");
  } finally {
    clearTimeout(timeoutId);
    if (externalAbortHandler) {
      signal?.removeEventListener("abort", externalAbortHandler);
    }
  }
}

export function __setDynamicAiFetchOverride(fn: typeof fetch | undefined) {
  if (fn) {
    (globalThis as Record<PropertyKey, unknown>)[
      DYNAMIC_AI_FETCH_OVERRIDE
    ] = fn;
    return;
  }
  delete (globalThis as Record<PropertyKey, unknown>)[
    DYNAMIC_AI_FETCH_OVERRIDE
  ];
}
