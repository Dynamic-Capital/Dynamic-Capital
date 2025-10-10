import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, DollarSign, Zap } from "lucide-react";
import { toast } from "sonner";

interface AILog {
  id: string;
  service_type: string;
  endpoint: string;
  status_code: number;
  tokens_used: number;
  duration_ms: number;
  created_at: string;
  error_message?: string;
}

interface Stats {
  totalRequests: number;
  totalTokens: number;
  avgDuration: number;
  errorRate: number;
}

export default function AIAnalytics() {
  const [logs, setLogs] = useState<AILog[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalRequests: 0,
    totalTokens: 0,
    avgDuration: 0,
    errorRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    const channel = supabase
      .channel("ai-analytics")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ai_service_logs",
        },
        (payload) => {
          setLogs((prev) => [payload.new as AILog, ...prev]);
          calculateStats([payload.new as AILog, ...logs]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_service_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: AILog[]) => {
    const totalRequests = data.length;
    const totalTokens = data.reduce((sum, log) => sum + (log.tokens_used || 0), 0);
    const avgDuration = data.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / totalRequests || 0;
    const errors = data.filter((log) => log.status_code >= 400 || log.error_message).length;
    const errorRate = (errors / totalRequests) * 100 || 0;

    setStats({ totalRequests, totalTokens, avgDuration, errorRate });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">AI Service Analytics</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.avgDuration)}ms</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.errorRate.toFixed(2)}%</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent AI Service Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={log.service_type === "agi" ? "default" : "secondary"}>
                          {log.service_type.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-mono">{log.endpoint}</span>
                      </div>
                      <Badge variant={log.status_code >= 400 ? "destructive" : "outline"}>
                        {log.status_code}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Tokens: {log.tokens_used || 0}</span>
                      <span>Duration: {log.duration_ms || 0}ms</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    {log.error_message && (
                      <div className="text-sm text-destructive">{log.error_message}</div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
