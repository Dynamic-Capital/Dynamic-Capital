import { isDynamicAiConfigured } from "@/config/dynamic-ai";
import { isDynamicAgiConfigured } from "@/config/dynamic-agi";
import { isDynamicAgsConfigured } from "@/config/dynamic-ags";
import { OpenAIClient } from "@/integrations/openai/client";
import { callDynamicAi } from "@/services/dynamic-ai/client";
import { callDynamicAgi } from "@/services/dynamic-agi/client";
import { callDynamicAgs } from "@/services/dynamic-ags/client";
import { optionalEnvVar, requireEnvVar } from "@/utils/env";

import {
  type ChatMessage,
  type ChatRequest,
  type ChatResult,
  type ProviderId,
  type ProviderSummary,
  type TokenUsage,
} from "./types";

interface ProviderDefinition {
  id: ProviderId;
  name: string;
  description: string;
  defaultModel: string;
  contextWindow: number;
  maxOutputTokens: number;
  envKeys?: string[];
  isConfigured?: () => boolean;
  requiresConfiguration?: boolean;
  invoke(request: ProviderInvokeInput): Promise<Omit<ChatResult, "provider">>;
}

type ProviderInvokeInput = Omit<ChatRequest, "providerId">;

const ANTHROPIC_VERSION = "2023-06-01";

