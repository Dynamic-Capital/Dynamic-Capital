import {
  DYNAMIC_AI_CHAT_KEY,
  DYNAMIC_AI_CHAT_TIMEOUT_MS,
  DYNAMIC_AI_CHAT_URL,
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

export async function callDynamicAi({
  sessionId,
  messages,
  signal,
  language,
}: DynamicAiChatParams): Promise<DynamicAiChatResult> {
  if (!DYNAMIC_AI_CHAT_URL || !DYNAMIC_AI_CHAT_KEY) {
    throw new Error("Dynamic AI chat is not configured");
  }

  const parsedMessages = messages.map((message) =>
    chatRequestMessageSchema.parse(message)
  );

  if (parsedMessages.length === 0) {
    throw new Error("Dynamic AI chat requires at least one message");
  }

  if (parsedMessages[0]?.role !== "system") {
    parsedMessages.unshift({ role: "system", content: SYSTEM_PROMPT });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DYNAMIC_AI_CHAT_TIMEOUT_MS,
  );

  try {
    const response = await getFetch()(DYNAMIC_AI_CHAT_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${DYNAMIC_AI_CHAT_KEY}`,
        "x-session-id": sessionId,
      },
      body: JSON.stringify({
        messages: parsedMessages,
        sessionId,
        language,
      }),
      signal: signal ?? controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Dynamic AI request failed with status ${response.status} ${response.statusText}`,
      );
    }

    const payload = await response.json();
    return dynamicAiResponseSchema.parse(payload);
  } finally {
    clearTimeout(timeoutId);
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
