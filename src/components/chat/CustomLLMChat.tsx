import { useState, useRef, useEffect } from "react";
import { useCustomLLMChat } from "../../hooks/useCustomLLMChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send } from "lucide-react";

interface CustomLLMChatProps {
  provider?: "openai" | "anthropic" | "ollama" | "lovable" | "custom";
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  systemPrompt?: string;
  placeholder?: string;
}

export function CustomLLMChat({
  provider = "openai",
  model,
  baseUrl,
  apiKey,
  systemPrompt,
  placeholder = "Type your message...",
}: CustomLLMChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, sendMessage, isLoading, error } = useCustomLLMChat({
    provider,
    model,
    baseUrl,
    apiKey,
    systemPrompt,
    stream: true,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const message = input;
    setInput("");
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <Card
              key={index}
              className={`p-4 ${
                message.role === "user"
                  ? "bg-primary/10 ml-auto max-w-[80%]"
                  : "bg-muted max-w-[80%]"
              }`}
            >
              <div className="text-sm font-medium mb-1 capitalize">
                {message.role}
              </div>
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            </Card>
          ))}
          
          {isLoading && (
            <Card className="p-4 bg-muted max-w-[80%]">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </Card>
          )}
          
          {error && (
            <Card className="p-4 bg-destructive/10 border-destructive">
              <div className="text-sm text-destructive">{error}</div>
            </Card>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
