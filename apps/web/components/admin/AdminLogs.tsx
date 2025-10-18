"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, FileText, RefreshCw, Search } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { callAdminFunction } from "@/utils/admin-client";
import { formatIsoDateTime } from "@/utils/isoFormat";
import { AdminListSkeleton } from "./AdminListSkeleton";

interface AdminLog {
  id: string;
  created_at: string;
  admin_telegram_id: string;
  action_type: string;
  action_description: string;
  affected_table?: string;
  affected_record_id?: string;
  old_values?: any;
  new_values?: any;
}

export function AdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState(50);
  const { isAdmin } = useTelegramAuth();
  const { toast } = useToast();

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      if (!isAdmin) {
        setLogs([]);
        setLoading(false);
        return;
      }

      const { data, error } = await callAdminFunction("ADMIN_LOGS", {
        method: "POST",
        body: {
          limit,
          offset: 0,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if ((data as any)?.ok) {
        setLogs((data as any).items || []);
      } else {
        throw new Error((data as any)?.error || "Failed to load admin logs");
      }
    } catch (error) {
      console.error("Failed to load admin logs:", error);
      toast({
        title: "Error",
        description: "Failed to load admin logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, limit, toast]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = logs.filter((log) =>
    log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.admin_telegram_id.includes(searchTerm)
  );

  const getActionColor = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case "approve":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "reject":
        return "bg-dc-brand/10 text-dc-brand border-dc-brand/20";
      case "update":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "delete":
        return "bg-dc-brand/10 text-dc-brand border-dc-brand/20";
      case "create":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    return formatIsoDateTime(dateString);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Admin Activity Logs
        </CardTitle>
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={loadLogs}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]" aria-busy={loading}>
          {loading
            ? <AdminListSkeleton rows={5} />
            : filteredLogs.length === 0
            ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No logs match your search" : "No logs found"}
              </div>
            )
            : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <Badge className={getActionColor(log.action_type)}>
                        {log.action_type}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(log.created_at)}
                      </div>
                    </div>

                    <p className="text-sm font-medium">
                      {log.action_description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Admin: {log.admin_telegram_id}</span>
                      {log.affected_table && (
                        <span>Table: {log.affected_table}</span>
                      )}
                    </div>

                    {(log.old_values || log.new_values) && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View changes
                        </summary>
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          {log.old_values && (
                            <div>
                              <strong>Before:</strong>
                              <pre className="mt-1 text-xs">{JSON.stringify(log.old_values, null, 2)}</pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div className="mt-2">
                              <strong>After:</strong>
                              <pre className="mt-1 text-xs">{JSON.stringify(log.new_values, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
