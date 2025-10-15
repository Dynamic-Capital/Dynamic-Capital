"use client";

import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";
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

function clampMetricValue(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function generateTrendSeries(metric: MarketPulseMetric) {
  const pointCount = 6;
  const baseValue = clampMetricValue(metric.value);
  const rawChange = typeof metric.change === "number" ? metric.change : 0;
  const normalisedChange = Math.abs(rawChange) > 1
    ? rawChange
    : rawChange * 100;
  const direction = Math.sign(normalisedChange || 1);
  const confidence = typeof metric.confidence === "number"
    ? metric.confidence
    : 0.45;
  const startValue = clampMetricValue(
    baseValue - direction * Math.abs(normalisedChange) * 0.6,
  );
  const endValue = baseValue;

  return Array.from({ length: pointCount }, (_, index) => {
    const t = index / Math.max(pointCount - 1, 1);
    const smooth = t * t * (3 - 2 * t);
    const wave = Math.sin(t * Math.PI) * confidence * 8 * direction;
    const nextValue = clampMetricValue(
      startValue + (endValue - startValue) * smooth + wave,
    );
    return { index, value: Number(nextValue.toFixed(2)) };
  });
}

function MetricTooltip({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const [{ value }] = (payload ?? []) as Array<{ value: number }>;
  return (
    <div className="rounded-md border border-border/40 bg-background/90 px-2 py-1 text-xs text-foreground shadow-md">
      {Number(value).toFixed(1)}%
    </div>
  );
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
    <Card className="glass-motion-card">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-subheading font-semibold tracking-tight text-foreground">
            Market Pulse & Trading Desk Sync
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Desk time: {deskTimeLabel}
            </Badge>
            {lastSyncedLabel && (
              <Badge className="bg-emerald-500/10 text-emerald-300">
                <span
                  className="mr-1 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"
                  aria-hidden
                />
                Live · {lastSyncedLabel}
              </Badge>
            )}
          </div>
        </div>
        {(lastSyncedLabel || sectionReason) && (
          <p className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {lastSyncedLabel && (
              <span>Auto-sync updates every few minutes.</span>
            )}
            {sectionReason && (
              <span className="truncate">Focus: {sectionReason}</span>
            )}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {visibleMetrics.map((metric) => {
          const changeLabel = formatChange(metric.change, metric.changeLabel);
          const isPositive = changeLabel.startsWith("+");
          const trendData = generateTrendSeries(metric);
          const gradientId = `metric-trend-${metric.id}`;
          return (
            <div
              key={metric.id}
              className="space-y-3 rounded-2xl border border-border/30 bg-background/60 p-4 backdrop-blur"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {metric.label}
                  </p>
                  {metric.description && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {metric.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 text-right text-sm font-semibold">
                  <span className="text-base tracking-tight text-foreground">
                    {formatMetricValue(metric.value, metric.unit)}
                  </span>
                  {changeLabel && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                        isPositive
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400",
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
              <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
                <ResponsiveContainer height={60} width="100%">
                  <AreaChart
                    data={trendData}
                    margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id={gradientId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.38}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={<MetricTooltip />}
                      cursor={{
                        stroke: "hsl(var(--primary) / 0.4)",
                        strokeWidth: 1,
                      }}
                      wrapperStyle={{ outline: "none" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill={`url(#${gradientId})`}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <Slider
                value={[clampMetricValue(metric.value)]}
                max={100}
                step={1}
                disabled
                className="[&>span]:bg-primary/30 [&>span>span]:bg-primary"
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
          <div className="space-y-3 border-t border-border/40 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Multi-LLM Highlights
            </p>
            <ul className="space-y-2 text-xs">
              {insightGroups.map((insight) => (
                <li
                  key={insight.key}
                  className={cn(
                    "miniapp-panel flex items-start gap-2 p-3 text-xs leading-relaxed",
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
