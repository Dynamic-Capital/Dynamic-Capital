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
import {
  type ChatStreamChunk,
  DynamicChatError,
  useDynamicChat,
} from "@/hooks/useDynamicChat";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useToast } from "@/hooks/useToast";
import { MAX_HISTORY } from "@/services/dynamic-ai/constants";
import type {
  ChatMessage,
  TelegramAuthData,
} from "@/services/dynamic-ai/schema";
import { cn } from "@/utils";

interface ChatAssistantWidgetProps {
  telegramData?: TelegramAuthData;
  className?: string;
}
const SUGGESTION_PAGE_SIZE = 3;
const MAX_SUGGESTION_DECK = 12;

type SyncStatus = "idle" | "syncing" | "connected" | "error";

interface WeightedSuggestion {
  text: string;
  weight: number;
}

const INTRO_SUGGESTIONS: readonly WeightedSuggestion[] = [
  { text: "What does the Dynamic Capital desk include?", weight: 5 },
  { text: "How do I get started with VIP onboarding?", weight: 4 },
  { text: "Which automation templates can I unlock?", weight: 4 },
];

const FOLLOW_UP_SUGGESTIONS: readonly WeightedSuggestion[] = [
  { text: "Show me the latest automation playbooks.", weight: 4 },
  { text: "What trading tools can I access today?", weight: 4 },
  { text: "How do I escalate to a human desk lead?", weight: 4 },
];

const PROGRESSION_SUGGESTIONS: readonly WeightedSuggestion[] = [
  { text: "Summarize the key desk takeaways so far.", weight: 3 },
  { text: "What should I prioritize next to stay on track?", weight: 3 },
];

const STATUS_SUGGESTIONS: Record<SyncStatus, readonly WeightedSuggestion[]> = {
  idle: [
    { text: "Walk me through the desk services.", weight: 6 },
    { text: "What perks unlock when I activate the desk?", weight: 5 },
  ],
  syncing: [
    { text: "While it syncs, show me quick wins.", weight: 6 },
    { text: "Preview the automation templates I should prep.", weight: 5 },
  ],
  connected: [
    { text: "Recommend my next best action.", weight: 6 },
    { text: "Which signals or bots should I enable today?", weight: 5 },
  ],
  error: [
    { text: "How do I reach @DynamicCapital_Support?", weight: 6 },
    { text: "Share the offline trading playbook.", weight: 5 },
    { text: "Show me what to do while the desk is offline.", weight: 5 },
  ],
};

const KEYWORD_SUGGESTIONS: Record<string, readonly WeightedSuggestion[]> = {
  vip: [
    { text: "Compare VIP mentorship tiers for me.", weight: 6 },
    { text: "What perks come with VIP onboarding?", weight: 5 },
  ],
  mentor: [
    { text: "Who are the VIP mentors I can meet?", weight: 5 },
    { text: "Line up my first mentorship session.", weight: 4 },
  ],
  token: [
    { text: "Explain the DCT token utilities again.", weight: 6 },
    { text: "How do I earn more DCT rewards?", weight: 4 },
  ],
  plan: [
    { text: "Break down the subscription plans.", weight: 6 },
    { text: "Help me choose between the VIP plans.", weight: 5 },
  ],
  bot: [
    { text: "Which bots should I start with today?", weight: 6 },
    { text: "Set up a starter automation flow for me.", weight: 5 },
  ],
  automation: [
    { text: "Guide me through setting up automation.", weight: 6 },
    { text: "Show automation templates by strategy.", weight: 5 },
  ],
  risk: [
    { text: "Give me risk management best practices.", weight: 6 },
    { text: "Build me a guardrail checklist.", weight: 5 },
  ],
  support: [
    { text: "List human support options.", weight: 6 },
    { text: "When should I escalate to a desk lead?", weight: 5 },
  ],
};

const TELEGRAM_CONNECTED_SUGGESTIONS: readonly WeightedSuggestion[] = [
  { text: "Confirm my Telegram perks are active.", weight: 5 },
  { text: "Sync my Telegram chats with the desk.", weight: 4 },
];

const TELEGRAM_UNCONNECTED_SUGGESTIONS: readonly WeightedSuggestion[] = [
  { text: "Sync my Telegram perks with the desk.", weight: 6 },
  { text: "Invite me to the Dynamic Capital VIP rooms.", weight: 5 },
];

