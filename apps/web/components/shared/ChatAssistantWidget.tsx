"use client";

import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  Loader2,
  Minimize2,
  RotateCcw,
  Sparkles,
  WifiOff,
  X,
} from "lucide-react";

import {
  DynamicContainer,
  DynamicMotionStackItem,
} from "@/components/dynamic-ui";
import {
  Badge,
  Button,
  Column,
  Input,
  Row,
  Spinner,
  Text,
} from "@/components/dynamic-ui-system";
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

const SYSTEM_PROMPT =
  `You are the Dynamic Capital desk assistant. Answer like an elite trading desk lead: confident, structured, and concise. Use short paragraphs or bullet points when useful, keep replies under 180 words, and highlight VIP access, execution support, automation templates, and 24/7 desk coverage when relevant. Always include a short risk disclaimer and finish with: "💡 Need more help? Contact @DynamicCapital_Support or check our VIP plans!"`;

type StatusBadgeProps = Partial<ComponentPropsWithoutRef<typeof Badge>>;

interface StatusMeta {
  badge: string;
  badgeProps: StatusBadgeProps;
  label: ReactNode;
  description: ReactNode;
  icon: ReactNode;
}

const ASCII_FRAMES = ["░", "▒", "▓", "█", "▓", "▒", "░", "▚", "▞"] as const;

interface AsciiShaderTextProps {
  text: string;
  active?: boolean;
}

