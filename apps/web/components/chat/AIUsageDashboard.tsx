"use client";

import { useMemo } from "react";
import { Activity, BarChart3, Clock3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { DynamicServiceName } from "./DynamicAIChat";

interface AiServiceLog {
  id: string;
  created_at: string;
  service_name: string;
  status: "success" | "error";
  tokens_in: number | null;
  tokens_out: number | null;
  latency_ms: number | null;
  model: string | null;
}

const METRIC_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function AIUsageDashboard() {
  const { user } = useAuth();

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ["ai-service-logs", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<AiServiceLog[]> => {
      if (!user?.id) return [];
      const since = new Date(Date.now() - METRIC_WINDOW_MS).toISOString();
      const { data, error: queryError } = await supabase
        .from("ai_service_logs")
        .select(
          "id, created_at, service_name, status, tokens_in, tokens_out, latency_ms, model",
        )
        .eq("user_id", user.id)
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;
      return (data ?? []) as AiServiceLog[];
    },
    staleTime: 60_000,
  });

  const metrics = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((log) => log.status === "success").length;
    const totalTokens = logs.reduce(
      (sum, log) => sum + (log.tokens_in ?? 0) + (log.tokens_out ?? 0),
      0,
    );
    const totalLatency = logs.reduce(
      (sum, log) => sum + (log.latency_ms ?? 0),
      0,
    );
    const perService = logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.service_name] = (acc[log.service_name] ?? 0) + 1;
      return acc;
    }, {});

    const avgLatency = success > 0 ? Math.round(totalLatency / success) : null;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

    return {
      total,
      success,
      successRate,
      totalTokens,
      avgLatency,
      perService,
    };
  }, [logs]);

  if (!user) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>AI Usage Metrics</CardTitle>
          <CardDescription>
            Sign in to view personalised telemetry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Metrics will appear once you authenticate and engage with Dynamic AI
            copilots.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>AI Usage Metrics</CardTitle>
        <CardDescription>Performance over the last seven days.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading
          ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )
          : error
          ? (
            <p className="text-sm text-destructive">
              Unable to load metrics right now. Please try again shortly.
            </p>
          )
          : logs.length === 0
          ? (
            <p className="text-sm text-muted-foreground">
              Start a conversation with Dynamic AI, AGI, or AGS to generate
              usage telemetry.
            </p>
          )
          : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                    <Activity className="h-4 w-4" /> Total Calls
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{metrics.total}</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.success} successful ·{" "}
                    {metrics.successRate}% success rate
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                    <Clock3 className="h-4 w-4" /> Avg Latency
                  </div>
                  <p className="mt-2 text-2xl font-semibold">
                    {metrics.avgLatency !== null
                      ? `${metrics.avgLatency} ms`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Computed across successful completions
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                    <BarChart3 className="h-4 w-4" /> Tokens Used
                  </div>
                  <p className="mt-2 text-2xl font-semibold">
                    {metrics.totalTokens}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Prompt + completion tokens combined
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-widest text-muted-foreground">
                  Service Distribution
                </h4>
                <div className="mt-3 grid gap-3">
                  {["ai", "agi", "ags"].map((service) => {
                    const count = metrics.perService[service] ?? 0;
                    const label = SERVICE_LABELS[service as DynamicServiceName];
                    return (
                      <div
                        key={service}
                        className="flex items-center justify-between rounded-md border border-border/40 bg-background/70 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="uppercase tracking-widest"
                          >
                            {service}
                          </Badge>
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
      </CardContent>
    </Card>
  );
}

const SERVICE_LABELS: Record<DynamicServiceName, string> = {
  ai: "Dynamic AI",
  agi: "Dynamic AGI",
  ags: "Dynamic AGS",
};
