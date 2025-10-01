"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { RotateCcw, Send, Sparkles } from "lucide-react";

import {
  Column,
  Heading,
  Line,
  Row,
  SegmentedControl,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface LanguageOption {
  value: "english" | "dhivehi";
  label: string;
  helper: string;
  prompt: string;
  placeholder: string;
  tagLabel: string;
  lang: string;
}

function composeSystemPrompt(base: string, languagePrompt: string): string {
  const baseTrimmed = base.trim();
  const languageTrimmed = languagePrompt.trim();
  if (!baseTrimmed) return languageTrimmed;
  if (!languageTrimmed) return baseTrimmed;
  return `${baseTrimmed}\n\n${languageTrimmed}`;
}

const DHIVEHI_CHAR_PATTERN = /[\u0780-\u07BF]/;

function inferMessageLanguage(content: string, fallback: string): string {
  if (DHIVEHI_CHAR_PATTERN.test(content)) {
    return "dv";
  }
  if (/[A-Za-z]/.test(content)) {
    return "en";
  }
  return fallback;
}

const BASE_SYSTEM_PROMPT =
  "You are the Dynamic Capital orchestration lead. Compare provider responses, surface latency or token insights, and highlight when Dynamic AGI orchestration or specialist agents should extend the analysis. Keep reasoning auditable for risk, automation triggers, and compliance checkpoints.";

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    value: "english",
    label: "English",
    helper:
      "Default orchestration voice with automation-ready, English analysis.",
    prompt:
      "Communicate in English with concise rationales. Summarise provider divergence, latency considerations, and automation hooks in bullet-ready form.",
    placeholder:
      "Ask about routing policies, compare providers, or request Dhivehi hand-offs.",
    tagLabel: "English · Control",
    lang: "en",
  },
  {
    value: "dhivehi",
    label: "Dhivehi",
    helper:
      "Dynamic AGI localises replies with Dhivehi (Thaana) phrasing plus English checkpoints for compliance.",
    prompt:
      'Respond primarily in Dhivehi (Thaana script). Translate user intent from English when necessary. Use Dhivehi financial terminology from the Dynamic Capital glossary, format monetary values for Maldivian Rufiyaa where relevant, and add a concise English checkpoint prefixed with "EN:" when guidance includes figures or compliance steps.',
    placeholder: "ސްޓްރެޓޭޖީ އިތުރަށް ސަބަބުން އަދި ފަންވަތް އިސްމޮންސް ބަލާލެއްވުން؟",
    tagLabel: "Dhivehi · Thaana",
    lang: "dv",
  },
];

const DEFAULT_SYSTEM_PROMPT = composeSystemPrompt(
  BASE_SYSTEM_PROMPT,
  LANGUAGE_OPTIONS[0].prompt,
);

