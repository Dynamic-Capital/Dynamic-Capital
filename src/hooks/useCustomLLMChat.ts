import { useState, useCallback } from "react";
import { supabase } from "../integrations/supabase/client";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

type Provider = "openai" | "anthropic" | "ollama" | "lovable" | "custom";

interface UseCustomLLMChatOptions {
  provider?: Provider;
  model?: string;
  stream?: boolean;
  baseUrl?: string;
  apiKey?: string;
  sessionId?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export function useCustomLLMChat(options: UseCustomLLMChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      setIsLoading(true);
      setError(null);

      const userMessage: Message = { role: "user", content };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      try {
        const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-llm-chat`;

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            messages: updatedMessages,
            provider: options.provider || "openai",
            model: options.model,
            stream: options.stream ?? true,
            baseUrl: options.baseUrl,
            apiKey: options.apiKey,
            sessionId: options.sessionId,
            systemPrompt: options.systemPrompt,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          
          if (response.status === 429) {
            throw new Error("Rate limit exceeded. Please try again later.");
          }
          if (response.status === 402) {
            throw new Error("Payment required. Please add credits to your account.");
          }
          
          throw new Error(errorData.error || `API error: ${response.status}`);
        }

        // Handle streaming response
        if (options.stream !== false && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let textBuffer = "";
          let assistantContent = "";
          let streamDone = false;

          while (!streamDone) {
            const { done, value } = await reader.read();
            if (done) break;

            textBuffer += decoder.decode(value, { stream: true });

            let newlineIndex: number;
            while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
              let line = textBuffer.slice(0, newlineIndex);
              textBuffer = textBuffer.slice(newlineIndex + 1);

              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (line.startsWith(":") || line.trim() === "") continue;
              if (!line.startsWith("data: ")) continue;

              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") {
                streamDone = true;
                break;
              }

              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content as string | undefined;
                
                if (content) {
                  assistantContent += content;
                  setMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (last?.role === "assistant") {
                      return prev.map((m, i) =>
                        i === prev.length - 1 ? { ...m, content: assistantContent } : m
                      );
                    }
                    return [...prev, { role: "assistant", content: assistantContent }];
                  });
                }
              } catch {
                textBuffer = line + "\n" + textBuffer;
                break;
              }
            }
          }

          // Flush remaining buffer
          if (textBuffer.trim()) {
            for (let raw of textBuffer.split("\n")) {
              if (!raw || raw.startsWith(":") || !raw.startsWith("data: ")) continue;
              const jsonStr = raw.slice(6).trim();
              if (jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content as string | undefined;
                if (content) {
                  assistantContent += content;
                  setMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (last?.role === "assistant") {
                      return prev.map((m, i) =>
                        i === prev.length - 1 ? { ...m, content: assistantContent } : m
                      );
                    }
                    return [...prev, { role: "assistant", content: assistantContent }];
                  });
                }
              } catch {}
            }
          }
        } else {
          // Handle non-streaming response
          const data = await response.json();
          const assistantMessage: Message = {
            role: "assistant",
            content:
              options.provider === "anthropic"
                ? data.content[0].text
                : data.choices[0].message.content,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Chat error:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setIsLoading(false);
      }
    },
    [messages, options]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    error,
  };
}
