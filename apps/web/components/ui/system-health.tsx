"use client";

import { type ReactNode, useEffect, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DynamicBadge,
  type DynamicBadgeEmphasis,
  type DynamicBadgeSize,
  type DynamicBadgeTone,
} from "@/components/ui/dynamic-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Database,
  RefreshCw,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils";
import { formatIsoTime } from "@/utils/isoFormat";
import {
  type SystemHealthCheck,
  type SystemHealthCheckKey,
  type SystemHealthCheckStatus,
  type SystemHealthOverallStatus,
  type SystemHealthPerformance,
  type SystemHealthResponse,
} from "@/types/system-health";
import { useSystemHealth } from "@/hooks/useSystemHealth";

export type SystemHealthDisplayStatus =
  | SystemHealthOverallStatus
  | "loading"
  | "unknown";

interface SystemHealthProps {
  className?: string;
  showDetails?: boolean;
}

interface StatusMeta {
  label: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
  tone: DynamicBadgeTone;
  emphasis?: DynamicBadgeEmphasis;
  size?: DynamicBadgeSize;
  pulse?: boolean;
}

const STATUS_META: Record<SystemHealthDisplayStatus, StatusMeta> = {
  healthy: {
    label: "Healthy",
    description: "All systems are operating within expected thresholds.",
    icon: CheckCircle,
    iconClass: "text-success",
    tone: "success",
  },
  degraded: {
    label: "Degraded",
    description:
      "Some checks require attention. Review the affected components.",
    icon: AlertTriangle,
    iconClass: "text-warning",
    tone: "warning",
  },
  error: {
    label: "Error",
    description: "Critical issues detected. Immediate action recommended.",
    icon: AlertCircle,
    iconClass: "text-dc-brand",
    tone: "brand",
  },
  loading: {
    label: "Checking",
    description: "Fetching the latest system health status.",
    icon: RefreshCw,
    iconClass: "text-muted-foreground",
    tone: "neutral",
    emphasis: "outline",
    pulse: true,
  },
  unknown: {
    label: "Unknown",
    description: "System health could not be determined. Try refreshing.",
    icon: Activity,
    iconClass: "text-muted-foreground",
    tone: "neutral",
    emphasis: "outline",
  },
};

export const SYSTEM_HEALTH_STATUS_META = STATUS_META;

interface CheckMeta {
  label: string;
  description: string;
  icon: LucideIcon;
}

const CHECK_META: Record<SystemHealthCheckKey, CheckMeta> = {
  database: {
    label: "Database",
    description: "Primary Supabase cluster availability",
    icon: Database,
  },
  bot_content: {
    label: "Bot Content",
    description: "Content freshness and publishing pipeline",
    icon: Activity,
  },
  promotions: {
    label: "Promotions",
    description: "Active promo codes and campaigns",
    icon: Zap,
  },
  rpc_functions: {
    label: "Edge Functions",
    description: "Critical RPC and edge function endpoints",
    icon: Shield,
  },
};

const CHECK_STATUS_META: Record<
  SystemHealthCheckStatus,
  {
    label: string;
    icon: LucideIcon;
    tone: DynamicBadgeTone;
    emphasis?: DynamicBadgeEmphasis;
    size?: DynamicBadgeSize;
  }
> = {
  ok: {
    label: "Operational",
    icon: CheckCircle,
    tone: "success",
    size: "sm",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    tone: "warning",
    size: "sm",
  },
  error: {
    label: "Error",
    icon: AlertCircle,
    tone: "brand",
    size: "sm",
  },
};

export function SystemHealthStatusBadge({
  status,
  className,
  children,
}: {
  status: SystemHealthDisplayStatus;
  className?: string;
  children?: ReactNode;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.unknown;

  return (
    <DynamicBadge
      tone={meta.tone}
      emphasis={meta.emphasis}
      size={meta.size}
      pulse={meta.pulse}
      className={className}
    >
      {children ?? meta.label}
    </DynamicBadge>
  );
}

export function SystemHealthStatusIcon({
  status,
  isRefreshing = false,
  className,
}: {
  status: SystemHealthDisplayStatus;
  isRefreshing?: boolean;
  className?: string;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.unknown;
  const Icon = meta.icon;
  return (
    <Icon
      className={cn(
        "h-4 w-4",
        meta.iconClass,
        (status === "loading" || isRefreshing) && "animate-spin",
        className,
      )}
    />
  );
}

export function SystemHealthCheckStatusBadge({
  status,
  className,
}: {
  status: SystemHealthCheckStatus;
  className?: string;
}) {
  const meta = CHECK_STATUS_META[status];
  const Icon = meta.icon;

  return (
    <DynamicBadge
      tone={meta.tone}
      emphasis={meta.emphasis}
      size={meta.size}
      icon={<Icon className="h-3 w-3" />}
      className={className}
    >
      {meta.label}
    </DynamicBadge>
  );
}

export function SystemHealthMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number | ReactNode;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="space-y-1 rounded-lg border border-border/40 bg-muted/30 p-3 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn("text-sm font-semibold", {
          "text-success": tone === "positive",
          "text-dc-brand": tone === "negative",
        })}
      >
        {value}
      </p>
    </div>
  );
}

export function SystemHealthMetrics({
  performance,
}: {
  performance: SystemHealthPerformance;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SystemHealthMetric
        label="Average response"
        value={`${performance.average_response_time}ms`}
      />
      <SystemHealthMetric
        label="Total checks"
        value={performance.total_checks}
      />
      <SystemHealthMetric
        label="Failed checks"
        value={performance.failed_checks}
        tone={performance.failed_checks > 0 ? "negative" : "positive"}
      />
    </div>
  );
}