export function DynamicChat() {
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId | "">(
    "dynamic-agi",
  );
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [language, setLanguage] = useState<LanguageOption["value"]>(
    LANGUAGE_OPTIONS[0].value,
  );

  const selectedProvider = useMemo(() => {
    return providers.find((provider) => provider.id === selectedProviderId) ??
      null;
  }, [providers, selectedProviderId]);

  const languageOption = useMemo(() => {
    return LANGUAGE_OPTIONS.find((option) => option.value === language) ??
      LANGUAGE_OPTIONS[0];
  }, [language]);

  const composedSystemPrompt = useMemo(() => {
    return composeSystemPrompt(BASE_SYSTEM_PROMPT, languageOption.prompt);
  }, [languageOption]);

  useEffect(() => {
    if (!selectedProvider) return;
    setMaxTokens((previous) =>
      Math.min(previous, selectedProvider.maxOutputTokens)
    );
  }, [selectedProvider]);

  const executeChatWithProvider = useCallback(async ({
    messages: pendingMessages,
    signal,
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
      signal,
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
    updateSystemPrompt,
  } = useDynamicChatEngine({
    initialSystemPrompt: DEFAULT_SYSTEM_PROMPT,
    executor: executeChatWithProvider,
    conversationWindowSize: 16,
  });

  useEffect(() => {
    updateSystemPrompt(composedSystemPrompt);
  }, [composedSystemPrompt, updateSystemPrompt]);

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

        const resolvedSelection = data.providers.find((provider) =>
          provider.id === selectedProviderId
        );

        if (resolvedSelection) {
          setSelectedProviderId(resolvedSelection.id);
          return;
        }

        const dynamicAgiProvider = data.providers.find((provider) =>
          provider.id === "dynamic-agi"
        );

        if (dynamicAgiProvider) {
          setSelectedProviderId(dynamicAgiProvider.id);
          return;
        }

        const firstConfigured = data.providers.find((provider) =>
          provider.configured
        );
        setSelectedProviderId((firstConfigured ?? data.providers[0])?.id ?? "");
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

  const providerLabelId = useId();
  const providerHelperId = useId();

  const temperatureLabel = temperature.toFixed(2);
  const providerSelectionLabel = selectedProvider
    ? `${selectedProvider.name} selected`
    : "Select a provider";
  const promptPlaceholder = languageOption.placeholder;
  const conversationLanguageTag = languageOption.tagLabel;
  const isDynamicAgiActive = selectedProvider?.id === "dynamic-agi";

  return (
    <Column gap="24" fillWidth>
      <Row gap="24" wrap fillWidth align="start">
        <Column
          flex={1}
          minWidth={28}
          gap="20"
          padding="20"
          radius="l"
          background="surface"
          border="neutral-alpha-medium"
          className="relative overflow-hidden bg-background/70 shadow-lg shadow-primary/5 backdrop-blur"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-dc-brand/15 via-transparent to-dc-accent/10" />
          <Column gap="12" className="relative z-[1]">
            <Row gap="8" vertical="center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-dc-brand/20 text-dc-brand">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </div>
              <Column gap="8" align="start">
                <Heading variant="heading-strong-s">
                  Orchestration controls
                </Heading>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Route prompts through a configured provider and tune the
                  generation profile before you send the next message.
                </Text>
              </Column>
            </Row>
          </Column>

          <Column gap="12" className="relative z-[1]">
            <Text
              as="span"
              id={providerLabelId}
              variant="label-default-s"
              className="uppercase tracking-[0.2em] text-xs text-muted-foreground"
            >
              Providers
            </Text>
            <div
              role="radiogroup"
              aria-labelledby={providerLabelId}
              aria-describedby={providerHelperId}
              className="space-y-3"
            >
              {providers.length === 0
                ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-background/60 p-4">
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      Loading configured providers…
                    </Text>
                  </div>
                )
                : (
                  providers.map((provider) => {
                    const isSelected = provider.id === selectedProviderId;
                    const statusLabel = provider.configured
                      ? "Ready"
                      : "Setup required";
                    const statusBackground = provider.configured
                      ? "success-alpha-weak"
                      : "danger-alpha-weak";
                    const statusBorder = provider.configured
                      ? "success-alpha-medium"
                      : "danger-alpha-medium";
                    const statusForeground = provider.configured
                      ? "success-strong"
                      : "danger-strong";

                    return (
                      <button
                        key={provider.id}
                        type="button"
                        role="radio"
                        aria-label={`${provider.name} provider`}
                        aria-checked={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => setSelectedProviderId(provider.id)}
                        className={cn(
                          "group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-dc-brand/50",
                          isSelected
                            ? "border-dc-brand/60 bg-gradient-to-br from-dc-brand/15 via-background/60 to-dc-accent/15 shadow-lg shadow-primary/10"
                            : "border-white/10 bg-background/60 hover:border-dc-brand/40 hover:bg-background/70",
                        )}
                      >
                        <div className="pointer-events-none absolute inset-px rounded-[1.1rem] bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                        <Column gap="8" className="relative z-[1]">
                          <Row
                            horizontal="between"
                            vertical="center"
                            gap="12"
                            wrap
                          >
                            <Column gap="4" align="start" flex={1}>
                              <Text
                                variant="heading-strong-xs"
                                onBackground="neutral-strong"
                              >
                                {provider.name}
                              </Text>
                              <Text
                                variant="body-default-xs"
                                onBackground="neutral-weak"
                              >
                                {provider.description}
                              </Text>
                            </Column>
                            <Tag
                              size="s"
                              background={statusBackground}
                              border={statusBorder}
                              onBackground={statusForeground}
                            >
                              {statusLabel}
                            </Tag>
                          </Row>
                          <Row gap="8" wrap vertical="center">
                            <Tag
                              size="s"
                              background="neutral-alpha-weak"
                              border="neutral-alpha-medium"
                              onBackground="neutral-strong"
                            >
                              {provider.configured
                                ? provider.defaultModel
                                : "Missing API key"}
                            </Tag>
                            <Text
                              as="span"
                              variant="body-default-xs"
                              onBackground="neutral-weak"
                              className="font-mono"
                            >
                              ctx {provider.contextWindow.toLocaleString()}{" "}
                              · max {provider.maxOutputTokens.toLocaleString()}
                            </Text>
                          </Row>
                        </Column>
                      </button>
                    );
                  })
                )}
            </div>
            <Text
              as="span"
              id={providerHelperId}
              variant="body-default-xs"
              onBackground="neutral-weak"
            >
              {providerSelectionLabel}
            </Text>
          </Column>

          <Column gap="12" className="relative z-[1]">
            <Text
              as="span"
              variant="label-default-s"
              className="uppercase tracking-[0.2em] text-xs text-muted-foreground"
            >
              Language
            </Text>
            <SegmentedControl
              buttons={LANGUAGE_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
              selected={language}
              onToggle={(value) =>
                setLanguage(value as LanguageOption["value"])}
              aria-label="Select conversation language"
            />
            <Text
              as="span"
              variant="body-default-xs"
              onBackground="neutral-weak"
            >
              {languageOption.helper}
            </Text>
          </Column>

          <Column gap="16" className="relative z-[1]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  <span>Temperature</span>
                  <span className="font-mono text-xs text-foreground">
                    {temperatureLabel}
                  </span>
                </div>
                <Slider
                  id="temperature"
                  value={[Number(temperatureLabel)]}
                  min={0}
                  max={2}
                  step={0.05}
                  onValueChange={([value]) =>
                    setTemperature(Number(value.toFixed(2)))}
                  className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
                />
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Lower values keep answers precise; higher values invite more
                  creative exploration.
                </Text>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  <span>Max tokens</span>
                  <span className="font-mono text-xs text-foreground">
                    {maxTokens}
                  </span>
                </div>
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
                  className="rounded-xl border border-white/10 bg-background/70"
                />
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Requests automatically cap at the provider limit.
                </Text>
              </div>
            </div>

            {systemMessage && (
              <Column
                gap="12"
                padding="16"
                radius="l"
                border="neutral-alpha-medium"
                background="neutral-alpha-weak"
                className="relative overflow-hidden"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-dc-brand/10 via-transparent to-transparent" />
                <Column gap="8" className="relative z-[1]">
                  <Row gap="8" vertical="center">
                    <Sparkles
                      className="h-4 w-4 text-dc-brand"
                      aria-hidden="true"
                    />
                    <Text
                      variant="label-default-s"
                      className="uppercase tracking-[0.18em]"
                      onBackground="neutral-medium"
                    >
                      System prompt
                    </Text>
                  </Row>
                  <Text
                    as="p"
                    variant="body-default-s"
                    onBackground="neutral-weak"
                    className="leading-relaxed"
                  >
                    {systemMessage.content}
                  </Text>
                </Column>
              </Column>
            )}
          </Column>
        </Column>

        <Column
          flex={1}
          minWidth={36}
          gap="20"
          padding="20"
          radius="l"
          background="surface"
          border="neutral-alpha-medium"
          className="relative overflow-hidden bg-background/75 shadow-xl shadow-primary/5 backdrop-blur"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-dc-brand/10" />
          <Column gap="12" className="relative z-[1]">
            <Row horizontal="between" vertical="center" wrap gap="12">
              <Column gap="8" align="start">
                <Heading variant="heading-strong-s">
                  Conversation stream
                </Heading>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Messages are routed to the active provider with the controls
                  configured on the left.
                </Text>
              </Column>
              <Row gap="8" wrap vertical="center">
                {selectedProvider && (
                  <Tag
                    size="m"
                    background="brand-alpha-weak"
                    border="brand-alpha-medium"
                    onBackground="brand-strong"
                  >
                    Active · {selectedProvider.name}
                  </Tag>
                )}
                <Tag
                  size="m"
                  background="neutral-alpha-weak"
                  border="neutral-alpha-medium"
                  onBackground="neutral-strong"
                >
                  Language · {conversationLanguageTag}
                </Tag>
                {isDynamicAgiActive && (
                  <Tag
                    size="m"
                    background="accent-alpha-weak"
                    border="accent-alpha-medium"
                    onBackground="accent-strong"
                  >
                    Dynamic AGI optimised
                  </Tag>
                )}
              </Row>
            </Row>
          </Column>

          <Line background="neutral-alpha-weak" className="relative z-[1]" />

          <Column gap="12" className="relative z-[1]">
            {conversation.length === 0
              ? (
                <Column
                  gap="8"
                  padding="20"
                  radius="l"
                  border="neutral-alpha-medium"
                  background="neutral-alpha-weak"
                  align="start"
                  className="text-sm text-muted-foreground"
                >
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Start the conversation with a prompt to benchmark providers
                    side by side. Ask about routing strategies, latency
                    envelopes, or summary formats.
                  </Text>
                </Column>
              )
              : (
                conversation.map((message, index) => {
                  const isAssistant = message.role === "assistant";
                  const roleLabel = message.role === "assistant"
                    ? "Assistant"
                    : message.role === "system"
                    ? "System"
                    : "You";
                  const messageLang = inferMessageLanguage(
                    message.content,
                    languageOption.lang,
                  );

                  return (
                    <div
                      key={`${message.role}-${index}`}
                      className={cn(
                        "relative overflow-hidden rounded-2xl border p-4 transition-all duration-300",
                        isAssistant
                          ? "border-dc-brand/50 bg-gradient-to-br from-dc-brand/12 via-background/60 to-dc-accent/12 shadow-lg shadow-primary/10"
                          : "border-white/10 bg-background/60",
                      )}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 hover:opacity-100" />
                      <div className="relative z-[1] flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Tag
                              size="s"
                              background={isAssistant
                                ? "brand-alpha-weak"
                                : "neutral-alpha-weak"}
                              border={isAssistant
                                ? "brand-alpha-medium"
                                : "neutral-alpha-medium"}
                              onBackground={isAssistant
                                ? "brand-strong"
                                : "neutral-strong"}
                            >
                              {roleLabel}
                            </Tag>
                          </div>
                          {message.usageSummary && (
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {message.usageSummary}
                            </span>
                          )}
                        </div>
                        <Text
                          as="p"
                          variant="body-default-s"
                          onBackground="neutral-strong"
                          className="whitespace-pre-wrap leading-relaxed"
                          dir="auto"
                          lang={messageLang}
                        >
                          {message.content}
                        </Text>
                      </div>
                    </div>
                  );
                })
              )}
          </Column>

          {error && (
            <Column
              gap="8"
              padding="16"
              radius="l"
              border="danger-alpha-medium"
              background="danger-alpha-weak"
              className="relative z-[1] text-sm text-danger-foreground"
              role="alert"
            >
              <Text variant="body-default-s" onBackground="danger-strong">
                {error}
              </Text>
            </Column>
          )}

          <Line background="neutral-alpha-weak" className="relative z-[1]" />

          <Column gap="12" className="relative z-[1]">
            <Text
              as="label"
              htmlFor="chat-input"
              variant="label-default-s"
              className="uppercase tracking-[0.2em] text-xs text-muted-foreground"
            >
              Prompt
            </Text>
            <Textarea
              id="chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={promptPlaceholder}
              rows={4}
              className="min-h-[140px] rounded-2xl border border-white/10 bg-background/75 px-4 py-3 text-sm leading-relaxed text-foreground shadow-inner focus-visible:ring-2 focus-visible:ring-dc-brand/60"
              dir="auto"
              lang={languageOption.lang}
            />
            <Row gap="12" horizontal="end" wrap>
              <Button
                type="button"
                variant="ghost"
                onClick={resetConversation}
                disabled={isLoading}
                className="rounded-full border border-white/10 bg-background/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:border-white/20 hover:bg-background/70"
              >
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                Reset
              </Button>
              <Button
                type="button"
                variant="brand"
                onClick={handleSend}
                isLoading={isLoading}
                disabled={!input.trim() || isLoading}
                className="rounded-full px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em]"
              >
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                Send message
              </Button>
            </Row>
          </Column>
        </Column>
      </Row>
    </Column>
  );
}