const providerDefinitions: ProviderDefinition[] = [
  {
    id: "dynamic-ai",
    name: "Dynamic AI",
    description:
      "Dynamic AI fusion engine with governance-aware routing (demo fallback when offline).",
    defaultModel: "dai-orchestrator",
    contextWindow: 64_000,
    maxOutputTokens: 2_048,
    envKeys: ["DYNAMIC_AI_CHAT_URL", "DYNAMIC_AI_CHAT_KEY"],
    isConfigured: () => isDynamicAiConfigured,
    requiresConfiguration: false,
    async invoke(
      { messages, language },
    ): Promise<Omit<ChatResult, "provider">> {
      const { system, conversation } = normalizeMessages(messages);
      const requestMessages: ChatMessage[] = [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        ...conversation,
      ];
      const sessionId = `dai-${Date.now().toString(36)}-${
        Math.random()
          .toString(36)
          .slice(2)
      }`;
      const response = await callDynamicAi({
        sessionId,
        messages: requestMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        language,
      });
      return {
        message: { role: "assistant", content: response.answer },
        rawResponse: response,
      } satisfies Omit<ChatResult, "provider">;
    },
  },
  {
    id: "dynamic-agi",
    name: "Dynamic AGI",
    description: "Dynamic AGI orchestrator with multi-agent synthesis.",
    defaultModel: "dagi-orchestrator",
    contextWindow: 128_000,
    maxOutputTokens: 4_096,
    envKeys: ["DYNAMIC_AGI_CHAT_URL", "DYNAMIC_AGI_CHAT_KEY"],
    isConfigured: () => isDynamicAgiConfigured,
    requiresConfiguration: false,
    async invoke(
      { messages, temperature = 0.7, maxTokens, language },
    ): Promise<Omit<ChatResult, "provider">> {
      const { system, conversation } = normalizeMessages(messages);
      const result = await callDynamicAgi({
        system,
        messages: conversation,
        temperature,
        maxTokens,
        language,
      });
      return result;
    },
  },
  {
    id: "dynamic-ags",
    name: "Dynamic AGS",
    description:
      "Dynamic AGS governance playbook with compliance and policy telemetry (demo fallback when offline).",
    defaultModel: "dags-governance-playbook",
    contextWindow: 64_000,
    maxOutputTokens: 2_048,
    envKeys: ["DYNAMIC_AGS_PLAYBOOK_URL", "DYNAMIC_AGS_PLAYBOOK_KEY"],
    isConfigured: () => isDynamicAgsConfigured,
    requiresConfiguration: false,
    async invoke(
      { messages, temperature = 0.7, maxTokens, language },
    ): Promise<Omit<ChatResult, "provider">> {
      const { system, conversation } = normalizeMessages(messages);
      const result = await callDynamicAgs({
        system,
        messages: conversation,
        temperature,
        maxTokens,
        language,
      });
      return result;
    },
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4.1 mini for balanced cost and quality.",
    defaultModel: "gpt-4.1-mini",
    contextWindow: 128_000,
    maxOutputTokens: 4_096,
    envKeys: ["OPENAI_API_KEY"],
    async invoke(
      { messages, temperature = 0.7, maxTokens, language: _language },
    ): Promise<Omit<ChatResult, "provider">> {
      const client = new OpenAIClient();
      const { system, conversation } = normalizeMessages(messages);
      const response = await client.createChatCompletion({
        model: "gpt-4.1-mini",
        temperature,
        max_tokens: maxTokens,
        messages: buildOpenAIMessages(system, conversation),
      });

      const choice = response.choices?.[0]?.message;
      if (!choice?.content) {
        throw new Error("OpenAI returned an empty message.");
      }

      const usage = mapOpenAIUsage(response.usage);

      return {
        message: { role: "assistant", content: choice.content },
        usage,
        rawResponse: response,
      };
    },
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 3.5 Sonnet for longer reasoning chains.",
    defaultModel: "claude-3-5-sonnet-latest",
    contextWindow: 200_000,
    maxOutputTokens: 4_096,
    envKeys: ["ANTHROPIC_API_KEY"],
    async invoke(
      { messages, temperature = 0.7, maxTokens, language: _language },
    ): Promise<Omit<ChatResult, "provider">> {
      const apiKey = requireEnvVar("ANTHROPIC_API_KEY");
      const { system, conversation } = normalizeMessages(messages);
      const payload = {
        model: "claude-3-5-sonnet-latest",
        max_tokens: maxTokens,
        temperature,
        system,
        messages: conversation.map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: [{ type: "text", text: message.content }],
        })),
      } satisfies AnthropicMessageRequest;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "anthropic-version": ANTHROPIC_VERSION,
          "x-api-key": apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Anthropic request failed: ${response.status} ${error}`,
        );
      }

      const body = (await response.json()) as AnthropicMessageResponse;
      const contentText = extractAnthropicText(body);
      if (!contentText) {
        throw new Error("Anthropic response did not include text content.");
      }

      const usage = mapAnthropicUsage(body.usage);

      return {
        message: { role: "assistant", content: contentText },
        usage,
        rawResponse: body,
      };
    },
  },
  {
    id: "groq",
    name: "Groq",
    description: "Mixtral-8x7b via Groq for high-throughput comparisons.",
    defaultModel: "mixtral-8x7b-32768",
    contextWindow: 32_768,
    maxOutputTokens: 3_584,
    envKeys: ["GROQ_API_KEY"],
    async invoke(
      { messages, temperature = 0.7, maxTokens, language: _language },
    ): Promise<Omit<ChatResult, "provider">> {
      const apiKey = requireEnvVar("GROQ_API_KEY");
      const { system, conversation } = normalizeMessages(messages);

      const payload = {
        model: "mixtral-8x7b-32768",
        temperature,
        max_tokens: maxTokens,
        messages: buildOpenAIMessages(system, conversation),
      } satisfies OpenAIChatPayload;

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Groq request failed: ${response.status} ${error}`);
      }

      const body = (await response.json()) as OpenAIChatResponse;
      const choice = body.choices?.[0]?.message;
      if (!choice?.content) {
        throw new Error("Groq returned an empty response.");
      }

      const usage = mapOpenAIUsage(body.usage);

      return {
        message: { role: "assistant", content: choice.content },
        usage,
        rawResponse: body,
      };
    },
  },
];

