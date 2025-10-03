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

export interface DynamicAgsChatParams extends DynamicAgsChatRequest {
  signal?: AbortSignal;
}

const DYNAMIC_AGS_FETCH_OVERRIDE = Symbol.for(
  "dynamic-capital.dynamic-ags.fetch-override",
);

function getFetch(): typeof fetch {
  const override = (globalThis as Record<PropertyKey, unknown>)[
    DYNAMIC_AGS_FETCH_OVERRIDE
  ];
  if (typeof override === "function") {
    return override as typeof fetch;
  }
  return fetch;
}

function estimateTokenCount(text: string | undefined): number {
  if (!text) return 0;
  return Math.max(1, Math.round(text.length / 4));
}

function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message, index) => {
    const content = message.content.trim();
    if (!content) {
      throw new Error(
        `Dynamic AGS chat message at index ${index} cannot be empty`,
      );
    }
    const role = message.role === "assistant" ? "assistant" : "user";
    return { role, content } satisfies ChatMessage;
  });
}

function buildDemoResult(request: DynamicAgsChatRequest) {
  const latestUserMessage = [...request.messages]
    .reverse()
    .find((entry) => entry.role === "user");

  const focusLine = latestUserMessage
    ? `• Governance focus: ${latestUserMessage.content}`
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

export async function callDynamicAgs({
  signal,
  ...request
}: DynamicAgsChatParams): Promise<{
  message: ChatMessage;
  usage?: TokenUsage;
  rawResponse?: unknown;
}> {
  const normalizedMessages = sanitizeMessages(request.messages);
  if (normalizedMessages.length === 0) {
    throw new Error("Dynamic AGS chat requires at least one message.");
  }

  const normalizedSystem = request.system?.trim() || undefined;
  const normalizedLanguage = request.language?.trim() || undefined;

  const normalizedRequest: DynamicAgsChatRequest = {
    ...request,
    system: normalizedSystem,
    messages: normalizedMessages,
    language: normalizedLanguage,
  };

  if (!isDynamicAgsConfigured) {
    return buildDemoResult(normalizedRequest);
  }

  const playbookUrl = DYNAMIC_AGS_PLAYBOOK_URL!;
  const playbookKey = DYNAMIC_AGS_PLAYBOOK_KEY!;

  const controller = new AbortController();
  const fetcher = getFetch();
  const timeout = setTimeout(
    () => controller.abort(),
    DYNAMIC_AGS_TIMEOUT_MS,
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
      system: normalizedSystem ?? null,
      messages: normalizedMessages,
    };
    if (request.temperature !== undefined) {
      payload.temperature = request.temperature;
    }
    if (request.maxTokens !== undefined) {
      payload.maxTokens = request.maxTokens;
    }
    if (normalizedLanguage) {
      payload.language = normalizedLanguage;
    }

    const response = await fetcher(playbookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${playbookKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Dynamic AGS request failed: ${response.status} ${errorBody}`.trim(),
      );
    }

    let body: DynamicAgsChatResponse;
    try {
      body = (await response.json()) as DynamicAgsChatResponse;
    } catch (error) {
      throw new Error(
        "Dynamic AGS response was not valid JSON.",
        error instanceof Error ? { cause: error } : undefined,
      );
    }
    const message = normalizeRemoteMessage(body.message);
    const usage = normalizeRemoteUsage(body.usage);

    return {
      message,
      usage,
      rawResponse: body,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (signal?.aborted) {
        throw new Error("Dynamic AGS request was cancelled.");
      }
      throw new Error("Dynamic AGS request timed out.");
    }
    throw error instanceof Error
      ? error
      : new Error("Dynamic AGS request failed.");
  } finally {
    clearTimeout(timeout);
    if (externalAbortHandler) {
      signal?.removeEventListener("abort", externalAbortHandler);
    }
  }
}

export function __setDynamicAgsFetchOverride(fn: typeof fetch | undefined) {
  if (fn) {
    (globalThis as Record<PropertyKey, unknown>)[
      DYNAMIC_AGS_FETCH_OVERRIDE
    ] = fn;
    return;
  }
  delete (globalThis as Record<PropertyKey, unknown>)[
    DYNAMIC_AGS_FETCH_OVERRIDE
  ];
}
