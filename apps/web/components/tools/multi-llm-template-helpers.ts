import { type ChatMessage, type ProviderId } from "@/services/llm/types";
import { type PromptTemplate } from "@/services/llm/types";

export const FALLBACK_TEMPLATE_ID = "__fallback__";

export function applySystemPrompt<T extends ChatMessage>(
  messages: T[],
  prompt: string,
): T[] {
  const systemIndex = messages.findIndex((message) =>
    message.role === "system"
  );
  if (systemIndex === -1) {
    return [{ role: "system", content: prompt } as T, ...messages];
  }

  const next = messages.map((message, index) =>
    index === systemIndex ? { ...message, content: prompt } : message
  );
  return next;
}

export function selectTemplateForProvider(
  templates: PromptTemplate[],
  providerId: ProviderId | "" | null | undefined,
): PromptTemplate | undefined {
  if (!providerId) {
    return templates[0];
  }

  const exactMatch = templates.find((template) =>
    template.providerSuitability.includes(providerId)
  );
  if (exactMatch) {
    return exactMatch;
  }

  return templates[0];
}

export function resolveTemplatePrompt(
  template: PromptTemplate | null | undefined,
  fallbackPrompt: string,
): string {
  return template?.prompt ?? fallbackPrompt;
}
