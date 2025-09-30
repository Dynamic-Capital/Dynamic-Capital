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
  type DynamicChatEngineExecuteInput,
  useDynamicChatEngine,
} from "@/hooks/useDynamicChatEngine";
import {
  type ChatResult,
  type ProviderId,
  type ProviderSummary,
} from "@/services/llm/types";

interface ProvidersResponse {
  providers: ProviderSummary[];
}

const DEFAULT_SYSTEM_PROMPT =
  "You are the Dynamic AGI orchestrator comparing multiple model providers. Respond with concise, actionable insights and highlight when the Dynamic AGI engine can extend the analysis.";

export function DynamicChat() {
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId | "">(
    "",
  );
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);

  const selectedProvider = useMemo(() => {
    return providers.find((provider) => provider.id === selectedProviderId) ??
      null;
  }, [providers, selectedProviderId]);

  useEffect(() => {
    if (!selectedProvider) return;
    setMaxTokens((previous) =>
      Math.min(previous, selectedProvider.maxOutputTokens)
    );
  }, [selectedProvider]);

  const executeChatWithProvider = useCallback(async ({
    messages: pendingMessages,
  }: DynamicChatEngineExecuteInput) => {
    if (!selectedProvider) {
      throw new Error("Select a provider before sending a message.");
    }

    const response = await fetch("/api/tools/multi-llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        providerId: selectedProvider.id,
        messages: pendingMessages.map(({ role, content }) => ({
          role,
          content,
        })),
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
    return result;
  }, [maxTokens, selectedProvider, temperature]);

  const {
    conversation,
    systemMessage,
    input,
    setInput,
    isLoading,
    error,
    setError,
    resetConversation,
    sendMessage,
  } = useDynamicChatEngine({
    initialSystemPrompt: DEFAULT_SYSTEM_PROMPT,
    executor: executeChatWithProvider,
  });

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

        if (!selectedProviderId) {
          const firstConfigured = data.providers.find((provider) =>
            provider.configured
          );
          setSelectedProviderId(
            (firstConfigured ?? data.providers[0])?.id ?? "",
          );
        }
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
  }, [selectedProviderId, setError]);

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

    await sendMessage();
  }, [input, selectedProvider, sendMessage, setError]);

  return (
    <div className="w-full space-y-8">
      <Card className="border border-white/10 bg-gradient-to-b from-background/40 to-background/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Dynamic Chat</CardTitle>
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
                          {provider.description}
                        </span>
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
          {systemMessage && (
            <div className="rounded-lg border border-dashed border-white/10 bg-muted/10 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                System prompt
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {systemMessage.content}
              </p>
            </div>
          )}
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
                onClick={resetConversation}
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