interface AnthropicMessageRequest {
  model: string;
  max_tokens: number;
  temperature: number;
  system?: string | null;
  messages: {
    role: "user" | "assistant";
    content: { type: "text"; text: string }[];
  }[];
}

interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
}

interface AnthropicMessageResponse {
  id: string;
  type: string;
  role: "assistant";
  content: ({ type: "text"; text: string } | {
    type: string;
    [key: string]: unknown;
  })[];
  usage?: AnthropicUsage & { total_tokens?: number };
}

interface OpenAIChatPayload {
  model: string;
  temperature: number;
  max_tokens: number;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
}

interface OpenAIChatResponse {
  id: string;
  choices: { message?: { role: "assistant"; content?: string } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

function normalizeMessages(messages: ChatMessage[]): {
  system?: string;
  conversation: ChatMessage[];
} {
  const systemMessages = messages.filter((message) =>
    message.role === "system"
  );
  const system = systemMessages.length > 0
    ? systemMessages.map((message) => message.content.trim()).filter(Boolean)
      .join("\n\n")
    : undefined;

  const conversation = messages.filter((message) => message.role !== "system");
  return { system, conversation };
}

function buildOpenAIMessages(
  system: string | undefined,
  conversation: ChatMessage[],
) {
  const base = system ? [{ role: "system" as const, content: system }] : [];
  return [
    ...base,
    ...conversation.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

function extractAnthropicText(
  response: AnthropicMessageResponse,
): string | undefined {
  for (const block of response.content ?? []) {
    if (block && typeof block === "object" && block.type === "text") {
      const textBlock = block as { type: "text"; text?: string };
      if (
        typeof textBlock.text === "string" && textBlock.text.trim().length > 0
      ) {
        return textBlock.text;
      }
    }
  }
  return undefined;
}

function mapOpenAIUsage(usage?: {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}): TokenUsage | undefined {
  if (!usage) return undefined;
  const {
    prompt_tokens: inputTokens,
    completion_tokens: outputTokens,
    total_tokens: totalTokens,
  } = usage;
  if (
    inputTokens === undefined && outputTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined;
  }
  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

function mapAnthropicUsage(
  usage?: AnthropicUsage & { total_tokens?: number },
): TokenUsage | undefined {
  if (!usage) return undefined;
  const {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
  } = usage;
  if (
    inputTokens === undefined && outputTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined;
  }
  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

function providerConfigured(definition: ProviderDefinition): boolean {
  if (definition.requiresConfiguration === false) {
    return true;
  }
  if (typeof definition.isConfigured === "function") {
    return Boolean(definition.isConfigured());
  }
  const keys = definition.envKeys ?? [];
  return keys.every((key) => Boolean(optionalEnvVar(key)));
}

function toSummary(definition: ProviderDefinition): ProviderSummary {
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    configured: providerConfigured(definition),
    defaultModel: definition.defaultModel,
    contextWindow: definition.contextWindow,
    maxOutputTokens: definition.maxOutputTokens,
  } satisfies ProviderSummary;
}

export function listProviders(): ProviderSummary[] {
  return providerDefinitions.map(toSummary);
}

export async function executeChat(request: ChatRequest): Promise<ChatResult> {
  const definition = providerDefinitions.find((provider) =>
    provider.id === request.providerId
  );
  if (!definition) {
    throw new Error(`Unsupported provider: ${request.providerId}`);
  }

  const configured = providerConfigured(definition);
  if ((definition.requiresConfiguration ?? true) && !configured) {
    throw new Error(`Provider ${definition.name} is not configured.`);
  }

  const boundedMaxTokens = Math.min(
    definition.maxOutputTokens,
    request.maxTokens ?? definition.maxOutputTokens,
  );

  const result = await definition.invoke({
    messages: request.messages,
    temperature: request.temperature,
    maxTokens: boundedMaxTokens,
  });

  return {
    provider: toSummary(definition),
    ...result,
  } satisfies ChatResult;
}
