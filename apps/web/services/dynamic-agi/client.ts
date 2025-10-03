import {
  DYNAMIC_AGI_CHAT_KEY,
  DYNAMIC_AGI_CHAT_TIMEOUT_MS,
  DYNAMIC_AGI_CHAT_URL,
  isDynamicAgiConfigured,
} from "@/config/dynamic-agi";
import type { ChatMessage, TokenUsage } from "@/services/llm/types";

interface DynamicAgiChatRequest {
  system?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  language?: string;
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
  return {
    "content-type": "application/json",
  };
}

function estimateTokenCount(text: string | undefined): number {
  if (!text) return 0;
  const approximate = Math.max(1, Math.round(text.length / 4));
  return approximate;
}

function buildDemoResult(request: DynamicAgiChatRequest) {
  const latestUserMessage = [...request.messages]
    .reverse()
    .find((entry) => entry.role === "user");

  const focusLine = latestUserMessage
    ? `• Mission focus: ${latestUserMessage.content.trim()}`
    : "• Provide a mission briefing to generate a routed plan.";

  const languageLine = request.language
    ? `• Preferred delivery language: ${request.language}.`
    : undefined;

  const contentSegments = [
    "🚀 Dynamic AGI demo orchestrator engaged.",
    focusLine,
    "• Delegating discovery to Dynamic AI and compliance to Dynamic AGS.",
    "• Sequencing next steps: compile execution brief, open governance review, and publish treasury update.",
    "• Supply live credentials to stream real orchestration telemetry.",
  ];

  if (languageLine) {
    contentSegments.splice(2, 0, languageLine);
  }

  const responseText = contentSegments.join("\n");

  const inputTokens = request.messages.reduce(
    (total, message) => total + estimateTokenCount(message.content),
    estimateTokenCount(request.system),
  );
  const outputTokens = estimateTokenCount(responseText);
  const usage: TokenUsage = {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };

  const rawResponse: Record<string, unknown> = {
    mode: "demo",
    domain: "dynamic-agi",
  };
  if (latestUserMessage?.content) {
    rawResponse.prompt = latestUserMessage.content;
  }
  if (request.language) {
    rawResponse.language = request.language;
  }
  if (request.system) {
    rawResponse.system = request.system;
  }

  return {
    message: { role: "assistant", content: responseText } satisfies ChatMessage,
    usage,
    rawResponse,
  };
}

export async function callDynamicAgi(
  request: DynamicAgiChatRequest,
): Promise<{
  message: ChatMessage;
  usage?: TokenUsage;
  rawResponse?: unknown;
}> {
  if (!isDynamicAgiConfigured) {
    return buildDemoResult(request);
  }

  const chatUrl = DYNAMIC_AGI_CHAT_URL!;
  const chatKey = DYNAMIC_AGI_CHAT_KEY!;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DYNAMIC_AGI_CHAT_TIMEOUT_MS,
  );

  try {
    const response = await fetch(chatUrl, {
      method: "POST",
      headers: {
        ...buildHeaders(),
        authorization: `Bearer ${chatKey}`,
      },
      body: JSON.stringify({
        system: request.system ?? null,
        messages: request.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        language: request.language,
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
