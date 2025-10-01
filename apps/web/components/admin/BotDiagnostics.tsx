"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  RefreshCw,
  Settings,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { callEdgeFunction } from "@/config/supabase";
import { formatIsoDateTime } from "@/utils/isoFormat";

interface BotStatus {
  bot_status: string;
  webhook_status: string;
  last_update: string;
  webhook_url?: string;
  pending_updates?: number;
}

export function BotDiagnostics() {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const { getAdminAuth } = useTelegramAuth();
  const { toast } = useToast();

  const loadBotStatus = useCallback(async () => {
    setLoading(true);
    try {
      const auth = getAdminAuth();
      if (!auth) {
        throw new Error("No admin authentication available");
      }

      const { data, error } = await callEdgeFunction("BOT_STATUS_CHECK", {
        method: "POST",
        headers: {
          ...(auth.token ? { "Authorization": `Bearer ${auth.token}` } : {}),
        },
        body: {
          ...(auth.initData ? { initData: auth.initData } : {}),
        },
      });

      if (error) {
        console.warn("Failed to load bot status:", error.message);
        setBotStatus(null);
      } else if ((data as any)?.ok) {
        setBotStatus(data as BotStatus);
      } else {
        console.warn("Failed to load bot status:", (data as any)?.error);
        setBotStatus(null);
      }
    } catch (error) {
      console.error("Failed to load bot status:", error);
      setBotStatus(null);
    } finally {
      setLoading(false);
    }
  }, [getAdminAuth]);

  const rotateWebhookSecret = async () => {
    setIsRotating(true);
    try {
      const auth = getAdminAuth();
      if (!auth) {
        throw new Error("No admin authentication available");
      }

      const { data, error } = await callEdgeFunction("ROTATE_WEBHOOK_SECRET", {
        method: "POST",
        headers: {
          ...(auth.token ? { "Authorization": `Bearer ${auth.token}` } : {}),
        },
        body: {
          ...(auth.initData ? { initData: auth.initData } : {}),
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if ((data as any)?.ok) {
        toast({
          title: "Success",
          description: "Webhook secret rotated successfully",
        });
        await loadBotStatus();
      } else {
        throw new Error(
          (data as any)?.error || "Failed to rotate webhook secret",
        );
      }
    } catch (error) {
      console.error("Failed to rotate webhook secret:", error);
      toast({
        title: "Error",
        description: error instanceof Error
          ? error.message
          : "Failed to rotate webhook secret",
        variant: "destructive",
      });
    } finally {
      setIsRotating(false);
    }
  };

  const resetBot = async () => {
    try {
      const auth = getAdminAuth();
      if (!auth) {
        throw new Error("No admin authentication available");
      }

      const { data, error } = await callEdgeFunction("RESET_BOT", {
        method: "POST",
        headers: {
          ...(auth.token ? { "Authorization": `Bearer ${auth.token}` } : {}),
        },
        body: {
          ...(auth.initData ? { initData: auth.initData } : {}),
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if ((data as any)?.ok) {
        toast({
          title: "Success",
          description: "Bot reset successfully",
        });
        await loadBotStatus();
      } else {
        throw new Error((data as any)?.error || "Failed to reset bot");
      }
    } catch (error) {
      console.error("Failed to reset bot:", error);
      toast({
        title: "Error",
        description: error instanceof Error
          ? error.message
          : "Failed to reset bot",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadBotStatus();
  }, [loadBotStatus]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "online":
      case "healthy":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "error":
      case "failed":
      case "offline":
        return "bg-dc-brand/10 text-dc-brand border-dc-brand/20";
      case "warning":
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "online":
      case "healthy":
        return <CheckCircle className="w-4 h-4" />;
      case "error":
      case "failed":
      case "offline":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Bot Diagnostics
            </div>
            <Button
              onClick={loadBotStatus}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading
            ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary">
                </div>
                <span className="ml-2">Checking bot status...</span>
              </div>
            )
            : botStatus
            ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {getStatusIcon(botStatus.bot_status)}
                        Bot Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge className={getStatusColor(botStatus.bot_status)}>
                        {botStatus.bot_status}
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Webhook Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge
                        className={getStatusColor(botStatus.webhook_status)}
                      >
                        {botStatus.webhook_status}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                {botStatus.webhook_url && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Webhook URL</h4>
                    <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                      {botStatus.webhook_url}
                    </p>
                  </div>
                )}

                {botStatus.pending_updates !== undefined &&
                  botStatus.pending_updates > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {botStatus.pending_updates} pending updates detected
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-xs text-muted-foreground">
                  Last checked: {formatIsoDateTime(botStatus.last_update)}
                </div>
              </div>
            )
            : (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load bot status
              </div>
            )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Bot Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={rotateWebhookSecret}
            disabled={isRotating}
            variant="outline"
            className="w-full"
          >
            <Shield className="w-4 h-4 mr-2" />
            {isRotating ? "Rotating..." : "Rotate Webhook Secret"}
          </Button>

          <Button
            onClick={resetBot}
            variant="destructive"
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Bot
          </Button>

          <p className="text-xs text-muted-foreground">
            Use these tools carefully. Rotating webhook secret will update
            security credentials. Resetting the bot will clear temporary state
            and restart services.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
