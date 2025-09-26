"use client";

import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  MarketPulseMetric,
  MultiLlmInsight,
} from "@/services/miniapp/homeContentSync";

interface MiniAppMetricsSlidersProps {
  metrics: MarketPulseMetric[];
  insights?: MultiLlmInsight[];
  deskTimeLabel: string;
  lastSyncedLabel?: string;
  sectionReason?: string;
}

const MAX_METRICS_VISIBLE = 4;

function formatMetricValue(value: number, unit?: string) {
  const formatted = `${Math.round(value)}${unit ?? "%"}`;
  return formatted;
}

function formatChange(change?: number, label?: string) {
  if (typeof change === "number" && !Number.isNaN(change)) {
    const ratio = change > 1 ? change : change * 100;
    const prefix = ratio >= 0 ? "+" : "";
    return `${prefix}${ratio.toFixed(1)}%`;
  }
  return label ?? "";
}

const MiniAppMetricsSlidersComponent = ({
  metrics,
  insights,
  deskTimeLabel,
  lastSyncedLabel,
  sectionReason,
}: MiniAppMetricsSlidersProps) => {
  const visibleMetrics = metrics.slice(0, MAX_METRICS_VISIBLE);

  const insightGroups = useMemo(() => {
    if (!insights || insights.length === 0) {
      return [];
    }

    return insights.slice(0, 3).map((insight) => ({
      key: `${insight.provider}-${insight.message}`,
      message: insight.message,
      provider: insight.provider,
      emphasis: insight.emphasis ?? "neutral",
    }));
  }, [insights]);

  return (
    <Card className="bg-gradient-to-br from-background/60 via-background to-muted/50 border-primary/10">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <CardTitle className="text-subheading font-semibold">
            Market Pulse & Trading Desk Sync
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Desk time: {deskTimeLabel}
          </Badge>
        </div>
        {(lastSyncedLabel || sectionReason) && (
          <p className="text-xs text-muted-foreground flex flex-wrap gap-2">
            {lastSyncedLabel && <span>Auto-sync: {lastSyncedLabel}</span>}
            {sectionReason && (
              <span className="truncate">
                Focus: {sectionReason}
              </span>
            )}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {visibleMetrics.map((metric) => {
          const changeLabel = formatChange(metric.change, metric.changeLabel);
          const isPositive = changeLabel.startsWith("+");
          return (
            <div key={metric.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {metric.label}
                  </p>
                  {metric.description && (
                    <p className="text-xs text-muted-foreground">
                      {metric.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span>{formatMetricValue(metric.value, metric.unit)}</span>
                  {changeLabel && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                        isPositive
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-red-500/10 text-red-500",
                      )}
                    >
                      {isPositive
                        ? <TrendingUp className="h-3 w-3" />
                        : <TrendingDown className="h-3 w-3" />}
                      {changeLabel}
                    </span>
                  )}
                </div>
              </div>
              <Slider
                value={[Math.max(0, Math.min(100, metric.value))]}
                max={100}
                step={1}
                disabled
                className="[&>span]:bg-primary/40 [&>span>span]:bg-primary"
              />
              {typeof metric.confidence === "number" && (
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Confidence {Math.round(metric.confidence * 100)}%
                </p>
              )}
            </div>
          );
        })}

        {insightGroups.length > 0 && (
          <div className="pt-2 border-t border-border/40 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Multi-LLM Highlights
            </p>
            <ul className="space-y-1 text-xs">
              {insightGroups.map((insight) => (
                <li
                  key={insight.key}
                  className={cn(
                    "flex items-start gap-2 rounded-md bg-background/60 p-2 border border-border/30",
                    insight.emphasis === "marketing" &&
                      "border-amber-500/30 bg-amber-500/5",
                    insight.emphasis === "popularity" &&
                      "border-emerald-500/30 bg-emerald-500/5",
                  )}
                >
                  <Badge variant="secondary" className="text-[10px]">
                    {insight.provider}
                  </Badge>
                  <span className="text-left leading-relaxed">
                    {insight.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const MiniAppMetricsSliders = memo(MiniAppMetricsSlidersComponent);
