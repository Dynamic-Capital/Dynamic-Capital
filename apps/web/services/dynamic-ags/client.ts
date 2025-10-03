import {
  DYNAMIC_AGS_PLAYBOOK_KEY,
  DYNAMIC_AGS_PLAYBOOK_URL,
  DYNAMIC_AGS_TIMEOUT_MS,
  isDynamicAgsConfigured,
} from "@/config/dynamic-ags";
import type { ChatMessage, TokenUsage } from "@/services/llm/types";

interface DynamicAgsChatRequest {
  system?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  language?: string;
}

interface DynamicAgsChatResponse {
  message?: { role?: string | null; content?: string | null } | null;
  usage?: {
    inputTokens?: number | null;
    outputTokens?: number | null;
    totalTokens?: number | null;
  } | null;
  [key: string]: unknown;
}

function estimateTokenCount(text: string | undefined): number {
  if (!text) return 0;
  return Math.max(1, Math.round(text.length / 4));
}

function buildDemoResult(request: DynamicAgsChatRequest) {
  const latestUserMessage = [...request.messages]
    .reverse()
    .find((entry) => entry.role === "user");

  const focusLine = latestUserMessage
    ? `• Governance focus: ${latestUserMessage.content.trim()}`
    : "• Share a policy or incident to generate a review checklist.";

  const languageLine = request.language
    ? `• Preferred language: ${request.language}.`
    : undefined;

  const messageLines = [
    "🛡️ Dynamic AGS demo governance desk online.",
    focusLine,
    "• Validating policy drift, risk overlays, and treasury guard compliance.",
    "• Coordinating with Dynamic AI for telemetry and Dynamic AGI for execution readiness.",
    "• Add live credentials to stream real audit logs and approvals.",
  ];

  if (languageLine) {
    messageLines.splice(2, 0, languageLine);
  }

  const responseText = messageLines.join("\n");

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
    domain: "dynamic-ags",
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

function normalizeRemoteMessage(
  message: DynamicAgsChatResponse["message"],
): ChatMessage {
  if (!message || typeof message !== "object") {
    throw new Error("Dynamic AGS response did not include a message payload.");
  }

  const content = typeof message.content === "string"
    ? message.content.trim()
    : "";

  if (!content) {
    throw new Error("Dynamic AGS returned an empty message.");
  }

  const role = message.role === "assistant" ? "assistant" : "assistant";
  return { role, content } satisfies ChatMessage;
}

function normalizeRemoteUsage(
  usage: DynamicAgsChatResponse["usage"],
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

export async function callDynamicAgs(
  request: DynamicAgsChatRequest,
): Promise<{
  message: ChatMessage;
  usage?: TokenUsage;
  rawResponse?: unknown;
}> {
  if (!isDynamicAgsConfigured) {
    return buildDemoResult(request);
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DYNAMIC_AGS_TIMEOUT_MS,
  );

  try {
    const response = await fetch(DYNAMIC_AGS_PLAYBOOK_URL!, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${DYNAMIC_AGS_PLAYBOOK_KEY!}`,
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
        `Dynamic AGS request failed: ${response.status} ${errorBody}`.trim(),
      );
    }

    const payload = (await response.json()) as DynamicAgsChatResponse;
    const message = normalizeRemoteMessage(payload.message);
    const usage = normalizeRemoteUsage(payload.usage);

    return {
      message,
      usage,
      rawResponse: payload,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Dynamic AGS request timed out.");
    }
    throw error instanceof Error
      ? error
      : new Error("Dynamic AGS request failed.");
  } finally {
    clearTimeout(timeout);
  }
}
