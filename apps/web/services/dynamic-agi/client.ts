import {
  DYNAMIC_AGI_CHAT_KEY,
  DYNAMIC_AGI_CHAT_TIMEOUT_MS,
  DYNAMIC_AGI_CHAT_URL,
} from "@/config/dynamic-agi";
import type { ChatMessage, TokenUsage } from "@/services/llm/types";

interface DynamicAgiChatRequest {
  system?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

interface DynamicAgiChatResponse {
  message?: { role?: string; content?: string } | null;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  } | null;
  [key: string]: unknown;
}

function normalizeMessage(
  message: DynamicAgiChatResponse["message"],
): ChatMessage {
  if (!message || typeof message !== "object") {
    throw new Error("Dynamic AGI response did not include a message payload.");
  }

  const content = typeof message.content === "string"
    ? message.content.trim()
    : "";

  if (!content) {
    throw new Error("Dynamic AGI returned an empty message.");
  }

  const role = message.role === "assistant" ? "assistant" : "assistant";

  return { role, content } satisfies ChatMessage;
}

function normalizeUsage(
  usage: DynamicAgiChatResponse["usage"],
): TokenUsage | undefined {
  if (!usage || typeof usage !== "object") {
    return undefined;
  }

  const inputTokens = typeof usage.inputTokens === "number"
    ? usage.inputTokens
    : undefined;
  const outputTokens = typeof usage.outputTokens === "number"
    ? usage.outputTokens
    : undefined;
  const totalTokens = typeof usage.totalTokens === "number"
    ? usage.totalTokens
    : undefined;

  if (
    inputTokens === undefined && outputTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined;
  }

  return { inputTokens, outputTokens, totalTokens } satisfies TokenUsage;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (DYNAMIC_AGI_CHAT_KEY) {
    headers.authorization = `Bearer ${DYNAMIC_AGI_CHAT_KEY}`;
  }
  return headers;
}

export async function callDynamicAgi(
  request: DynamicAgiChatRequest,
): Promise<{
  message: ChatMessage;
  usage?: TokenUsage;
  rawResponse?: unknown;
}> {
  if (!DYNAMIC_AGI_CHAT_URL || !DYNAMIC_AGI_CHAT_KEY) {
    throw new Error("Dynamic AGI chat is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DYNAMIC_AGI_CHAT_TIMEOUT_MS,
  );

  try {
    const response = await fetch(DYNAMIC_AGI_CHAT_URL, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        system: request.system ?? null,
        messages: request.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Dynamic AGI request failed: ${response.status} ${errorBody}`.trim(),
      );
    }

    const payload = (await response.json()) as DynamicAgiChatResponse;
    const message = normalizeMessage(payload.message);
    const usage = normalizeUsage(payload.usage);

    return {
      message,
      usage,
      rawResponse: payload,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Dynamic AGI request timed out.");
    }
    throw error instanceof Error
      ? error
      : new Error("Dynamic AGI request failed.");
  } finally {
    clearTimeout(timeout);
  }
}
