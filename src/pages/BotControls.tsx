import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { callEdgeFunction } from "@/config/supabase";

interface StatusResponse {
  status?: string;
  bot_status?: string;
  message?: string;
}

export default function BotControls() {
  const { toast } = useToast();
  const [lastStatus, setLastStatus] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      const { data } = await callEdgeFunction("BOT_STATUS_CHECK");
      const status = (data as StatusResponse)?.bot_status || (data as StatusResponse)?.status || "unknown";
      setLastStatus(status);
      toast({
        title: "Bot status",
        description: status,
      });
    } catch (err) {
      console.error("status error", err);
      toast({ title: "Status check failed", variant: "destructive" });
    }
  };

  const rotateSecret = async () => {
    try {
      const { data } = await callEdgeFunction("ROTATE_WEBHOOK_SECRET", { method: "POST" });
      toast({ title: "Secret rotated", description: (data as StatusResponse)?.message });
    } catch (err) {
      console.error("rotate error", err);
      toast({ title: "Rotation failed", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Bot Controls</h1>
      <Card>
        <CardHeader>
          <CardTitle>Edge Function Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkStatus}>Check Bot Status</Button>
          <Button onClick={rotateSecret} variant="outline">
            Rotate Webhook Secret
          </Button>
          {lastStatus && (
            <p className="text-sm text-muted-foreground">
              Last status: {lastStatus}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
