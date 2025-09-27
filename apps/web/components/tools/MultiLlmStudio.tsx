"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils";

import {
  type ChatMessage,
  type ChatResult,
  type PromptTemplate,
  type ProviderId,
  type ProviderSummary,
} from "@/services/llm/types";

import {
  applySystemPrompt,
  FALLBACK_TEMPLATE_ID,
  resolveTemplatePrompt,
  selectTemplateForProvider,
} from "./multi-llm-template-helpers";

interface ProvidersResponse {
  providers: ProviderSummary[];
}

interface TemplatesResponse {
  templates: PromptTemplate[];
}

const DEFAULT_SYSTEM_PROMPT =
  "You are an analytical AI assistant comparing multiple model providers. Respond with concise, actionable insights.";

interface ConversationItem extends ChatMessage {
  usageSummary?: string;
}

export function MultiLlmStudio() {
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId | "">(
    "",
  );
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    FALLBACK_TEMPLATE_ID,
  );
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [hasUserSelectedTemplate, setHasUserSelectedTemplate] = useState(false);
  const [messages, setMessages] = useState<ConversationItem[]>([
    { role: "system", content: DEFAULT_SYSTEM_PROMPT },
  ]);
  const [input, setInput] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProviders() {
      try {
        const response = await fetch("/api/tools/multi-llm/providers");
        if (!response.ok) {
          throw new Error(`Unable to fetch providers (${response.status}).`);
        }

        const data = (await response.json()) as ProvidersResponse;
        if (cancelled) return;
        setProviders(data.providers);

        const firstConfigured = data.providers.find((provider) =>
          provider.configured
        );
        setSelectedProviderId((previous) => {
          if (previous) {
            return previous;
          }
          return (firstConfigured ?? data.providers[0])?.id ?? "";
        });
      } catch (providerError) {
        if (cancelled) return;
        const message = providerError instanceof Error
          ? providerError.message
          : "Unable to load provider metadata.";
        setError(message);
      }
    }

    void loadProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      try {
        const response = await fetch("/api/tools/multi-llm/templates");
        if (!response.ok) {
          throw new Error(`Unable to fetch templates (${response.status}).`);
        }

        const data = (await response.json()) as TemplatesResponse;
        if (cancelled) return;
        setTemplates(data.templates);
        setTemplateError(null);
      } catch (templateLoadError) {
        if (cancelled) return;
        const message = templateLoadError instanceof Error
          ? templateLoadError.message
          : "Unable to load prompt templates.";
        setTemplateError(message);
        setTemplates([]);
      }
    }

    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProvider = useMemo(() => {
    return providers.find((provider) => provider.id === selectedProviderId) ??
      null;
  }, [providers, selectedProviderId]);

  const providerNameById = useMemo(() => {
    return new Map<ProviderId, string>(
      providers.map((provider) => [provider.id, provider.name] as const),
    );
  }, [providers]);

  const formatProviderSuitability = useCallback(
    (ids: ProviderId[]) => {
      if (ids.length === 0) {
        return "Applies to all providers";
      }

      const labels = ids.map((id) => providerNameById.get(id) ?? id);
      return `Best for: ${labels.join(", ")}`;
    },
    [providerNameById],
  );

  useEffect(() => {
    if (!selectedProvider) return;
    setMaxTokens((previous) =>
      Math.min(previous, selectedProvider.maxOutputTokens)
    );
  }, [selectedProvider]);

  useEffect(() => {
    if (templates.length === 0) {
      if (selectedTemplateId !== FALLBACK_TEMPLATE_ID) {
        setSelectedTemplateId(FALLBACK_TEMPLATE_ID);
      }
      return;
    }

    if (hasUserSelectedTemplate) {
      return;
    }

    const recommended = selectTemplateForProvider(
      templates,
      selectedProviderId,
    );

    if (recommended && recommended.id !== selectedTemplateId) {
      setSelectedTemplateId(recommended.id);
    }
  }, [
    templates,
    selectedProviderId,
    hasUserSelectedTemplate,
    selectedTemplateId,
  ]);

  useEffect(() => {
    if (templates.length === 0) {
      return;
    }

    if (selectedTemplateId === FALLBACK_TEMPLATE_ID) {
      return;
    }

    const exists = templates.some((template) =>
      template.id === selectedTemplateId
    );
    if (!exists) {
      setSelectedTemplateId(templates[0].id);
      setHasUserSelectedTemplate(false);
    }
  }, [templates, selectedTemplateId]);

  const selectedTemplate = useMemo(() => {
    if (selectedTemplateId === FALLBACK_TEMPLATE_ID) {
      return null;
    }

    return templates.find((template) => template.id === selectedTemplateId) ??
      null;
  }, [selectedTemplateId, templates]);

  const activeSystemPrompt = useMemo(() => {
    return resolveTemplatePrompt(selectedTemplate, DEFAULT_SYSTEM_PROMPT);
  }, [selectedTemplate]);

  useEffect(() => {
    setMessages((previous) => applySystemPrompt(previous, activeSystemPrompt));
  }, [activeSystemPrompt]);

  const conversation = useMemo(
    () => messages.filter((message) => message.role !== "system"),
    [messages],
  );

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    if (!selectedProvider) {
      setError("Select a provider before sending a message.");
      return;
    }

    if (!selectedProvider.configured) {
      setError(
        `${selectedProvider.name} is not configured. Add the required API key to continue.`,
      );
      return;
    }

    setError(null);

    const userMessage: ConversationItem = { role: "user", content: trimmed };
    const pendingMessages = [...messages, userMessage];

    setMessages(pendingMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/tools/multi-llm/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerId: selectedProvider.id,
          messages: pendingMessages,
          temperature,
          maxTokens,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = typeof errorBody.error === "string"
          ? errorBody.error
          : `Chat request failed with status ${response.status}.`;
        throw new Error(message);
      }

      const result = (await response.json()) as ChatResult;
      const usageSummary = formatUsage(result.usage);
      const assistantMessage: ConversationItem = {
        ...result.message,
        usageSummary,
      };
      setMessages((previous) => [...previous, assistantMessage]);
    } catch (chatError) {
      const message = chatError instanceof Error
        ? chatError.message
        : "Unable to generate a response.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [input, maxTokens, messages, selectedProvider, temperature]);

  const systemMessage = messages.find((message) => message.role === "system");

  return (
    <div className="w-full space-y-8">
      <Card className="border border-white/10 bg-gradient-to-b from-background/40 to-background/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Multi-LLM Studio</CardTitle>
          <CardDescription>
            Compare responses across providers by routing the same conversation
            through each configured model.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={selectedProviderId}
                onValueChange={(value) =>
                  setSelectedProviderId(value as ProviderId)}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div className="flex flex-col">
                        <span>{provider.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {provider.configured
                            ? provider.defaultModel
                            : "Missing API configuration"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProvider && (
                <p className="text-xs text-muted-foreground">
                  Context window:{" "}
                  {selectedProvider.contextWindow.toLocaleString()}{" "}
                  tokens · Max output:{" "}
                  {selectedProvider.maxOutputTokens.toLocaleString()} tokens
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Slider
                  id="temperature"
                  value={[Number(temperature.toFixed(2))]}
                  min={0}
                  max={2}
                  step={0.05}
                  onValueChange={([value]) =>
                    setTemperature(Number(value.toFixed(2)))}
                  formatValue={(value) => value.toFixed(2)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min={32}
                  max={selectedProvider?.maxOutputTokens ?? 8192}
                  value={maxTokens}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    if (!Number.isFinite(parsed)) return;
                    setMaxTokens(
                      Math.max(
                        32,
                        Math.min(
                          parsed,
                          selectedProvider?.maxOutputTokens ?? 8192,
                        ),
                      ),
                    );
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Requests are capped to the provider limit automatically.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt-template">Prompt template</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={(value) => {
                  setSelectedTemplateId(value);
                  setHasUserSelectedTemplate(true);
                }}
                disabled={templates.length === 0}
              >
                <SelectTrigger id="prompt-template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FALLBACK_TEMPLATE_ID}>
                    Default analysis prompt
                  </SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col">
                        <span>{template.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatProviderSuitability(
                            template.providerSuitability,
                          )}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templateError && (
                <p className="text-xs text-destructive">{templateError}</p>
              )}
              {templates.length === 0 && !templateError && (
                <p className="text-xs text-muted-foreground">
                  No templates configured. Using the default analysis prompt.
                </p>
              )}
            </div>

            {systemMessage && (
              <div className="rounded-lg border border-dashed border-white/10 bg-muted/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {selectedTemplate
                    ? `${selectedTemplate.label} prompt`
                    : "Default system prompt"}
                </p>
                {selectedTemplate?.description && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                )}
                {selectedTemplate?.providerSuitability.length
                  ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatProviderSuitability(
                        selectedTemplate.providerSuitability,
                      )}
                    </p>
                  )
                  : null}
                <p className="mt-2 text-sm text-muted-foreground">
                  {systemMessage.content}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-white/10 bg-gradient-to-b from-background/40 to-background/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
          <CardDescription>
            Messages are sent to the selected provider using the controls above.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {conversation.length === 0
              ? (
                <div className="rounded-md border border-dashed border-white/10 p-6 text-sm text-muted-foreground">
                  Start the conversation with a question to compare providers.
                </div>
              )
              : (
                conversation.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={cn(
                      "rounded-lg border p-4 shadow-sm transition-colors",
                      message.role === "assistant"
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/40 bg-background/40",
                    )}
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                      <span>
                        {message.role === "assistant" ? "Assistant" : "You"}
                      </span>
                      {message.usageSummary && (
                        <span>{message.usageSummary}</span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {message.content}
                    </p>
                  </div>
                ))
              )}
          </div>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-3">
            <Label htmlFor="chat-input" className="text-sm">
              Prompt
            </Label>
            <Textarea
              id="chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about desk positioning, compare strategies, or request a structured summary."
              rows={4}
            />
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  setMessages([
                    {
                      role: "system",
                      content: activeSystemPrompt,
                    },
                  ])}
                disabled={isLoading}
              >
                Reset conversation
              </Button>
              <Button
                onClick={handleSend}
                isLoading={isLoading}
                disabled={!input.trim()}
              >
                Send message
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatUsage(usage: ChatResult["usage"]): string | undefined {
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
