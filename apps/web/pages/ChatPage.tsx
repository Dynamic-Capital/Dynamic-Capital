import { useState } from "react";
import { DynamicAIChat } from "@/components/chat/DynamicAIChat";
import { AIUsageDashboard } from "@/components/chat/AIUsageDashboard";
import { Card } from "@/components/ui/card";

export function ChatSection() {
  const [sessionId, setSessionId] = useState<string | undefined>();

  return (
    <section id="chat" className="py-16">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold">Dynamic AI Command Center</h2>
            <p className="mt-1 text-muted-foreground">
              Coordinate AI, AGI, and AGS copilots with realtime telemetry.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card className="h-[calc(100vh-16rem)]">
            <DynamicAIChat
              sessionId={sessionId}
              onSessionChange={setSessionId}
            />
          </Card>
          <AIUsageDashboard />
        </div>
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
