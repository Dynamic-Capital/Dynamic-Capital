import { useState } from 'react';
import { DynamicAGIChat } from '@/components/chat/DynamicAGIChat';
import { Card } from '@/components/ui/card';

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | undefined>();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Dynamic AGI Chat</h1>
          <p className="text-muted-foreground mt-2">
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
    </div>
  );
}
