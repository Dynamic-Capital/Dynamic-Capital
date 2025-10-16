import type { LucideIcon } from "lucide-react";
import { Activity, AlertTriangle, ShieldAlert, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dynamicSignals } from "@/lib/mock-data";

type IndicatorColor = (typeof dynamicSignals.indicators)[number]["color"];

const SIGNAL_META = {
  success: {
    label: "Buy zone",
    action: "Robots are buying.",
    icon: TrendingUp,
    accentClass: "text-success",
    badgeClass: "bg-success/10 text-success",
    barClass: "bg-success",
  },
  warning: {
    label: "Check soon",
    action: "Review setups.",
    icon: AlertTriangle,
    accentClass: "text-warning",
    badgeClass: "bg-warning/10 text-warning",
    barClass: "bg-warning",
  },
  error: {
    label: "Pause now",
    action: "Protect capital.",
    icon: ShieldAlert,
    accentClass: "text-error",
    badgeClass: "bg-error/10 text-error",
    barClass: "bg-error",
  },
} satisfies Record<
  IndicatorColor,
  {
    label: string;
    action: string;
    icon: LucideIcon;
    accentClass: string;
    badgeClass: string;
    barClass: string;
  }
>;

export function SignalsWidget() {
  const totalSignals = dynamicSignals.indicators.reduce(
    (sum, indicator) => sum + indicator.count,
    0,
  );
  const cardClasses =
    "relative overflow-hidden rounded-3xl border border-border/60 bg-background/90 p-6 shadow-lg shadow-primary/10";
  const summaryId = "signals-summary";
  const listId = "signals-list";

  return (
    <Card className={cardClasses}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(110,80,255,0.12),transparent_75%)]" />
      <div className="relative z-10 space-y-6">
        <div
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          aria-labelledby={summaryId}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Activity className="h-6 w-6" aria-hidden />
            </span>
            <div className="space-y-1">
              <p id={summaryId} className="text-base font-semibold">
                Signals now
              </p>
              <p className="text-sm text-muted-foreground">
                Quick view for new traders.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-success/30 bg-success/10 text-success self-start sm:self-auto"
          >
            {dynamicSignals.status}
          </Badge>
        </div>

        <div className="rounded-2xl border border-border/50 bg-background/80 p-4 shadow-inner">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total alerts</span>
            <span className="text-sm font-semibold text-foreground">
              {totalSignals}
            </span>
          </div>
          <div
            className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-border/60"
            aria-hidden
          >
            {dynamicSignals.indicators.map((indicator, index) => {
              const meta = SIGNAL_META[indicator.color as IndicatorColor];
              const widthPercent = totalSignals
                ? Math.max(
                  Math.round((indicator.count / totalSignals) * 100),
                  4,
                )
                : indicator.count > 0
                ? 100 / dynamicSignals.indicators.length
                : 0;
              return (
                <span
                  key={`${indicator.color}-${index}`}
                  className={meta.barClass}
                  style={{ width: `${widthPercent}%` }}
                />
              );
            })}
          </div>
        </div>

        <ul id={listId} className="grid gap-3" role="list">
          {dynamicSignals.indicators.map((indicator, index) => {
            const meta = SIGNAL_META[indicator.color as IndicatorColor];
            const percentage = totalSignals
              ? Math.round((indicator.count / totalSignals) * 100)
              : 0;
            const indicatorClasses = [
              "group flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5",
              "sm:flex-row sm:items-center sm:justify-between",
            ].join(" ");

            return (
              <li
                key={`${indicator.color}-${index}`}
                className={indicatorClasses}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.badgeClass}`}
                  >
                    <meta.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {meta.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {meta.action}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className={`text-sm font-semibold ${meta.accentClass}`}>
                    {indicator.count} alerts
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {percentage}% of alerts
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
