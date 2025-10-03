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
    ? `• Focus request: “${latestUserMessage.content.trim()}”.`
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

  if (parsedMessages[0]?.role !== "system") {
    parsedMessages.unshift({ role: "system", content: SYSTEM_PROMPT });
  }

  if (!isDynamicAiConfigured) {
    return buildDemoResponse(parsedMessages, language);
  }

  const chatUrl = DYNAMIC_AI_CHAT_URL!;
  const chatKey = DYNAMIC_AI_CHAT_KEY!;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DYNAMIC_AI_CHAT_TIMEOUT_MS,
  );

  try {
    const response = await getFetch()(chatUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${chatKey}`,
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
