"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select } from "@/components/ui/select";
import { Calendar, MessageSquare, RefreshCw, Send, Users } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { callEdgeFunction } from "@/config/supabase";
import { formatIsoDateTime } from "@/utils/isoFormat";

interface BroadcastMessage {
  id: string;
  title: string;
  content?: string;
  target_audience?: any;
  delivery_status: string;
  created_at: string;
  scheduled_at?: string;
  sent_at?: string;
  total_recipients?: number;
  successful_deliveries?: number;
  failed_deliveries?: number;
}

export function BroadcastManager() {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { getAdminAuth } = useTelegramAuth();
  const { toast } = useToast();

  const audienceOptions = useMemo(
    () => [
      { value: "all", label: "All Users" },
      { value: "vip", label: "VIP Users Only" },
      { value: "free", label: "Free Users Only" },
      { value: "admins", label: "Admins Only" },
    ],
    [],
  );

  const loadBroadcasts = useCallback(async () => {
    setLoading(true);
    try {
      const auth = getAdminAuth();
      if (!auth) {
        throw new Error("No admin authentication available");
      }

      const { data, error } = await callEdgeFunction("BROADCAST_DISPATCH", {
        method: "POST",
        headers: {
          ...(auth.token ? { "Authorization": `Bearer ${auth.token}` } : {}),
        },
        body: {
          ...(auth.initData ? { initData: auth.initData } : {}),
          action: "list",
        },
      });

      if (error) {
        console.warn("Failed to load broadcasts:", error.message);
        setMessages([]);
      } else if ((data as any)?.ok) {
        setMessages((data as any).messages || []);
      } else {
        console.warn("Failed to load broadcasts:", (data as any)?.error);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to load broadcasts:", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [getAdminAuth]);

  const sendBroadcast = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter both title and content",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const auth = getAdminAuth();
      if (!auth) {
        throw new Error("No admin authentication available");
      }

      const { data, error } = await callEdgeFunction("BROADCAST_DISPATCH", {
        method: "POST",
        headers: {
          ...(auth.token ? { "Authorization": `Bearer ${auth.token}` } : {}),
        },
        body: {
          ...(auth.initData ? { initData: auth.initData } : {}),
          action: "send",
          title: newTitle,
          content: newContent,
          target_audience: { type: targetAudience },
          scheduled_at: scheduledTime || undefined,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if ((data as any)?.ok) {
        toast({
          title: "Success",
          description: scheduledTime
            ? "Broadcast scheduled successfully"
            : "Broadcast sent successfully",
        });
        setNewTitle("");
        setNewContent("");
        setScheduledTime("");
        await loadBroadcasts();
      } else {
        throw new Error((data as any)?.error || "Failed to send broadcast");
      }
    } catch (error) {
      console.error("Failed to send broadcast:", error);
      toast({
        title: "Error",
        description: error instanceof Error
          ? error.message
          : "Failed to send broadcast",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    loadBroadcasts();
  }, [loadBroadcasts]);

  const formatDate = (dateString: string) => {
    return formatIsoDateTime(dateString);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "failed":
        return "bg-dc-brand/10 text-dc-brand border-dc-brand/20";
      case "sending":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "scheduled":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="Broadcast title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Content</label>
            <Textarea
              placeholder="Broadcast message content..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Target Audience</label>
              <Select
                value={targetAudience}
                onValueChange={(value) => {
                  const nextValue = Array.isArray(value) ? value[0] : value;
                  setTargetAudience(nextValue ?? "all");
                }}
                options={audienceOptions}
                surfaceClassName="rounded-lg border border-border/60 bg-background"
                inputClassName="text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Schedule (optional)</label>
              <Input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={sendBroadcast}
            disabled={isSending || !newTitle.trim() || !newContent.trim()}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending
              ? "Sending..."
              : (scheduledTime ? "Schedule Broadcast" : "Send Now")}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Broadcast History ({messages.length})
            </div>
            <Button
              onClick={loadBroadcasts}
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
          <ScrollArea className="h-[400px]">
            {loading
              ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary">
                  </div>
                  <span className="ml-2">Loading broadcasts...</span>
                </div>
              )
              : messages.length === 0
              ? (
                <div className="text-center py-8 text-muted-foreground">
                  No broadcasts yet
                </div>
              )
              : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{message.title}</h4>
                        <Badge
                          className={getStatusColor(message.delivery_status)}
                        >
                          {message.delivery_status}
                        </Badge>
                      </div>

                      {message.content && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {message.content}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Created: {formatDate(message.created_at)}
                        </div>
                        {message.sent_at && (
                          <span>Sent: {formatDate(message.sent_at)}</span>
                        )}
                      </div>

                      {(message.total_recipients !== undefined) && (
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>Recipients: {message.total_recipients}</span>
                          </div>
                          {message.successful_deliveries !== undefined && (
                            <span className="text-green-600">
                              ✓ {message.successful_deliveries}
                            </span>
                          )}
                          {message.failed_deliveries !== undefined &&
                            message.failed_deliveries > 0 && (
                            <span className="text-dc-brand-dark">
                              ✗ {message.failed_deliveries}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
