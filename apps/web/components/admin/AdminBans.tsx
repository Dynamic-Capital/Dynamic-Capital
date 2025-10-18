"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Plus, RefreshCw, Shield, UserX } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { callAdminFunction } from "@/utils/admin-client";
import { formatIsoDateTime } from "@/utils/isoFormat";
import { AdminListSkeleton } from "./AdminListSkeleton";

interface AbuseBan {
  id: string;
  telegram_id: string;
  reason?: string;
  created_at: string;
  expires_at?: string;
  created_by?: string;
}

export function AdminBans() {
  const [bans, setBans] = useState<AbuseBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTelegramId, setNewTelegramId] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newExpiration, setNewExpiration] = useState("");
  const [isAddingBan, setIsAddingBan] = useState(false);
  const { isAdmin } = useTelegramAuth();
  const { toast } = useToast();

  const loadBans = useCallback(async () => {
    setLoading(true);
    try {
      if (!isAdmin) {
        setBans([]);
        setLoading(false);
        return;
      }

      const { data, error } = await callAdminFunction("ADMIN_BANS", {
        method: "POST",
        body: { action: "list" },
      });

      if (error) {
        console.warn("Failed to load bans:", error.message);
        setBans([]);
      } else if ((data as any)?.ok) {
        setBans((data as any).bans || []);
      } else {
        console.warn("Failed to load bans:", (data as any)?.error);
        setBans([]);
      }
    } catch (error) {
      console.error("Failed to load bans:", error);
      setBans([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const addBan = async () => {
    if (!newTelegramId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Telegram ID",
        variant: "destructive",
      });
      return;
    }

    setIsAddingBan(true);
    try {
      if (!isAdmin) {
        throw new Error("No admin authentication available");
      }

      const { data, error } = await callAdminFunction("ADMIN_BANS", {
        method: "POST",
        body: {
          action: "add",
          telegram_id: newTelegramId,
          reason: newReason || undefined,
          expires_at: newExpiration || undefined,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if ((data as any)?.ok) {
        toast({
          title: "Success",
          description: "User banned successfully",
        });
        setNewTelegramId("");
        setNewReason("");
        setNewExpiration("");
        await loadBans();
      } else {
        throw new Error((data as any)?.error || "Failed to add ban");
      }
    } catch (error) {
      console.error("Failed to add ban:", error);
      toast({
        title: "Error",
        description: error instanceof Error
          ? error.message
          : "Failed to add ban",
        variant: "destructive",
      });
    } finally {
      setIsAddingBan(false);
    }
  };

  const removeBan = async (banId: string) => {
    try {
      if (!isAdmin) {
        throw new Error("No admin authentication available");
      }

      const { data, error } = await callAdminFunction("ADMIN_BANS", {
        method: "POST",
        body: {
          action: "remove",
          ban_id: banId,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if ((data as any)?.ok) {
        toast({
          title: "Success",
          description: "Ban removed successfully",
        });
        await loadBans();
      } else {
        throw new Error((data as any)?.error || "Failed to remove ban");
      }
    } catch (error) {
      console.error("Failed to remove ban:", error);
      toast({
        title: "Error",
        description: error instanceof Error
          ? error.message
          : "Failed to remove ban",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadBans();
  }, [loadBans]);

  const formatDate = (dateString: string) => {
    return formatIsoDateTime(dateString);
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Ban
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Telegram ID</label>
              <Input
                placeholder="Enter Telegram user ID"
                value={newTelegramId}
                onChange={(e) => setNewTelegramId(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Expiration (optional)
              </label>
              <Input
                type="datetime-local"
                value={newExpiration}
                onChange={(e) => setNewExpiration(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea
              placeholder="Reason for ban..."
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              rows={3}
            />
          </div>
          <Button
            onClick={addBan}
            disabled={isAddingBan || !newTelegramId.trim()}
            className="w-full"
          >
            <UserX className="w-4 h-4 mr-2" />
            {isAddingBan ? "Adding Ban..." : "Add Ban"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Active Bans ({bans.length})
            </div>
            <Button
              onClick={loadBans}
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
          <ScrollArea className="h-[400px]" aria-busy={loading}>
            {loading
              ? <AdminListSkeleton rows={4} />
              : bans.length === 0
              ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active bans
                </div>
              )
              : (
                <div className="space-y-3">
                  {bans.map((ban) => (
                    <div
                      key={ban.id}
                      className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          User: {ban.telegram_id}
                        </div>
                        <div className="flex items-center gap-2">
                          {ban.expires_at && (
                            <Badge
                              variant={isExpired(ban.expires_at)
                                ? "destructive"
                                : "secondary"}
                            >
                              {isExpired(ban.expires_at) ? "Expired" : "Active"}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeBan(ban.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>

                      {ban.reason && (
                        <p className="text-sm text-muted-foreground">
                          {ban.reason}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Created: {formatDate(ban.created_at)}
                        </div>
                        {ban.expires_at && (
                          <span>Expires: {formatDate(ban.expires_at)}</span>
                        )}
                      </div>

                      {ban.created_by && (
                        <div className="text-xs text-muted-foreground">
                          By: {ban.created_by}
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