export function SystemHealthCheckItem({
  checkKey,
  check,
}: {
  checkKey: SystemHealthCheckKey;
  check: SystemHealthCheck;
}) {
  const meta = CHECK_META[checkKey];
  const Icon = meta.icon;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/40 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{meta.label}</p>
          <p className="text-xs text-muted-foreground">{meta.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{check.response_time}ms</span>
        {typeof check.active_count === "number" && (
          <span>{check.active_count} active</span>
        )}
        <SystemHealthCheckStatusBadge status={check.status} />
      </div>
    </div>
  );
}

const RECOMMENDATION_ICONS = [TrendingUp, Shield, Zap] as const;

interface ParsedRecommendation {
  title: string;
  description?: string;
}

function parseRecommendation(
  recommendation: string,
  index: number,
): ParsedRecommendation {
  const fallbackTitle = `Recommendation ${index + 1}`;
  const trimmed = recommendation.trim();
  if (!trimmed) {
    return { title: fallbackTitle };
  }

  const delimiterMatch = trimmed.match(
    /^(.*?\S)(?:\s*:\s*|\s+[\u2013\u2014-]\s+)(.+)$/,
  );
  if (delimiterMatch) {
    const [, rawTitle, rawDescription] = delimiterMatch;
    return {
      title: rawTitle.trim() || fallbackTitle,
      description: rawDescription.trim(),
    };
  }

  const sentenceMatch = trimmed.match(/^([^.!?]+)[.!?]\s+(.*)$/);
  if (sentenceMatch) {
    const [, rawTitle, rawDescription] = sentenceMatch;
    return {
      title: rawTitle.trim() || fallbackTitle,
      description: rawDescription.trim(),
    };
  }

  return {
    title: trimmed,
  };
}

export function SystemHealthRecommendations({
  recommendations,
}: {
  recommendations: string[];
}) {
  if (!recommendations.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Recommendations</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((rec, index) => {
          const Icon =
            RECOMMENDATION_ICONS[index % RECOMMENDATION_ICONS.length];
          const { title, description } = parseRecommendation(rec, index);

          return (
            <div
              key={`${index}-${rec}`}
              className="flex h-full flex-col gap-2 rounded-lg border border-border/40 bg-card/80 p-3"
            >
              <div className="flex items-start gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border/40 bg-muted/40">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold leading-tight">{title}</p>
                  {description
                    ? (
                      <p className="text-xs text-muted-foreground">
                        {description}
                      </p>
                    )
                    : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SystemHealthSkeleton({
  showDetails,
}: {
  showDetails: boolean;
}) {
  if (showDetails) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </div>
    </div>
  );
}

function SystemHealthSummary({ data }: { data: SystemHealthResponse }) {
  return (
    <div className="space-y-4">
      <SystemHealthMetrics performance={data.performance} />
      <SystemHealthRecommendations recommendations={data.recommendations} />
    </div>
  );
}

function SystemHealthDetails({ data }: { data: SystemHealthResponse }) {
  const checkEntries = useMemo(
    () =>
      Object.entries(data.checks) as [
        SystemHealthCheckKey,
        SystemHealthCheck,
      ][],
    [data.checks],
  );

  return (
    <div className="space-y-4">
      <SystemHealthMetrics performance={data.performance} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Component status</p>
        <div className="space-y-2">
          {checkEntries.map(([key, check]) => (
            <SystemHealthCheckItem key={key} checkKey={key} check={check} />
          ))}
        </div>
      </div>
      <SystemHealthRecommendations recommendations={data.recommendations} />
    </div>
  );
}

export function SystemHealth({
  className,
  showDetails = false,
}: SystemHealthProps) {
  const {
    data,
    error,
    isError,
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useSystemHealth({
    autoRefresh: showDetails,
  });
  const previousStatusRef = useRef<SystemHealthOverallStatus | null>(null);

  const status: SystemHealthDisplayStatus = data
    ? data.overall_status
    : isLoading
    ? "loading"
    : isError
    ? "unknown"
    : "loading";

  const lastChecked = data?.timestamp
    ? new Date(data.timestamp)
    : dataUpdatedAt
    ? new Date(dataUpdatedAt)
    : undefined;

  useEffect(() => {
    if (!data) return;
    if (previousStatusRef.current === data.overall_status) return;

    previousStatusRef.current = data.overall_status;

    if (data.overall_status === "degraded") {
      toast.warning("Some systems are experiencing issues");
    } else if (data.overall_status === "error") {
      toast.error("System health check failed");
    }
  }, [data]);

  if (
    !showDetails && !isLoading && !isError && data?.overall_status === "healthy"
  ) {
    return null;
  }

  const meta = STATUS_META[status];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 sm:items-center">
            <SystemHealthStatusIcon
              status={status}
              isRefreshing={isFetching && !!data}
              className="mt-0.5"
            />
            <div>
              <CardTitle className="text-base">System Health</CardTitle>
              <CardDescription className="text-xs">
                {meta.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SystemHealthStatusBadge status={status} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={cn("h-4 w-4", isFetching && "animate-spin")}
              />
            </Button>
          </div>
        </div>
        {lastChecked && (
          <CardDescription className="text-xs">
            Last checked: {formatIsoTime(lastChecked)}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {error?.message || "Failed to load system health"}
            </AlertDescription>
          </Alert>
        )}

        {isLoading && !data
          ? <SystemHealthSkeleton showDetails={showDetails} />
          : data
          ? (
            showDetails
              ? <SystemHealthDetails data={data} />
              : <SystemHealthSummary data={data} />
          )
          : null}
      </CardContent>
    </Card>
  );
}
