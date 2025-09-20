"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Bot, Minimize2, RotateCcw, Send, User, X } from "lucide-react";

import { OnceButton } from "@/components/once-ui";
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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function ChatAssistantWidget({ telegramData, className }: ChatAssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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

  const appendMessages = (...msgs: ChatMessage[]) => {
    setMessages((previous) => {
      const next = [...previous, ...msgs];
      return next.slice(-MAX_HISTORY);
    });
  };

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
    setQuestion("");
    setIsLoading(true);

    appendMessages({ role: "user", content: userQuestion });
    void logChatMessage({
      telegramUserId: telegramData?.id,
      sessionId,
      role: "user",
      content: userQuestion,
    });

    try {
      const { data, error } = await supabase.functions.invoke("ai-faq-assistant", {
        body: {
          question: userQuestion,
          context: telegramData ? { telegram: telegramData } : undefined,
        },
      });

      if (error) {
        throw new Error(error.message || "AI service unavailable");
      }

      if (data?.answer) {
        appendMessages({ role: "assistant", content: data.answer });
        void logChatMessage({
          telegramUserId: telegramData?.id,
          sessionId,
          role: "assistant",
          content: data.answer,
        });
      } else {
        throw new Error("No answer returned");
      }
    } catch (err) {
      console.error("Failed to get AI answer", err);
      const fallbackMessage = [
        "I’m sorry, the assistant is taking a quick break.",
        "Here’s what most traders ask for:",
        "• VIP onboarding: pick a plan, complete checkout, and the bot unlocks everything instantly",
        "• Benefits: 24/7 desk coverage, live playbooks, automation templates",
        "• Risk management: position sizing calculators, trade review frameworks",
        "Need a human? Message @DynamicCapital_Support",
      ].join("\n\n");
      appendMessages({ role: "assistant", content: fallbackMessage });
      toast({
        title: "Assistant unavailable",
        description: "Showing the fallback playbook",
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
    if (typeof window !== "undefined") {
      localStorage.removeItem("chat-assistant-history");
    }
  };

  return (
    <LayoutGroup>
      <AnimatePresence initial={false} mode="wait">
        {isOpen ? (
          <motion.div
            key="chat-open"
            layoutId="chat-assistant"
            className={cn("fixed bottom-20 left-4 z-40", className)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            style={{ width: "min(22rem, 88vw)" }}
          >
            <Column
              background="surface"
              border="neutral-alpha-medium"
              radius="l"
              padding="l"
              gap="16"
              shadow="xl"
            >
              {isMinimized ? (
                <Row horizontal="between" vertical="center">
                  <Row gap="8" vertical="center">
                    <Bot className="h-4 w-4" />
                    <Text variant="body-default-m">Desk assistant</Text>
                  </Row>
                  <Row gap="8">
                    <Button
                      size="s"
                      variant="secondary"
                      data-border="rounded"
                      onClick={() => setIsMinimized(false)}
                    >
                      Reopen
                    </Button>
                    <Button
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
                <>
                  <Row horizontal="between" vertical="center">
                    <Row gap="8" vertical="center">
                      <Bot className="h-5 w-5" />
                      <Column>
                        <Text variant="heading-strong-s">Desk assistant</Text>
                        <Text variant="body-default-s" onBackground="neutral-weak">
                          Ask anything about VIP access or execution support.
                        </Text>
                      </Column>
                    </Row>
                    <Row gap="8">
                      <Button
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
                        size="s"
                        variant="secondary"
                        data-border="rounded"
                        onClick={() => setIsMinimized(true)}
                        aria-label="Minimize chat"
                      >
                        <Minimize2 className="h-4 w-4" />
                      </Button>
                      <Button
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
                  <Row wrap gap="8">
                    {quickSuggestions.map((suggestion) => (
                      <Button
                        key={suggestion}
                        size="s"
                        variant="secondary"
                        data-border="rounded"
                        onClick={() => setQuestion(suggestion)}
                        disabled={isLoading}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </Row>
                  <Column
                    gap="12"
                    style={{ maxHeight: "16rem", overflowY: "auto" }}
                  >
                    {messages.length === 0 ? (
                      <Column
                        background="page"
                        border="neutral-alpha-weak"
                        radius="m"
                        padding="m"
                        gap="8"
                      >
                        <Text variant="body-default-m">
                          Welcome! Ask how to join the VIP desk, what’s inside the admin dashboard, or how to automate risk.
                        </Text>
                        <Text variant="body-default-s" onBackground="neutral-weak">
                          Responses blend live bot knowledge with the macro playbook.
                        </Text>
                      </Column>
                    ) : (
                      messages.map((message, index) => (
                        <Column
                          key={`${message.role}-${index}`}
                          background={
                            message.role === "assistant"
                              ? "brand-alpha-weak"
                              : "page"
                          }
                          border={
                            message.role === "assistant"
                              ? "brand-alpha-medium"
                              : "neutral-alpha-weak"
                          }
                          radius="m"
                          padding="m"
                          gap="8"
                        >
                          <Row gap="8" vertical="center">
                            {message.role === "assistant" ? (
                              <Bot className="h-4 w-4" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                            <Text variant="body-default-s" onBackground="neutral-weak">
                              {message.role === "assistant" ? "Desk" : "You"}
                            </Text>
                          </Row>
                          <Text variant="body-default-m" style={{ whiteSpace: "pre-wrap" }}>
                            {message.content}
                          </Text>
                        </Column>
                      ))
                    )}
                  </Column>
                  <form onSubmit={handleSubmit}>
                    <Column gap="12">
                      <Input
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
                            <Text variant="body-default-s">Gathering answer…</Text>
                          </Row>
                        ) : (
                          <Row gap="8" vertical="center">
                            <Send className="h-4 w-4" />
                            Ask the desk
                          </Row>
                        )}
                      </Button>
                    </Column>
                  </form>
                </>
              )}
            </Column>
          </motion.div>
        ) : (
          <motion.div
            key="chat-closed"
            layoutId="chat-assistant"
            className={cn("fixed bottom-20 left-4 z-40", className)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <OnceButton
              variant="primary"
              size="default"
              className="rounded-full"
              onClick={() => {
                setIsOpen(true);
                setIsMinimized(false);
              }}
            >
              <Row gap="8" vertical="center">
                <Bot className="h-5 w-5" />
                Chat with the desk
              </Row>
            </OnceButton>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}

export default ChatAssistantWidget;
