"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  Loader2,
  Minimize2,
  RotateCcw,
  Sparkles,
  User,
  WifiOff,
  X,
} from "lucide-react";

import { OnceButton, OnceContainer } from "@/components/once-ui";
import { Badge } from "@/components/ui/badge";
import {
  Button,
  Column,
  Input,
  Row,
  Spinner,
  Text,
} from "@once-ui-system/core";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import { logChatMessage } from "@/integrations/supabase/queries";
import { cn } from "@/utils";

export interface TelegramAuthData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface ChatAssistantWidgetProps {
  telegramData?: TelegramAuthData;
  className?: string;
}

const MAX_HISTORY = 50;
const MAX_REQUEST_HISTORY = 20;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

type SyncStatus = "idle" | "syncing" | "connected" | "error";

const SYSTEM_PROMPT = `You are the Dynamic Capital desk assistant. Answer like an elite trading desk lead: confident, structured, and concise. Use short paragraphs or bullet points when useful, keep replies under 180 words, and highlight VIP access, execution support, automation templates, and 24/7 desk coverage when relevant. Always include a short risk disclaimer and finish with: "💡 Need more help? Contact @DynamicCapital_Support or check our VIP plans!"`;

export function ChatAssistantWidget({ telegramData, className }: ChatAssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const stored = localStorage.getItem("chat-assistant-history");
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored) as ChatMessage[];
      return parsed.slice(-MAX_HISTORY);
    } catch (error) {
      console.warn("Failed to parse stored chat history", error);
      localStorage.removeItem("chat-assistant-history");
      return [];
    }
  });
  const [sessionId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    let stored = localStorage.getItem("chat-assistant-session-id");
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem("chat-assistant-session-id", stored);
    }
    return stored;
  });
  const { toast } = useToast();
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const quickSuggestions = useMemo(
    () => [
      "How do I start?",
      "VIP benefits?",
      "Trading tips?",
      "Risk management?",
    ],
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem("chat-assistant-history", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let active = true;

    const loadHistory = async () => {
      try {
        const { data, error } = await supabase
          .from("user_interactions")
          .select("interaction_data")
          .eq("interaction_type", "ai_chat")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true })
          .limit(MAX_HISTORY);

        if (!active || error || !data) {
          return;
        }

        const loaded = data
          .map((row) => row.interaction_data as ChatMessage | null)
          .filter((item): item is ChatMessage => Boolean(item));

        if (loaded.length > 0) {
          setMessages(loaded.slice(-MAX_HISTORY));
          if (loaded.some((message) => message.role === "assistant")) {
            setSyncStatus("connected");
          }
        }
      } catch (err) {
        console.warn("Failed to load chat history", err);
      }
    };

    void loadHistory();

    return () => {
      active = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!messageContainerRef.current) {
      return;
    }
    messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
  }, [messages, isLoading]);

  const appendMessages = useCallback((...msgs: ChatMessage[]) => {
    setMessages((previous) => {
      const next = [...previous, ...msgs];
      return next.slice(-MAX_HISTORY);
    });
  }, []);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const handleSuggestion = useCallback(
    (value: string) => {
      setQuestion(value);
      focusInput();
    },
    [focusInput],
  );

  const buildChatPayload = useCallback(
    (history: ChatMessage[]): ChatRequestMessage[] => {
      const trimmedHistory = history.slice(-MAX_REQUEST_HISTORY);
      const conversation: ChatRequestMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
      ];

      if (telegramData) {
        const fullName = [telegramData.first_name, telegramData.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        const username = telegramData.username ? `@${telegramData.username}` : "not provided";
        const displayName = fullName || "Unknown";
        conversation.push({
          role: "system",
          content: `User context: Telegram ID ${telegramData.id}. Display name: ${displayName}. Username: ${username}. Use this context only when it improves the answer.`,
        });
      }

      for (const entry of trimmedHistory) {
        conversation.push({
          role: entry.role,
          content: entry.content,
        });
      }

      return conversation.slice(-MAX_REQUEST_HISTORY - 4);
    },
    [telegramData],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim()) {
      toast({
        title: "Please enter a question",
        description: "Ask about trading, VIP membership, or the admin tools",
        variant: "destructive",
      });
      return;
    }

    const userQuestion = question.trim();
    const nextHistory = [...messages, { role: "user", content: userQuestion }];

    setQuestion("");
    setIsLoading(true);
    setSyncStatus("syncing");

    appendMessages({ role: "user", content: userQuestion });
    void logChatMessage({
      telegramUserId: telegramData?.id,
      sessionId,
      role: "user",
      content: userQuestion,
    });

    try {
      const payload = buildChatPayload(nextHistory);
      const { data, error } = await supabase.functions.invoke("chatgpt-proxy", {
        body: {
          messages: payload,
          temperature: 0.65,
        },
      });

      if (error) {
        throw new Error(error.message || "AI service unavailable");
      }

      const assistantReply =
        typeof data?.answer === "string" ? data.answer.trim() : "";

      if (assistantReply) {
        appendMessages({ role: "assistant", content: assistantReply });
        void logChatMessage({
          telegramUserId: telegramData?.id,
          sessionId,
          role: "assistant",
          content: assistantReply,
        });
        setSyncStatus("connected");
      } else {
        throw new Error("No answer returned");
      }
    } catch (err) {
      console.error("Failed to get AI answer", err);
      const fallbackMessage = [
        "I'm sorry — the AI desk lost the connection for a moment.",
        "Here's what most traders look for while we reconnect:",
        "• VIP onboarding: choose a membership, complete checkout, and unlock bots instantly",
        "• Benefits: 24/7 desk coverage, live playbooks, automation templates",
        "• Risk management: sizing calculators, journaling frameworks, daily debriefs",
        "Need a human? Message @DynamicCapital_Support",
      ].join("\n\n");
      appendMessages({ role: "assistant", content: fallbackMessage });
      setSyncStatus("error");
      toast({
        title: "Assistant temporarily offline",
        description: "We saved your message and loaded the fallback playbook.",
        variant: "destructive",
      });
      void logChatMessage({
        telegramUserId: telegramData?.id,
        sessionId,
        role: "assistant",
        content: fallbackMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setQuestion("");
    setSyncStatus("idle");
    if (typeof window !== "undefined") {
      localStorage.removeItem("chat-assistant-history");
    }
  };

  const statusMeta = useMemo(() => {
    switch (syncStatus) {
      case "syncing":
        return {
          badge: "Syncing",
          badgeClassName: "border-primary/50 bg-primary/10 text-primary",
          label: "Syncing with ChatGPT",
          description: "Crafting a desk-style answer using your latest messages.",
          icon: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
        };
      case "connected":
        return {
          badge: "Live",
          badgeClassName: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
          label: "Connected to ChatGPT",
          description: "Follow-up questions stay in the same AI conversation.",
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        };
      case "error":
        return {
          badge: "Retrying",
          badgeClassName: "border-rose-500/40 bg-rose-500/10 text-rose-500",
          label: "Fallback playbook active",
          description: "We saved the chat and will resync automatically.",
          icon: <WifiOff className="h-4 w-4 text-rose-500" />,
        };
      default:
        return {
          badge: "Ready",
          badgeClassName: "border-border/60 bg-muted/40 text-muted-foreground",
          label: "ChatGPT sync ready",
          description: "Ask about VIP onboarding, execution, or automation.",
          icon: <Sparkles className="h-4 w-4 text-primary" />,
        };
    }
  }, [syncStatus]);

  const containerPositionClass = cn("fixed bottom-20 left-4 z-40", className);

  return (
    <LayoutGroup>
      <AnimatePresence initial={false} mode="wait">
        {isOpen ? (
          <OnceContainer
            key="chat-open"
            layoutId="chat-assistant"
            variant={null}
            animateIn={false}
            className={containerPositionClass}
            style={{ width: "min(25rem, 92vw)" }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <Column
              radius="xl"
              padding="l"
              gap="16"
              className="relative overflow-hidden border border-border/60 bg-background/95 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.6)] backdrop-blur-xl"
            >
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-dc-accent/15"
                aria-hidden="true"
              />
              {isMinimized ? (
                <Row horizontal="between" vertical="center" className="relative z-[1]">
                  <Row gap="10" vertical="center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Bot className="h-5 w-5" />
                    </div>
                    <Column>
                      <Text variant="heading-strong-s">Desk assistant</Text>
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        {statusMeta.label}
                      </Text>
                    </Column>
                  </Row>
                  <Row gap="8">
                    <Button
                      type="button"
                      size="s"
                      variant="secondary"
                      data-border="rounded"
                      onClick={() => setIsMinimized(false)}
                    >
                      Reopen
                    </Button>
                    <Button
                      type="button"
                      size="s"
                      variant="secondary"
                      data-border="rounded"
                      onClick={() => setIsOpen(false)}
                    >
                      Close
                    </Button>
                  </Row>
                </Row>
              ) : (
                <Column gap="16" className="relative z-[1]">
                  <Row horizontal="between" vertical="center">
                    <Row gap="10" vertical="center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Bot className="h-5 w-5" />
                      </div>
                      <Column>
                        <Text variant="heading-strong-s">Desk assistant</Text>
                        <Text variant="body-default-s" onBackground="neutral-weak">
                          Live chat powered by ChatGPT and the Dynamic Capital playbook.
                        </Text>
                      </Column>
                    </Row>
                    <Row gap="8">
                      <Button
                        type="button"
                        size="s"
                        variant="secondary"
                        data-border="rounded"
                        onClick={handleReset}
                        disabled={isLoading}
                        aria-label="Reset conversation"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="s"
                        variant="secondary"
                        data-border="rounded"
                        onClick={() => setIsMinimized(true)}
                        aria-label="Minimize chat"
                      >
                        <Minimize2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="s"
                        variant="secondary"
                        data-border="rounded"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close chat"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </Row>
                  </Row>

                  <Row
                    gap="12"
                    vertical="center"
                    className="items-start rounded-2xl border border-border/60 bg-background/80 p-3"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                      {statusMeta.icon}
                    </div>
                    <Column gap="4" className="flex-1">
                      <Text variant="body-default-m">{statusMeta.label}</Text>
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        {statusMeta.description}
                      </Text>
                    </Column>
                    <Badge className={cn("shrink-0", statusMeta.badgeClassName)}>
                      {statusMeta.badge}
                    </Badge>
                  </Row>

                  <Row wrap gap="8">
                    {quickSuggestions.map((suggestion) => (
                      <Button
                        key={suggestion}
                        type="button"
                        size="s"
                        variant="secondary"
                        data-border="rounded"
                        onClick={() => handleSuggestion(suggestion)}
                        disabled={isLoading}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </Row>

                  <div
                    ref={messageContainerRef}
                    role="log"
                    aria-live="polite"
                    aria-busy={isLoading}
                    className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1"
                  >
                    {messages.length === 0 ? (
                      <Column
                        radius="l"
                        padding="m"
                        gap="8"
                        className="border border-dashed border-border/60 bg-background/90 text-left"
                      >
                        <Text variant="body-default-m">
                          Welcome! Ask how to join the VIP desk, what’s inside the admin dashboard, or how to automate risk.
                        </Text>
                        <Text variant="body-default-s" onBackground="neutral-weak">
                          Responses stay synced with ChatGPT so you can ask follow-up questions in the same thread.
                        </Text>
                      </Column>
                    ) : (
                      messages.map((message, index) => (
                        <Column
                          key={`${message.role}-${index}`}
                          radius="l"
                          padding="m"
                          gap="8"
                          className={cn(
                            "relative overflow-hidden border text-left shadow-[0_20px_40px_-28px_rgba(15,23,42,0.55)]",
                            message.role === "assistant"
                              ? "border-primary/40 bg-gradient-to-br from-primary/15 via-background/85 to-background/95"
                              : "border-border/60 bg-background/90",
                          )}
                        >
                          {message.role === "assistant" ? (
                            <div
                              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-dc-accent/10"
                              aria-hidden="true"
                            />
                          ) : null}
                          <Row gap="8" vertical="center" className="relative z-[1] text-muted-foreground">
                            <div
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-full",
                                message.role === "assistant"
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted/40 text-muted-foreground",
                              )}
                            >
                              {message.role === "assistant" ? (
                                <Bot className="h-4 w-4" />
                              ) : (
                                <User className="h-4 w-4" />
                              )}
                            </div>
                            <Text variant="body-default-s" onBackground="neutral-weak">
                              {message.role === "assistant" ? "Desk" : "You"}
                            </Text>
                          </Row>
                          <Text
                            variant="body-default-m"
                            style={{ whiteSpace: "pre-wrap" }}
                            className="relative z-[1] text-foreground"
                          >
                            {message.content}
                          </Text>
                        </Column>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <Column gap="12">
                      <Input
                        ref={inputRef}
                        id="chat-assistant-question"
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        placeholder="Ask about pricing, onboarding, or platform access"
                        disabled={isLoading}
                      />
                      <Button
                        type="submit"
                        size="m"
                        variant="secondary"
                        data-border="rounded"
                        disabled={isLoading || !question.trim()}
                      >
                        {isLoading ? (
                          <Row gap="8" vertical="center">
                            <Spinner />
                            <Text variant="body-default-s">Syncing with ChatGPT…</Text>
                          </Row>
                        ) : (
                          <Row gap="8" vertical="center">
                            <Sparkles className="h-4 w-4" />
                            Ask the desk
                          </Row>
                        )}
                      </Button>
                    </Column>
                  </form>
                </Column>
              )}
            </Column>
          </OnceContainer>
        ) : (
          <OnceContainer
            key="chat-closed"
            layoutId="chat-assistant"
            variant={null}
            animateIn={false}
            className={containerPositionClass}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <OnceButton
              variant="primary"
              size="default"
              className="rounded-full shadow-primary"
              onClick={() => {
                setIsOpen(true);
                setIsMinimized(false);
                setTimeout(() => focusInput(), 220);
              }}
            >
              <Row gap="8" vertical="center">
                <Sparkles className="h-5 w-5" />
                Chat with the desk
              </Row>
            </OnceButton>
          </OnceContainer>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}

export default ChatAssistantWidget;
