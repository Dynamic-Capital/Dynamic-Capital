import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ResetResults {
  payments_cleared: number;
  subscriptions_cleared: number;
  enrollments_cleared: number;
  sessions_cleared: number;
  bot_reset: boolean;
  webhook_info: any;
  bot_info: any;
}

export function SystemResetButton() {
  const [isResetting, setIsResetting] = useState(false);
  const [lastReset, setLastReset] = useState<{
    success: boolean;
    results?: ResetResults;
    steps_completed?: string[];
    timestamp?: string;
  } | null>(null);

  const handleSystemReset = async () => {
    if (!confirm("Are you sure you want to clear all pending payments and reset the bot? This action cannot be undone.")) {
      return;
    }

    setIsResetting(true);
    
    try {
      toast.info("Starting system reset...");
      
      const { data, error } = await supabase.functions.invoke('admin-reset-system', {
        body: {}
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setLastReset(data);
        toast.success("System reset completed successfully!");
      } else {
        throw new Error(data?.message || "Reset failed");
      }
    } catch (error) {
      console.error("System reset failed:", error);
      toast.error(`Reset failed: ${(error as Error).message}`);
      setLastReset({
        success: false,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            System Reset
          </CardTitle>
          <CardDescription>
            Clear all pending payments and reset the Telegram bot. This will cancel all pending transactions and restart the bot webhook.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSystemReset}
            disabled={isResetting}
            variant="destructive"
            className="w-full"
          >
            {isResetting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Resetting System...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Clear Payments & Reset Bot
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {lastReset && (
        <Card className={lastReset.success ? "border-green-500" : "border-destructive"}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${lastReset.success ? "text-green-600" : "text-destructive"}`}>
              {lastReset.success ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              Last Reset: {lastReset.success ? "Success" : "Failed"}
            </CardTitle>
            <CardDescription>
              {lastReset.timestamp && `Executed at: ${new Date(lastReset.timestamp).toLocaleString()}`}
            </CardDescription>
          </CardHeader>
          {lastReset.results && (
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-medium">Results:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Payments cleared: {lastReset.results.payments_cleared}</li>
                  <li>• Subscriptions cleared: {lastReset.results.subscriptions_cleared}</li>
                  <li>• Enrollments cleared: {lastReset.results.enrollments_cleared}</li>
                  <li>• Sessions reset: {lastReset.results.sessions_cleared}</li>
                  <li>• Bot reset: {lastReset.results.bot_reset ? "✅" : "❌"}</li>
                </ul>
                
                {lastReset.steps_completed && (
                  <div className="mt-4">
                    <h4 className="font-medium">Steps Completed:</h4>
                    <ul className="space-y-1 text-sm">
                      {lastReset.steps_completed.map((step, index) => (
                        <li key={index}>• {step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {lastReset.results.bot_info && (
                  <div className="mt-4 p-2 bg-muted rounded text-xs">
                    <strong>Bot Status:</strong> {lastReset.results.bot_info.first_name} (@{lastReset.results.bot_info.username})
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}