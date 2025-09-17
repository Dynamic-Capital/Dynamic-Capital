"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Send,
  Loader2,
  Bot,
  X,
  Minimize2,
  User,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import { logChatMessage } from "@/integrations/supabase/queries";
import { cn } from "@/utils";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";

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

const MAX_HISTORY = 50; // cap history to avoid unbounded localStorage growth

export function ChatAssistantWidget({ telegramData, className }: ChatAssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("chat-assistant-history");
      if (stored) {
        try {
          return (
            JSON.parse(stored) as {
              role: "user" | "assistant";
              content: string;
            }[]
          ).slice(-MAX_HISTORY);
        } catch {
          localStorage.removeItem("chat-assistant-history");
        }
      }
    }
    return [];
  });
  const [sessionId] = useState(() => {
    if (typeof window !== "undefined") {
      let sid = localStorage.getItem("chat-assistant-session-id");
      if (!sid) {
        sid = crypto.randomUUID();
        localStorage.setItem("chat-assistant-session-id", sid);
      }
      return sid;
    }
    return "";
  });
  const { toast } = useToast();

  const appendMessages = (
    ...msgs: { role: "user" | "assistant"; content: string }[]
  ) => {
    setMessages((prev) => {
      const next = [...prev, ...msgs];
      return next.slice(-MAX_HISTORY);
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chat-assistant-history", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    async function loadHistory() {
      if (!sessionId) return;
      try {
        const { data, error } = await supabase
          .from("user_interactions")
          .select("interaction_data")
          .eq("interaction_type", "ai_chat")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true })
          .limit(MAX_HISTORY);
        if (!error && data) {
          const loaded = data
            .map((r) => r.interaction_data as { role: "user" | "assistant"; content: string } | null)
            .filter((m): m is { role: "user" | "assistant"; content: string } => m !== null);
          if (loaded.length) {
            setMessages(loaded.slice(-MAX_HISTORY));
          }
        }
      } catch (err) {
        console.warn("Failed to load chat history", err);
      }
    }
    loadHistory();
  }, [sessionId]);

  const quickSuggestions = [
    "How do I start?",
    "VIP benefits?",
    "Trading tips?",
    "Risk management?",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast({
        title: "Please enter a question",
        description: "Type your trading or platform related question",
        variant: "destructive",
      });
      return;
    }

    const userQuestion = question.trim();
    setIsLoading(true);
    appendMessages({ role: "user", content: userQuestion });
    void logChatMessage({
      telegramUserId: telegramData?.id,
      sessionId,
      role: "user",
      content: userQuestion,
    });
    setQuestion("");

    try {
      const { data, error } = await supabase.functions.invoke("ai-faq-assistant", {
        body: {
          question: userQuestion,
          context: telegramData ? { telegram: telegramData } : undefined,
        },
      });

      if (error) {
        console.warn("AI service unavailable:", error);
        const fallbackMessage = `I'm sorry, the AI service is temporarily unavailable.

Here are some quick answers to common questions:

🔹 **Getting Started**: Choose a VIP plan → Make payment → Get access to our premium signals and community
🔹 **VIP Benefits**: Real-time signals, market analysis, 24/7 support, and exclusive community access
🔹 **Trading Tips**: Always use proper risk management, never risk more than 2% per trade
🔹 **Risk Management**: Set stop losses, use proper position sizing, and never trade with emotion

💡 Need more help? Contact @DynamicCapital_Support or check our VIP plans!`;
        appendMessages({ role: "assistant", content: fallbackMessage });
        toast({
          title: "AI service unavailable",
          description: "Showing fallback answers. Please try again later.",
          variant: "destructive",
        });
        void logChatMessage({
          telegramUserId: telegramData?.id,
          sessionId,
          role: "assistant",
          content: fallbackMessage,
        });
        return;
      }

      if (data.answer) {
        appendMessages({ role: "assistant", content: data.answer });
        void logChatMessage({
          telegramUserId: telegramData?.id,
          sessionId,
          role: "assistant",
          content: data.answer,
        });
      } else {
        throw new Error("No answer received");
      }
    } catch (error: any) {
      console.error("Failed to get AI answer:", error);
      const fallbackMessage = `I apologize, but the AI service is currently experiencing issues.

Here are some helpful resources:

🔹 **Trading Questions**: Our VIP community provides real-time support and guidance
🔹 **Platform Help**: Contact @DynamicCapital_Support for technical assistance
🔹 **Account Issues**: Email support@dynamiccapital.com for account-related questions
🔹 **VIP Plans**: Choose from 1, 3, 6, 12 month or Lifetime VIP access

📈 **Quick Trading Tips**:
• Use proper risk management (max 2% per trade)
• Follow our premium signals for best results
• Join our VIP community for live market analysis

💡 Need immediate help? Contact @DynamicCapital_Support!`;
      appendMessages({ role: "assistant", content: fallbackMessage });
      toast({
        title: "Failed to get AI answer",
        description: error?.message || "Please try again later.",
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
            className={cn(
              "fixed bottom-20 left-4 z-40 w-80 max-w-[calc(100vw-2rem)]",
              className,
            )}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            style={{ borderRadius: 16, overflow: "hidden" }}
          >
            <Card className="bg-card/95 backdrop-blur-md border shadow-xl">
              {!isMinimized && (
                <>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary animate-pulse-glow" />
                        <CardTitle className="text-base">AI Assistant</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleReset}
                          className="h-7 px-2 text-xs"
                          disabled={isLoading}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Reset
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsMinimized(true)}
                          className="h-7 w-7 p-0"
                        >
                          <Minimize2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsOpen(false)}
                          className="h-7 w-7 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="text-xs">
                      Ask any trading or platform question
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Quick suggestion buttons */}
                    <div className="flex flex-wrap gap-1">
                      {quickSuggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          onClick={() => setQuestion(suggestion)}
                          className="text-xs h-6 px-2"
                          disabled={isLoading}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {messages.map((msg, index) => (
                        <div
                          key={index}
                          className={cn(
                            "p-2 rounded-lg",
                            msg.role === "assistant"
                              ? "bg-primary/5 border border-primary/20"
                              : "bg-muted",
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {msg.role === "assistant" ? (
                              <Bot className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                            ) : (
                              <User className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                            )}
                            <div className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                      <Input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask about trading, signals, plans..."
                        className="text-sm"
                        disabled={isLoading}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        size="sm"
                        disabled={isLoading || !question.trim()}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Getting answer...
                          </>
                        ) : (
                          <>
                            <Send className="h-3 w-3 mr-2" />
                            Ask
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </>
              )}

              {isMinimized && (
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI Assistant</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsMinimized(false)}
                        className="h-6 w-6 p-0"
                      >
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsOpen(false)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="chat-closed"
            layoutId="chat-assistant"
            className={cn("fixed bottom-20 left-4 z-40", className)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            style={{ borderRadius: 9999, overflow: "hidden" }}
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 animate-pulse-glow"
            >
              <Bot className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}

