import { useState } from "react";
import { DynamicAGIChat } from "@/components/chat/DynamicAGIChat";
import { Card } from "@/components/ui/card";

export function ChatSection() {
  const [sessionId, setSessionId] = useState<string | undefined>();

  return (
    <section id="chat" className="py-16">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Dynamic AGI Chat</h2>
          <p className="mt-2 text-muted-foreground">
            Your intelligent trading assistant powered by Dynamic AGI
          </p>
        </div>

        <Card className="h-[calc(100vh-16rem)]">
          <DynamicAGIChat
            sessionId={sessionId}
            onSessionChange={setSessionId}
          />
        </Card>
      </div>
    </section>
  );
}

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-background">
      <ChatSection />
    </div>
  );
}