const DESK_PLAYBOOK = [
  "24/7 coverage with human desk leads for escalations.",
  "Automation templates for scalps, swings, and treasury flows.",
  "Risk dashboards, journaling prompts, and daily debriefs included.",
] as const;

const FALLBACK_ASSISTANT_RESPONSE = [
  "I'm sorry — the AI desk lost the connection for a moment.",
  "Here's what most traders look for while we reconnect:",
  "• VIP onboarding: choose a membership, complete checkout, and unlock bots instantly",
  "• Benefits: 24/7 desk coverage, live playbooks, automation templates",
  "• Risk management: sizing calculators, journaling frameworks, daily debriefs",
  "Need a human? Message @DynamicCapital_Support",
].join("\n\n");

interface SuggestionContext {
  history: ChatMessage[];
  status: SyncStatus;
  hasTelegramProfile: boolean;
}

const normalize = (value: string) => value.toLowerCase();

function buildSuggestionDeck({
  history,
  status,
  hasTelegramProfile,
}: SuggestionContext): string[] {
  const userMessages = history.filter((message) => message.role === "user");
  const assistantMessages = history.filter(
    (message) => message.role === "assistant",
  );
  const lastUserMessage = userMessages.at(-1)?.content ?? "";
  const lastUserMessageNormalized = normalize(lastUserMessage);
  const isFirstInteraction = userMessages.length === 0;
  const hasDeepThread = userMessages.length >= 3 ||
    assistantMessages.length >= 3;

  const scores = new Map<string, number>();

  const addSuggestion = (suggestion: WeightedSuggestion | undefined) => {
    if (!suggestion) {
      return;
    }
    const text = suggestion.text.trim();
    if (!text) {
      return;
    }
    const normalized = normalize(text);
    if (normalized === lastUserMessageNormalized) {
      return;
    }
    const nextScore = (scores.get(text) ?? 0) + suggestion.weight;
    scores.set(text, nextScore);
  };

  const addSuggestions = (
    suggestions: readonly WeightedSuggestion[] | undefined,
    weightMultiplier = 1,
  ) => {
    if (!suggestions) {
      return;
    }
    for (const suggestion of suggestions) {
      addSuggestion({
        text: suggestion.text,
        weight: suggestion.weight * weightMultiplier,
      });
    }
  };

  addSuggestions(STATUS_SUGGESTIONS[status]);
  addSuggestions(
    isFirstInteraction ? INTRO_SUGGESTIONS : FOLLOW_UP_SUGGESTIONS,
  );

  for (const [keyword, suggestions] of Object.entries(KEYWORD_SUGGESTIONS)) {
    if (lastUserMessageNormalized.includes(keyword)) {
      addSuggestions(suggestions, 1.15);
    }
  }

  if (hasTelegramProfile) {
    addSuggestions(TELEGRAM_CONNECTED_SUGGESTIONS);
  } else {
    addSuggestions(TELEGRAM_UNCONNECTED_SUGGESTIONS);
  }

  if (hasDeepThread) {
    addSuggestions(PROGRESSION_SUGGESTIONS);
  }

  addSuggestions(INTRO_SUGGESTIONS, 0.75);
  addSuggestions(FOLLOW_UP_SUGGESTIONS, 0.65);

  const askedQuestions = new Set(
    userMessages.map((message) => normalize(message.content)),
  );

  const ranked = Array.from(scores.entries()).map(([text, score]) => {
    const penalty = askedQuestions.has(normalize(text)) ? 4 : 0;
    return {
      text,
      score: score - penalty,
    };
  });

  const filtered = ranked
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score === a.score) {
        return a.text.localeCompare(b.text);
      }
      return b.score - a.score;
    })
    .map((entry) => entry.text);

  if (filtered.length === 0) {
    return INTRO_SUGGESTIONS.map((entry) => entry.text);
  }

  if (filtered.length < SUGGESTION_PAGE_SIZE) {
    const fallbackPool = [
      ...INTRO_SUGGESTIONS,
      ...FOLLOW_UP_SUGGESTIONS,
      ...(hasTelegramProfile
        ? TELEGRAM_CONNECTED_SUGGESTIONS
        : TELEGRAM_UNCONNECTED_SUGGESTIONS),
    ];
    for (const fallback of fallbackPool) {
      if (filtered.includes(fallback.text)) {
        continue;
      }
      filtered.push(fallback.text);
      if (filtered.length >= SUGGESTION_PAGE_SIZE) {
        break;
      }
    }
  }

  return filtered.slice(0, MAX_SUGGESTION_DECK);
}

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
  const [isOpen, setIsOpen] = useState(() => {
    // Auto-open the widget in test environments so automated suites can interact
    // with the form controls without needing to click the launcher first.
    if (typeof process !== "undefined" && process.env?.NODE_ENV === "test") {
      return true;
    }
    return false;
  });
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
  const [fallbackMessageState, setFallbackMessageState] = useState<
    ChatMessage | null
  >(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const stored = sessionStorage.getItem("chat-assistant-fallback");
      if (!stored) {
        return null;
      }
      const parsed = JSON.parse(stored) as ChatMessage;
      if (parsed?.role === "assistant" && typeof parsed.content === "string") {
        return parsed;
      }
    } catch (error) {
      console.warn("Failed to parse fallback assistant message", error);
      sessionStorage.removeItem("chat-assistant-fallback");
    }
    return null;
  });
  const [hasUnread, setHasUnread] = useState(false);
  const [suggestionCursor, setSuggestionCursor] = useState(0);
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
  const { fetchHistory, sendMessage } = useDynamicChat({
    sessionId,
    telegramData,
  });
  const { trackWithTelegramContext } = useAnalytics();
  const { toast } = useToast();
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previousAssistantCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const fallbackMessage = fallbackMessageState;

  const updateFallbackMessage = useCallback((message: ChatMessage | null) => {
    setFallbackMessageState(message);
    if (typeof window === "undefined") {
      return;
    }
    if (message) {
      sessionStorage.setItem(
        "chat-assistant-fallback",
        JSON.stringify(message),
      );
    } else {
      sessionStorage.removeItem("chat-assistant-fallback");
    }
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const suggestionDeck = useMemo(
    () =>
      buildSuggestionDeck({
        history: messages,
        status: syncStatus,
        hasTelegramProfile: Boolean(telegramData),
      }),
    [messages, syncStatus, telegramData],
  );

  const totalSuggestionPages = useMemo(() => {
    if (suggestionDeck.length === 0) {
      return 0;
    }
    return Math.ceil(suggestionDeck.length / SUGGESTION_PAGE_SIZE);
  }, [suggestionDeck.length]);

  const visibleSuggestions = useMemo(() => {
    if (totalSuggestionPages === 0) {
      return [] as string[];
    }
    const start = suggestionCursor * SUGGESTION_PAGE_SIZE;
    return suggestionDeck.slice(start, start + SUGGESTION_PAGE_SIZE);
  }, [suggestionCursor, suggestionDeck, totalSuggestionPages]);

  useEffect(() => {
    setSuggestionCursor(0);
  }, [messages.length, syncStatus, telegramData?.id]);

  useEffect(() => {
    setSuggestionCursor((current) => {
      if (totalSuggestionPages === 0) {
        return 0;
      }
      return Math.min(current, totalSuggestionPages - 1);
    });
  }, [totalSuggestionPages]);

  const hasSuggestionOverflow = totalSuggestionPages > 1;
  const hasSuggestions = visibleSuggestions.length > 0;

  const cycleSuggestions = useCallback(() => {
    if (totalSuggestionPages === 0) {
      return;
    }
    setSuggestionCursor((current) => (current + 1) % totalSuggestionPages);
    focusInput();
  }, [focusInput, totalSuggestionPages]);

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
    if (!fallbackMessage) {
      return;
    }
    if (!isOpen || isMinimized) {
      setHasUnread(true);
    }
  }, [fallbackMessage, isMinimized, isOpen]);

  useEffect(() => {
    if (isOpen && !isMinimized && hasUnread) {
      setHasUnread(false);
    }
  }, [hasUnread, isMinimized, isOpen]);

  const loadHistory = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!sessionId) {
        return;
      }

      setSyncStatus((current) => current === "connected" ? current : "syncing");

      try {
        const { messages: history } = await fetchHistory();
        if (!isMountedRef.current) {
          return;
        }

        if (history.length > 0) {
          setMessages(history.slice(-MAX_HISTORY));
          if (history.some((message) => message.role === "assistant")) {
            setSyncStatus("connected");
          } else {
            setSyncStatus("idle");
          }
        } else {
          setMessages([]);
          setSyncStatus("idle");
        }
        updateFallbackMessage(null);
        setInlineError(null);
      } catch (error) {
        if (!isMountedRef.current) {
          return;
        }

        const chatError = error instanceof DynamicChatError
          ? error
          : new DynamicChatError("Failed to load chat history", {
            cause: error,
          });

        setSyncStatus("error");
        updateFallbackMessage({
          role: "assistant",
          content: FALLBACK_ASSISTANT_RESPONSE,
        });

        if (!options.silent) {
          toast({
            title: "Unable to sync history",
            description:
              "We saved your session and loaded the offline desk playbook.",
            variant: "destructive",
          });
        }

        trackWithTelegramContext({
          event_type: "chat_history_sync_failed",
          interaction_data: {
            status: chatError.status ?? "network",
            request_id: chatError.requestId ?? undefined,
            timestamp: new Date().toISOString(),
          },
        });
      }
    },
    [
      sessionId,
      fetchHistory,
      isMountedRef,
      toast,
      trackWithTelegramContext,
      updateFallbackMessage,
    ],
  );

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    void loadHistory();
  }, [sessionId, loadHistory]);

  useEffect(() => {
    trackWithTelegramContext({
      event_type: "chat_status_changed",
      interaction_data: {
        status: syncStatus,
        session_id: sessionId || undefined,
        timestamp: new Date().toISOString(),
      },
    });
  }, [sessionId, syncStatus, trackWithTelegramContext]);

  useEffect(() => {
    if (!messageContainerRef.current) {
      return;
    }
    messageContainerRef.current.scrollTop =
      messageContainerRef.current.scrollHeight;
  }, [messages, fallbackMessage, isLoading]);

  const appendMessages = useCallback((...msgs: ChatMessage[]) => {
    setMessages((previous) => {
      const next = [...previous, ...msgs];
      return next.slice(-MAX_HISTORY);
    });
  }, []);

  const handleSuggestion = useCallback(
    (value: string) => {
      setQuestion(value);
      focusInput();
    },
    [focusInput],
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
    const assistantPlaceholder: ChatMessage = {
      role: "assistant",
      content: "",
    };
    const nextHistory = [...messages, userMessage];

    setQuestion("");
    setIsLoading(true);
    setSyncStatus("syncing");
    setInlineError(null);
    updateFallbackMessage(null);

    appendMessages(userMessage, assistantPlaceholder);

    try {
      type SendResult = Awaited<ReturnType<typeof sendMessage>>;
      const attemptSend = async (
        retry: number,
        onToken?: (chunk: ChatStreamChunk) => void,
      ): Promise<SendResult> => {
        try {
          return await sendMessage({
            message: userQuestion,
            history: nextHistory,
            onToken,
          });
        } catch (err) {
          const chatError = err instanceof DynamicChatError
            ? err
            : new DynamicChatError("Failed to send message", { cause: err });
          if (chatError.isRetryable && retry < 2) {
            const delay = 400 * 2 ** retry;
            await new Promise((resolve) => setTimeout(resolve, delay));
            return attemptSend(retry + 1, onToken);
          }
          throw chatError;
        }
      };

      const response = await attemptSend(0, (chunk: ChatStreamChunk) => {
        setMessages((previous) => {
          if (previous.length === 0) {
            return previous;
          }
          const next = [...previous];
          const lastIndex = next.length - 1;
          const lastEntry = next[lastIndex];
          if (!lastEntry || lastEntry.role !== "assistant") {
            return next;
          }
          next[lastIndex] = { ...lastEntry, content: chunk.content };
          return next;
        });
      });

      if (response.history.length > 0) {
        setMessages(response.history.slice(-MAX_HISTORY));
        if (
          response.history.some((entry) => entry.role === "assistant")
        ) {
          setSyncStatus("connected");
        }
      } else if (response.assistantMessage) {
        setMessages((previous) => {
          if (previous.length === 0) {
            return [response.assistantMessage];
          }
          const next = [...previous];
          const lastIndex = next.length - 1;
          if (next[lastIndex]?.role === "assistant") {
            next[lastIndex] = response.assistantMessage;
            return next;
          }
          next.push(response.assistantMessage);
          return next.slice(-MAX_HISTORY);
        });
        setSyncStatus("connected");
      } else {
        throw new Error("No answer returned");
      }
      updateFallbackMessage(null);
      setInlineError(null);
    } catch (err) {
      const chatError = err instanceof DynamicChatError
        ? err
        : new DynamicChatError("Failed to send message", { cause: err });

      if (chatError.isRecoverable) {
        setSyncStatus("idle");
        setInlineError(
          chatError.category === "rate-limit"
            ? "We hit a temporary rate limit. Please wait a few seconds and try again."
            : chatError.message ||
              "Please adjust your question and try again.",
        );
        setMessages((previous) => {
          if (previous.length === 0) {
            return previous;
          }
          let next = [...previous];
          if (next[next.length - 1]?.role === "assistant") {
            next = next.slice(0, -1);
          }
          if (
            next.length > 0 &&
            next[next.length - 1]?.role === "user" &&
            next[next.length - 1]?.content === userQuestion
          ) {
            next = next.slice(0, -1);
          }
          return next;
        });
        setQuestion(userQuestion);
        toast({
          title: "Message not sent",
          description: chatError.category === "rate-limit"
            ? "Traffic is heavy right now. We'll be ready for another try shortly."
            : "The assistant couldn't process that request. Tweak your question and resend.",
          variant: "default",
        });
        trackWithTelegramContext({
          event_type: "chat_message_recoverable_error",
          interaction_data: {
            category: chatError.category,
            status: chatError.status ?? "client",
            request_id: chatError.requestId ?? undefined,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        console.error("Failed to get AI answer", err);
        setMessages((previous) => {
          if (previous.length === 0) {
            return previous;
          }
          if (previous[previous.length - 1]?.role === "assistant") {
            return previous.slice(0, -1);
          }
          return previous;
        });
        updateFallbackMessage({
          role: "assistant",
          content: FALLBACK_ASSISTANT_RESPONSE,
        });
        setSyncStatus("error");
        toast({
          title: "Assistant temporarily offline",
          description:
            "We saved your message and loaded the fallback playbook.",
          variant: "destructive",
        });
        trackWithTelegramContext({
          event_type: "chat_message_failure",
          interaction_data: {
            category: chatError.category,
            status: chatError.status ?? "network",
            request_id: chatError.requestId ?? undefined,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setQuestion("");
    setSyncStatus("idle");
    setInlineError(null);
    updateFallbackMessage(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("chat-assistant-history");
    }
  };

  const handleRetry = useCallback(() => {
    void loadHistory({ silent: false });
  }, [loadHistory]);

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

  const hasMessages = messages.length > 0 || Boolean(fallbackMessage);
  const isSyncing = syncStatus === "syncing";

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
                        {syncStatus === "error"
                          ? (
                            <Button
                              type="button"
                              size="s"
                              variant="secondary"
                              data-border="rounded"
                              onClick={handleRetry}
                              disabled={isLoading || isSyncing}
                              aria-label="Retry connection"
                            >
                              <span className="flex items-center gap-1.5">
                                <RotateCcw className="h-4 w-4" />
                                <span>Retry</span>
                              </span>
                            </Button>
                          )
                          : null}
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
                          {syncStatus === "error"
                            ? (
                              <Button
                                type="button"
                                size="s"
                                variant="secondary"
                                data-border="rounded"
                                onClick={handleRetry}
                                disabled={isLoading || isSyncing}
                                aria-label="Retry connection"
                              >
                                <span className="flex items-center gap-1.5">
                                  <RotateCcw className="h-4 w-4" />
                                  <span className="sr-only">Retry</span>
                                </span>
                              </Button>
                            )
                            : null}
                          <Button
                            type="button"
                            size="s"
                            variant="secondary"
                            data-border="rounded"
                            onClick={handleReset}
                            disabled={isLoading}
                            aria-label="Reset conversation"
                          >
                            <Sparkles className="h-4 w-4" />
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
                                  <div className="max-w-[85%] rounded-2xl border border-dc-brand/20 bg-dc-brand/10 px-4 py-3 text-sm text-dc-brand-dark shadow-sm dark:border-dc-brand/30 dark:bg-dc-brand/15 dark:text-dc-brand-light">
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
                                        ? "border border-dc-brand/20 bg-dc-brand/10 text-dc-brand-dark dark:border-dc-brand/30 dark:bg-dc-brand/15 dark:text-dc-brand-light"
                                        : "bg-primary text-primary-foreground",
                                    )}
                                  >
                                    {isAssistant
                                      ? (
                                        <span className="absolute -left-2 top-1 h-3 w-3 rotate-45 rounded-sm border border-dc-brand/20 bg-dc-brand/10 shadow-sm dark:border-dc-brand/30 dark:bg-dc-brand/15" />
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
                          {fallbackMessage
                            ? (
                              <DynamicMotionStackItem
                                key="assistant-fallback"
                                layout
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.28, ease: "easeOut" }}
                              >
                                <div className="flex justify-start">
                                  <div
                                    className={cn(
                                      "relative max-w-[85%] rounded-2xl px-4 py-3 text-sm text-dc-brand-dark shadow-sm",
                                      "border border-dc-brand/20 bg-dc-brand/10 dark:border-dc-brand/30 dark:bg-dc-brand/15 dark:text-dc-brand-light",
                                    )}
                                  >
                                    <span className="absolute -left-2 top-1 h-3 w-3 rotate-45 rounded-sm border border-dc-brand/20 bg-dc-brand/10 shadow-sm dark:border-dc-brand/30 dark:bg-dc-brand/15" />
                                    <Text
                                      as="span"
                                      variant="body-default-s"
                                      style={{ whiteSpace: "pre-wrap" }}
                                      className="block"
                                    >
                                      {fallbackMessage.content}
                                    </Text>
                                  </div>
                                </div>
                              </DynamicMotionStackItem>
                            )
                            : null}
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
                                  <div
                                    className={cn(
                                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm",
                                      "border border-dc-brand/20 bg-dc-brand/10 text-dc-brand-dark shadow-sm dark:border-dc-brand/30 dark:bg-dc-brand/15 dark:text-dc-brand-light",
                                    )}
                                  >
                                    <Spinner />
                                    <span>Assistant is typing…</span>
                                  </div>
                                </div>
                              </DynamicMotionStackItem>
                            )
                            : null}
                        </AnimatePresence>
                      </div>
                      {hasSuggestions
                        ? (
                          <Column gap="8" align="start" className="w-full">
                            <Row
                              horizontal="between"
                              vertical="center"
                              className="w-full"
                            >
                              <Text
                                variant="label-default-s"
                                onBackground="neutral-weak"
                              >
                                Quick replies
                              </Text>
                              {hasSuggestionOverflow
                                ? (
                                  <Button
                                    type="button"
                                    size="s"
                                    variant="secondary"
                                    data-border="rounded"
                                    onClick={cycleSuggestions}
                                    aria-label="Refresh quick replies"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <RotateCcw className="h-4 w-4" />
                                      <span>Refresh</span>
                                    </span>
                                  </Button>
                                )
                                : null}
                            </Row>
                            <Row gap="8" wrap className="w-full">
                              {visibleSuggestions.map((suggestion) => (
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
                        )
                        : null}
                      <Column
                        gap="8"
                        align="start"
                        className="w-full rounded-xl border border-primary/10 bg-primary/5 p-4"
                      >
                        <Text
                          variant="label-default-s"
                          onBackground="neutral-weak"
                        >
                          Desk playbook highlights
                        </Text>
                        <Column gap="4" align="start" className="w-full">
                          {DESK_PLAYBOOK.map((highlight) => (
                            <Row
                              key={highlight}
                              gap="8"
                              align="start"
                              vertical="start"
                              className="w-full"
                            >
                              <span className="mt-1 text-xs text-primary">
                                •
                              </span>
                              <Text
                                as="span"
                                variant="body-default-xs"
                                onBackground="neutral-strong"
                                className="text-left"
                              >
                                {highlight}
                              </Text>
                            </Row>
                          ))}
                        </Column>
                      </Column>
                      <form
                        onSubmit={handleSubmit}
                        className="w-full space-y-3"
                      >
                        <Column gap="12">
                          {inlineError
                            ? (
                              <Text
                                as="p"
                                variant="body-default-xs"
                                onBackground="danger-strong"
                                role="status"
                              >
                                {inlineError}
                              </Text>
                            )
                            : null}
                          <Input
                            ref={inputRef}
                            id="chat-assistant-question"
                            value={question}
                            onChange={(event) =>
                              setQuestion(event.target.value)}
                            placeholder="Ask about VIP Plans, Tokens, or Trading Basics…"
                            aria-label="Ask the Dynamic Capital assistant a question"
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