function AsciiShaderText({ text, active = false }: AsciiShaderTextProps) {
  const [frame, setFrame] = useState(0);
  const characters = useMemo(() => text.split(""), [text]);

  useEffect(() => {
    if (!active) {
      setFrame(0);
      return;
    }

    const interval = window.setInterval(() => {
      setFrame((current) => (current + 1) % ASCII_FRAMES.length);
    }, 120);

    return () => {
      window.clearInterval(interval);
    };
  }, [active]);

  return (
    <span
      aria-label={text}
      className="relative inline-flex flex-wrap items-center gap-[0.35em] font-mono text-primary uppercase tracking-[0.32em]"
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-y-1 inset-x-0 rounded-md bg-gradient-to-r from-primary/20 via-transparent to-dc-accent/30 blur-xl"
        animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      {characters.map((character, index) => {
        const displayCharacter = character === " " ? "\u00A0" : character;
        return (
          <span key={`${character}-${index}`} className="relative inline-block">
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 text-xs leading-none text-primary/60 blur-[0.3px] mix-blend-screen"
              animate={{
                opacity: [0.25, 0.85, 0.25],
                y: [2, -2, 2],
              }}
              transition={{
                duration: 1.2,
                delay: index * 0.05,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {ASCII_FRAMES[(frame + index) % ASCII_FRAMES.length]}
            </motion.span>
            <motion.span
              className="relative"
              animate={{
                y: [0, -2, 0],
                color: ["#a855f7", "#22d3ee", "#a855f7"],
                textShadow: [
                  "0 0 0 rgba(168, 85, 247, 0)",
                  "0 0 12px rgba(59, 130, 246, 0.75)",
                  "0 0 0 rgba(168, 85, 247, 0)",
                ],
              }}
              transition={{
                duration: 1.2,
                delay: index * 0.05,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {displayCharacter}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

export function ChatAssistantWidget(
  { telegramData, className }: ChatAssistantWidgetProps,
) {
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
  const [hasUnread, setHasUnread] = useState(false);
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
  const previousAssistantCountRef = useRef(0);

  const quickSuggestions = useMemo(
    () => [
      "What’s VIP Mentorship?",
      "How does DCT token work?",
      "Show me subscription plans.",
    ],
    [],
  );

  const assistantMessageCount = useMemo(
    () => messages.filter((message) => message.role === "assistant").length,
    [messages],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem("chat-assistant-history", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (
      assistantMessageCount > previousAssistantCountRef.current &&
      (!isOpen || isMinimized)
    ) {
      setHasUnread(true);
    }

    previousAssistantCountRef.current = assistantMessageCount;
  }, [assistantMessageCount, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized && hasUnread) {
      setHasUnread(false);
    }
  }, [hasUnread, isMinimized, isOpen]);

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
    messageContainerRef.current.scrollTop =
      messageContainerRef.current.scrollHeight;
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
        const username = telegramData.username
          ? `@${telegramData.username}`
          : "not provided";
        const displayName = fullName || "Unknown";
        conversation.push({
          role: "system",
          content:
            `User context: Telegram ID ${telegramData.id}. Display name: ${displayName}. Username: ${username}. Use this context only when it improves the answer.`,
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
    const userMessage: ChatMessage = {
      role: "user",
      content: userQuestion,
    };
    const nextHistory = [...messages, userMessage];

    setQuestion("");
    setIsLoading(true);
    setSyncStatus("syncing");

    appendMessages(userMessage);
    void logChatMessage({
      telegramUserId: telegramData?.id,
      sessionId,
      role: userMessage.role,
      content: userMessage.content,
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

      const assistantReply = typeof data?.answer === "string"
        ? data.answer.trim()
        : "";

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

  const statusMeta = useMemo<StatusMeta>(() => {
    const baseBadgeProps: StatusBadgeProps = {
      arrow: false,
      effect: false,
      paddingX: "12",
      paddingY: "4",
      textVariant: "label-strong-s",
      className: "shrink-0",
    };

    switch (syncStatus) {
      case "syncing":
        return {
          badge: "⚡ API sync",
          badgeProps: {
            ...baseBadgeProps,
            background: "brand-alpha-weak",
            border: "brand-alpha-medium",
            onBackground: "brand-strong",
          },
          label: <AsciiShaderText text="API SYNC IN PROGRESS" active />,
          description:
            "Hang tight — the assistant is pulling desk intel for you.",
          icon: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
        };
      case "connected":
        return {
          badge: "🟢 Online",
          badgeProps: {
            ...baseBadgeProps,
            background: "success-alpha-weak",
            border: "success-alpha-medium",
            onBackground: "success-strong",
          },
          label: "Desk assistant ready for follow-ups",
          description: "Ask about VIP plans, tokens, or trading basics.",
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        };
      case "error":
        return {
          badge: "⚠️ Reconnecting",
          badgeProps: {
            ...baseBadgeProps,
            background: "danger-alpha-weak",
            border: "danger-alpha-medium",
            onBackground: "danger-strong",
          },
          label: "Loaded the fallback desk playbook",
          description: "We saved your message and will reconnect shortly.",
          icon: <WifiOff className="h-4 w-4 text-rose-500" />,
        };
      default:
        return {
          badge: "🟢 Online",
          badgeProps: {
            ...baseBadgeProps,
            background: "neutral-alpha-weak",
            border: "neutral-alpha-medium",
            onBackground: "brand-strong",
          },
          label: "Dynamic Capital AI assistant",
          description: "Ask about VIP onboarding, tokens, or trading basics.",
          icon: <Sparkles className="h-4 w-4 text-primary" />,
        };
    }
  }, [syncStatus]);

  const containerPositionClass = cn(
    "fixed z-40",
    isOpen ? "bottom-28 right-6" : "bottom-6 right-6",
    className,
  );

  const hasMessages = messages.length > 0;

  return (
    <LayoutGroup>
      <AnimatePresence initial={false} mode="wait">
        {isOpen
          ? (
            <DynamicContainer
              key="chat-open"
              layoutId="chat-assistant"
              variant={null}
              animateIn={false}
              className={containerPositionClass}
              style={{ width: "min(24rem, 92vw)" }}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
            >
              <Column
                radius="xl"
                padding="l"
                gap="16"
                background="surface"
                border="neutral-alpha-medium"
                shadow="xl"
                className="relative overflow-hidden backdrop-blur-xl"
              >
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-dc-accent/15"
                  aria-hidden="true"
                />
                {isMinimized
                  ? (
                    <Column gap="16" align="start" className="relative z-[1]">
                      <Row gap="12" vertical="center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Bot className="h-5 w-5" />
                        </div>
                        <Column align="start" gap="8">
                          <Text variant="heading-strong-s">
                            Dynamic Capital AI Assistant
                          </Text>
                          <Row gap="8" vertical="center" wrap>
                            <Badge {...statusMeta.badgeProps}>
                              {statusMeta.badge}
                            </Badge>
                            <Text
                              variant="body-default-xs"
                              onBackground="neutral-weak"
                            >
                              {statusMeta.label}
                            </Text>
                          </Row>
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
                          Reopen chat
                        </Button>
                        <Button
                          type="button"
                          size="s"
                          variant="secondary"
                          data-border="rounded"
                          onClick={() => {
                            setIsOpen(false);
                            setIsMinimized(false);
                          }}
                        >
                          Close
                        </Button>
                      </Row>
                    </Column>
                  )
                  : (
                    <Column
                      gap="16"
                      align="start"
                      className="relative z-[1]"
                      style={{ minHeight: "24rem" }}
                    >
                      <Row horizontal="between" vertical="start" align="start">
                        <Row gap="12" vertical="start" align="start">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                            🤖
                          </div>
                          <Column align="start" gap="8">
                            <Text variant="heading-strong-s">
                              Dynamic Capital AI Assistant
                            </Text>
                            <Row gap="8" vertical="center" wrap>
                              <Badge {...statusMeta.badgeProps}>
                                {statusMeta.badge}
                              </Badge>
                              <Row
                                gap="8"
                                vertical="center"
                                className="text-muted-foreground"
                              >
                                {statusMeta.icon}
                                <Text
                                  as="span"
                                  variant="body-default-xs"
                                  onBackground="neutral-weak"
                                >
                                  {statusMeta.description}
                                </Text>
                              </Row>
                            </Row>
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
                            onClick={() => {
                              setIsOpen(false);
                              setIsMinimized(false);
                            }}
                            aria-label="Close chat"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </Row>
                      </Row>
                      <Text
                        variant="body-default-s"
                        onBackground="neutral-weak"
                      >
                        {statusMeta.label}
                      </Text>
                      <div
                        ref={messageContainerRef}
                        className="flex max-h-72 w-full flex-1 flex-col gap-3 overflow-y-auto pr-1"
                      >
                        <AnimatePresence initial={false}>
                          {!hasMessages
                            ? (
                              <DynamicMotionStackItem
                                key="assistant-greeting"
                                layout
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.28, ease: "easeOut" }}
                              >
                                <div className="flex justify-start">
                                  <div className="max-w-[85%] rounded-2xl bg-white/90 px-4 py-3 text-sm text-foreground shadow-sm ring-1 ring-neutral-200">
                                    <p className="whitespace-pre-wrap">
                                      {"👋 Hi! I’m your Dynamic Capital AI assistant. Ask me anything about VIP Plans, tokens, or trading basics."}
                                    </p>
                                  </div>
                                </div>
                              </DynamicMotionStackItem>
                            )
                            : null}
                          {messages.map((message, index) => {
                            const isAssistant = message.role === "assistant";
                            return (
                              <DynamicMotionStackItem
                                key={`${message.role}-${index}-${message.content.length}`}
                                layout
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.28, ease: "easeOut" }}
                              >
                                <div
                                  className={cn(
                                    "flex w-full",
                                    isAssistant
                                      ? "justify-start"
                                      : "justify-end",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "relative max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                                      isAssistant
                                        ? "bg-white/95 text-foreground ring-1 ring-neutral-200"
                                        : "bg-primary text-primary-foreground",
                                    )}
                                  >
                                    {isAssistant
                                      ? (
                                        <span className="absolute -left-2 top-1 h-3 w-3 rotate-45 rounded-sm bg-white/95 ring-1 ring-neutral-200" />
                                      )
                                      : (
                                        <span className="absolute -right-2 top-1 h-3 w-3 rotate-45 rounded-sm bg-primary" />
                                      )}
                                    <Text
                                      as="span"
                                      variant="body-default-s"
                                      style={{ whiteSpace: "pre-wrap" }}
                                      className="block"
                                    >
                                      {message.content}
                                    </Text>
                                  </div>
                                </div>
                              </DynamicMotionStackItem>
                            );
                          })}
                          {isLoading
                            ? (
                              <DynamicMotionStackItem
                                key="assistant-typing"
                                layout
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.28, ease: "easeOut" }}
                              >
                                <div className="flex justify-start">
                                  <div className="flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-3 text-sm text-neutral-600 shadow-sm ring-1 ring-neutral-200">
                                    <Spinner />
                                    <span>Assistant is typing…</span>
                                  </div>
                                </div>
                              </DynamicMotionStackItem>
                            )
                            : null}
                        </AnimatePresence>
                      </div>
                      <Column gap="8" align="start" className="w-full">
                        <Text
                          variant="label-default-s"
                          onBackground="neutral-weak"
                        >
                          Quick replies
                        </Text>
                        <Row gap="8" wrap>
                          {quickSuggestions.map((suggestion) => (
                            <Button
                              key={suggestion}
                              type="button"
                              size="s"
                              variant="secondary"
                              data-border="rounded"
                              onClick={() => handleSuggestion(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </Row>
                      </Column>
                      <form
                        onSubmit={handleSubmit}
                        className="w-full space-y-3"
                      >
                        <Column gap="12">
                          <Input
                            ref={inputRef}
                            id="chat-assistant-question"
                            value={question}
                            onChange={(event) =>
                              setQuestion(event.target.value)}
                            placeholder="Ask about VIP Plans, Tokens, or Trading Basics…"
                            disabled={isLoading}
                          />
                          <Button
                            type="submit"
                            size="m"
                            variant="primary"
                            data-border="rounded"
                            disabled={isLoading || !question.trim()}
                          >
                            {isLoading ? "Sending…" : "Send"}
                          </Button>
                        </Column>
                      </form>
                    </Column>
                  )}
              </Column>
            </DynamicContainer>
          )
          : (
            <DynamicContainer
              key="chat-closed"
              layoutId="chat-assistant"
              variant={null}
              animateIn={false}
              className={containerPositionClass}
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
            >
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsOpen(true);
                  setIsMinimized(false);
                  setHasUnread(false);
                  setTimeout(() => focusInput(), 220);
                }}
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                aria-label="Open Dynamic Capital assistant"
              >
                {hasUnread
                  ? (
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-primary/40 blur-xl"
                      initial={{ opacity: 0.4, scale: 1 }}
                      animate={{
                        opacity: [0.3, 0.7, 0.3],
                        scale: [1, 1.15, 1],
                      }}
                      transition={{
                        duration: 1.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )
                  : null}
                <Bot className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-primary" />
              </motion.button>
            </DynamicContainer>
          )}
      </AnimatePresence>
    </LayoutGroup>
  );
}

export default ChatAssistantWidget;
