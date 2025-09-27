import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useDynamicChat } from "@/hooks/useDynamicChat";
import { type ChatMessage } from "@/services/dynamic-ai/schema";

const SESSION_STORAGE_KEY = "dynamic-capital.ai.session";

type UiMessageStatus = "sent" | "pending" | "error";

type UiMessage = ChatMessage & {
  id: string;
  status: UiMessageStatus;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function toUiMessages(messages: ChatMessage[]): UiMessage[] {
  return messages.map((message) => ({
    ...message,
    id: createId(),
    status: "sent" as const,
  }));
}

function toChatHistory(messages: UiMessage[]): ChatMessage[] {
  return messages
    .filter((message) => message.status === "sent")
    .map(({ role, content }) => ({ role, content }));
}

function getAssistantContentForStatus(status: UiMessageStatus) {
  if (status === "pending") {
    return "Thinking…";
  }
  if (status === "error") {
    return "I couldn't process that request. Please try again.";
  }
  return undefined;
}

export function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hasScrolled = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const queryClient = useQueryClient();

  const { fetchHistory, sendMessage } = useDynamicChat({
    sessionId: sessionId ?? undefined,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      setSessionId(stored);
      return;
    }
    const generated = createId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, generated);
    setSessionId(generated);
  }, []);

  const chatHistoryKey = useMemo(
    () => ["dynamic-ai-chat-history", sessionId ?? "pending"],
    [sessionId],
  );

  const historyQuery = useQuery({
    queryKey: chatHistoryKey,
    enabled: Boolean(sessionId),
    staleTime: 30_000,
    queryFn: async () => {
      const result = await fetchHistory();
      return result;
    },
  });

  useEffect(() => {
    if (historyQuery.data?.messages) {
      setMessages(toUiMessages(historyQuery.data.messages));
    }
  }, [historyQuery.data]);

  useEffect(() => {
    if (!historyQuery.error) {
      return;
    }
    if (historyQuery.error instanceof Error) {
      setErrorMessage(historyQuery.error.message);
    } else {
      setErrorMessage("We could not load your previous conversation.");
    }
  }, [historyQuery.error]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    const behavior = hasScrolled.current ? "smooth" : "auto";
    container.scrollTo({ top: container.scrollHeight, behavior });
    hasScrolled.current = true;
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async ({
      message,
      history,
    }: {
      message: string;
      history: ChatMessage[];
    }) => {
      if (!sessionId) {
        throw new Error("Missing session identifier");
      }

      const response = await sendMessage({
        message,
        history,
      });

      return response;
    },
    onMutate: async ({ message }) => {
      setErrorMessage(null);
      const optimisticUser: UiMessage = {
        id: createId(),
        role: "user",
        content: message,
        status: "sent",
      };
      const optimisticAssistant: UiMessage = {
        id: createId(),
        role: "assistant",
        content: "",
        status: "pending",
      };

      setMessages((prev) => [...prev, optimisticUser, optimisticAssistant]);

      return { assistantId: optimisticAssistant.id };
    },
    onSuccess: (data) => {
      setMessages(toUiMessages(data.history));
      queryClient.setQueryData(chatHistoryKey, {
        messages: data.history,
      });
    },
    onError: (error, _variables, context) => {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
      if (context?.assistantId) {
        setMessages((prev) =>
          prev.map((message) => {
            if (message.id !== context.assistantId) {
              return message;
            }
            return {
              ...message,
              status: "error" as const,
            };
          }),
        );
      }
    },
    onSettled: () => {
      hasScrolled.current = false;
    },
  });

  const isLoadingHistory = historyQuery.isLoading || !sessionId;
  const isSending = chatMutation.isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionId) {
      return;
    }
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }

    chatMutation.mutate({
      message: trimmed,
      history: toChatHistory(messages),
    });
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleReset = () => {
    const nextSession = createId();
    setMessages([]);
    setErrorMessage(null);
    setSessionId(nextSession);
    hasScrolled.current = false;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_STORAGE_KEY, nextSession);
    }
    queryClient.removeQueries({
      queryKey: ["dynamic-ai-chat-history"],
      exact: false,
    });
  };

  return (
    <div className="min-h-screen bg-background/80 pb-16 pt-10 text-foreground">
      <div className="container mx-auto flex max-w-5xl flex-col gap-6 px-4">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
              Concierge Chat
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Ask anything about deposits, membership, or operations.
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              The Dynamic concierge pulls from product documentation, support
              runbooks, and live payment data to give you fast, actionable
              answers.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition-colors duration-200 hover:border-primary hover:bg-primary/10"
          >
            Start new session
          </button>
        </header>

        {errorMessage ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <section className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-3xl border border-border/60 bg-card/70 shadow-lg backdrop-blur">
          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto px-6 py-6"
            aria-live="polite"
          >
            {isLoadingHistory && messages.length === 0 ? (
              <div className="space-y-4">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex gap-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary/10" />
                    <div className="flex-1 space-y-3">
                      <div className="h-3 w-3/4 rounded-full bg-muted" />
                      <div className="h-3 w-1/2 rounded-full bg-muted/70" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <p className="text-base font-medium text-foreground">
                  Welcome to the Dynamic concierge.
                </p>
                <p className="max-w-md text-sm">
                  Ask about onboarding, payouts, risk policies, or anything else
                  your desk needs. The assistant will tailor responses to your
                  account context.
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isUser = message.role === "user";
                const statusContent = getAssistantContentForStatus(
                  message.status,
                );
                const displayContent =
                  statusContent && message.role === "assistant"
                    ? statusContent
                    : message.content;

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm md:text-base ${
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : message.status === "error"
                            ? "border border-destructive/40 bg-destructive/10 text-destructive"
                            : "bg-muted text-foreground"
                      } ${
                        message.status === "pending" ? "opacity-70" : ""
                      }`}
                    >
                      <p className="whitespace-pre-line leading-relaxed">
                        {displayContent}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <form
            onSubmit={handleSubmit}
            className="border-t border-border/60 bg-background/80 px-6 py-5"
          >
            <fieldset className="flex flex-col gap-3" disabled={isSending}>
              <label className="text-sm font-medium text-muted-foreground">
                Ask the concierge
              </label>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="e.g. Summarize recent VIP deposits and flag any pending verifications"
                rows={3}
                className="w-full resize-none rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 md:text-base"
              />
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  The concierge may reference private payment data. Share
                  responsibly.
                </span>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSending ? "Sending…" : "Send message"}
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      </div>
    </div>
  );
}

export default ChatPage;
